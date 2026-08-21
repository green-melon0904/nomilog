import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * マイページ配下と法務画面で共通利用する、戻る導線付きの小さなヘッダー。
 * iPhoneで本文開始位置とタップ領域を揃え、画面ごとの独自な戻るボタン配置を増やさない。
 */
export function MobilePageHeader({ title, backHref = "/mypage" }: { title: string; backHref?: string }) {
  return (
    <header className="-mx-[18px] grid min-h-[58px] grid-cols-[52px_minmax(0,1fr)_52px] items-center border-b border-[var(--border)] px-2">
      <Link href={backHref} aria-label="前の画面へ戻る" title="戻る" className="tap-target grid w-11 place-items-center">
        <ChevronLeft className="h-6 w-6" strokeWidth={1.8} />
      </Link>
      <h1 className="truncate text-center text-[17px]">{title}</h1>
      <span aria-hidden="true" />
    </header>
  );
}
