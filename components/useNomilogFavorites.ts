"use client";

/**
 * お気に入り商品IDを、商品詳細・マイページ・管理画面で共有するクライアントhook。
 *
 * 本番ではWorkOS Cookieを直接読まず、同一オリジンのRoute Handlerだけを使う。ローカル確認時は
 * localStorageへ同じ商品ID配列を保存し、Supabase未設定でもUIと同期動作を検証できるようにする。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { hasSupabaseEnv } from "@/lib/supabase";

const localFavoritesKey = "nomilog.favoriteProductIds";
const favoritesChangedEvent = "nomilog:favorites";

export type FavoriteStatus = "loading" | "signed-in" | "signed-out" | "unavailable";

type FavoriteEventDetail = {
  productId: string;
  favorited: boolean;
};

export function useNomilogFavorites() {
  const remoteEnabled = hasSupabaseEnv();
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [status, setStatus] = useState<FavoriteStatus>(remoteEnabled ? "loading" : "signed-in");
  const [pendingProductIds, setPendingProductIds] = useState<Set<string>>(() => new Set());
  const requestId = useRef(0);
  const favoriteIdsRef = useRef<string[]>([]);
  const pendingIdsRef = useRef<Set<string>>(new Set());

  const replaceFavoriteIds = useCallback((ids: string[]) => {
    favoriteIdsRef.current = ids;
    setFavoriteProductIds(ids);
  }, []);

  const sync = useCallback(async () => {
    const currentRequest = ++requestId.current;

    if (!remoteEnabled) {
      const localIds = readLocalFavorites();
      if (currentRequest === requestId.current) {
        replaceFavoriteIds(localIds);
        setStatus("signed-in");
      }
      return;
    }

    try {
      const response = await fetch("/api/favorites", { cache: "no-store" });
      const result = await response.json().catch(() => null) as { favoriteProductIds?: string[] } | null;
      if (currentRequest !== requestId.current) return;

      if (response.status === 401) {
        replaceFavoriteIds([]);
        setStatus("signed-out");
        return;
      }
      if (!response.ok) {
        setStatus("unavailable");
        return;
      }

      replaceFavoriteIds(normalizeFavoriteIds(result?.favoriteProductIds));
      setStatus("signed-in");
    } catch {
      if (currentRequest === requestId.current) setStatus("unavailable");
    }
  }, [remoteEnabled, replaceFavoriteIds]);

  useEffect(() => {
    // 初回描画中のEffectから同期的にstateを連鎖更新しないよう、ブラウザの次フレームで
    // localStorageまたはAPIとの同期を始める。イベント購読は先に登録するため更新も取りこぼさない。
    const syncFrame = window.requestAnimationFrame(() => void sync());

    const onFavoritesChanged = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as FavoriteEventDetail | undefined : undefined;
      if (detail && typeof detail.productId === "string" && typeof detail.favorited === "boolean") {
        // 配列全体を通知すると、別hookの同時操作を古いスナップショットで上書きする。商品単位の
        // 差分だけを現在値へ適用し、ほかの商品に対する楽観更新を保ったまま画面間を同期する。
        requestId.current += 1;
        const currentIds = favoriteIdsRef.current;
        replaceFavoriteIds(detail.favorited
          ? normalizeFavoriteIds([detail.productId, ...currentIds])
          : currentIds.filter((id) => id !== detail.productId));
        return;
      }
      void sync();
    };

    window.addEventListener(favoritesChangedEvent, onFavoritesChanged);
    window.addEventListener("storage", onFavoritesChanged);
    return () => {
      window.cancelAnimationFrame(syncFrame);
      window.removeEventListener(favoritesChangedEvent, onFavoritesChanged);
      window.removeEventListener("storage", onFavoritesChanged);
    };
  }, [replaceFavoriteIds, sync]);

  const toggleFavorite = useCallback(async (productId: string) => {
    if (status !== "signed-in" || pendingIdsRef.current.has(productId)) return;

    const favoriteIdsBeforeOperation = favoriteIdsRef.current;
    const wasFavorited = favoriteIdsBeforeOperation.includes(productId);
    const optimisticIds = wasFavorited
      ? favoriteIdsBeforeOperation.filter((id) => id !== productId)
      : [productId, ...favoriteIdsBeforeOperation];

    replaceFavoriteIds(optimisticIds);
    pendingIdsRef.current = new Set(pendingIdsRef.current).add(productId);
    setPendingProductIds(pendingIdsRef.current);

    try {
      if (remoteEnabled) {
        const response = await fetch("/api/favorites", {
          method: wasFavorited ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId })
        });
        const result = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(result?.error ?? "お気に入りを変更できませんでした。");
      } else {
        window.localStorage.setItem(localFavoritesKey, JSON.stringify(optimisticIds));
      }

      window.dispatchEvent(new CustomEvent<FavoriteEventDetail>(favoritesChangedEvent, {
        detail: { productId, favorited: !wasFavorited }
      }));
    } catch (error) {
      // 別商品の保存が並行して成功していても消さないよう、失敗した商品だけを操作前の状態へ戻す。
      const currentIds = favoriteIdsRef.current;
      const rollbackIds = wasFavorited
        ? normalizeFavoriteIds([productId, ...currentIds])
        : currentIds.filter((id) => id !== productId);
      replaceFavoriteIds(rollbackIds);
      // 失敗時は差分通知だけでは同じ商品の同時成功を取り消す可能性があるため、各hookがAPIの
      // 確定状態を再取得する。エラー時だけの追加通信に限定し、通常操作の応答性は落とさない。
      window.dispatchEvent(new Event(favoritesChangedEvent));
      throw error;
    } finally {
      const nextPendingIds = new Set(pendingIdsRef.current);
      nextPendingIds.delete(productId);
      pendingIdsRef.current = nextPendingIds;
      setPendingProductIds(nextPendingIds);
    }
  }, [remoteEnabled, replaceFavoriteIds, status]);

  return {
    favoriteProductIds,
    status,
    isFavorite: (productId: string) => favoriteProductIds.includes(productId),
    isPending: (productId: string) => pendingProductIds.has(productId),
    toggleFavorite,
    refresh: sync
  };
}

function readLocalFavorites() {
  try {
    return normalizeFavoriteIds(JSON.parse(window.localStorage.getItem(localFavoritesKey) ?? "[]"));
  } catch {
    return [];
  }
}

function normalizeFavoriteIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string"))];
}
