# RouletteApp — トークテーマ抽選アプリ (おまけ付)

Power Apps Code Apps（React + TypeScript + Vite）製の 3D サイコロルーレット。Dataverse のカスタムテーブル `new_talktheme` に登録したトークテーマをランダム抽選し、3〜10 秒のサイコロアニメーションと BGM で演出します。

> 詳細仕様は [SPEC.md](SPEC.md) を参照してください。

## 機能

- Dataverse カスタムテーブルからトークテーマを自動取得
- 6 面サイコロに最大 6 テーマをランダム割り当て
- 3D ローリングアニメーション（秒数調整可: 3〜10 秒）
- BGM 付き演出（ON/OFF 切替）
- テーマ 6 件再選定ボタン
- **アプリ上からトークテーマの追加・編集・削除**（Dataverse に即時反映）
- Dataverse 未接続時はフォールバックテーマで動作

---

## データ要件

### Dataverse カスタムテーブル

| 項目 | 値 |
|---|---|
| テーブル表示名 | `トークテーマ`（任意） |
| テーブルスキーマ名 | `new_talktheme` |
| Entity Set 名（API） | `new_talkthemes` |
| 操作列 | `new_name`（主列、1 行テキスト） |

テーマを任意の件数登録します（例: 「最近ハマっている食べ物」「休日の過ごし方」など）。  
6 件以上登録するとランダムに 6 件選ばれます。6 件未満の場合は「フリー」で補完されます。

---

## 権限設計

### アプリを実行できるユーザー

| 条件 | 詳細 |
|---|---|
| Power Apps ライセンス | Power Apps（per user / per app）または Microsoft 365 付属ライセンス |
| アプリ共有 | Power Apps 管理画面でアプリを対象ユーザー／グループに共有 |
| Dataverse セキュリティロール | `new_talktheme` テーブルへの **読み取り（Read）** 権限を持つロールが割り当て済み |

### テーマの追加・編集・削除ができるユーザー

アプリ実行権限に加えて、下記の Dataverse テーブル権限が必要です。

| 操作 | 必要な Dataverse テーブル権限 |
|---|---|
| テーマ追加 | `new_talktheme` への **作成（Create）** |
| テーマ編集 | `new_talktheme` への **書き込み（Write）** |
| テーマ削除 | `new_talktheme` への **削除（Delete）** |

> 権限が不足しているユーザーが「保存」を押すとエラーメッセージがモーダル内に表示されます。  
> システム管理者ロールまたはカスタマイズ担当者ロールは上記を全て含みます。

---

## ソリューションインポート後の追加設定

ソリューション（`solution/RouletteApp_managed.zip`）をインポートするとアプリと `new_talktheme` テーブルが自動作成されます。  
インポート直後は下記を追加で設定してください。

### 1. セキュリティロールの設定

| ユーザー種別 | 推奨ロール設定 |
|---|---|
| 閲覧・抽選のみ | カスタムロール（`new_talktheme` に Read のみ）または **Basic User** ロール + テーブル権限追加 |
| テーマ管理者 | カスタムロール（`new_talktheme` に Create / Read / Write / Delete）またはシステム管理者 |

Power Apps 管理センター（make.powerapps.com）→ **設定** → **セキュリティロール** でロールを作成し、対象ユーザーに割り当ててください。

### 2. アプリを共有する

Power Apps 管理センター → **アプリ** → `RouletteApp` の **…** → **共有** から、使用するユーザーまたはグループを追加し、適切なセキュリティロールを一緒に付与してください。

### 3. テーマデータの初期登録

インポート直後は `new_talktheme` テーブルが空です。  
アプリの「テーマ編集」ボタンからアプリ上で直接追加できます。または Power Apps 管理センターの **テーブル** → `new_talktheme` → **データを編集** からも登録可能です。

---

## 使い方

### A. ソリューションをインポートして使う

マネージドソリューション ZIP は [`solution/RouletteApp_managed.zip`](solution/RouletteApp_managed.zip) にあります。  
Power Platform 環境にインポートするだけで使えます。Dataverse カスタムテーブル（`new_talktheme`）もソリューションに含まれているため、自動作成されます。

