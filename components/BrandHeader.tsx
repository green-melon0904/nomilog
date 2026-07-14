"use client";

/** ブランドロゴとメニューを主要画面で共有するヘッダー。 */

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function BrandHeader() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <header className="flex h-[70px] items-center justify-between">
        <Link href="/" aria-label="のみログ ホーム">
          <Image
            src="/nomilog-logo.png"
            alt="のみログ"
            width={826}
            height={229}
            priority
            className="h-auto w-[172px]"
          />
        </Link>
        <button
          type="button"
          aria-label={open ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="tap-target grid w-11 place-items-center"
        >
          {open ? <X className="h-7 w-7" strokeWidth={1.8} /> : <Menu className="h-7 w-7" strokeWidth={1.8} />}
        </button>
      </header>
      {open ? (
        <nav className="absolute right-0 top-[62px] z-30 w-40 rounded-[8px] border border-[var(--border)] bg-white p-1.5 shadow-[0_8px_24px_rgba(17,24,39,0.12)]">
          <Link href="/search" onClick={() => setOpen(false)} className="tap-target flex items-center rounded-[6px] px-3 text-[13px] hover:bg-[var(--surface-soft)]">ドリンクをさがす</Link>
          <Link href="/mypage" onClick={() => setOpen(false)} className="tap-target flex items-center rounded-[6px] px-3 text-[13px] hover:bg-[var(--surface-soft)]">マイページ</Link>
        </nav>
      ) : null}
    </div>
  );
}
