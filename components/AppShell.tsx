"use client";

/** 主要画面の余白と固定ボトムナビを管理するアプリシェル。 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquareText, Plus, Search, UserRound } from "lucide-react";

const navItems = [
  { href: "/", label: "ホーム", icon: Home, activePath: "/" },
  { href: "/search", label: "さがす", icon: Search, activePath: "/search" },
  // 中央の投稿は商品選択を求めず、飲み物名を自由に入力できるレビュー画面を開く。
  { href: "/reviews/new", label: "投稿", icon: Plus, primary: true },
  { href: "/reviews", label: "レビュー", icon: MessageSquareText, activePath: "/reviews" },
  { href: "/mypage", label: "マイページ", icon: UserRound, activePath: "/mypage" }
];

/** 商品閲覧・投稿では集中を優先し、それ以外の画面では主要導線を固定表示する。 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // 商品を読む画面とレビューを書く画面では、参考デザインと同じく内容へ集中できるよう
  // 下部ナビを外す。ホーム・検索・マイページではいつでも主要機能へ移動できるよう固定表示する。
  const showBottomNav = !pathname.startsWith("/products/") && !pathname.startsWith("/reviews/new");

  return (
    <main className={showBottomNav ? "mobile-shell" : "min-h-dvh bg-white"}>
      {children}
      {showBottomNav ? (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 backdrop-blur-md">
          <div className="mx-auto grid h-[66px] max-w-[460px] grid-cols-5 px-2">
            {navItems.map((item) => (
              <BottomNavItem key={`${item.href}-${item.label}`} {...item} />
            ))}
          </div>
        </nav>
      ) : null}
    </main>
  );
}

function BottomNavItem({
  href,
  label,
  icon: Icon,
  primary = false,
  activePath
}: {
  href: string;
  label: string;
  icon: typeof Home;
  primary?: boolean;
  activePath?: string;
}) {
  const pathname = usePathname();
  const active = !primary && pathname === activePath;

  function guardDirtyForm(event: React.MouseEvent<HTMLAnchorElement>) {
    // 投稿フォームとナビは別コンポーネントなので、未保存状態だけsessionStorageで共有する。
    // 入力中の移動を止め、意図せずレビューを失わないようにする。
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
      aria-label={primary ? "レビューを投稿" : undefined}
      className={`tap-target relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
        active ? "text-[var(--accent)]" : "text-[var(--text)]"
      }`}
    >
      <span
        className={
          primary
            ? "absolute -top-4 grid h-12 w-12 place-items-center rounded-full bg-[var(--accent)] !text-white shadow-[0_4px_14px_rgba(42,155,225,0.35)]"
            : "grid h-7 w-8 place-items-center"
        }
      >
        <Icon className={primary ? "h-7 w-7" : "h-[21px] w-[21px]"} strokeWidth={primary ? 1.8 : 1.9} />
      </span>
      <span className={primary ? "mt-8" : ""}>{label}</span>
    </Link>
  );
}
