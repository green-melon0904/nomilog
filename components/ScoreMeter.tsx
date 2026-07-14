/**
 * 味の指標を10区画のバーへ変換する。
 * 炭酸だけ最大値が4なのでmaxを外から受け取り、入力値を0〜100%へ丸めて視覚的なはみ出しを防ぐ。
 */
export function ScoreMeter({
  label,
  value,
  max = 5,
  startLabel = "弱め",
  endLabel = "強め"
}: {
  label: string;
  value: number;
  max?: number;
  startLabel?: string;
  endLabel?: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  const activeSegments = Math.round(percent / 10);

  return (
    <div className="grid grid-cols-[54px_44px_1fr_44px] items-center gap-2">
      <span className="text-[14px] font-semibold text-[var(--text)]">{label}</span>
      <span className="text-[11px] text-[var(--muted)]">{startLabel}</span>
      <span
        className="grid h-2 grid-cols-10 gap-[2px]"
        role="progressbar"
        aria-label={`${label} ${value.toFixed(1)} / ${max}`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Number(value.toFixed(1))}
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <span aria-hidden="true" key={index} className={`rounded-full ${index < activeSegments ? "bg-[var(--accent)]" : "bg-[#e6e8eb]"}`} />
        ))}
      </span>
      <span className="text-right text-[11px] text-[var(--muted)]">{endLabel}</span>
    </div>
  );
}
