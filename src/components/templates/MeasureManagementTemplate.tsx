import type { ReactNode } from "react";

interface MeasureManagementTemplateProps {
  filterBar: ReactNode;
  kpiRow: ReactNode;
  worklistCard: ReactNode;
  rankingCard: ReactNode;
}

// 조치 관리 화면 Layout 구성, Filter Row, KPI Row, 조치 워크List, 오른쪽의 센서 순위
export function MeasureManagementTemplate({
  filterBar,
  kpiRow,
  worklistCard,
  rankingCard,
}: MeasureManagementTemplateProps) {
  return (
    <div data-slot="measure-management" className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5">
      {filterBar}
      {kpiRow}
      <div data-slot="measure-management-body" className="flex min-h-0 flex-[1_1_0] gap-3.5">
        {worklistCard}
        {rankingCard}
      </div>
    </div>
  );
}
