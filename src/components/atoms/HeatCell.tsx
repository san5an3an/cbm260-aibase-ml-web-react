import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// hot은 값이 있는 Cell, cold는 값이 없는 Cell
export type HeatCellTone = "hot" | "cold";

const toneClassNames: Record<HeatCellTone, string> = {
  hot: "bg-destructive",
  cold: "bg-muted",
};

interface HeatCellProps extends ComponentProps<"span"> {
  // Cell 안에 표시할 Text, 값이 없는 Cell은 빈 문자열
  value: string;
  tone: HeatCellTone;
}

// 격자 Cell 한 개의 값을 Color와 Text로 표시, Hover한 Cell은 둘레를 연한 회색으로 넓힘
export function HeatCell({ value, tone, className, ...props }: HeatCellProps) {
  return (
    <span
      data-slot="heat-cell"
      data-tone={tone}
      className={cn(
        "grid h-6 cursor-default place-items-center rounded-[0.25rem] text-[0.6875rem] font-bold text-primary-foreground transition-shadow timing-micro hover:shadow-[0_0_0_0.125rem_var(--muted)]",
        toneClassNames[tone],
        className,
      )}
      {...props}
    >
      {value}
    </span>
  );
}
