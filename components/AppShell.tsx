"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, PenIcon, SearchIcon, UserIcon } from "@/components/icons";

const navItems = [
  { href: "/", label: "ホーム", icon: HomeIcon },
  { href: "/search", label: "検索", icon: SearchIcon },
  { href: "/reviews/new", label: "投稿", icon: PenIcon },
  { href: "/mypage", label: "マイページ", icon: UserIcon }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mobile-shell">
      {children}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 shadow-[0_-12px_30px_rgba(16,32,51,0.06)] backdrop-blur">
        <div className="mx-auto grid h-[76px] max-w-[480px] grid-cols-4 px-2 pt-2">
          {navItems.map((item) => (
            <BottomNavItem key={item.href} {...item} />
          ))}
        </div>
      </nav>
    </main>
  );
}

function BottomNavItem({
  href,
  label,
  icon: Icon
}: {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === href : pathname.startsWith(href);

  function guardDirtyForm(event: React.MouseEvent<HTMLAnchorElement>) {
    // 投稿フォームは別コンポーネントなので、未保存状態をsessionStorage経由で受け取る。
    // ボトムナビから移動した場合も、入力途中のレビューをうっかり捨てないようにする。
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("nomilog.reviewFormDirty") !== "true") return;
    if (!window.confirm("入力中のレビューを破棄して移動しますか？")) {
      event.preventDefault();
    }
  }

  return (
    <Link
      href={href}
      onClick={guardDirtyForm}
      aria-current={active ? "page" : undefined}
      className={`tap-target flex flex-col items-center justify-center gap-1 rounded-[8px] text-[11px] font-bold transition ${
        active ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "text-[var(--muted)]"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
