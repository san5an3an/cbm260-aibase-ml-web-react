import { kpiStatFrameClassName } from "@/components/atoms/kpiStatFrameClassName";
import { cn } from "@/lib/utils";

export type KpiStatTone = "brand" | "danger" | "warning" | "success" | "neutral";

const accentClassNames: Record<KpiStatTone, string> = {
  brand: "border-l-brand-line4",
  danger: "border-l-destructive",
  warning: "border-l-warning",
  success: "border-l-success",
  neutral: "border-l-border-strong",
};

interface KpiStatProps {
  label: string;
  value: string;
  unit: string;
  description: string;
  tone: KpiStatTone;
  // Card가 좁아져도 값은 한 Row로 두고 설명은 넘치면 말줄임으로 표시
  singleLine?: boolean;
}

// 이름, 큰 숫자, 설명으로 된 KPI Card 표시
export function KpiStat({
  label,
  value,
  unit,
  description,
  tone,
  singleLine = false,
}: KpiStatProps) {
  return (
    <div
      data-slot="kpi-stat"
      className={cn(
        kpiStatFrameClassName,
        accentClassNames[tone],
        singleLine && "min-w-0",
      )}
    >
      <div data-slot="kpi-stat-label" className="text-base leading-[1.375rem] font-bold">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          data-slot="kpi-stat-value"
          className={cn(
            "text-[1.875rem] leading-[2.125rem] font-bold tabular-nums",
            singleLine && "whitespace-nowrap",
          )}
        >
          {value}
        </span>
        <span data-slot="kpi-stat-unit" className="text-[0.8125rem] text-muted-foreground">
          {unit}
        </span>
      </div>
      <div
        data-slot="kpi-stat-description"
        className={cn("text-xs leading-4 text-muted-foreground", singleLine && "truncate")}
      >
        {description}
      </div>
    </div>
  );
}
