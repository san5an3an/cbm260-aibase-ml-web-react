import type { ReactNode } from "react";

interface EnsembleTemplateProps {
  filterBar: ReactNode;
  jobsCard: ReactNode;
  verdictCard: ReactNode;
}

// 모델 비교 화면 Layout 구성, Filter Row 아래 왼쪽에 Job Card 목록, 오른쪽 남는 Width에 판정
export function EnsembleTemplate({ filterBar, jobsCard, verdictCard }: EnsembleTemplateProps) {
  return (
    <div data-slot="ensemble" className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5">
      {filterBar}
      <div data-slot="ensemble-columns" className="flex min-h-0 flex-[1_1_0] gap-3.5">
        <div className="flex min-h-0 min-w-0 flex-[0_0_clamp(22.5rem,24vw,27.5rem)] flex-col">{jobsCard}</div>
        <div className="flex min-h-0 min-w-0 flex-[1_1_0] flex-col">{verdictCard}</div>
      </div>
    </div>
  );
}
