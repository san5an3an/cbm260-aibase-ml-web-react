import type { ReactNode } from "react";

interface ThresholdTuningTemplateProps {
  filterBar: ReactNode;
  kpiRow: ReactNode;
  previewCard: ReactNode;
}

// 임계값 튜닝 화면 Layout 구성, Filter Row, KPI Row, 임계 민감도 Card
export function ThresholdTuningTemplate({ filterBar, kpiRow, previewCard }: ThresholdTuningTemplateProps) {
  return (
    <div data-slot="threshold-tuning" className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5">
      {filterBar}
      {kpiRow}
      {previewCard}
    </div>
  );
}
