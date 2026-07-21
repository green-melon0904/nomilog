"use client";

/**
 * レビュー一覧を画面間で共有するための同期フック。
 *
 * ローカルデモではseed/localStorageを即座に描画し、Supabase接続中は公開データだけを読む。
 * 同じタブの投稿通知と別タブのstorageイベントを同じ同期関数へ集約し、ホーム・検索・詳細の
 * 集計結果が画面ごとにずれず、仮データを接続済み環境へ混ぜないようにする。
 */

import { useEffect, useRef, useState } from "react";
import { readAllReviews, seedReviews } from "@/lib/nomilog-data";
import { canUseRemoteData, fetchRemoteReviews } from "@/lib/nomilog-remote";
import type { Review } from "@/lib/types";

/** ローカルデモまたはリモートのいずれか一方のレビューを表示用に返す。 */
export function useNomilogReviews() {
  const remoteEnabled = canUseRemoteData();
  const latestRequestId = useRef(0);
  // Supabase接続中にseedを重ねると、仮の商品に付けたデモレビューが実データのように表示される。
  // 接続済み環境ではDBだけを正として、公開時に仮レビューを実在商品のレビューへ誤継承しない。
  const [reviews, setReviews] = useState<Review[]>(() => remoteEnabled ? [] : seedReviews);

  useEffect(() => {
    let active = true;
    const sync = () => {
      if (!remoteEnabled) {
        // ローカルデモではseedと端末内投稿を即時にまとめ、同じタブの投稿結果もすぐ反映する。
        setReviews(readAllReviews());
        return;
      }

      // いいね後の再取得でも、前回の一覧を消さずに待つ。空表示を挟むとカードやランキングが
      // 一瞬消えて操作感を損なうためである。リクエスト番号で、遅れて返った古い応答が最新状態を
      // 上書きすることも防ぐ。
      const requestId = ++latestRequestId.current;
      void fetchRemoteReviews().then((remoteReviews) => {
        if (!active || requestId !== latestRequestId.current) return;
        setReviews(remoteReviews);
      });
    };
    sync();
    // storageは別タブ、nomilog:reviewsは同じタブの投稿・削除を通知する。
    // 通知経路が違っても同じsyncを通すことで、画面ごとの集計差分を作らない。
    window.addEventListener("storage", sync);
    window.addEventListener("nomilog:reviews", sync);
    return () => {
      active = false;
      window.removeEventListener("storage", sync);
      window.removeEventListener("nomilog:reviews", sync);
    };
  }, [remoteEnabled]);

  return reviews;
}
