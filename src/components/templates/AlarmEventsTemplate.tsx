import type { ReactNode } from "react";

interface AlarmEventsTemplateProps {
  filterBar: ReactNode;
  kpiRow: ReactNode;
  worklistCard: ReactNode;
  trendCard: ReactNode;
  carRankingCard: ReactNode;
}

// 알람/이벤트 화면 Layout 구성, Filter Row, KPI Row, 워크List, 오른쪽의 추이와 순위
export function AlarmEventsTemplate({
  filterBar,
  kpiRow,
  worklistCard,
  trendCard,
  carRankingCard,
}: AlarmEventsTemplateProps) {
  return (
    <div data-slot="alarm-events" className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5">
      {filterBar}
      {kpiRow}
      <div data-slot="alarm-events-body" className="flex min-h-0 flex-[1_1_0] gap-3.5">
        {worklistCard}
        <div
          data-slot="alarm-events-side"
          className="flex min-h-0 min-w-0 flex-[0_0_clamp(27.5rem,30vw,35rem)] flex-col gap-3.5 overflow-y-auto"
        >
          {trendCard}
          {carRankingCard}
        </div>
      </div>
    </div>
  );
}
