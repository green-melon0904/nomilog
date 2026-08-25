# のみログ 本番運用ガイド

最終更新: 2026-08-25

公開後の確認、障害対応、管理者権限、保存期間に基づく削除を一か所で確認するための手順です。秘密値、利用者のメールアドレス、WorkOS User IDはこの文書や日記へ記録しません。

## 役割と連絡先

- 復旧担当: のみログ運営（個人開発）
- 公開連絡先: `melongreen0904@gmail.com`
- 障害を確認した人が、書き込み停止、状況確認、復旧、事後記録まで担当する

一人での運営中は、原因調査より先に利用者への影響を止めます。判断に迷う場合は新規書き込みだけを停止し、匿名で閲覧できるホーム、検索、商品詳細、レビュー一覧は維持します。

## 毎日の公開確認

応募完了までは1日1回、次を確認して`diary/YYYY-MM-DD_diary.md`へ結果だけを残します。ユーザーID、メールアドレス、問い合わせ本文は記録しません。

- [ ] 公開URLのホームが表示される
- [ ] 検索から商品詳細を開ける
- [ ] ログイン入口がWorkOS ProductionのHosted UIへ遷移する
- [ ] ログアウト状態の`POST /api/reviews`が`401`を返す
- [ ] VercelでFunctionの5xx増加がない
- [ ] SupabaseでAPI、Postgres、Auth、Storageの異常ログがない
- [ ] WorkOSで認証エラーや急な利用増加がない
- [ ] 通報と問い合わせに未対応のものがない

## 無料枠とログの確認場所

数値はサービス側で変更されるため、この文書へ上限値を固定せずDashboardの当日表示を正本にします。

| サービス | 確認場所 | 確認内容 |
| --- | --- | --- |
| Vercel | Projectの`Usage`、`Observability`、`Deployments` | Function実行、転送量、5xx、直近デプロイ |
| Supabase | Organizationの`Usage`、Projectの`Logs`、`Database`、`Storage` | DB容量、Storage容量、API/Auth/DB/Storageエラー |
| WorkOS | Dashboardの`Billing`、`Users`、`Events` | 認証利用、メール送信、失敗イベント |

Supabase Freeは自動バックアップを前提にできないため、公開切替前は`npm run release:backup`でDBとStorageをリポジトリ外へ保存します。SupabaseのDatabase backupだけではStorageの実体を復元できないため、画像も同じバックアップへ含めます。

公式資料:

- <https://vercel.com/docs/plans/hobby>
- <https://vercel.com/docs/observability>
- <https://supabase.com/docs/guides/platform/backups>
- <https://supabase.com/docs/guides/monitoring-and-debugging/logs>
- <https://workos.com/docs/dashboard>
- <https://workos.com/docs/authkit/sessions>

## 新規書き込みだけを停止する

荒らし、誤データ、DB変更作業、保存先の障害を確認した場合に使用します。

1. VercelのProduction環境変数へ`NOMILOG_WRITE_MAINTENANCE=1`を設定する。
2. Productionを再デプロイする。
3. ログアウト状態で`POST /api/reviews`がメンテナンス用の`503`になることを確認する。
4. ホーム、検索、商品詳細、レビュー一覧が引き続き表示されることを確認する。
5. DBへ直接届く書き込みも止める必要がある場合は、[公開商品への切替手順](./public-launch-runbook.md)の書き込み停止SQLを実行する。

復旧後は環境変数を削除して再デプロイし、ログアウト状態の投稿APIが通常の`401`へ戻ることを確認します。DB側も停止した場合は、同手順の中止・再開条件に従います。

## 障害対応

### 1. 影響を止める

- 読み取りが正常なら、上記手順で書き込みだけを停止する。
- 個人情報や秘密値の漏えいが疑われる場合は、該当キーを失効してから新しいキーを発行する。
- 管理者アカウントの不正利用が疑われる場合は、次の「管理者権限を解除する」を先に行う。

### 2. 状況を記録する

日記へ発生時刻、影響した機能、直前のGit commit、直前のDeployment、実施した停止操作を記録します。ログ本文や個人情報は転記しません。

### 3. ログを確認する

- Vercel: `Observability`で5xxと該当Routeを絞り、対象DeploymentのBuild LogsとRuntime Logsを確認する。
- Supabase: `Logs`でAPI、Postgres、Auth、Storageを切り替え、同じ時刻のエラーを確認する。
- WorkOS: `Events`で認証失敗を確認し、アプリ側のCookieやアクセストークンをログへ出さない。

### 4. アプリをロールバックする

Vercel Hobbyでは、Productionを直前のProduction DeploymentへInstant Rollbackできます。

1. Vercelの`Deployments`で`main`を絞り、直前の正常なProductionとGit commitを確認する。
2. 現在のProductionのメニューから`Instant Rollback`を実行する。
3. ホーム、検索、ログイン、投稿APIを確認する。
4. ロールバック後はProductionの自動割り当て状態と環境変数を確認する。環境変数だけを戻す機能ではないため、認証先やメンテナンスフラグを再確認する。
5. 原因修正をPreviewで検証し、正常なDeploymentをProductionへ昇格する。

DB変更はVercelのロールバックでは戻りません。公開切替時のDB障害は、`/Users/koukento/nomilog-release-backups`の外部バックアップとDB内スナップショットを保持し、復元SQLをレビューしてから実行します。

公式資料: <https://vercel.com/docs/deployments/rollback-production-deployment>

## 管理者権限を解除する

1. WorkOS Dashboardの`Users`から対象ユーザーを開き、`Sessions`で有効なセッションを失効する。
2. Supabase SQL Editorで次を実行する。値はWorkOS Dashboardで確認し、日記へ残さない。

```sql
delete from public.app_admins where user_id = 'user_...';
```

3. `select`で対象行が0件であることを確認する。
4. 対象ユーザーが運営画面を再読込して`403`になることを確認する。
5. API key漏えいも疑われる場合はWorkOS API keyとCookie passwordをローテーションし、Vercelを再デプロイする。

WorkOSのアクセストークンが有効な間も、運営APIは操作ごとに`app_admins`を確認するため、DB行の削除を権限解除の必須手順とします。

## 保存期間を過ぎた運営データを削除する

プライバシーポリシーの保存期間に合わせ、対応完了から1年を過ぎた通報と問い合わせを月1回確認します。

1. Supabase SQL Editorで`supabase/operations/purge-expired-moderation-data.sql.template`を開く。
2. 最初の件数確認だけを実行し、削除対象が`pending`、`new`、`read`を含まないことを確認する。
3. 公開データの外部バックアップが完了していることを確認する。
4. 確認語を置き換え、トランザクション全体を一度だけ実行する。
5. 返された削除件数と実施日だけを日記へ記録する。

自動Cronにはせず、応募期間中は管理者が対象件数を読んでから実行します。削除条件の変更はSQLレビューとProduction前検証を必要とします。

## 復旧完了の条件

- [ ] 公開画面と認証入口が正常である
- [ ] 投稿APIの応答が想定どおりである
- [ ] Vercel、Supabase、WorkOSで新しい異常ログが増えていない
- [ ] 一時停止した書き込みを意図どおり再開または継続停止している
- [ ] ロールバックまたは修正後のGit commitとDeploymentを日記へ記録した
- [ ] 個人情報や秘密値を日記、GitHub、スクリーンショットへ残していない
