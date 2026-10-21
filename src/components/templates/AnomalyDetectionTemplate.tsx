import type { ReactNode } from "react";

interface AnomalyDetectionTemplateProps {
  filterBar: ReactNode;
  heatmapCard: ReactNode;
  detailCard: ReactNode;
}

// 이상 감지 내역 화면 Layout 구성, Filter Row, 장치별 이상 현황, 장치와 날짜 상세
export function AnomalyDetectionTemplate({ filterBar, heatmapCard, detailCard }: AnomalyDetectionTemplateProps) {
  return (
    <div data-slot="anomaly-detection" className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5">
      {filterBar}
      {heatmapCard}
      {detailCard}
    </div>
  );
}
