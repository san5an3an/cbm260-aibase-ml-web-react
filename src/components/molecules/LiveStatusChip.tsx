import { LiveDot } from "@/components/atoms/LiveDot";

interface LiveStatusChipProps {
  label: string;
}

// 실시간 모니터링 상태 표시
export function LiveStatusChip({ label }: LiveStatusChipProps) {
  return (
    <span data-slot="live-status-chip" className="flex h-8 items-center gap-1.5 rounded-md border border-success bg-card px-3 text-xs font-semibold text-on-success-subtle">
      <LiveDot />
      {label}
    </span>
  );
}
