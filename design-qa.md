# のみログ デザインQA

## 比較条件

- Source visual truth: `/var/folders/5l/zgbzj39519z925v92kd18vv00000gn/T/codex-clipboard-ea182892-12ce-4342-9c50-fe915b82679e.png`
- Supplied logo: `/Users/koukento/Downloads/のみログ_,ロゴ.png`
- Home implementation: `/Users/koukento/nomilog/audit-screenshots/redesign-home-pass2.png`
- Product implementation: `/Users/koukento/nomilog/audit-screenshots/redesign-detail-pass3.png`
- Review implementation: `/Users/koukento/nomilog/audit-screenshots/redesign-review-pass2.png`
- Full-view comparison: `/Users/koukento/nomilog/audit-screenshots/design-comparison-pass3.jpg`
- Focused comparison: `/Users/koukento/nomilog/audit-screenshots/design-comparison-focused-pass3.jpg`
- Viewport: `390 x 844`
- State: ホームはseedレビュー、商品詳細はクラフトゼロコーラ、投稿画面は未入力状態

## 確認結果

### フォントとタイポグラフィ

IBM Plex Sans JP Semiboldを全画面の基準とし、見出し、ナビ、フォームラベルの階層を参考画像へ合わせた。支給済みのフォント指定を優先したため、参考画像のシステムフォントより字面はやや強いが、崩れや不自然な改行はない。

### 余白とレイアウト

ホームはロゴ、検索、カテゴリ、4件の横並びランキング、新着レビューを最初の画面へ配置した。商品詳細は商品画像、評価、味の指標、購入場所、似た商品を同じ順序に揃えた。投稿フォームは44pxのタップ領域を維持しているため参考画像より縦に長いが、横スクロール、要素の重なり、主要操作の欠落はない。

### 色とトークン

背景は`#FFFFFF`、主要操作は`#2A9BE1`、区切り線は`#E5E7EB`へ統一した。カテゴリだけは識別性のため淡い補助色を使い、画面全体を単色にしない構成にしている。グラデーションは使用していない。

### 画像とアセット

ヘッダーは支給ロゴ`public/nomilog-logo.png`を縦横比を保って表示している。商品画像は既存の商品カタログ資産を維持したため、参考画像の実写商品とは異なるが、今回明示されたロゴ差し替えと画面構成には一致している。画像の欠落、引き伸ばし、透明背景の縁取りはない。

### コピーと操作

検索、カテゴリ、ランキング、商品詳細、購入場所、似た商品、レビュー投稿の文言を日本語UIとして揃えた。メニュー開閉、検索への遷移、4点評価、シーン選択、コメント入力、プレビュー、投稿、商品詳細への反映を確認した。ブラウザコンソールエラーは0件だった。

## 比較履歴

### Pass 1

- [P2] ホームのランキング4件目が390px幅で切れていた。
- [P2] 投稿ヘッダーの「プレビュー」が2行に折り返していた。
- [P2] 商品詳細がクライアント同期前に0点と空の購入場所を表示していた。

対応: ランキング項目幅を縮小し、投稿ヘッダーの列幅とnowrapを調整した。レビューhookの初期値へseedレビューを入れ、初回描画から集計値を表示した。

### Pass 2

- Pass 1の3件が解消したことを同一viewportで確認した。
- [P2] 商品詳細の味スコアが連続バーで、参考画像の区画バーと異なっていた。

対応: 味スコアを10区画のバーへ変更した。

### Pass 3

- 区画バー、ホーム4件表示、投稿ヘッダー、初回集計表示を再確認した。
- P0/P1/P2の未対応項目はない。

## 残る差分

- [P3] 投稿フォームは44pxタップ領域を守るため、参考画像より縦スクロール量が多い。
- [P3] 商品画像は既存カタログのイラスト資産であり、参考画像の実写商品写真とは画風が異なる。
- 開発時の画面左下に表示されるNext.js Dev Toolsバッジは本番ビルドには表示されない。

## 実装チェック

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed
- 390px幅の横オーバーフロー: なし
- 固定ボトムナビ: viewport下端に収まる
- 投稿プレビューと投稿反映: passed
- コンソールエラー: 0件

## 独立実装レビュー

別エージェントによる差分レビューではP0/P1はなく、次のP2が3件報告された。

- レビュータブのリンク先と選択状態が一致しない。
- 投稿プレビューダイアログにフォーカス制御、Escape操作、背面の無効化がない。
- 味スコアの区画バーから現在値を読み上げられない。

対応後、レビュー専用ルート`/reviews`と`aria-current="page"`、モーダルの初期フォーカス・Tab循環・Escape終了・inert解除、3本の`progressbar`の現在値をブラウザで再確認した。未対応のレビュー指摘はない。

