"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { RatingStars } from "@/components/RatingStars";
import { deleteLocalReview, demoUser, formatDate, products, readProductRequests } from "@/lib/nomilog-data";
import { useNomilogReviews } from "@/components/useNomilogReviews";
import { createClient, hasSupabaseEnv } from "@/lib/supabase";

export function MyPageScreen() {
  const reviews = useNomilogReviews();
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [remoteUserEmail, setRemoteUserEmail] = useState<string | null>(null);
  const myReviews = reviews
    .filter((review) => review.userId === demoUser.userId || review.userName === demoUser.name)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const requests = readProductRequests();
  const remoteEnabled = hasSupabaseEnv();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setRemoteUserEmail(data.user?.email ?? null));
  }, []);

  async function sendLoginLink() {
    setAuthMessage("");
    const supabase = createClient();
    if (!supabase || !email.trim()) return;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/mypage`
      }
    });
    setAuthMessage(error ? error.message : "ログイン用メールを送信しました。");
  }

  return (
    <div className="screen">
      <Header title="マイページ" backHref="/" action="none" />

      <section className="app-card mb-4 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-[8px] bg-[var(--accent)] text-[24px] font-black text-white">
            {demoUser.avatarUrl}
          </div>
          <div>
            <p className="text-[18px] font-black">{demoUser.name}</p>
            <p className="mt-1 text-[13px] font-bold text-[var(--muted)]">Supabase接続時はAuthプロフィールに同期</p>
          </div>
        </div>
      </section>

      {remoteEnabled ? (
        <section className="app-card mb-4 p-4">
          <h2 className="text-[17px] font-black">Supabaseログイン</h2>
          {remoteUserEmail ? (
            <p className="mt-2 text-[13px] font-bold text-[var(--muted)]">{remoteUserEmail} でログイン中</p>
          ) : (
            <div className="mt-3 flex gap-2">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="メールアドレス"
                className="min-h-11 min-w-0 flex-1 rounded-[8px] border border-[var(--border)] px-3 text-[16px] font-semibold outline-none"
              />
              <button onClick={sendLoginLink} className="tap-target rounded-[8px] bg-[var(--accent)] px-3 text-[13px] font-black text-white">
                送信
              </button>
            </div>
          )}
          {authMessage ? <p className="mt-2 text-[13px] font-bold text-[var(--accent-strong)]">{authMessage}</p> : null}
        </section>
      ) : null}

      <section className="mb-5">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[19px] font-black tracking-[0]">自分のレビュー</h2>
          <span className="text-[12px] font-bold text-[var(--muted)]">{myReviews.length}件</span>
        </div>
        {myReviews.length > 0 ? (
          <div className="space-y-3">
            {myReviews.map((review) => {
              const product = products.find((item) => item.id === review.productId);
              return (
                <article key={review.id} className="app-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/products/${review.productId}`} className="block truncate text-[16px] font-black">
                        {product?.name ?? "不明な商品"}
                      </Link>
                      <p className="mt-1 text-[12px] font-bold text-[var(--muted)]">{formatDate(review.createdAt)}</p>
                    </div>
                    <RatingStars value={review.rating} />
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed">{review.comment}</p>
                  <button
                    onClick={() => {
                      if (window.confirm("このローカルレビューを削除しますか？")) deleteLocalReview(review.id);
                    }}
                    className="tap-target mt-3 rounded-[8px] border border-[var(--border)] px-4 text-[13px] font-black text-[var(--cola)]"
                  >
                    削除
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="soft-card p-4">
            <p className="text-[14px] leading-relaxed text-[var(--muted)]">まだ投稿したレビューはありません。</p>
            <Link href="/reviews/new" className="tap-target mt-3 inline-flex items-center rounded-[8px] bg-[var(--accent)] px-4 text-[14px] font-black text-white">
              レビューを書く
            </Link>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[19px] font-black tracking-[0]">商品リクエスト</h2>
          <span className="text-[12px] font-bold text-[var(--muted)]">{requests.length}件</span>
        </div>
        <div className="space-y-2">
          {requests.length > 0 ? (
            requests.map((request) => (
              <div key={request.id} className="soft-card flex items-center justify-between gap-3 p-3">
                <span className="min-w-0 truncate text-[14px] font-black">{request.name}</span>
                <span className="rounded-full bg-white px-3 py-1 text-[12px] font-black text-[var(--accent-strong)]">
                  {request.status}
                </span>
              </div>
            ))
          ) : (
            <p className="soft-card p-4 text-[13px] font-bold text-[var(--muted)]">検索で見つからない商品をリクエストできます。</p>
          )}
        </div>
      </section>
    </div>
  );
}
