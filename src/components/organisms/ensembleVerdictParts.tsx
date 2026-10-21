import { motion, useReducedMotion } from "motion/react";
import { formatAnomalyPercent, formatThreshold } from "@/components/organisms/inferenceRate";
import { inferenceRateTextClassNames } from "@/components/organisms/inferenceTones";
import type { AnomalyLevelKey } from "@/domain/anomaly";
import type { EnsembleConsensusVerdict, EnsembleModelVerdict, EnsembleWindowRange } from "@/domain/ensemble";
import { ensembleConsensusRuleLabels } from "@/domain/labels/ensembleConsensusRule";
import type { AnalysisModel } from "@/domain/model";
import { motionDuration, motionEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Bar가 가득 차는 이상 비율(%), Model 판정 Table과 다수결 Card에서 사용
const MODEL_BAR_FULL_PERCENT = 27;
const CONSENSUS_BAR_FULL_PERCENT = 28;
// 판정 Table의 Column 정의, Model, 이상 window, 이상 비율 Bar, 비율 Text, 임계값
export const ENSEMBLE_MODEL_COLUMNS = "minmax(9.375rem,1.1fr) 7.5rem minmax(12.5rem,3fr) 6.875rem 8.75rem";

// 구간에 속한 window 수 계산, 양 끝 포함
export function rangeWindowCount(range: EnsembleWindowRange): number {
  return range.endWindow - range.startWindow + 1;
}

// 등급별 Bar 배경과 채움 Color, 이상이 없으면 회색
const barClassNames: Record<AnomalyLevelKey, { track: string; fill: string }> = {
  danger: {
    track: "bg-danger-subtle",
    fill: "bg-[linear-gradient(90deg,color-mix(in_srgb,var(--danger)_70%,var(--card)),var(--danger))]",
  },
  warning: {
    track: "bg-warning-subtle",
    fill: "bg-[linear-gradient(90deg,color-mix(in_srgb,var(--warning)_70%,var(--card)),var(--warning))]",
  },
  caution: {
    track: "bg-caution-subtle",
    fill: "bg-[linear-gradient(90deg,color-mix(in_srgb,var(--caution)_70%,var(--card)),var(--caution))]",
  },
  normal: { track: "bg-muted", fill: "bg-muted-strong" },
};

// 이상 비율을 등급 Color의 굵은 Bar로 표시, 가득 차는 비율을 넘으면 가득 채움
function LevelRateBar({
  level,
  percent,
  fullPercent,
}: {
  level: AnomalyLevelKey;
  percent: number;
  fullPercent: number;
}) {
  const width = `${Math.min(100, (percent / fullPercent) * 100)}%`;
  // 처음 그릴 때 왼쪽부터 차오름, 다른 Chart와 같은 길이와 감속 곡선 사용, 움직임 줄이기 설정이면 바로 표시
  const shouldReduceMotion = useReducedMotion();
  return (
    <span data-slot="ensemble-rate-bar" className={cn("block h-2.5 rounded-[0.3125rem]", barClassNames[level].track)}>
      <motion.span
        data-slot="ensemble-rate-bar-fill"
        className={cn("block h-2.5 rounded-[0.3125rem]", barClassNames[level].fill)}
        initial={shouldReduceMotion ? false : { width: 0 }}
        animate={{ width }}
        transition={{ duration: motionDuration.slow, ease: motionEase.out }}
      />
    </span>
  );
}

interface EnsembleModelTableProps {
  models: readonly EnsembleModelVerdict[];
  windowCount: number;
  analysisModels: readonly AnalysisModel[];
  // 넘치면 Table 안에서 Scroll하고 머리글 Row를 위에 고정, 화면 판정 Card용
  scrollable: boolean;
}

// Model별 이상 window, 비율, 임계값 Table 표시
export function EnsembleModelTable({ models, windowCount, analysisModels, scrollable }: EnsembleModelTableProps) {
  return (
    <div
      data-slot="ensemble-model-table"
      role="table"
      className={cn(
        "rounded-[0.625rem] border border-border bg-card",
        scrollable ? "min-h-0 flex-[0_1_auto] overflow-auto" : "overflow-hidden",
      )}
    >
      <div
        role="row"
        data-slot="ensemble-model-table-head"
        className={cn("grid h-11 items-center border-b border-border bg-muted text-sm", scrollable && "sticky top-0 z-1")}
        style={{ gridTemplateColumns: ENSEMBLE_MODEL_COLUMNS }}
      >
        <span role="columnheader" className="px-4">모델</span>
        <span role="columnheader" className="px-4 text-right">이상 window</span>
        <span role="columnheader" className="px-4">이상 비율</span>
        <span role="columnheader" />
        <span role="columnheader" className="px-4 text-right">임계값</span>
      </div>
      {models.map((model) => (
        <div
          key={model.modelCode}
          role="row"
          data-slot="ensemble-model-row"
          className="grid h-14 items-center border-b border-border text-sm tabular-nums"
          style={{ gridTemplateColumns: ENSEMBLE_MODEL_COLUMNS }}
        >
          <span role="cell" className="flex flex-col px-4">
            <b>{model.modelCode}</b>
            <span className="text-xs text-muted-foreground">
              {analysisModels.find((item) => item.code === model.modelCode)?.name ?? model.modelCode}
            </span>
          </span>
          <span role="cell" className="px-4 text-right font-bold">{`${model.anomalyWindowCount} / ${windowCount}`}</span>
          <span role="cell" className="px-4">
            <LevelRateBar level={model.anomalyRateLevel} percent={model.anomalyRatePercent} fullPercent={MODEL_BAR_FULL_PERCENT} />
          </span>
          <span role="cell" className={cn("font-bold", inferenceRateTextClassNames[model.anomalyRateLevel])}>
            {formatAnomalyPercent(model.anomalyRatePercent)}
          </span>
          <span role="cell" className="px-4 text-right">{formatThreshold(model.threshold)}</span>
        </div>
      ))}
    </div>
  );
}

interface EnsembleConsensusCardsProps {
  consensus: readonly EnsembleConsensusVerdict[];
  windowCount: number;
  // 상세 Modal에서는 짧은 설명만 표시
  compact: boolean;
}

// 다수결 규칙별 이상 비율 Card를 2개 Column으로 표시
export function EnsembleConsensusCards({ consensus, windowCount, compact }: EnsembleConsensusCardsProps) {
  return (
    <div data-slot="ensemble-consensus-list" className="grid grid-cols-2 gap-3.5">
      {consensus.map((item) => {
        const labels = ensembleConsensusRuleLabels[item.rule];
        return (
          <div
            key={item.rule}
            data-slot="ensemble-consensus-card"
            className="flex flex-col gap-2.5 rounded-[0.75rem] border border-border bg-card px-[1.125rem] py-4"
          >
            <div className="flex items-center">
              <span className="text-base font-bold">{labels.label}</span>
              <span className="flex-1" />
              <span className="text-xs font-bold text-brand-line4-text">{labels.codeLabel}</span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span
                data-slot="ensemble-consensus-percent"
                className={cn("text-[2rem] leading-9 font-bold tabular-nums", inferenceRateTextClassNames[item.anomalyRateLevel])}
              >
                {formatAnomalyPercent(item.anomalyRatePercent)}
              </span>
              <span className="text-sm text-muted-foreground">{`${item.anomalyWindowCount} / ${windowCount} window`}</span>
            </div>
            <LevelRateBar level={item.anomalyRateLevel} percent={item.anomalyRatePercent} fullPercent={CONSENSUS_BAR_FULL_PERCENT} />
            <span className="text-sm text-muted-foreground">
              {compact ? labels.shortDescription : labels.description}
            </span>
            {compact ? null : <span className="text-xs text-muted-foreground">{labels.note}</span>}
          </div>
        );
      })}
    </div>
  );
}