final result: passed

---

# マイページ ログイン状態QA

## 比較条件

- Source visual truth（ログイン前）: `/var/folders/5l/zgbzj39519z925v92kd18vv00000gn/T/codex-clipboard-55e6bcb6-b811-4581-ba1e-667154a95992.png`
- Source visual truth（ログイン後）: `/var/folders/5l/zgbzj39519z925v92kd18vv00000gn/T/codex-clipboard-c3ad1983-845c-490e-a07a-4c3fa01886d5.png`
- Implementation capture: `/Users/koukento/nomilog/audit-screenshots/mypage-signed-out-reference-pass1.png`
- Viewport: `390 x 844`
- State: WorkOS未ログイン

## 実装内容

- ブランドロゴと中央タイトルのヘッダー、プロフィール導入カード、ログイン・新規登録の2導線を実装した。
- 新規登録は`/sign-up` Route Handlerを追加し、WorkOS AuthKitの`getSignUpUrl`へ安全な`returnTo`を渡す。外部URLは既存の許可リストで拒否する。
- ログイン後はWorkOSの表示名・登録日、自分のレビュー、評価済みドリンク、購入場所、設定一覧を表示する構造へ変更した。
- サーバーはセッションAPIから表示用の登録日だけを返し、アクセストークンやAPIキーをブラウザへ渡さない。

## 比較結果

- ヘッダー、導入カード、ログイン/新規登録の2ボタン、3行の機能説明、商品横スクロール、サポート一覧、固定ナビを参考画像と同じ順序で配置した。
- 背景は白、主要操作と選択状態は`#2A9BE1`、カードは小さな角丸と薄い境界線で統一した。
- 既存の商品イラストを使うため、参考画像の実写パッケージとは画風が異なる。プロフィール人物も画像生成スクリプトが指定パスに存在しなかったため、同じ青系のユーザーアイコンで代替した。
- `scrollWidth = clientWidth = 390`で、横オーバーフローはない。
- ブラウザコンソールエラー: 0件。
- `npm run typecheck`: passed。
- `npm run lint`: passed。
- `npx next build --webpack`: passed。
- 新規登録ルートはWorkOSの`screen_hint=sign-up`を含むURLを返すことを確認した。

## 残る確認

- WorkOSでログイン済みのブラウザセッションがこの検証用ブラウザにないため、右側の参照画像に対応するログイン後状態は実セッションでの視覚確認が必要。

final result: blocked

---

# カタログ限定レビュー QA

## 確認結果

- 中央の投稿ボタン: `/reviews/new` を開き、飲み物は未選択
- 商品詳細からの投稿: `productId`に対応する商品を初期選択
- 飲み物、評価、シーン、購入場所、コメントの入力後: 投稿確認ダイアログを表示
- カタログ外の飲み物: 商品選択が必須のため保存不可
- カタログ商品: 商品IDと商品マスタ由来の名称を保存し、投稿後は該当の商品詳細へ移動
- 390px幅の横オーバーフロー: なし

## 保存設計

`reviews.product_id`を必須とし、Route Handlerが商品マスタの存在確認と商品名の再取得を行う。これにより、クライアントが任意の商品名を送ってもカタログ外レビューや商品IDと表示名の不整合を保存できない。公開前は仮の20品目を管理し、公開時には仮レビュー・いいね・画像を削除した上で、実在商品を新しい商品IDで登録する。仮の商品IDの名称・メーカーだけを実在商品へ差し替えない。

## 削除と制約

- `20260721000000_restrict_reviews_to_catalog.sql`で、既存の未登録レビューと商品追加リクエストを削除する。既存画像がある場合は、SupabaseのStorage APIまたは管理画面で削除する。
- 同マイグレーションで`reviews.product_id`を`NOT NULL`へ戻し、外部キーとあわせてカタログにない飲み物のレビューをDBでも拒否する。
- 公開切替時は`supabase/release/public-launch.sql.template`を投稿停止中に実行し、仮レビュー・いいね・画像を削除してから、新しいIDの実在20品目を登録する。

final result: passed

---

# レビュー投稿画面 再調整QA

## 比較条件

- Source visual truth: `/var/folders/5l/zgbzj39519z925v92kd18vv00000gn/T/codex-clipboard-1051bafc-4b02-4502-a1d6-adf9900cba7b.png`
- Implementation screenshot: in-app Browser capture of `http://127.0.0.1:3007/reviews/new?productId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1`
- Viewport: `390 x 844`（縦スクロールバーを除くコンテンツ幅は375px）
- State: ローカルデモ、投稿前、購入場所は未選択

