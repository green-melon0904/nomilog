export function ScoreMeter({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  // 甘さ・コスパは5段階、炭酸は0〜4段階なのでmaxを外から渡せるようにする。
  // 予期しない値が来てもバーがはみ出さないよう、0〜100%に丸めて表示する。
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className="grid grid-cols-[64px_1fr_36px] items-center gap-2">
      <span className="text-[13px] font-bold text-[var(--muted)]">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-[var(--accent-soft)]">
        <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${percent}%` }} />
      </span>
      <span className="text-right text-[12px] font-bold text-[var(--text)]">{value.toFixed(1)}</span>
    </div>
  );
}
