import { KpiStat, type KpiStatTone } from "@/components/molecules/KpiStat";
import type { MeasureSummary } from "@/domain/measures";
import { measureActionLabels } from "@/domain/labels/measureAction";
import { measureInspectionLabels } from "@/domain/labels/measureInspection";

interface KpiCardDefinition {
  key: string;
  label: string;
  tone: KpiStatTone;
  value: (summary: MeasureSummary) => number;
  description: string;
}

// 여부의 이름과 Label의 코드 표기를 "조치 여부 N" 형태로 연결
function describeFlag(name: string, label: { codeLabel: string }): string {
  return `${name} ${label.codeLabel}`;
}

// KPI Card 목록 정의, 요약 수치를 Card 문구로 변환
const kpiCards: readonly KpiCardDefinition[] = [
  {
    key: "total",
    label: "총 조치대상",
    tone: "brand",
    value: (summary) => summary.totalCount,
    description: "이상 센서로 적재된 전체",
  },
  {
    key: "unactioned",
    label: measureActionLabels.N.stateLabel,
    tone: "danger",
    value: (summary) => summary.unactionedCount,
    description: describeFlag("조치 여부", measureActionLabels.N),
  },
  {
    key: "actioned",
    label: measureActionLabels.Y.stateLabel,
    tone: "success",
    value: (summary) => summary.actionedCount,
    description: describeFlag("조치 여부", measureActionLabels.Y),
  },
  {
    key: "uninspected",
    label: measureInspectionLabels.N.stateLabel,
    tone: "warning",
    value: (summary) => summary.uninspectedCount,
    description: describeFlag("검수 여부", measureInspectionLabels.N),
  },
];

interface MeasureKpiRowProps {
  summary: MeasureSummary;
}

// 조치 대상의 상태별 건수를 KPI Card로 가로 나열
export function MeasureKpiRow({ summary }: MeasureKpiRowProps) {
  return (
    <div
      data-slot="measure-kpi-row"
      className="grid h-28 flex-none gap-4"
      style={{ gridTemplateColumns: `repeat(${kpiCards.length}, minmax(0, 1fr))` }}
    >
      {kpiCards.map((card) => (
        <KpiStat
          key={card.key}
          label={card.label}
          value={String(card.value(summary))}
          unit="건"
          description={card.description}
          tone={card.tone}
        />
      ))}
    </div>
  );
}
