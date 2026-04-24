# Power Apps Code Apps 仕様書

## 1. 目的・背景
- 背景: 雑談・アイスブレイク時のトークテーマ決定を簡単にしたい
- 解決したい課題: テーマ決定の属人化・迷いを排除し、すぐに会話を開始できるようにする
- 期待する効果: トーク開始までの時間短縮、場の活性化

## 2. スコープ
- 対象ユーザー: イベント運営者（実行者・テーマ管理者）
- 対象業務・対象範囲: トークテーマ抽選・表示・テーマ管理（追加・編集・削除）
- 対象外: 重複排除、履歴管理

## 3. 成功基準（KPI）
- 成功指標: KPIは設定しない
- 受入れ条件:
	- Dataverse カスタムテーブルの主列（new_name）からテーマを取得できる
	- 抽選中にサイコロ演出と BGM が再生される
	- 結果がサイコロ天面にポップなデザインで表示される
	- アプリ上からテーマの追加・編集・削除が Dataverse に反映される

## 4. 前提・制約
- 対応プラットフォーム: Power Apps Code Apps（React + TypeScript + Vite）
- 対応ブラウザ: Microsoft Edge

## 5. 画面仕様
### 5.1 画面一覧
| 画面ID | 画面名 | 目的 | 対象ユーザー | 備考 |
|---|---|---|---|---|
| SCR-001 | ルーレット（サイコロ） | テーマ抽選・結果表示・テーマ管理 | イベント運営者 | 抽選演出・BGM・テーマ編集モーダルあり |

### 5.2 画面詳細（SCR-001）
- 目的: Dataverse のトークテーマをランダム抽選して表示。テーマのインライン管理も行う
- UIコンポーネント:
	- 3D サイコロアニメーション（6面それぞれにテーマを表示）
	- 抽選結果テキスト
	- 抽選開始ボタン（`Start roll`）
	- 6テーマ再選定ボタン
	- **テーマ編集ボタン**（モーダルを開く）
	- BGM ON/OFF トグル
	- 抽選時間スライダー（3〜10 秒）
	- カウントダウン表示
	- **テーマ編集モーダル**（追加・編集・削除・保存・キャンセル）
- バリデーション:
	- Dataverse 未接続時はフォールバックテーマ（定数）で動作
	- テーマが 6 件未満の場合は「フリー」で補完
	- 権限不足時は保存エラーをモーダル内に表示
- 画面遷移: 単一画面

## 6. 機能要件
| 機能ID | 機能名 | 概要 | 優先度 | 実装状況 |
|---|---|---|---|---|
| F-001 | テーマ取得 | Dataverse `new_talkthemes` の `new_name` 列を取得 | High | ✅ 実装済み |
| F-002 | ランダム抽選 | 取得テーマからランダムに 6 件選びサイコロ面に割り当て | High | ✅ 実装済み |
| F-003 | 抽選演出 | 3〜10 秒間（可変）3D サイコロアニメーション | High | ✅ 実装済み |
| F-004 | BGM 再生 | 抽選中に mp3 を Web Audio API で再生（ループ） | Medium | ✅ 実装済み |
| F-005 | 結果表示 | サイコロ天面にポップなデザインで抽選テーマを表示 | High | ✅ 実装済み |
| F-006 | 6テーマ再選定 | Dataverse 取得済みテーマから別の 6 件をランダム選定 | Low | ✅ 実装済み |
| F-007 | テーマ編集 | アプリ上からテーマの追加・編集・削除を行い Dataverse に保存 | Medium | ✅ 実装済み |

## 7. 非機能要件
- 性能: 抽選時間は 3〜10 秒（ユーザーが設定可）
- セキュリティ: Dataverse 接続は組織認証（Entra）、Dataverse native 経路（databaseReferences）を使用
- BGM: Power Apps iframe の CSP 制限を回避するため、mp3 を base64 埋め込みして Web Audio API で再生

## 8. データ要件
- データソース: Dataverse（native 接続、connectionReferences 不使用）
- テーブルスキーマ名: `new_talktheme`
- Entity Set 名（API）: `new_talkthemes`
- 操作列: `new_name`（主列、1 行テキスト）、`new_talkthemeid`（主キー）
- CRUD: **Create / Read / Update / Delete（全操作）**
- 権限:
  - 閲覧・抽選ユーザー: `new_talktheme` への Read 権限
  - テーマ管理者: `new_talktheme` への Create / Read / Write / Delete 権限

## 9. 権限設計

### アプリを実行できるユーザー
| 条件 | 詳細 |
|---|---|
| Power Apps ライセンス | per user / per app、または Microsoft 365 付属ライセンス |
| アプリ共有 | make.powerapps.com でアプリを対象ユーザー／グループに共有 |
| Dataverse セキュリティロール | `new_talktheme` への Read 権限を含むロールが割り当て済み |

### テーマを追加・編集・削除できるユーザー
| 操作 | 必要な Dataverse テーブル権限 |
|---|---|
| テーマ追加 | `new_talktheme` への **Create** |
| テーマ編集 | `new_talktheme` への **Write** |
| テーマ削除 | `new_talktheme` への **Delete** |

> システム管理者ロールまたはカスタマイズ担当者ロールは上記を全て含みます。

### ソリューションインポート後の追加設定
1. **セキュリティロールの設定**: 閲覧者ロール（Read のみ）とテーマ管理者ロール（CRUD）をカスタム作成し、対象ユーザーに割り当て
2. **アプリの共有**: make.powerapps.com → アプリ → 共有 でユーザー・グループを追加（セキュリティロールも同時付与）
3. **テーマデータの初期登録**: アプリの「テーマ編集」ボタンから追加、または make.powerapps.com の テーブル → データを編集 から登録

## 10. 連携要件
- 接続方式: Dataverse `databaseReferences`（native executor）
- 認証: Microsoft Entra（組織アカウント）
- 連携タイミング: アプリ起動時（`getContext()` 解決後）に 1 回取得。テーマ保存後に再取得

## 11. デプロイ/運用
- ビルド: `npm run build && pac code push`
- マネージドソリューション: `pac solution export --name RouletteApp --path ./solution/RouletteApp_managed.zip --managed --overwrite`
- ロールバック: 直前ビルドの再デプロイ

### ソースからデプロイする場合の Dataverse セットアップ
1. **テーブル作成**: make.powerapps.com → Dataverse → テーブル → 新しいテーブル を作成（スキーマ名 `new_talktheme`、主列スキーマ名 `new_name` であることを確認）
2. **接続設定**: `power.config.json` の `instanceUrl` に Dataverse 組織 URL（`https://<org>.crm.dynamics.com/`）を設定
3. 詳細手順は [rouletteapp/DEVELOPMENT.md](../rouletteapp/DEVELOPMENT.md) を参照

