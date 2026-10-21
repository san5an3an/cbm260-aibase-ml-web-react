import { cn } from "@/lib/utils";

export type LegendDotTone =
  | "borderStrong"
  | "caution"
  | "warningStrong"
  | "danger"
  | "brandText"
  | "success";

const toneClassNames: Record<LegendDotTone, string> = {
  borderStrong: "bg-border-strong",
  caution: "bg-caution",
  warningStrong: "bg-warning-strong",
  danger: "bg-destructive",
  brandText: "bg-brand-line4-text",
  success: "bg-success",
};

interface LegendDotProps {
  tone: LegendDotTone;
  label: string;
  className?: string;
}

// Chart의 Color가 무엇을 뜻하는지 작은 점과 Label로 표시
export function LegendDot({ tone, label, className }: LegendDotProps) {
  return (
    <span data-slot="legend-dot" className={cn("flex items-center gap-1", className)}>
      <span
        data-slot="legend-dot-mark"
        className={cn("size-2 rounded-[0.125rem]", toneClassNames[tone])}
      />
      {label}
    </span>
  );
}
