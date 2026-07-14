/**
 * 数値評価を5つの星へ変換する、一覧と詳細で共通の表示部品。
 * 表示箇所ごとに丸め方や星のサイズを実装すると評価の見え方が揺れるため、共通部品で
 * 視覚表示を揃えつつ、元の小数値はaria-labelと隣の数値に残す。
 */
import { Star } from "lucide-react";

/**
 * 小数評価を視覚的な星へ丸めて表示する。
 * 小数点以下は星の塗り分けではなくaria-labelと隣の数値へ残し、画面幅は固定してカードの揺れを防ぐ。
 */
export function RatingStars({ value, size = "sm" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const rounded = Math.round(value);
  const iconSize = size === "lg" ? 28 : size === "md" ? 20 : 15;

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)}点`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          width={iconSize}
          height={iconSize}
          strokeWidth={1.7}
          className={index < rounded ? "fill-[var(--star)] text-[var(--star)]" : "fill-white text-[#aeb3ba]"}
        />
      ))}
    </span>
  );
}
