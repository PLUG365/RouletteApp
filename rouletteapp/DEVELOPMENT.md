# rouletteapp — Power Apps Code App 本体

このディレクトリが Power Apps Code App の実体です。React + TypeScript + Vite で構成され、`pac code push` で Power Platform 環境にデプロイされます。

プロジェクト全体の概要はリポジトリルートの [README.md](../README.md) を参照してください。開発者向けのセットアップ手順・技術メモは本ドキュメントに記載しています。

## ディレクトリ構成

```
rouletteapp/
├── src/
│   ├── App.tsx                         # メインコンポーネント（ルーレットロジック・UI・テーマ編集）
│   ├── App.css                         # スタイル（ダークテーマ・3D アニメーション・モーダル）
│   ├── main.tsx                        # エントリポイント
│   ├── index.css                       # グローバルスタイル（フォント・CSS 変数）
│   ├── assets/
│   │   ├── bgm.mp3                     # BGM 音源
│   │   └── bgmData.ts                  # bgm.mp3 を base64 埋め込みした TS モジュール
│   └── generated/                      # pac CLI 自動生成コード（手動編集禁止）
│       ├── index.ts
│       ├── models/
│       │   └── MicrosoftDataverseModel.ts
│       └── services/
│           └── MicrosoftDataverseService.ts
├── .power/
│   └── schemas/
│       ├── commondataserviceforapps/
│       │   └── commondataserviceforapps.Schema.json  # Dataverse スキーマ（pac 自動生成）
│       └── appschemas/
│           └── dataSourcesInfo.ts      # データソース接続設定（pac 自動生成）
├── package.json                        # 依存関係・スクリプト定義
├── package-lock.json                   # 依存関係ロックファイル
├── vite.config.ts                      # Vite ビルド設定
├── tsconfig.json / tsconfig.*.json     # TypeScript コンパイル設定
├── eslint.config.js                    # ESLint ルール
├── index.html                          # Vite HTML エントリポイント
├── power.config.template.json          # 接続設定テンプレート（要コピー＆編集）
├── power.config.json                   # 接続設定（.gitignore 対象）
└── DEVELOPMENT.md                      # 本ファイル
```

## 開発コマンド

```bash
npm install          # 依存関係インストール
npm run dev          # ローカル開発サーバー起動 (http://localhost:3000)
npm run build        # 本番ビルド → dist/
npm run lint         # ESLint チェック
npm run preview      # dist/ をプレビュー
```

## 自動生成ファイルについて

`src/generated/` と `.power/schemas/` 以下のファイルは pac CLI が自動生成します。手動編集は非推奨です。Dataverse の接続を変更した場合、これらのファイルは自動的に上書きされます。

## 依存パッケージ

| パッケージ | 用途 |
|---|---|
| `@microsoft/power-apps` | Power Apps SDK（Dataverse 接続・認証） |
| `react` / `react-dom` | UI フレームワーク |
| `vite` | ビルドツール |

---

## セットアップ手順

### 前提条件

| ツール | バージョン |
|---|---|
| Node.js | 18.x 以上 |
| Power Platform CLI (`pac`) | 最新版 |
| VS Code + Power Platform Tools 拡張 | 推奨 |

```bash
npm install -g @microsoft/powerplatform-cli
```

### 1. Dataverse カスタムテーブルを作成する

[Power Apps 管理センター](https://make.powerapps.com) → **Dataverse** → **テーブル** → **新しいテーブル** から下記のとおり作成してください。

| 設定項目 | 値 |
|---|---|
| 表示名 | 任意（例: トークテーマ） |
| **スキーマ名（固定）** | **`new_talktheme`** |
| 主列の表示名 | 任意（例: 名前） |
| **主列のスキーマ名（固定）** | **`new_name`** |

> スキーマ名が異なる場合は `.power/schemas/appschemas/dataSourcesInfo.ts` のテーブル名等も合わせて変更が必要です。

テーブル作成後、**データを編集** からテーマを数件登録しておくとテスト時に便利です。

### 2. power.config.json を設定する

`power.config.template.json` を `power.config.json` にリネームして編集してください。

```bash
cp power.config.template.json power.config.json
```

| プレースホルダー | 確認方法 |
|---|---|
| `<YOUR_ENVIRONMENT_ID>` | Power Platform 管理センター → 環境 → 詳細 |
| `<YOUR_INSTANCE_URL>` | `https://<org>.crm.dynamics.com/`（Dataverse 組織 URL） |

> `appId` は `pac code push` 初回実行時に自動で書き込まれます。空のままで問題ありません。  
> `power.config.json` は `.gitignore` に登録済みのため、誤ってコミットされません。

### 3. ローカルで動作確認する

```bash
npm install
npm run dev
# → http://localhost:3000
```

Dataverse 接続なしでもフォールバックテーマで動作確認できます。

### 4. Power Apps にデプロイする

```bash
npm run build
pac auth create --environment <YOUR_ENVIRONMENT_ID>
pac code push
```

### 5. マネージドソリューションとしてエクスポートする（任意）

```bash
pac solution export \
  --name RouletteApp \
  --path ../solution/RouletteApp_managed.zip \
  --managed \
  --overwrite
```

---

## 技術メモ

### BGM 再生方式

Power Apps の iframe 環境では `<audio>` 要素への URL 再生が CSP 制限で失敗するため、Web Audio API を使用しています。  
`bgm.mp3` を base64 エンコードして `bgmData.ts` に埋め込み、実行時に `AudioContext.decodeAudioData()` でデコードして `AudioBufferSourceNode` でループ再生します。

### Dataverse 接続方式

`connectionReferences`（コネクター API 経由）ではなく `databaseReferences`（Dataverse native 経路）を使用することで、token exchange エラーを回避しています。  
`power.config.json` に `databaseReferences.default.cds.instanceUrl` を設定し、`.power/schemas/appschemas/dataSourcesInfo.ts` に `dataSourceType: "Dataverse"` で登録します。

テーマの CRUD（追加・更新・削除）は `dvClient`（`@microsoft/power-apps/data` の `getClient`）が提供する `createRecordAsync` / `updateRecordAsync` / `deleteRecordAsync` を使用します。
