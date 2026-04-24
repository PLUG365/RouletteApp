# rouletteapp — Power Apps Code App 本体

このディレクトリが Power Apps Code App の実体です。React + TypeScript + Vite で構成され、`pac powerapps code push` で Power Platform 環境にデプロイされます。

プロジェクト全体の概要・セットアップ手順はリポジトリルートの [README.md](../README.md) を参照してください。

## ディレクトリ構成

```
rouletteapp/
├── src/
│   ├── App.tsx                         # メインコンポーネント（ルーレットロジック・UI）
│   ├── App.css                         # スタイル（ダークテーマ・3D アニメーション）
│   ├── main.tsx                        # エントリポイント
│   ├── assets/                         # 静的アセット（BGM など）
│   └── generated/                      # pac CLI 自動生成コード（手動編集禁止）
│       ├── models/
│       │   └── TalkThemesModel.ts      # SharePoint リストの型定義
│       └── services/
│           └── TalkThemesService.ts    # SharePoint CRUD サービス
├── .power/
│   └── schemas/
│       ├── sharepointonline/
│       │   └── talkthemes.Schema.json  # SharePoint リストスキーマ（pac 自動生成）
│       └── appschemas/
│           └── dataSourcesInfo.ts      # データソースメタデータ（pac 自動生成）
├── power.config.json                   # 接続設定（.gitignore 対象 — テンプレートから作成）
├── power.config.template.json          # 接続設定テンプレート
└── vite.config.ts                      # Vite ビルド設定
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

`src/generated/` と `.power/schemas/` 以下のファイルは pac CLI が自動生成します。手動編集は非推奨です。SharePoint リストの接続を変更した場合、これらのファイルは自動的に上書きされます。

## 依存パッケージ

| パッケージ | 用途 |
|---|---|
| `@microsoft/power-apps` | Power Apps SDK（SharePoint 接続・認証） |
| `react` / `react-dom` | UI フレームワーク |
| `vite` | ビルドツール |
