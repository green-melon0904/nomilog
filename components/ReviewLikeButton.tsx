"use client";

/**
 * レビューのいいね操作を表示するクライアント部品。
 *
 * Supabaseに存在するレビューは認証済みAPIへ保存し、seedレビューは外部DBにないため
 * ローカルデモとして扱う。どちらの場合も、未ログインのユーザーが保存処理へ進めないよう
 * クリック時に認証状態を確認する。
 */

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

type ReviewLikeButtonProps = {
  reviewId: string;
  initialCount?: number;
};

type LikeStatusResponse = {
  configured?: boolean;
  authenticated?: boolean;
  liked?: boolean;
  likeCount?: number;
  user?: unknown;
};

const localLikesKey = "nomilog.reviewLikes.v1";

/**
 * レビューのいいね件数と本人の選択状態を表示し、ログイン済みならトグルする。
 * DBレビューとseedレビューで保存先が異なるため、識別子の形式で経路を切り替える。ただし
 * 認証状態が確定する前は操作を止め、未ログインのクリックをローカル状態として誤保存しない。
 * @param reviewId DBレビューではUUID、seedレビューではデモ用の識別子
 * @param initialCount レビュー一覧が取得した集計済み件数
 */
export function ReviewLikeButton({ reviewId, initialCount = 0 }: ReviewLikeButtonProps) {
  const remoteReview = isUuid(reviewId);
  const [count, setCount] = useState(Math.max(0, initialCount));
  const [liked, setLiked] = useState(false);
  const [authConfigured, setAuthConfigured] = useState<boolean | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likeAnimationKey, setLikeAnimationKey] = useState(0);

  useEffect(() => {
    let active = true;

    // UUIDを持つDBレビューはAPIから本人の状態と最新件数を取得する。
    // seedレビューはDB行がないため、ログイン済みの開発用画面だけ端末内の状態を復元する。
    const endpoint = remoteReview
      ? `/api/reviews/likes?reviewId=${encodeURIComponent(reviewId)}`
      : "/api/auth/session";
    void fetch(endpoint, { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, data: await response.json() as LikeStatusResponse }))
      .then(({ ok, data }) => {
        if (!active) return;
        setAuthConfigured(data.configured ?? false);
        const isAuthenticated = remoteReview ? Boolean(data.authenticated) : Boolean(data.user);
        setAuthenticated(isAuthenticated);
        if (remoteReview) {
          setLiked(Boolean(data.liked));
          if (typeof data.likeCount === "number") setCount(Math.max(0, data.likeCount));
        } else if (isAuthenticated) {
          setLiked(readLocalLike(reviewId));
        }
        if (!ok && remoteReview) setError("いいねの状態を取得できませんでした。");
      })
      .catch(() => {
        if (!active) return;
        // API障害時は誤って本人扱いにせず、次のタップでログインまたは再試行へ進める。
        setAuthConfigured(remoteReview);
        setError("いいねの状態を取得できませんでした。");
      });

    return () => {
      active = false;
    };
  }, [remoteReview, reviewId]);

  async function toggleLike() {
    if (busy) return;
    setError(null);

    // 初回の認証状態が届く前に押下されると、未ログインでもローカル保存へ進めてしまう。
    // 判定が終わるまで操作を止め、WorkOS設定時は必ずログイン確認を通す。
    if (authConfigured === null) return;

    if (authConfigured === true && !authenticated) {
      // 認証後に元のレビューへ戻せるよう、現在のアプリ内パスだけをreturnToへ渡す。
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/sign-in?next=${encodeURIComponent(returnTo)}`);
      return;
    }

    if (remoteReview && authConfigured !== true) {
      setError("いいね機能の接続を確認できませんでした。");
      return;
    }

    const nextLiked = !liked;
    setBusy(true);
    setLiked(nextLiked);
    setCount((current) => Math.max(0, current + (nextLiked ? 1 : -1)));
    // 成功状態へ切り替わる瞬間だけアイコンを再マウントし、同じ状態の再描画では
    // アニメーションを繰り返さない。失敗時は状態を戻すが、押下への反応は残す。
    if (nextLiked) setLikeAnimationKey((current) => current + 1);

    try {
      if (remoteReview) {
        const response = await fetch("/api/reviews/likes", {
          method: nextLiked ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewId })
        });
        const data = await response.json() as { error?: string; liked?: boolean; likeCount?: number };
        if (!response.ok) throw new Error(data.error ?? "いいねの更新に失敗しました。");
        setLiked(Boolean(data.liked));
        if (typeof data.likeCount === "number") setCount(Math.max(0, data.likeCount));

        // ランキングはレビュー配列のlikeCountから計算するため、ボタン内の件数だけ更新しても
        // ホームの順位は変わらない。保存成功後だけ一覧を再取得し、評価・いいねを使う週次順位を
        // リロードなしで更新する。失敗時はcatchで表示を戻すため通知しない。
        window.dispatchEvent(new Event("nomilog:reviews"));
      } else {
        writeLocalLike(reviewId, nextLiked);
      }
    } catch (reason) {
      // サーバー保存に失敗したら、表示だけ成功した状態を残さず元へ戻す。
      setLiked(!nextLiked);
      setCount((current) => Math.max(0, current + (nextLiked ? -1 : 1)));
      setError(reason instanceof Error ? reason.message : "いいねの更新に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggleLike();
      }}
      disabled={busy || authConfigured === null}
      aria-label={liked ? "いいねを取り消す" : "レビューにいいねする"}
      aria-pressed={liked}
      title={liked ? "いいねを取り消す" : "レビューにいいねする"}
      className={`tap-target inline-flex min-w-[52px] items-center justify-center gap-1 rounded-full px-2 text-[11px] transition-colors disabled:opacity-60 ${
        liked ? "bg-[#fff1f2] text-[#e5484d]" : "text-[var(--muted)]"
      }`}
    >
      <Heart
        key={likeAnimationKey}
        className={`h-4 w-4 ${likeAnimationKey > 0 ? "nomilog-like-pop" : ""}`}
        fill={liked ? "currentColor" : "none"}
        strokeWidth={1.7}
      />
      <span>{count}</span>
      {error ? <span className="sr-only" role="status">{error}</span> : null}
    </button>
  );
}

/**
 * 端末内デモのいいね一覧から、指定レビューの選択状態を読む。
 * seedレビューにはDBのいいね行がないため、Supabase未接続のデモだけlocalStorageを使う。
 * 壊れた保存値は未選択として扱い、いいねボタン以外の画面へエラーを広げない。
 */
function readLocalLike(reviewId: string) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(localLikesKey) ?? "[]") as unknown;
    return Array.isArray(stored) && stored.includes(reviewId);
  } catch {
    return false;
  }
}

/**
 * 端末内デモのいいねを更新し、同じ端末で再訪したときにも状態を復元できるようにする。
 * 本番DBの代替ではなく接続前の挙動確認用なので、ユーザー単位の共有やサーバー集計は行わず、
 * 端末内のUI状態だけを保持する。
 */
function writeLocalLike(reviewId: string, liked: boolean) {
  const stored = readLocalLikeIds();
  const next = liked ? [...new Set([...stored, reviewId])] : stored.filter((id) => id !== reviewId);
  window.localStorage.setItem(localLikesKey, JSON.stringify(next));
}

/**
 * 壊れたlocalStorageを画面エラーへ広げず、文字列IDだけを取り出す。
 * 保存値をそのまま信頼せず型を絞ることで、手動編集や旧形式が混ざってもいいね状態の復元だけ
 * を安全に失敗させる。
 */
function readLocalLikeIds() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(localLikesKey) ?? "[]") as unknown;
    return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
