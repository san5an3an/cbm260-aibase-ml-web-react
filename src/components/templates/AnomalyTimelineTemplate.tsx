import type { ReactNode } from "react";

interface AnomalyTimelineTemplateProps {
  filterBar: ReactNode;
  trendCard: ReactNode;
  detailCard: ReactNode;
}

// 이상 타임라인 화면 Layout 구성, Filter Row, 추이 Card, 상세 Card
export function AnomalyTimelineTemplate({
  filterBar,
  trendCard,
  detailCard,
}: AnomalyTimelineTemplateProps) {
  return (
    <div data-slot="anomaly-timeline" className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5">
      {filterBar}
      {trendCard}
      {detailCard}
    </div>
  );
}
