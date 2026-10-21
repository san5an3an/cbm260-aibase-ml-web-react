import type { ReactNode } from "react";

interface ModelDiagnosticsTemplateProps {
  filterBar: ReactNode;
  learningHealthCard: ReactNode;
  visualizationCard: ReactNode;
  rootCauseCard: ReactNode;
}

// 모델 진단 화면 Layout 구성, Filter Row, 왼쪽 위아래 Card 둘, 오른쪽 근본원인 Card
export function ModelDiagnosticsTemplate({
  filterBar,
  learningHealthCard,
  visualizationCard,
  rootCauseCard,
}: ModelDiagnosticsTemplateProps) {
  return (
    <div data-slot="model-diagnostics" className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5">
      {filterBar}
      <div className="flex min-h-0 flex-[1_1_0] gap-3.5">
        <div className="flex min-h-0 min-w-0 flex-[1_1_0] flex-col gap-3.5">
          {learningHealthCard}
          {visualizationCard}
        </div>
        {rootCauseCard}
      </div>
    </div>
  );
}
