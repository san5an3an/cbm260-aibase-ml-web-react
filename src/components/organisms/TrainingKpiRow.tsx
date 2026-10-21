import { KpiStat, type KpiStatTone } from "@/components/molecules/KpiStat";
import type { TrainingSummary } from "@/domain/training";
import { trainingJobStatusLabels } from "@/domain/labels/trainingJobStatus";
import { trainingStageLabels } from "@/domain/labels/trainingStage";
import { formatIsoDate, formatIsoHourMinute, formatIsoMonthDay } from "@/lib/formatTime";

// 값이 없을 때 표시할 문구
const EMPTY_VALUE = "-";
// List 항목을 한 줄로 이을 때의 구분 문자
const SEPARATOR = " · ";

interface KpiCardDefinition {
  key: string;
  label: (summary: TrainingSummary) => string;
  tone: KpiStatTone;
  value: (summary: TrainingSummary) => string;
  unit: string;
  description: (summary: TrainingSummary) => string;
}

// KPI Card List 정의, 요약 값을 Card에 표시할 Text로 변환
const kpiCards: readonly KpiCardDefinition[] = [
  {
    key: "history",
    label: () => "총 학습 이력",
    tone: "brand",
    value: (summary) => String(summary.historyCount),
    unit: "건",
    description: () => "장치×세그먼트×모델×버전 = 1행",
  },
  {
    key: "models",
    label: () => "학습 모델 종류",
    tone: "brand",
    value: (summary) => String(summary.modelCodes.length),
    unit: "종",
    description: (summary) =>
      summary.modelCodes.length === 0 ? EMPTY_VALUE : summary.modelCodes.join(SEPARATOR),
  },
  {
    key: "active",
    label: () => "진행중 학습",
    tone: "warning",
    value: (summary) => String(summary.activeJobCount),
    unit: "건",
    description: (summary) =>
      [
        `${trainingJobStatusLabels.queued.label} ${summary.queuedJobCount}`,
        `${trainingStageLabels.preprocess.label} ${summary.runningJobCountsByStage.preprocess}`,
        `${trainingStageLabels.train.label} ${summary.runningJobCountsByStage.train}`,
      ].join(SEPARATOR),
  },
  {
    key: "latest",
    label: () => "최근 학습 일시",
    tone: "neutral",
    value: ({ latestTraining }) =>
      latestTraining === null
        ? EMPTY_VALUE
        : `${formatIsoMonthDay(latestTraining.trainedAt)} ${formatIsoHourMinute(latestTraining.trainedAt)}`,
    unit: "",
    description: ({ latestTraining }) =>
      latestTraining === null
        ? EMPTY_VALUE
        : `${formatIsoDate(latestTraining.trainedAt)}${SEPARATOR}${latestTraining.deviceCode}`,
  },
  {
    key: "failed",
    label: (summary) => `실패 학습 (${summary.failureWindowDays}일)`,
    tone: "danger",
    value: (summary) => String(summary.failedJobCount),
    unit: "건",
    description: ({ latestFailure }) =>
      latestFailure === null
        ? EMPTY_VALUE
        : [latestFailure.deviceCode, latestFailure.modelCode, latestFailure.failureReason].join(
            SEPARATOR,
          ),
  },
];

interface TrainingKpiRowProps {
  summary: TrainingSummary;
}

// 학습 이력, Model, 진행 중, 최근 학습, 실패의 요약을 KPI Card로 가로 나열
export function TrainingKpiRow({ summary }: TrainingKpiRowProps) {
  return (
    <div
      data-slot="training-kpi-row"
      className="grid h-28 flex-none gap-4"
      style={{ gridTemplateColumns: `repeat(${kpiCards.length}, minmax(0, 1fr))` }}
    >
      {kpiCards.map((card) => (
        <KpiStat
          key={card.key}
          label={card.label(summary)}
          value={card.value(summary)}
          unit={card.unit}
          description={card.description(summary)}
          tone={card.tone}
          singleLine
        />
      ))}
    </div>
  );
}
