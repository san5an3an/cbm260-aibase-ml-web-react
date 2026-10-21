import { DigitTile } from "@/components/atoms/DigitTile";
import { kpiFlipCardClassName } from "@/components/atoms/kpiFlipCardClassName";
import { cn } from "@/lib/utils";

export type KpiTone = "brand" | "warning" | "danger" | "neutral";

const accentClassNames: Record<KpiTone, string> = {
  brand: "border-l-brand-line4",
  warning: "border-l-warning",
  danger: "border-l-destructive",
  neutral: "border-l-border-strong",
};

interface KpiFlipCardProps {
  label: string;
  value: string;
  unit: string;
  description: string;
  tone: KpiTone;
  // 새 값을 기다리는 동안 값과 설명을 옅게 표시, Layout과 이름은 그대로
  isWaiting: boolean;
}

// 숫자를 한 Text씩 Cell에 담아 보여 주는 KPI Card 표시
export function KpiFlipCard({
  label,
  value,
  unit,
  description,
  tone,
  isWaiting,
}: KpiFlipCardProps) {
  return (
    <div
      data-slot="kpi-flip-card"
      className={cn(kpiFlipCardClassName, accentClassNames[tone])}
    >
      <div data-slot="kpi-flip-card-label" className="text-base leading-[1.125rem] font-bold">
        {label}
      </div>
      <div
        data-slot="kpi-flip-card-value"
        className={cn("flex items-end gap-1", isWaiting && "opacity-50")}
      >
        {[...value].map((character, index) => (
          <DigitTile key={index} character={character} />
        ))}
        <span
          data-slot="kpi-flip-card-unit"
          className="pb-1 pl-0.5 text-base leading-5 whitespace-nowrap text-muted-foreground"
        >
          {unit}
        </span>
      </div>
      <div
        data-slot="kpi-flip-card-description"
        className={cn("text-xs leading-4 text-muted-foreground", isWaiting && "opacity-50")}
      >
        {description}
      </div>
    </div>
  );
}
