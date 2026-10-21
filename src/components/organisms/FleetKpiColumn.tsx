import { KpiFlipCard, type KpiTone } from "@/components/molecules/KpiFlipCard";
import type { FleetSummary } from "@/domain/fleet";
import { formatIsoDate, formatIsoHourMinute } from "@/lib/formatTime";

// 추론이 한 건도 없을 때 시각 위치에 표시할 문구
const EMPTY_TIME = "--:--";

interface KpiCardDefinition {
  key: string;
  label: string;
  tone: KpiTone;
  value: (summary: FleetSummary) => string;
  unit: (summary: FleetSummary) => string;
  description: (summary: FleetSummary) => string;
}

// KPI Card 목록 정의, 요약 수치를 Card 문구로 변환
const kpiCards: readonly KpiCardDefinition[] = [
  {
    key: "inference-total",
    label: "총 추론 건수",
    tone: "brand",
    value: (summary) => String(summary.totalInferenceCount),
    unit: () => "건",
    description: () => "누적 · 장치×세그먼트 판정 1건 = 1행",
  },
  {
    key: "covered-devices",
    label: "커버 장치·세그먼트",
    tone: "brand",
    value: (summary) => String(summary.coveredDeviceCount),
    unit: (summary) => `장치 · 세그먼트 ${summary.coveredSegmentCount}`,
    description: () => "추론 이력이 있는 고유 장치 / 장치×세그먼트",
  },
  {
    key: "anomaly-rate",
    label: "평균 이상비율 (최신)",
    tone: "warning",
    value: (summary) => summary.latestAnomalyRatePercent.toFixed(1),
    unit: () => "%",
    description: (summary) =>
      `장치×세그먼트 최신 추론 기준 · 누적 평균 ${summary.cumulativeAnomalyRatePercent.toFixed(1)}%`,
  },
  {
    key: "alerts",
    label: "경보 (경고+위험)",
    tone: "danger",
    value: (summary) => String(summary.alertDeviceCount).padStart(2, "0"),
    unit: () => "개 장치",
    description: (summary) =>
      `최신 상태 기준 · 위험 ${summary.dangerDeviceCount} · 경고 ${summary.warningDeviceCount}`,
  },
  {
    key: "last-inference",
    label: "최근 추론",
    tone: "neutral",
    value: (summary) =>
      summary.lastInferenceAt === null ? EMPTY_TIME : formatIsoHourMinute(summary.lastInferenceAt),
    unit: () => "",
    description: (summary) =>
      summary.lastInferenceAt === null
        ? "데이터 신선도"
        : `${formatIsoDate(summary.lastInferenceAt)} · 데이터 신선도`,
  },
];

interface FleetKpiColumnProps {
  summary: FleetSummary;
  // 새 요약을 기다리는 동안 값을 옅게 표시하고 화면 읽기 프로그램에 기다리는 중임을 알림
  isWaiting: boolean;
}

// Fleet 개요의 KPI Card를 세로로 나열
export function FleetKpiColumn({ summary, isWaiting }: FleetKpiColumnProps) {
  return (
    <div
      data-slot="fleet-kpi-column"
      aria-busy={isWaiting}
      className="flex min-h-0 flex-[0_0_clamp(14.5rem,15vw,18rem)] flex-col gap-3.5 overflow-y-auto"
    >
      {kpiCards.map((card) => (
        <KpiFlipCard
          key={card.key}
          label={card.label}
          value={card.value(summary)}
          unit={card.unit(summary)}
          description={card.description(summary)}
          tone={card.tone}
          isWaiting={isWaiting}
        />
      ))}
    </div>
  );
}
