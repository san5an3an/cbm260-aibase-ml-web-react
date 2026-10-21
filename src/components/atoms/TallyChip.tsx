interface TallyChipProps {
  label: string;
  count: string;
}

// 항목 이름과 개수를 작은 알약 모양으로 표시
export function TallyChip({ label, count }: TallyChipProps) {
  return (
    <span
      data-slot="tally-chip"
      className="flex h-5 items-center gap-1 rounded-[0.625rem] bg-muted px-2 font-semibold whitespace-nowrap text-foreground"
    >
      {label} <b data-slot="tally-chip-count">{count}</b>
    </span>
  );
}
