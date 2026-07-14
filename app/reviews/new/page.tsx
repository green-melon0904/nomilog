/** クエリの商品IDを投稿フォームへ渡すレビュー作成ページ。 */
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { ReviewFormScreen } from "@/components/ReviewFormScreen";

export default async function ReviewNewPage({ searchParams }: { searchParams: Promise<{ productId?: string }> }) {
  const { productId } = await searchParams;

  return (
    <AppShell>
      <Suspense>
        {/* productIdが変わったときも前の商品名を残さないよう、キーでフォーム状態を作り直す。 */}
        <ReviewFormScreen key={productId ?? "unregistered-drink"} />
      </Suspense>
    </AppShell>
  );
}
