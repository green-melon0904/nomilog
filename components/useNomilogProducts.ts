"use client";

/**
 * seed商品を即時表示し、後からSupabaseの商品マスタを同じIDで上書きする同期フック。
 * ネットワーク待ちで検索候補を空にすると入力体験が遅くなるため、初回表示はローカルを
 * 優先し、リモートが使える場合だけ後から最新情報を重ねる。
 */

import { useEffect, useState } from "react";
import { products } from "@/lib/nomilog-data";
import { fetchRemoteProducts } from "@/lib/nomilog-remote";
import type { Product } from "@/lib/types";

/**
 * 公開商品カタログを画面が扱うcamelCase配列として返す。
 * 呼び出し側にseedとSupabaseの判定を漏らさないことで、検索・候補表示・商品詳細が同じ
 * 商品集合を参照し、接続設定の有無だけでUIの分岐が増えないようにする。
 */
export function useNomilogProducts() {
  const [catalog, setCatalog] = useState<Product[]>(products);

  useEffect(() => {
    // ネットワーク待ちで候補入力や検索を空にしないためseedを先に使い、取得後は同じIDを
    // リモート側で上書きする。こうすると管理側の画像・メーカー更新も反映できる。
    void fetchRemoteProducts().then((remoteProducts) => {
      if (remoteProducts.length === 0) return;
      const merged = new Map(products.map((product) => [product.id, product]));
      remoteProducts.forEach((product) => merged.set(product.id, product));
      setCatalog([...merged.values()]);
    });
  }, []);

  return catalog;
}
