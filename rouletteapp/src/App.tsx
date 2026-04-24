import { useEffect, useRef, useState, useCallback, type ChangeEvent } from 'react'
import { getContext } from '@microsoft/power-apps/app'
import { getClient } from '@microsoft/power-apps/data'
import { dataSourcesInfo } from '../.power/schemas/appschemas/dataSourcesInfo'
import bgmMp3Base64 from './assets/bgmData'
import './App.css'

const dvClient = getClient(dataSourcesInfo)

const FACES = [
  { value: 1, className: 'face-1' },
  { value: 6, className: 'face-6' },
  { value: 3, className: 'face-3' },
  { value: 4, className: 'face-4' },
  { value: 5, className: 'face-5' },
  { value: 2, className: 'face-2' },
]

const THEMES = [
  '最近ハマっている食べ物',
  '休日の朝のルーティン',
  '子どもの頃のあだ名',
  '思い出の映画',
  '密かなマイブーム',
  'おすすめの散歩スポット',
]

const ROLL_DURATION_MIN = 3
const ROLL_DURATION_MAX = 10
const DEFAULT_ROLL_DURATION = 10

type ThemeRecord = { id: string; name: string }
type EditItem = { id?: string; name: string; deleted?: boolean }

const shuffleThemes = (items: string[]) => {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

const selectSixThemes = (items: string[]) => {
  const cleaned = items.map((item) => item.trim()).filter(Boolean)
  const shuffled = shuffleThemes(cleaned)
  const picked = shuffled.slice(0, 6)

  while (picked.length < 6) {
    picked.push('フリー')
  }

  return picked
}

function App() {
  const [isRolling, setIsRolling] = useState(false)
  const [isBgmEnabled, setIsBgmEnabled] = useState(true)
  const [isLoadingThemes, setIsLoadingThemes] = useState(false)
  const [rollDuration, setRollDuration] = useState(DEFAULT_ROLL_DURATION)
  const [countdown, setCountdown] = useState(DEFAULT_ROLL_DURATION)
  const [sourceThemes, setSourceThemes] = useState<ThemeRecord[]>([])
  const [selectedThemes, setSelectedThemes] = useState(() => selectSixThemes(THEMES))
  const [rollState, setRollState] = useState(() => ({
    themesByFace: selectSixThemes(THEMES),
    resultFace: 1,
  }))
  const [isPowerReady, setIsPowerReady] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editItems, setEditItems] = useState<EditItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const intervalRef= useRef<number | null>(null)
  const rollEndRef = useRef<number | null>(null)
  const finalStateRef = useRef<{ themesByFace: string[]; resultFace: number } | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const audioGainRef = useRef<GainNode | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)

  const decodeEmbeddedAudio = useCallback(async (context: AudioContext) => {
    if (audioBufferRef.current) {
      return audioBufferRef.current
    }

    const binary = atob(bgmMp3Base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    const decoded = await context.decodeAudioData(bytes.buffer.slice(0))
    audioBufferRef.current = decoded
    return decoded
  }, [])

  const stopBgm = useCallback(() => {
    const source = audioSourceRef.current
    audioSourceRef.current = null
    if (source) {
      try {
        source.stop()
      } catch {
        // source may already be stopped
      }
      source.disconnect()
    }

    if (audioGainRef.current) {
      audioGainRef.current.disconnect()
      audioGainRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void getContext()
      .then(() => {
        if (!cancelled) {
          setIsPowerReady(true)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const msg = error instanceof Error ? error.message : String(error)
          console.error('Context init failed:', msg)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const playBgm = useCallback(async () => {
    if (!isBgmEnabled) return
    if (audioSourceRef.current) return
    try {
      const context = audioContextRef.current ?? new AudioContext()
      audioContextRef.current = context
      if (context.state !== 'running') {
        await context.resume()
      }

      const decoded = await decodeEmbeddedAudio(context)
      const source = context.createBufferSource()
      const gain = context.createGain()

      source.buffer = decoded
      source.loop = true
      gain.gain.value = 0.9

      source.connect(gain)
      gain.connect(context.destination)
      source.start(0)

      audioSourceRef.current = source
      audioGainRef.current = gain
    } catch {
      // BGM playback failed silently
    }
  }, [decodeEmbeddedAudio, isBgmEnabled])

  const applySelectedThemes = useCallback((themes: string[]) => {
    setSelectedThemes(themes)
    setRollState((current) => ({
      themesByFace: shuffleThemes(themes),
      resultFace: current.resultFace,
    }))
  }, [])

  const loadThemesFromSharePoint = useCallback(async () => {
    setIsLoadingThemes(true)
    try {
      const result = await dvClient.retrieveMultipleRecordsAsync<{ new_talkthemeid?: string; new_name?: string }>(
        'new_talkthemes',
        { select: ['new_talkthemeid', 'new_name'] }
      )
      const items = result.data ?? []
      const records: ThemeRecord[] = items
        .map((item) => ({
          id: item.new_talkthemeid ?? '',
          name: (item.new_name ?? '').trim(),
        }))
        .filter((t) => t.name)

      setSourceThemes(records)
      applySelectedThemes(selectSixThemes(records.map((t) => t.name)))
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Failed to load themes from Dataverse:', msg)
      setSourceThemes([])
      applySelectedThemes(selectSixThemes([]))
    } finally {
      setIsLoadingThemes(false)
    }
  }, [applySelectedThemes])

  useEffect(() => {
    if (!isPowerReady) return
    void loadThemesFromSharePoint()
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
      stopBgm()
    }
  }, [isPowerReady, loadThemesFromSharePoint, stopBgm])

  useEffect(() => {
    if (!isRolling) return

    intervalRef.current = window.setInterval(() => {
      const now = Date.now()
      const endAt = rollEndRef.current ?? now
      const remainingMs = Math.max(0, endAt - now)
      const remainingSeconds = Math.ceil(remainingMs / 1000)

      if (remainingMs <= 0) {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        const finalState = finalStateRef.current
        if (finalState) {
          setRollState(finalState)
        } else {
          setRollState({
            themesByFace: shuffleThemes(selectedThemes),
            resultFace: Math.floor(Math.random() * 6) + 1,
          })
        }
        setCountdown(0)
        setIsRolling(false)
        stopBgm()
        return
      }

      const nextThemes = shuffleThemes(selectedThemes)
      const nextFace = Math.floor(Math.random() * 6) + 1
      setCountdown(remainingSeconds)
      setRollState({ themesByFace: nextThemes, resultFace: nextFace })
    }, 160)

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRolling, selectedThemes, stopBgm])

  const handleRoll = () => {
    if (isRolling) return
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    rollEndRef.current = Date.now() + rollDuration * 1000
    void playBgm()
    finalStateRef.current = {
      themesByFace: shuffleThemes(selectedThemes),
      resultFace: Math.floor(Math.random() * 6) + 1,
    }
    setCountdown(rollDuration)
    setRollState({
      themesByFace: shuffleThemes(selectedThemes),
      resultFace: Math.floor(Math.random() * 6) + 1,
    })
    setIsRolling(true)
  }

  const handleDurationChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value)
    setRollDuration(nextValue)
    if (!isRolling) {
      setCountdown(nextValue)
    }
  }

  const handleReselect = () => {
    if (isRolling) return
    const baseThemes = sourceThemes.length ? sourceThemes.map((t) => t.name) : []
    applySelectedThemes(selectSixThemes(baseThemes))
  }

  useEffect(() => {
    if (isRolling && !isBgmEnabled) {
      stopBgm()
    }
  }, [isBgmEnabled, isRolling, stopBgm])

  const handleOpenEditor = () => {
    setSaveError(null)
    setEditItems(sourceThemes.map((t) => ({ id: t.id, name: t.name })))
    setIsEditing(true)
  }

  const handleEditChange = (index: number, value: string) => {
    setEditItems((prev) => prev.map((item, i) => (i === index ? { ...item, name: value } : item)))
  }

  const handleEditDelete = (index: number) => {
    setEditItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, deleted: !item.deleted } : item
      )
    )
  }

  const handleEditAdd = () => {
    setEditItems((prev) => [...prev, { name: '' }])
  }

  const handleSaveThemes = async () => {
    setSaveError(null)
    setIsSaving(true)
    try {
      const originalMap = new Map(sourceThemes.map((t) => [t.id, t.name]))

      for (const item of editItems) {
        if (item.deleted) {
          if (item.id) {
            await dvClient.deleteRecordAsync('new_talkthemes', item.id)
          }
        } else if (!item.id) {
          const trimmed = item.name.trim()
          if (trimmed) {
            await dvClient.createRecordAsync<{ new_name: string }, void>(
              'new_talkthemes',
              { new_name: trimmed }
            )
          }
        } else if (originalMap.get(item.id) !== item.name.trim()) {
          const trimmed = item.name.trim()
          if (trimmed) {
            await dvClient.updateRecordAsync<{ new_name: string }, void>(
              'new_talkthemes',
              item.id,
              { new_name: trimmed }
            )
          }
        }
      }

      setIsEditing(false)
      await loadThemesFromSharePoint()
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      setSaveError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedTheme =
    rollState.themesByFace[rollState.resultFace - 1] ||
    'テーマがここに表示されます'

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">Dice Roulette</p>
          <h1>Spin the cube. Spark the talk.</h1>
          <p className="subtitle">
            A bold, playful stage for choosing the next conversation theme.
          </p>
        </div>
        <div className="hero-meta">
          <div className="status">
            <span className={`pulse${isRolling ? ' active' : ''}`} />
            {isRolling ? 'Rolling...' : 'Ready'}
          </div>
          <button
            className="primary-button"
            onClick={handleRoll}
            disabled={isRolling}
          >
            {isRolling ? 'Rolling the dice' : 'Start roll'}
          </button>
          <button
            className="secondary-button"
            onClick={handleReselect}
            disabled={isRolling || isLoadingThemes}
          >
            {isLoadingThemes ? '読み込み中...' : '6テーマ再選定'}
          </button>
          <button
            className="secondary-button"
            onClick={handleOpenEditor}
            disabled={isRolling || isLoadingThemes}
          >
            テーマ編集
          </button>
          <div className="toggle-row">
            <span className="toggle-label">BGM</span>
            <label className="toggle" htmlFor="bgm-toggle">
              <input
                id="bgm-toggle"
                type="checkbox"
                checked={isBgmEnabled}
                onChange={(event) => setIsBgmEnabled(event.target.checked)}
              />
              <span className="toggle-track" />
            </label>
          </div>
          <div className="duration-control">
            <label className="duration-label" htmlFor="roll-duration">
              抽選時間: {rollDuration}s
            </label>
            <input
              id="roll-duration"
              className="duration-slider"
              type="range"
              min={ROLL_DURATION_MIN}
              max={ROLL_DURATION_MAX}
              step={1}
              value={rollDuration}
              onChange={handleDurationChange}
              disabled={isRolling}
            />
          </div>
        </div>
      </header>

      <main className="stage">
        <section className="dice-stage">
          <div className="spotlight" />
          <div
            className={`dice-cube show-${rollState.resultFace}${isRolling ? ' is-rolling' : ''}`}
          >
            {FACES.map((face) => (
              <div key={face.value} className={`face ${face.className}`}>
                <div className={`face-label${isRolling ? ' rolling' : ''}`}>
                  {rollState.themesByFace[face.value - 1] || 'テーマ未設定'}
                </div>
              </div>
            ))}
          </div>
          <div className="dice-shadow" />
        </section>

        <section className="result-panel">
          <h2>Selected theme</h2>
          <p className={`result-text${isRolling ? ' rolling' : ''}`}>
            {selectedTheme}
          </p>
          <div className="result-meta">
            <div className="pill countdown">{countdown}s</div>
          </div>
          <div className="theme-list">
            <h3>6テーマ一覧</h3>
            <ul>
              {selectedThemes.map((theme, index) => (
                <li key={`${theme}-${index}`}>{theme || 'フリー'}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {isEditing && (
        <div className="modal-overlay" onClick={() => !isSaving && setIsEditing(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>トークテーマを編集</h2>
              <button
                className="modal-close"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <ul className="edit-list">
                {editItems.map((item, index) => (
                  <li key={index} className={`edit-item${item.deleted ? ' deleted' : ''}`}>
                    <input
                      className="edit-input"
                      type="text"
                      value={item.name}
                      onChange={(e) => handleEditChange(index, e.target.value)}
                      disabled={isSaving || item.deleted}
                      placeholder="テーマを入力"
                    />
                    <button
                      className={`edit-delete-btn${item.deleted ? ' undo' : ''}`}
                      onClick={() => handleEditDelete(index)}
                      disabled={isSaving}
                      title={item.deleted ? '元に戻す' : '削除'}
                    >
                      {item.deleted ? '↩' : '✕'}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                className="add-theme-btn"
                onClick={handleEditAdd}
                disabled={isSaving}
              >
                ＋ テーマを追加
              </button>
              {saveError && (
                <p className="save-error">{saveError}</p>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="secondary-button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                キャンセル
              </button>
              <button
                className="primary-button"
                onClick={() => { void handleSaveThemes() }}
                disabled={isSaving}
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
