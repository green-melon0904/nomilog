import Link from "next/link";
import { BellIcon, ChevronLeftIcon } from "@/components/icons";

export function Header({
  title = "のみログ",
  backHref,
  action = "bell"
}: {
  title?: string;
  backHref?: string;
  action?: "bell" | "none";
}) {
  return (
    <header className="mb-4 flex h-12 items-center justify-between">
      <div className="flex min-w-0 items-center gap-2">
        {backHref ? (
          <Link href={backHref} className="tap-target grid w-11 place-items-center rounded-[8px] text-[var(--text)]" aria-label="戻る">
            <ChevronLeftIcon className="h-6 w-6" />
          </Link>
        ) : null}
        <h1 className="truncate text-[22px] font-black tracking-[0] text-[var(--text)]">{title}</h1>
      </div>
      {action === "bell" ? (
        <button className="tap-target grid w-11 place-items-center rounded-[8px] bg-[var(--surface-soft)] text-[var(--accent-strong)]" aria-label="通知">
          <BellIcon className="h-5 w-5" />
        </button>
      ) : null}
    </header>
  );
}
