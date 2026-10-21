import { cn } from "@/lib/utils";

export type LegendSwatchTone = "danger" | "warning" | "caution" | "brand" | "chart2";
// square는 Bar나 Cell의 Color를 뜻하는 작은 사각형, line은 선의 Color를 뜻하는 짧은 Bar
export type LegendSwatchShape = "square" | "line";

const toneClassNames: Record<LegendSwatchTone, string> = {
  danger: "bg-destructive",
  warning: "bg-warning",
  caution: "bg-caution",
  brand: "bg-brand-line4",
  chart2: "bg-chart-2",
};

const shapeClassNames: Record<LegendSwatchShape, string> = {
  square: "size-[0.5625rem] rounded-[0.125rem]",
  line: "h-[0.1875rem] w-3.5 rounded-[0.125rem]",
};

interface LegendSwatchProps {
  tone: LegendSwatchTone;
  label: string;
  shape?: LegendSwatchShape;
}

// Chart의 Color가 무엇을 뜻하는지 작은 사각형이나 짧은 Bar와 Label로 표시
export function LegendSwatch({ tone, label, shape = "square" }: LegendSwatchProps) {
  return (
    <span data-slot="legend-swatch" className="flex items-center gap-[0.3125rem]">
      <span
        data-slot="legend-swatch-mark"
        className={cn(shapeClassNames[shape], toneClassNames[tone])}
      />
      {label}
    </span>
  );
}
