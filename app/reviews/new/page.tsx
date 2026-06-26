import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { ReviewFormScreen } from "@/components/ReviewFormScreen";

export default function ReviewNewPage() {
  return (
    <AppShell>
      <Suspense>
        <ReviewFormScreen />
      </Suspense>
    </AppShell>
  );
}
