/**
 * 公開切替で登録する10商品の機械可読な正本。
 *
 * DB検証と画像検証で同じID・表記・ファイル名を使い、手作業による転記ずれを防ぐ。
 * SQLはSupabase SQL Editorでも単独実行できる必要があるため値を重複して持つが、変更時は
 * `supabase/release/public-launch.sql.template`と`docs/public-product-catalog.md`も同時に更新する。
 */
export const publicCatalog = Object.freeze([
  {
    id: "b0000000-0000-4000-8000-000000000001",
    name: "ウィルキンソン タンサン ダブルグレープ",
    maker: "アサヒ飲料",
    categoryId: "11111111-1111-4111-8111-111111111111",
    imageUrl: "/products/real/wilkinson-double-grape.webp"
  },
  {
    id: "b0000000-0000-4000-8000-000000000002",
    name: "ウィルキンソン タンサン レモン",
    maker: "アサヒ飲料",
    categoryId: "11111111-1111-4111-8111-111111111111",
    imageUrl: "/products/real/wilkinson-lemon.webp"
  },
  {
    id: "b0000000-0000-4000-8000-000000000003",
    name: "三ツ矢サイダー",
    maker: "アサヒ飲料",
    categoryId: "11111111-1111-4111-8111-111111111111",
    imageUrl: "/products/real/mitsuya-cider.webp"
  },
  {
    id: "b0000000-0000-4000-8000-000000000004",
    name: "お～いお茶 緑茶",
    maker: "伊藤園",
    categoryId: "22222222-2222-4222-8222-222222222222",
    imageUrl: "/products/real/oi-ocha-green.webp"
  },
  {
    id: "b0000000-0000-4000-8000-000000000005",
    name: "キリン 午後の紅茶 おいしい無糖 香るレモン",
    maker: "キリンビバレッジ",
    categoryId: "22222222-2222-4222-8222-222222222222",
    imageUrl: "/products/real/gogo-tea-unsweetened-lemon.webp"
  },
  {
    id: "b0000000-0000-4000-8000-000000000006",
    name: "緑茶 伊右衛門",
    maker: "サントリー食品インターナショナル",
    categoryId: "22222222-2222-4222-8222-222222222222",
    imageUrl: "/products/real/iyemon-green.webp"
  },
  {
    id: "b0000000-0000-4000-8000-000000000007",
    name: "クラフトボス ブラック",
    maker: "サントリー食品インターナショナル",
    categoryId: "33333333-3333-4333-8333-333333333333",
    imageUrl: "/products/real/craft-boss-black.webp"
  },
  {
    id: "b0000000-0000-4000-8000-000000000008",
    name: "TULLY’S COFFEE BARISTA’S BLACK キリマンジャロ",
    maker: "伊藤園",
    categoryId: "33333333-3333-4333-8333-333333333333",
    imageUrl: "/products/real/tullys-black-kilimanjaro.webp"
  },
  {
    id: "b0000000-0000-4000-8000-000000000009",
    name: "ポカリスエット",
    maker: "大塚製薬",
    categoryId: "66666666-6666-4666-8666-666666666666",
    imageUrl: "/products/real/pocari-sweat.webp"
  },
  {
    id: "b0000000-0000-4000-8000-000000000010",
    name: "カルピスウォーター",
    maker: "アサヒ飲料",
    categoryId: "66666666-6666-4666-8666-666666666666",
    imageUrl: "/products/real/calpis-water.webp"
  }
]);
