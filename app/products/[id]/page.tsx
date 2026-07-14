/** 動的セグメントの商品IDを商品詳細画面へ橋渡しするページ。 */
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
