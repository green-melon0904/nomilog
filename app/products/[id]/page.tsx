/**
 * 動的セグメントの商品IDを商品詳細画面へ橋渡しするページ。
 * URL解決と商品詳細の表示を分離し、詳細画面のデータ集計やUI変更がルーティング処理へ
 * 波及しないよう、ページ側はIDの受け渡しだけを担当する。
 */
import { AppShell } from "@/components/AppShell";
import { ProductDetailScreen } from "@/components/ProductDetailScreen";

/** ルーティングの責務をIDの受け渡しに限定し、詳細画面の描画は専用コンポーネントへ委譲する。 */
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      <ProductDetailScreen productId={id} />
    </AppShell>
  );
}
