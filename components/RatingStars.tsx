export function RatingStars({ value, size = "sm" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const rounded = Math.round(value);
  const textSize = size === "lg" ? "text-[24px]" : size === "md" ? "text-[18px]" : "text-[14px]";

  return (
    <span className={`inline-flex items-center gap-[1px] ${textSize}`} aria-label={`${value.toFixed(1)}点`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < rounded ? "text-[var(--amber)]" : "text-[#cfd8d2]"}>
          ★
        </span>
      ))}
    </span>
  );
}
