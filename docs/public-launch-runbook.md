# 公開商品への切替手順

仮商品・仮レビューを、テック甲子園向けの実在商品10件へ切り替えるための運用手順です。
通常のマイグレーションではなく、公開直前に一度だけ実行します。

## 実行条件

- [x] `docs/public-product-catalog.md`の10商品と撮影画像が一致している
- [x] 10画像が`public/products/real/*.webp`にあり、位置情報などのメタデータを削除済み
- [x] `main`のビルド、Vercel Productionのデプロイ、10画像の直接表示が成功している
- [x] Supabase Dashboardへ管理者としてアクセスできる
- [x] `.env.local`の`SUPABASE_SECRET_KEY`が実行時に有効なSecret keyである
- [x] 公開切替中に別の開発作業やDB変更を行っていない

## 1. アプリの書き込みを停止

Vercelの`Production`環境変数へ`NOMILOG_WRITE_MAINTENANCE=1`を設定し、Productionを再デプロイします。
デプロイ後、次のリクエストが`503`になることを確認します。公開画面の閲覧は止まりません。

```bash
curl -i -X POST https://nomilog-eight.vercel.app/api/reviews
```

次に`supabase/release/public-launch-pause-writes.sql.template`をSupabase SQL Editorへ貼り付け、
`REPLACE_WITH_CONFIRMATION`を`PUBLIC_LAUNCH_2026_WRITE_PAUSE_CONFIRMED`へ置き換えて一度だけ実行します。
このSQLは既存JWTからのDB書き込みと、`review-images`・`profile-images`への作成・更新・削除も停止します。

アプリとDBの二段階で止める理由は、Vercelのデプロイ反映待ちやSupabaseへ直接アクセスするリクエストによって、バックアップ後にデータが増えることを防ぐためです。

## 2. 外部バックアップ

プロジェクト直下で次を実行します。

```bash
npm run release:backup
```

バックアップはリポジトリ外の`/Users/koukento/nomilog-release-backups`へ作成されます。
出力先に`BACKUP_INCOMPLETE`がなく、`manifest.json`にテーブル件数、`review-images`、`profile-images`の件数が記録されていることを確認します。バックアップにはユーザーID、レビュー内容、問い合わせ、管理者登録が含まれるため、GitHubやクラウド共有フォルダへ追加しません。

## 3. レビュー画像を空にする

`manifest.json`の`storage["review-images"].count`が0件より多い場合だけ、Supabase Dashboardの`Storage > review-images`から全ファイルを削除します。SQLで`storage.objects`を削除すると実体が残るため、必ずDashboardまたはStorage APIを使います。プロフィール画像は削除しません。

削除前に、`storage/review-images`以下へ同じ件数の画像が保存され、`manifest.json`にSHA-256が記録されていることを確認します。

## 4. 公開切替SQL

1. `supabase/release/public-launch.sql.template`を開く。
2. SQL全体をSupabase SQL Editorの新しいクエリへ貼り付ける。
3. `REPLACE_WITH_CONFIRMATION`を`PUBLIC_LAUNCH_2026_BACKUP_CONFIRMED`へ置き換える。
4. SQL Editorで全体を一度だけ実行する。

SQLは関連テーブルをロックし、`private.public_launch_2026_*`へ実行直前のDBスナップショットを作成します。想定外の商品、書き込み停止漏れ、残存レビュー画像、二重実行、登録件数の不一致を検出した場合は、変更をコミットせず停止します。削除と更新は既知の仮商品20件だけへ限定されます。

エラーが出た場合は再実行せず、エラー文、公開画面、バックアップの有無を確認します。切替を中止する場合は「書き込み停止を解除する」の中止手順を実行します。確認語を入れたSQLをファイルへ保存したりコミットしたりしません。

## 5. 自動検証

SQLが成功したら次を実行します。

```bash
npm run release:verify -- --site-url=https://nomilog-eight.vercel.app
```

次の条件をすべて自動確認します。

- レビュー可能な商品が指定の10件だけである
- 商品名、メーカー、カテゴリ、画像パスが正本と一致する
- レビュー、いいね、通報、通知、商品リクエスト、お気に入り、デモプロフィールが0件である
- `review-images`が空である
- ローカル画像が有効なWebPである
- Vercel Productionの画像内容が、ローカルWebPとSHA-256で一致する

