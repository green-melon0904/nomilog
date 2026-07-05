export function RatingStars({ value, size = "sm" }: { value: number; size?: "sm" | "md" | "lg" }) {
  // 表示用の星は小数を四捨五入し、細かな点数はaria-labelと横の数値表示に任せる。
  // カード上では視認性を優先し、星の数でざっくり評価が伝わるようにしている。
  const rounded = Math.round(value);
  const textSize = size === "lg" ? "text-[24px]" : size === "md" ? "text-[18px]" : "text-[14px]";

  return (
    <span className={`inline-flex items-center gap-[1px] ${textSize}`} aria-label={`${value.toFixed(1)}点`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < rounded ? "text-[var(--amber)]" : "text-[#d7e3ee]"}>
          ★
        </span>
      ))}
    </span>
  );
}
