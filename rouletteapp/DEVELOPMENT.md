# rouletteapp — Power Apps Code App 本体

このディレクトリが Power Apps Code App の実体です。React + TypeScript + Vite で構成され、`pac code push` で Power Platform 環境にデプロイされます。

プロジェクト全体の概要・セットアップ手順はリポジトリルートの [README.md](../README.md) を参照してください。

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
