import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { ReviewFormScreen } from "@/components/ReviewFormScreen";

export default async function ReviewEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      <Suspense>
        <ReviewFormScreen key={id} reviewId={id} />
      </Suspense>
    </AppShell>
  );
}
