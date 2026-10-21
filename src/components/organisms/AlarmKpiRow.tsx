import { KpiStat, type KpiStatTone } from "@/components/molecules/KpiStat";
import type { AlarmStatusKey, AlarmSummary } from "@/domain/alarms";
import { alarmStatusLabels } from "@/domain/labels/alarmStatus";
import { cn } from "@/lib/utils";

interface KpiCardDefinition {
  key: string;
  label: string;
  tone: KpiStatTone;
  value: (summary: AlarmSummary) => number;
  description: string;
}

// 상태 하나의 Alarm 수를 보여 주는 Card 정의
function statusCard(status: AlarmStatusKey, tone: KpiStatTone): KpiCardDefinition {
  return {
    key: status,
    label: alarmStatusLabels[status].label,
    tone,
    value: (summary) => summary.countsByStatus[status],
    description: alarmStatusLabels[status].codeLabel,
  };
}

// KPI Card 목록 정의, 요약 수치를 Card의 Text로 변환
const kpiCards: readonly KpiCardDefinition[] = [
  {
    key: "open",
    label: "미처리 (open)",
    tone: "brand",
    value: (summary) => summary.openCount,
    description: `${alarmStatusLabels.NEW.label} + ${alarmStatusLabels.ACK.label} + ${alarmStatusLabels.IN_PROGRESS.label}`,
  },
  statusCard("NEW", "danger"),
  statusCard("IN_PROGRESS", "warning"),
  statusCard("RESOLVED", "success"),
  statusCard("FALSE_POSITIVE", "neutral"),
];

// 기다리는 동안 옅게 할 Card 안의 값, Card의 Layout, 이름, 설명은 그대로 둠
const waitingValueClassName =
  "[&_[data-slot=kpi-stat-unit]]:opacity-50 [&_[data-slot=kpi-stat-value]]:opacity-50";

interface AlarmKpiRowProps {
  summary: AlarmSummary;
  // 요약을 다시 받는 동안 값을 옅게 하고 화면 읽기 도구에 대기 중임을 알림
  isWaiting: boolean;
}

// Alarm의 상태별 건수를 KPI Card로 가로로 나열
export function AlarmKpiRow({ summary, isWaiting }: AlarmKpiRowProps) {
  return (
    <div
      data-slot="alarm-kpi-row"
      aria-busy={isWaiting || undefined}
      className={cn("grid h-28 flex-none gap-4", isWaiting && waitingValueClassName)}
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
