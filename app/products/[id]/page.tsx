import { AppShell } from "@/components/AppShell";
import { ProductDetailScreen } from "@/components/ProductDetailScreen";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      <ProductDetailScreen productId={id} />
    </AppShell>
  );
}
