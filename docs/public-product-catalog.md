# 公開用商品一覧

テック甲子園への応募・一般公開時に、のみログへ登録する初期商品です。
酒類は含めず、メーカー公式の商品情報で現行商品であることを確認した飲料から選定しています。

## 必要な商品

| No. | 商品名 | メーカー | カテゴリ | 撮影容量 | JANコード | 画像ファイル名 | 公式情報 |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | ウィルキンソン タンサン ダブルグレープ | アサヒ飲料 | 炭酸 | PET 500ml | `4514603470710` | `wilkinson-double-grape` | [JANコード一覧](https://www.asahiinryo.co.jp/products/list/jan/0002.html) |
| 2 | ウィルキンソン タンサン レモン | アサヒ飲料 | 炭酸 | PET 500ml | `4514603347418` | `wilkinson-lemon` | [ブランド商品情報](https://www.asahiinryo.co.jp/products/wilkinson/) |
| 3 | 三ツ矢サイダー | アサヒ飲料 | 炭酸 | PET 500ml | `4514603263213` | `mitsuya-cider` | [商品情報](https://www.asahiinryo.co.jp/products/carbonated/mitsuya_cider/index.html) |
| 4 | お～いお茶 緑茶 | 伊藤園 | お茶 | PET 600ml | `4901085003800` | `oi-ocha-green` | [商品情報](https://www.itoen.jp/products/45534/) |
| 5 | キリン 午後の紅茶 おいしい無糖 香るレモン | キリンビバレッジ | お茶 | PET 500ml | `4909411088477` | `gogo-tea-unsweetened-lemon` | [商品情報](https://products.kirin.co.jp/softdrink/softdrink/detail.html?id=8219) |
| 6 | 緑茶 伊右衛門 | サントリー食品インターナショナル | お茶 | PET 600ml | `4901777300446` | `iyemon-green` | [商品情報](https://products.suntory.co.jp/d/4901777300446/) |
| 7 | クラフトボス ブラック | サントリー食品インターナショナル | コーヒー | PET 500ml | `4901777382718` | `craft-boss-black` | [商品情報](https://products.suntory.co.jp/d/4901777382718/) |
| 8 | TULLY’S COFFEE BARISTA’S BLACK キリマンジャロ | 伊藤園 | コーヒー | ボトル缶 285ml | `4901085647202` | `tullys-black-kilimanjaro` | [商品情報](https://www.itoen.jp/products/41624/) |
| 9 | ポカリスエット | 大塚製薬 | その他 | PET 500ml | `45019517` | `pocari-sweat` | [商品情報](https://www.otsuka.co.jp/nutraceutical/products/pocarisweat/) |
| 10 | カルピスウォーター | アサヒ飲料 | その他 | PET 500ml | `4901340689213` | `calpis-water` | [商品情報](https://www.asahiinryo.co.jp/products/milkybeverage/calpis_water/) |

商品名、メーカー、容量、JANコードは2026年8月29日に各メーカー公式ページで確認しました。パッケージ変更時はJANコードと撮影画像を再確認し、この日付も更新します。

容量は撮影するパッケージを揃えるための目安です。のみログ上では、同じ味の商品を容量別に分割せず、一つの商品としてレビューを集約します。

## 画像の準備

- 元画像は `/Users/koukento/nomilog-source-images` に保存する。
- 拡張子は `.jpg`、`.jpeg`、`.png`、`.heic` のいずれでもよい。
- 上の表にある画像ファイル名を使用し、拡張子だけを追加する。
- 背景を透過した正面画像を使い、ラベルと容器全体が切れないようにする。
- 人物、レシート、店舗名、住所など、公開する必要のない情報を写さない。
- 元画像はGitへ直接追加しない。公開前にWebPへ変換し、位置情報などのメタデータを削除する。

## 登録前チェック

- [x] 10商品すべての画像が揃っている
- [x] 商品名とパッケージが一致している
- [x] 画像に個人情報や位置情報が残っていない
- [x] 画像をWebPへ変換して表示を確認した
- [x] 仮データをバックアップした
- [x] 公開切替SQLをレビューした
- [x] 公開後に商品件数、レビュー件数、RLSを確認した