## 修正内容

- 投稿ヘッダーを68pxの画面幅いっぱいにし、左の戻る操作と中央の`レビューを投稿`を参考画像の構成へ揃えた。投稿プレビューのリンクやダイアログは設けていない。
- 星評価、3つの丸形スケール、3列のシーン、4列2段の購入場所、コメント、破線の写真選択、青い投稿ボタンを同じ順番と視覚的な強弱で再構成した。
- 購入場所は初期選択をなくし、`セブン-イレブン`と`ドラッグストア`も改行・横あふれなしで表示できる先頭列の幅に調整した。
- 投稿ボタンは必須項目を満たした後に`レビューを投稿しますか？`の確認ダイアログを開く。ここでキャンセルまたは投稿の確定を選べる。

## 確認結果

- 390px幅の横オーバーフロー: なし（`scrollWidth = clientWidth = 375`）
- ヘッダー幅: 375px、タイトルはヘッダー中央に配置
- 投稿プレビュー導線: なし
- 4点評価、シーン、購入場所、コメントを入力後の投稿操作: `レビューを投稿しますか？`確認ダイアログを表示
- 確認ダイアログの初期フォーカス: `キャンセル`
- コンソールエラー: 0件
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed

## 独立実装レビュー

初回レビューで、標準フォーム送信による投稿画面からの離脱、購入場所名の重なり、入力欄の読み上げ名称不足が報告された。投稿ボタンを明示的な`type="button"`と確認起動へ変更し、`127.0.0.1`からの開発時HMR接続を許可して実操作を再確認した。購入場所は12px表示とクリップを加え、コメント欄と味の指標には固有のアクセシブルな名称を設定した。

再レビューの結果、未解消の指摘はない。

## 残る差分

- [P3] 参考画像は操作部がより小さいモックアップである。本実装はiOSの44px以上のタップ領域を優先するため、小さな端末では写真追加と投稿ボタンまで縦スクロールする。

final result: passed

---

# レビュー投稿画面 追加QA

## 比較条件

- Source visual truth: `/var/folders/5l/zgbzj39519z925v92kd18vv00000gn/T/codex-clipboard-1051bafc-4b02-4502-a1d6-adf9900cba7b.png`
- Implementation screenshot: `/Users/koukento/nomilog/audit-screenshots/review-form-reference-pass4.png`
- Full-view comparison: `/Users/koukento/nomilog/audit-screenshots/review-form-reference-comparison-pass4.jpg`
- Viewport: `390 x 844`（ブラウザの縦スクロールバーを除くコンテンツ幅は375px）
- State: ローカルデモ、未ログインでない状態、総合評価は未選択

## 比較履歴

### Pass 1

- [P2] 購入場所が3列で、参考画像の4列・8候補と異なっていた。
- [P2] 商品名の補助行と各フィールドの区切り線が多く、フォームの密度が参考画像より重かった。

対応: 商品名の補助行を外し、総合評価と3つの味指標を一つの面へ統合した。シーンを3列、購入場所を4列×2段へ変更し、`ドラッグストア`と`Amazon`を追加した。

### Pass 2

- [P2] 390px幅で`セブン-イレブン`と`ドラッグストア`が折り返した。

対応: 4列構成は保ったまま1列目を広くし、長い店舗名も一行表示へ調整した。

### Independent Review

- [P1] Supabase接続時に未ログインでもフォームを入力できた。
- [P2] 旧localStorageレビューの`セブン`表記が新しい選択肢と一致しない。
- [P2] ホームインジケータ付きiPhoneで投稿ボタン下の余白が不足する。

対応: Supabase接続かつ未ログイン時はフォームを表示せずマイページへ案内する。旧ローカル投稿は読み込み時に`セブン-イレブン`へ移行し、SQLマイグレーションでも既存のリモート行を更新する。投稿画面下端に`env(safe-area-inset-bottom)`を追加した。

## 確認結果

- 横オーバーフロー: なし（`scrollWidth = clientWidth = 375`）
- 4点評価、シーン、Amazonの選択状態: passed
- 投稿フォームのコンソールエラー: 0件
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed（最終修正後に再実行）
- SupabaseローカルDB: この環境ではPostgresが未起動のため`supabase migration list --local`は接続できなかった。マイグレーションファイルは公式CLIで生成済みで、リモート適用前にSupabase環境での実行確認が必要。

## 残る差分

- [P3] 参考画像は横幅の広い端末で全操作を一画面に収めている。本実装はiOSの44px操作領域を優先するため、写真追加と投稿ボタンは小さい端末で縦スクロール後に続く。

final result: passed
