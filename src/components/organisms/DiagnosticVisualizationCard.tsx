import { StatePill } from "@/components/atoms/StatePill";
import { SectionCard } from "@/components/molecules/SectionCard";
import { ScoreDistributionChart } from "@/components/organisms/ScoreDistributionChart";
import type { DiagnosticVisualizationKind, ScoreDistribution } from "@/domain/diagnostics";
import { diagnosticVisualizationLabels } from "@/domain/labels/diagnosticVisualization";

interface DiagnosticVisualizationCardProps {
  modelCode: string;
  visualization: DiagnosticVisualizationKind;
  distribution: ScoreDistribution;
}

// Model 내부 점수의 분포와 임계값을 보여 주는 진단 시각화 Card 표시
export function DiagnosticVisualizationCard({
  modelCode,
  visualization,
  distribution,
}: DiagnosticVisualizationCardProps) {
  return (
    <SectionCard
      data-slot="diagnostic-visualization-card"
      eyebrow="MODEL DIAGNOSTIC"
      title="모델 진단 시각화"
      description="모델 내부 시각화 — IF 트리 깊이 · SVM 경계 · VAE 잠재공간"
      aside={
        <StatePill
          size="md"
          tone="brand"
          label={`${modelCode} · ${diagnosticVisualizationLabels[visualization]}`}
        />
      }
      className="min-h-0 flex-[1_1_0] overflow-hidden"
    >
      <div
        data-slot="diagnostic-visualization-box"
        className="flex min-h-0 flex-[1_1_0] flex-col gap-2 overflow-hidden rounded-[0.625rem] border border-border bg-card px-6 pt-10 pb-4"
      >
        <ScoreDistributionChart distribution={distribution} />
      </div>
    </SectionCard>
  );
}
