import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { SearchScreen } from "@/components/SearchScreen";

export default function SearchPage() {
  return (
    <AppShell>
      <Suspense>
        <SearchScreen />
      </Suspense>
    </AppShell>
  );
}
