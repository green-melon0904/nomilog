"use client";

/**
 * 商品のお気に入り状態を切り替えるハートボタン。
 *
 * 未ログイン時は現在の商品へ戻るログイン導線を開き、保存APIへ匿名リクエストを送らない。
 * 保存中は同じ商品の連打だけを止め、画面上のほかの操作を妨げない。
 */
import { Heart } from "lucide-react";
import { useState } from "react";
import { useNomilogFavorites } from "@/components/useNomilogFavorites";

export function FavoriteButton({ productId, returnTo, compact = false }: { productId: string; returnTo: string; compact?: boolean }) {
  const favorites = useNomilogFavorites();
  return <FavoriteButtonView productId={productId} returnTo={returnTo} compact={compact} favorites={favorites} />;
}

type FavoriteController = ReturnType<typeof useNomilogFavorites>;

/**
 * 親画面ですでに取得したお気に入り状態を使ってハートを描画する。
 * 一覧の各商品でhookを呼ぶと同じGETが商品数ぶん発生するため、一覧だけはこの表示部品へ
 * 共通controllerを渡す。単体の商品詳細は上のFavoriteButtonを使えばよい。
 */
export function FavoriteButtonView({
  productId,
  returnTo,
  compact = false,
  favorites
}: {
  productId: string;
  returnTo: string;
  compact?: boolean;
  favorites: FavoriteController;
}) {
  const { isFavorite, isPending, status, toggleFavorite } = favorites;
  const [animationKey, setAnimationKey] = useState(0);
  const [error, setError] = useState("");
  const favorited = isFavorite(productId);
  const pending = isPending(productId);

  async function onToggle() {
    setError("");
    if (status === "signed-out") {
      // WorkOSへリダイレクトするRoute Handlerなので、PKCE Cookieを二重生成しない文書遷移を使う。
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- 認証Route Handlerは通常のNext.jsページではない。
      window.location.assign(`/sign-in?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (status !== "signed-in" || pending) {
      if (status === "unavailable") setError("お気に入り機能を利用できません。");
      return;
    }

    try {
      await toggleFavorite(productId);
      if (!favorited) setAnimationKey((current) => current + 1);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "お気に入りを変更できませんでした。");
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={onToggle}
        disabled={status === "loading" || pending}
        aria-pressed={favorited}
        aria-label={favorited ? "お気に入りから外す" : "お気に入りに追加"}
        title={favorited ? "お気に入りから外す" : "お気に入りに追加"}
        className={`${compact ? "h-11 w-11" : "tap-target min-h-11 gap-2 px-3"} inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white text-[13px] disabled:cursor-wait disabled:opacity-60`}
      >
        <Heart
          key={animationKey}
          className={`${compact ? "h-6 w-6" : "h-5 w-5"} ${favorited ? "fill-[#ef4444] text-[#ef4444]" : "text-[var(--accent)]"} ${animationKey > 0 ? "nomilog-like-pop" : ""}`}
          strokeWidth={1.8}
        />
        {compact ? null : <span>{favorited ? "お気に入り済み" : "お気に入り"}</span>}
      </button>
      {error ? <span role="alert" className="absolute right-0 top-full z-10 mt-1 w-52 rounded-[6px] bg-[#fff3f3] p-2 text-right text-[10px] text-[var(--danger)] shadow-sm">{error}</span> : null}
    </span>
  );
}
