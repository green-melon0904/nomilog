import { AppShell } from "@/components/AppShell";
import { ProductDetailScreen } from "@/components/ProductDetailScreen";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js App Routerの動的セグメントから商品IDを受け取り、
  // 画面側のProductDetailScreenに渡して詳細・レビュー・似た味の商品を描画する。
  const { id } = await params;
  return (
    <AppShell>
      <ProductDetailScreen productId={id} />
    </AppShell>
  );
}
