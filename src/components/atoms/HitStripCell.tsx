import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// 하루 동안 이상을 낸 Model 수, null은 그날 저장된 결과 없음
export type HitStripLevel = number | null;

// Model 수가 늘수록 진한 Color 지정
const levelClassNames = [
  "bg-muted",
  "bg-[color-mix(in_srgb,var(--caution)_45%,var(--card))]",
  "bg-[color-mix(in_srgb,var(--caution)_80%,var(--warning))]",
  "bg-warning",
] as const;

interface HitStripCellProps extends ComponentProps<"span"> {
  level: HitStripLevel;
}

// 날짜별 이상 정도를 Cell 하나로 표시, Tooltip 연결이 넘기는 props를 그대로 받음
export function HitStripCell({ level, className, ...props }: HitStripCellProps) {
  return (
    <span
      data-slot="hit-strip-cell"
      className={cn(
        "box-border h-3.5 w-[0.5625rem] rounded-[0.125rem]",
        level === null
          ? "border border-dashed border-border-strong"
          : levelClassNames[Math.min(Math.max(level, 0), levelClassNames.length - 1)],
        className,
      )}
      {...props}
    />
  );
}