## 6. 書き込み停止を解除する

公開切替SQLが成功した場合、Supabase側の必要最小限の書き込み権限と`review-images`ポリシーはSQL内で復元済みです。自動検証が成功してからVercelの`NOMILOG_WRITE_MAINTENANCE`を削除し、Productionを再デプロイします。`POST /api/reviews`がメンテナンス用`503`ではなく通常の認証エラーへ戻ることを確認します。

公開切替SQLを実行する前、またはSQLがエラーでロールバックされた後に作業を中止する場合は、`supabase/release/public-launch-resume-writes.sql.template`の`REPLACE_WITH_CONFIRMATION`を`PUBLIC_LAUNCH_2026_WRITE_RESUME_CONFIRMED`へ置き換えて実行します。その後、Vercelの環境変数を削除して再デプロイします。

公開切替SQLが成功した後は、再開SQLを重ねて実行しません。

## 7. 画面確認

- [x] ホームの「気になる一本」に公開商品だけが表示される
- [x] 検索で商品名とメーカー名を検索できる
- [x] 商品詳細で画像、商品名、カテゴリが正しい
- [x] ログインユーザーがレビューを1件投稿できる
- [x] 投稿後に商品詳細の平均評価とレビュー件数へ反映される
- [ ] 投稿後にランキングと最新レビューへ反映される
- [x] 別ユーザーがレビューへいいねできる
- [x] 管理者が通報、非公開化、復元、対応完了を一巡できる
- [x] スモーク用アカウント削除と関連データの連鎖削除が成功する
- [ ] iPhone Safariで横スクロール、固定ナビ、入力欄、画像表示に問題がない

スモークテストで作成したレビューは、表示確認用の実レビューとして残すか、管理画面から削除して公開開始時の状態を明確にします。

## 2026年8月29日の実行記録

- VercelとSupabaseの二段階で書き込みを停止し、投稿APIがメンテナンス用HTTP 503を返すことを確認した。
- リポジトリ外の`/Users/koukento/nomilog-release-backups/2026-08-28T16-39-47-798Z`へ、12テーブルとStorage 2バケットの外部バックアップを作成した。`BACKUP_INCOMPLETE`はなく、バックアップ先はディレクトリ`700`・ファイル`600`である。
- 公開切替SQLを一度だけ実行し、仮商品20件を非公開化、仮レビュー6件と関連する仮データを削除、公開用10商品を登録した。
- `release:verify`で公開商品10件、仮レビュー0件、仮データ0件、Storage 0件、ローカル画像とProduction画像のSHA-256一致を確認した。
- Vercelのメンテナンス変数を削除して再デプロイし、投稿APIが通常の未ログインHTTP 401へ戻ることを確認した。
- 作業中だけ`.env.local`へ置いたSecret keyは、検証後に削除した。秘密値はログ、文書、Gitへ残していない。
- 管理された投稿者でレビューを投稿し、商品詳細の平均4.0・レビュー1件への反映を確認した。別ユーザーでいいねと通報を行い、一時管理者で非公開化、復元、対応完了を確認した。
- スモーク用アカウント削除では、Storageの一覧RLS不足と、管理者削除時の監査列更新が権限判定に拒否される問題を検出した。本人の`object.list`だけを許可し、管理者権限が有効なうちに監査列の個人識別子を外す修正後、Production APIがHTTP 200で成功した。
- 新規作成したスモーク用WorkOSユーザー、プロフィール、一時管理者権限、いいね、通報、通知を削除した。最後に検証レビュー1件を削除し、レビュー、関連データ、問い合わせ、商品申請、お気に入り、レビュー画像が0件、対象商品のレビュー件数と平均評価が0へ戻ったことを確認した。

## 復元が必要な場合

公開切替SQLを逆順に戻すだけでは、トリガーや外部キーによって復元順序が変わります。自己判断で`private.public_launch_2026_*`を`INSERT`せず、外部バックアップとDB内スナップショットの両方を保持したまま復元SQLを作成してレビューします。
