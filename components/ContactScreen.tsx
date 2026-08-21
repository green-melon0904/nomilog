"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { MobilePageHeader } from "@/components/MobilePageHeader";
import type { ContactCategory } from "@/lib/safety-input";

const categories: Array<{ value: ContactCategory; label: string }> = [
  { value: "general", label: "サービスについて" },
  { value: "account", label: "アカウント・ログイン" },
  { value: "content", label: "レビュー・掲載内容" },
  { value: "privacy", label: "個人情報・プライバシー" },
  { value: "other", label: "その他" }
];

/** ログイン前でも使える問い合わせフォーム。返信先メールは問い合わせ対応のためだけに保存する。 */
export function ContactScreen() {
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<ContactCategory>("general");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, category, message, website })
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "お問い合わせを送信できませんでした。");
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "お問い合わせを送信できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen pb-8">
      <MobilePageHeader title="お問い合わせ" />
      {sent ? (
        <section className="py-20 text-center">
          <CheckCircle2 className="mx-auto h-11 w-11 text-[var(--accent)]" strokeWidth={1.6} />
          <h2 className="mt-4 text-[18px]">送信しました</h2>
          <p className="mt-2 text-[12px] font-normal leading-relaxed text-[var(--muted)]">内容を確認し、必要に応じて入力いただいたメールアドレスへ返信します。</p>
        </section>
      ) : (
        <form onSubmit={submit} className="space-y-5 pt-6">
          <div><label htmlFor="contact-email" className="text-[13px]">返信先メールアドレス</label><input id="contact-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="mt-2 min-h-11 w-full rounded-[8px] border border-[var(--border)] bg-white px-3 text-[16px] outline-none focus:border-[var(--accent)]" /></div>
          <div><label htmlFor="contact-category" className="text-[13px]">お問い合わせ種別</label><select id="contact-category" value={category} onChange={(event) => setCategory(event.target.value as ContactCategory)} className="mt-2 min-h-11 w-full rounded-[8px] border border-[var(--border)] bg-white px-3 text-[16px] outline-none focus:border-[var(--accent)]">{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          <div><label htmlFor="contact-message" className="text-[13px]">お問い合わせ内容</label><textarea id="contact-message" value={message} onChange={(event) => setMessage(event.target.value)} required minLength={20} maxLength={1000} rows={8} placeholder="20文字以上で入力してください" className="mt-2 min-h-[180px] w-full resize-none rounded-[8px] border border-[var(--border)] bg-white px-3 py-3 text-[16px] font-normal leading-relaxed outline-none focus:border-[var(--accent)]" /><p className="mt-1 text-right text-[11px] font-normal text-[var(--muted)]">{message.length}/1000</p></div>
          <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><label htmlFor="contact-website">ウェブサイト</label><input id="contact-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
          {error ? <p role="alert" className="rounded-[8px] bg-[#fff1f2] px-3 py-2 text-[12px] font-normal text-[#c53d47]">{error}</p> : null}
          <button type="submit" disabled={submitting} className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--accent)] px-4 text-[15px] !text-white disabled:opacity-60"><Send className="h-4 w-4" strokeWidth={1.8} />{submitting ? "送信中…" : "送信する"}</button>
        </form>
      )}
    </div>
  );
}
