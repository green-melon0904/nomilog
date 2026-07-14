"use client";

/**
 * レビュー一覧を画面間で共有するための同期フック。
 *
 * 初期表示はseed/localStorageで即座に描画し、マウント後にSupabaseの公開データを重ねる。
 * 同じタブの投稿通知と別タブのstorageイベントを同じ同期関数へ集約し、ホーム・検索・詳細の
 * 集計結果が画面ごとにずれないようにする。
 */

import { useEffect, useState } from "react";
import { readAllReviews, seedReviews } from "@/lib/nomilog-data";
import { fetchRemoteReviews } from "@/lib/nomilog-remote";
import type { Review } from "@/lib/types";

/** seed、端末内レビュー、リモートレビューを表示用の配列として返す。 */
export function useNomilogReviews() {
  const [reviews, setReviews] = useState<Review[]>(seedReviews);

  useEffect(() => {
    const sync = () => {
      // リモート取得を待つと初回画面が空になるため、ローカルの即時値を先に描画する。
      // Supabaseが設定されている場合だけ、後から最新の公開レビューを重ねる。
      setReviews(readAllReviews());
      void fetchRemoteReviews().then((remoteReviews) => {
        if (remoteReviews.length > 0) {
          setReviews([...readAllReviews(), ...remoteReviews]);
        }
      });
    };
    sync();
    // storageは別タブ、nomilog:reviewsは同じタブの投稿・削除を通知する。
    // 通知経路が違っても同じsyncを通すことで、画面ごとの集計差分を作らない。
    window.addEventListener("storage", sync);
    window.addEventListener("nomilog:reviews", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("nomilog:reviews", sync);
    };
  }, []);

  return reviews;
}
