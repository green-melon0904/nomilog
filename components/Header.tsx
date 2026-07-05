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
  // 各画面で共通の高さとタップ領域を保つヘッダー。
  // backHrefがある画面だけ戻る導線を出し、通知ボタンはホームなど必要な画面だけ表示する。
  return (
    <header className="mb-5 flex h-14 items-center justify-between">
      <div className="flex min-w-0 items-center gap-2">
        {backHref ? (
          <Link href={backHref} className="tap-target grid w-11 place-items-center rounded-[8px] bg-[var(--accent-soft)] text-[var(--accent-strong)]" aria-label="戻る">
            <ChevronLeftIcon className="h-6 w-6" />
          </Link>
        ) : null}
        <div className="flex min-w-0 items-center gap-2">
          {!backHref ? <span className="h-3 w-3 rounded-full bg-[var(--accent)] shadow-[0_0_0_5px_var(--accent-soft)]" /> : null}
          <h1 className="truncate text-[24px] font-black tracking-[0] text-[var(--text)]">{title}</h1>
        </div>
      </div>
      {action === "bell" ? (
        <button className="tap-target grid w-11 place-items-center rounded-[8px] border border-[var(--border)] bg-white text-[var(--accent-strong)] shadow-sm" aria-label="通知">
          <BellIcon className="h-5 w-5" />
        </button>
      ) : null}
    </header>
  );
}
