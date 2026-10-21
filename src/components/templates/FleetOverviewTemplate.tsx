import type { ReactNode } from "react";

interface FleetOverviewTemplateProps {
  kpiColumn: ReactNode;
  riskRanking: ReactNode;
  anomalyHistory: ReactNode;
  modelCoverage: ReactNode;
}

// 플릿 개요 화면 Layout 구성, KPI Column, 가운데 Card 둘, 커버리지 Card
export function FleetOverviewTemplate({
  kpiColumn,
  riskRanking,
  anomalyHistory,
  modelCoverage,
}: FleetOverviewTemplateProps) {
  return (
    <div data-slot="fleet-overview" className="flex min-h-0 flex-[1_1_0] gap-3.5">
      {kpiColumn}
      <div
        data-slot="fleet-overview-center"
        className="flex min-h-0 min-w-[37.5rem] flex-[1_1_0] flex-col gap-2.5"
      >
        {riskRanking}
        {anomalyHistory}
      </div>
      {modelCoverage}
    </div>
  );
}
