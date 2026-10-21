import { cn } from "@/lib/utils";

export type ChartLabelPillTone = "danger" | "warning";

const toneClassNames: Record<ChartLabelPillTone, string> = {
  danger: "bg-danger-subtle text-destructive",
  warning: "bg-warning-subtle text-warning-strong",
};

interface ChartLabelPillProps {
  tone: ChartLabelPillTone;
  label: string;
}

// Chart의 기준선에 붙는 Label 표시
export function ChartLabelPill({ tone, label }: ChartLabelPillProps) {
  return (
    <span
      data-slot="chart-label-pill"
      className={cn(
        "flex h-[1.125rem] items-center rounded-[0.25rem] px-1.5 text-[0.6875rem] font-bold whitespace-nowrap",
        toneClassNames[tone],
      )}
    >
      {label}
    </span>
  );
}
