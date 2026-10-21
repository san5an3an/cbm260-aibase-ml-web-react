import type { ReactNode } from "react";

interface InferenceTemplateProps {
  filterBar: ReactNode;
  jobsCard: ReactNode;
  resultsCard: ReactNode;
}

// 추론 화면 Layout 구성, Filter Row, 추론 Job Card, 남는 Height의 추론 결과
export function InferenceTemplate({ filterBar, jobsCard, resultsCard }: InferenceTemplateProps) {
  return (
    <div data-slot="inference" className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5">
      {filterBar}
      {jobsCard}
      {resultsCard}
    </div>
  );
}
