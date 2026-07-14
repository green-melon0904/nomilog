/**
 * クエリの商品IDを投稿フォームへ渡すレビュー作成ページ。
 * 商品詳細からは対象商品を初期入力し、中央の投稿ボタンからは商品未選択で始められるため、
 * productIdを任意の入力として扱い、フォーム側で登録済み・未登録の両方を判断する。
 */
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
