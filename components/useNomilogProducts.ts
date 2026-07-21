"use client";

/**
 * ローカルデモはseed商品を表示し、Supabase接続時はDBの商品マスタを取得する同期フック。
 * 接続済み環境で仮データを先に出すとDB障害時に存在しない商品を選べるように見えるため、
 * リモート利用時は取得結果だけをカタログとして扱う。
 */

import { useEffect, useState } from "react";
import { products } from "@/lib/nomilog-data";
import { canUseRemoteData, fetchRemoteProducts } from "@/lib/nomilog-remote";
import type { Product } from "@/lib/types";

/**
 * 公開商品カタログを画面が扱うcamelCase配列として返す。
 * 呼び出し側にseedとSupabaseの判定を漏らさないことで、検索・候補表示・商品詳細が同じ
 * 商品集合を参照し、接続設定の有無だけでUIの分岐が増えないようにする。
 */
export function useNomilogProducts() {
  const remoteEnabled = canUseRemoteData();
  // 接続済み環境で仮カタログを先に出すと、DB障害時に存在しない商品を選べるように見えてしまう。
  // リモートでは空から開始し、ローカルデモだけが20件の仮データを即時表示する。
  const [catalog, setCatalog] = useState<Product[]>(() => remoteEnabled ? [] : products);

  useEffect(() => {
    if (!remoteEnabled) return;

    // 接続済み環境ではDB側でreviewableと明示された商品だけを使う。取得失敗も空配列として
    // 扱い、仮の商品を表示してからAPIで拒否される不整合を作らない。
    void fetchRemoteProducts().then((remoteProducts) => {
      setCatalog(remoteProducts);
    });
  }, [remoteEnabled]);

  return catalog;
}
