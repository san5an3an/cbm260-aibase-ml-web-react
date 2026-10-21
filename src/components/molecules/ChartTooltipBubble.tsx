import { tooltipBubbleClassName } from "@/components/atoms/tooltipBubbleClassName";
import { cn } from "@/lib/utils";

export type ChartTooltipBubbleSize = "default" | "compact";

// Cursor를 따라다니는 Tooltip과 Cursor 사이의 간격(rem), Chart Tooltip과 직접 그린 Cell의 Tooltip이 함께 사용
export const TOOLTIP_CURSOR_GAP = 0.75;

// Tooltip의 두 Row, 첫 Row와 둘째 Row(없으면 한 Row)
export interface ChartTooltipText {
  title: string;
  detail?: string;
}

const sizeClassNames: Record<ChartTooltipBubbleSize, string> = {
  default:
    "items-center gap-0.5 rounded-md px-3 py-2 text-background tabular-nums shadow-[0_0.375rem_1rem_rgba(0,0,0,0.2)]",
  compact: tooltipBubbleClassName,
};

interface ChartTooltipBubbleProps extends ChartTooltipText {
  size?: ChartTooltipBubbleSize;
}

// Chart의 값에 Hover했을 때 뜨는 어두운 Tooltip 표시
export function ChartTooltipBubble({ title, detail, size = "default" }: ChartTooltipBubbleProps) {
  return (
    <span
      data-slot="chart-tooltip-bubble"
      className={cn(
        "pointer-events-none flex flex-col bg-foreground whitespace-nowrap",
        sizeClassNames[size],
      )}
    >
      <b className={size === "default" ? "text-xs" : undefined}>{title}</b>
      {detail ? (
        <span className={size === "default" ? "text-[0.6875rem] opacity-85" : undefined}>
          {detail}
        </span>
      ) : null}
    </span>
  );
}
