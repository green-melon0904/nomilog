# のみログ

のみログは、自販機やコンビニで買える飲み物を、味・価格・飲む場面から探してレビューできるモバイルWebアプリです。
「次に何を飲むか」を、広告や知名度だけではなく、実際に飲んだ人の感想から選べる体験を目指しています。

- 公開URL: <https://nomilog-eight.vercel.app>
- 応募形態: テック甲子園2026 プロダクト部門・個人応募
- 開発状況: 公開用の商品写真と本番データへの切り替え準備中

## 主な機能

- 商品名・メーカー・カテゴリからの飲料検索
- 総合評価、甘さ、炭酸、コストパフォーマンス、場面、購入場所を含むレビュー投稿
- 評価平均とレビューへのいいねを使ったランキング
- お気に入り、投稿履歴、プロフィール、通知設定の管理
- WorkOS AuthKitのメールコードによる新規登録・ログイン
- レビュー通報、非公開化、復元、問い合わせ対応を行う運営画面
- アカウントと関連データの削除

## 技術構成

| 領域 | 採用技術 |
| --- | --- |
| Web | Next.js 16 App Router、React 19、TypeScript |
| UI | Tailwind CSS 4、Lucide React |
| 認証 | WorkOS AuthKit（Magic Auth） |
| Database / Storage | Supabase Postgres、Row Level Security、Supabase Storage |
| Hosting | Vercel |
| Test | Node.js test runner、TypeScript、ESLint、Next.js production build |

認証セッションはWorkOSのHttpOnly Cookieで管理し、SupabaseにはWorkOSが発行したJWTを渡します。ブラウザへ公開するのはSupabaseのPublishable keyだけで、Secret keyとWorkOS API keyはサーバー環境変数に限定しています。

## ローカル起動

### 必要なもの

- Node.js 24.x
- npm
- Supabaseプロジェクト
- WorkOS AuthKitアプリケーション

### セットアップ

```bash
git clone https://github.com/green-melon0904/nomilog.git
cd nomilog
npm ci
cp .env.example .env.local
```

`.env.local`へ下記の環境変数を設定します。値そのものはGitへ追加しません。

| 変数 | 公開範囲 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser | Supabase Publishable keyまたはlegacy anon key |
| `SUPABASE_SECRET_KEY` | Server only | お問い合わせ保存と公開切替バックアップ用のSupabase Secret key |
| `WORKOS_CLIENT_ID` | Server | WorkOS Application Client ID |
| `WORKOS_API_KEY` | Server only | WorkOS API key |
| `WORKOS_COOKIE_PASSWORD` | Server only | AuthKit Cookie暗号化用のランダム値 |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | Browser | 認証後のCallback URL |
| `NOMILOG_WRITE_MAINTENANCE` | Server | 公開切替時だけ書き込みを停止するフラグ |

WorkOSとSupabaseの連携は[WORKOS_SETUP.md](./WORKOS_SETUP.md)を参照してください。Supabaseへ新規構築する場合は、`supabase/migrations`をファイル名順に適用します。

WorkOSのローカルCallback設定に合わせ、ポート`3008`で起動します。

```bash
npm run dev -- -p 3008
```

ブラウザで <http://127.0.0.1:3008> を開きます。

## 検証

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

公開切替のバックアップと検証は、通常開発では実行しません。実行条件と停止・復元手順は[公開商品への切替手順](./docs/public-launch-runbook.md)に記載しています。

## セキュリティと運用

- 公開テーブルはRLSで所有者または運営者の操作範囲を制限しています。
- レビュー投稿、いいね、通報、お問い合わせにはサーバー側の入力制限とレート制限があります。
- レビュー画像は形式、容量、寸法、画素数をクライアントとサーバーの両方で検証します。
- 秘密値、バックアップ、利用者の個人情報はリポジトリへ保存しません。
- 障害時の停止、ログ確認、ロールバック、保存期間に基づく削除は[本番運用ガイド](./docs/production-operations.md)に従います。

## 生成AIの利用

開発補助としてOpenAI Codexを利用しています。主な利用範囲は、実装案の検討、コード作成、テスト、セキュリティレビュー、運用文書の整理です。課題設定、機能の優先順位、UIの方向性、商品方針、公開判断は開発者本人が行い、生成された内容は差分と動作を確認してから採用・修正しています。

## 関連文書

- [テック甲子園2026 本番公開チェックリスト](./docs/tech-koshien-2026-production-readiness.md)
- [公開商品一覧と撮影チェック](./docs/public-product-catalog.md)
- [公開商品への切替手順](./docs/public-launch-runbook.md)
- [本番運用ガイド](./docs/production-operations.md)
- [テック甲子園2026 提出内容ドラフト](./docs/tech-koshien-2026-submission-draft.md)