> ソリューションにはおまけアプリも同梱されています。

#### 1. ソリューションをインポートする

[Power Apps 管理センター](https://make.powerapps.com) → **ソリューション** → **ソリューションのインポート** から `RouletteApp_managed.zip` を選択してインポートしてください。

#### 2. 権限・共有設定を行う

上記「ソリューションインポート後の追加設定」を参照してください。

#### 3. テーマデータを登録する

アプリを起動し「テーマ編集」ボタンからテーマを追加してください（テーマ管理者権限が必要）。

---

### B. ソースからビルド・デプロイする

開発者向けのセットアップ手順です。

#### 前提条件

| ツール | バージョン |
|---|---|
| Node.js | 18.x 以上 |
| Power Platform CLI (`pac`) | 最新版 |
| VS Code + Power Platform Tools 拡張 | 推奨 |

```bash
npm install -g @microsoft/powerplatform-cli
```

#### 1. Dataverse カスタムテーブルを作成する

[Power Apps 管理センター](https://make.powerapps.com) → **Dataverse** → **テーブル** → **新しいテーブル** から下記のとおり作成してください。

| 設定項目 | 値 |
|---|---|
| 表示名 | 任意（例: トークテーマ） |
| **スキーマ名（固定）** | **`new_talktheme`** |
| 主列の表示名 | 任意（例: 名前） |
| **主列のスキーマ名（固定）** | **`new_name`** |

> スキーマ名が異なる場合は `rouletteapp/.power/schemas/appschemas/dataSourcesInfo.ts` のテーブル名等も合わせて変更が必要です。

テーブル作成後、**データを編集** からテーマを数件登録しておくとテスト時に便利です。

---

#### 2. power.config.json を設定する

`rouletteapp/power.config.template.json` を `power.config.json` にリネームして編集してください。

```bash
cd rouletteapp
mv power.config.template.json power.config.json
```

`power.config.json` を自分の環境に合わせて編集する:

| プレースホルダー | 確認方法 |
|---|---|
| `<YOUR_ENVIRONMENT_ID>` | Power Platform 管理センター → 環境 → 詳細 |
| `<YOUR_INSTANCE_URL>` | `https://<org>.crm.dynamics.com/`（Dataverse 組織 URL） |

> `appId` は `pac code push` 初回実行時に自動で書き込まれます。空のままで問題ありません。  
> `power.config.json` は `.gitignore` に登録済みのため、誤ってコミットされません。

#### 3. ローカルで動作確認する

```bash
npm install
npm run dev
# → http://localhost:3000
```

Dataverse 接続なしでもフォールバックテーマで動作確認できます。

#### 4. Power Apps にデプロイする

```bash
npm run build
pac auth create --environment <YOUR_ENVIRONMENT_ID>
pac code push
```

#### 5. マネージドソリューションとしてエクスポートする（任意）

```bash
pac solution export \
  --name RouletteApp \
  --path ./RouletteApp_managed.zip \
  --managed \
  --overwrite
```

---

## アーキテクチャ

リポジトリ構成・ファイル一覧は [rouletteapp/DEVELOPMENT.md](rouletteapp/DEVELOPMENT.md) を参照してください。

## 技術メモ

### BGM 再生方式

Power Apps の iframe 環境では `<audio>` 要素への URL 再生が CSP 制限で失敗するため、Web Audio API を使用しています。  
`bgm.mp3` を base64 エンコードして `bgmData.ts` に埋め込み、実行時に `AudioContext.decodeAudioData()` でデコードして `AudioBufferSourceNode` でループ再生します。

### Dataverse 接続方式

`connectionReferences`（コネクター API 経由）ではなく `databaseReferences`（Dataverse native 経路）を使用することで、token exchange エラーを回避しています。  
`power.config.json` に `databaseReferences.default.cds.instanceUrl` を設定し、`.power/schemas/appschemas/dataSourcesInfo.ts` に `dataSourceType: "Dataverse"` で登録します。

テーマの CRUD（追加・更新・削除）は `dvClient`（`@microsoft/power-apps/data` の `getClient`）が提供する `createRecordAsync` / `updateRecordAsync` / `deleteRecordAsync` を使用します。

## ライセンス

MIT

