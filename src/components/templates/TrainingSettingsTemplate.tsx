import type { ReactNode } from "react";

interface TrainingSettingsTemplateProps {
  filterBar: ReactNode;
  kpiRow: ReactNode;
  jobsCard: ReactNode;
  resultsCard: ReactNode;
}

// 재학습 설정 화면 Layout 구성, Filter Row, KPI Row, 학습 Job Card, 남는 Height의 학습 결과
export function TrainingSettingsTemplate({
  filterBar,
  kpiRow,
  jobsCard,
  resultsCard,
}: TrainingSettingsTemplateProps) {
  return (
    <div data-slot="training-settings" className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5">
      {filterBar}
      {kpiRow}
      {jobsCard}
      {resultsCard}
    </div>
  );
}
