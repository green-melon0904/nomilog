/**
 * 投稿前にログインが必要な理由とマイページへの導線を表示する案内部品。
 * Supabase接続済みの本番経路と、接続前でも確認できるローカルデモを明示的に分け、
 * デモ保存を本番の認証済み投稿と誤解させないようにする。
 */
import Link from "next/link";
import { hasSupabaseEnv } from "@/lib/supabase";

export function LoginNotice({ compact = false }: { compact?: boolean }) {
  const remote = hasSupabaseEnv();

  return (
    <div className="soft-card p-4">
      <p className="text-[14px] font-semibold text-[var(--accent-strong)]">ログイン状態</p>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">
        {remote
          ? "Supabase接続中です。レビュー投稿にはマイページからのログインが必要です。"
          : "MVPデモではログイン済みユーザーとしてローカル保存します。"}
      </p>
      {!compact ? (
        <Link href="/mypage" className="mt-3 inline-flex min-h-11 items-center rounded-[8px] bg-[var(--accent)] px-4 text-[14px] font-semibold !text-white shadow-[0_10px_22px_rgba(42,155,225,0.2)]">
          マイページを見る
        </Link>
      ) : null}
    </div>
  );
}
