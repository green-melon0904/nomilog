# WorkOS AuthKit Setup

のみログでは、WorkOS AuthKitのMagic Authを6桁メールコード認証として使い、SupabaseにはWorkOSのJWTだけを渡します。WorkOSのAPIキーやセッショントークンをブラウザへ保存しません。

## 1. WorkOSの設定

1. 左メニューの`Applications`を開き、最初からある`Default application`を選ぶ（なければAuthKitのアプリケーションを作成する）。
2. アプリの`Redirects`へ次を登録する。
   - Redirect URI: `http://127.0.0.1:3008/auth/callback`
3. 左メニューの`Authentication`で`Magic Auth`を有効にする。
4. 本番URLを使うときは、アプリの`Redirects`へ`https://<本番ドメイン>/auth/callback`を追加する。
5. 左メニューの`Authentication`を開き、`Features`内の`JWT Template`で、JWTのrole claimを次の内容にする。

```json
{
  "role": "authenticated"
}
```

`role`はSupabaseがPostgresの`authenticated`ロールを選ぶために必要です。アプリの権限判定には使わず、各行の所有者はJWTの`sub`で照合します。

## 2. 環境変数

`.env.local`に、同じWorkOS環境かつ同じApplicationの値を設定します。`WORKOS_CLIENT_ID`はRedirect URIを登録したApplicationのCredentialsからコピーし、`WORKOS_API_KEY`は同じStagingまたはProduction環境で作成します。`WORKOS_COOKIE_PASSWORD`には32文字以上のランダム文字列を使います。

```env
WORKOS_CLIENT_ID=client_...
WORKOS_API_KEY=sk_...
WORKOS_COOKIE_PASSWORD=32文字以上のランダム値
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://127.0.0.1:3008/auth/callback
```

## 3. Supabase Third-Party Auth

Supabase Dashboardの`Authentication`設定にある`Third-Party Auth`から、WorkOS integrationを追加します。この連携はWorkOSのIssuerだけを登録する方式です。`Sign In / Providers`にあるWorkOS OAuth設定（Client IDとSecret Keyを入力する画面）は別の認証方式なので、有効化しません。Issuerには次を入力します。

```text
https://api.workos.com/user_management/<WORKOS_CLIENT_ID>
```

## 4. RLS migration

この移行はすでにSupabaseプロジェクトへ適用済みのため、追加作業は不要です。WorkOSのユーザーIDはUUIDではないため、このmigrationが`auth.uid()`ではなく検証済みJWTの`sub`をRLSで参照するよう変更しています。

## 5. 動作確認

1. マイページの「メールコードでログイン」を押す。
2. WorkOSの画面でメールアドレスと6桁コードを入力する。
3. `/mypage`または投稿開始時の`/reviews/new`へ戻ることを確認する。
4. ログアウト後、投稿APIが401となり保存できないことを確認する。
