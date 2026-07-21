/**
 * クエリの商品IDを投稿フォームへ渡すレビュー作成ページ。
 * 商品詳細からは対象商品を初期選択し、中央の投稿ボタンからはカタログ選択前の状態で始める。
 * 仮運用では運営カタログの商品だけを投稿対象にするため、フォーム側で実在商品を必須確認する。
 */
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { ReviewFormScreen } from "@/components/ReviewFormScreen";

export default async function ReviewNewPage({ searchParams }: { searchParams: Promise<{ productId?: string }> }) {
  const { productId } = await searchParams;

  return (
    <AppShell>
      <Suspense>
        {/* productIdが変わったときも前の選択を残さないよう、キーでフォーム状態を作り直す。 */}
        <ReviewFormScreen key={productId ?? "catalog-select"} />
      </Suspense>
    </AppShell>
  );
}
