"use client";

import { useEffect, useState } from "react";
import { readAllReviews } from "@/lib/nomilog-data";
import { fetchRemoteReviews } from "@/lib/nomilog-remote";
import type { Review } from "@/lib/types";

export function useNomilogReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const sync = () => {
      // まずseedとlocalStorageのレビューを即時反映し、画面を待たせない。
      // Supabaseが設定されている場合だけ、後からリモートレビューを重ねて最新状態にする。
      setReviews(readAllReviews());
      void fetchRemoteReviews().then((remoteReviews) => {
        if (remoteReviews.length > 0) {
          setReviews([...readAllReviews(), ...remoteReviews]);
        }
      });
    };
    sync();
    // storageは別タブの更新、nomilog:reviewsは同じタブ内の投稿・削除更新を拾うためのイベント。
    // どちらも同じsync関数に寄せて、レビュー一覧・ランキング・詳細画面の再計算を揃える。
    window.addEventListener("storage", sync);
    window.addEventListener("nomilog:reviews", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("nomilog:reviews", sync);
    };
  }, []);

  return reviews;
}
