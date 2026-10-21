import { LegendSwatch } from "@/components/atoms/LegendSwatch";
import { SectionCard } from "@/components/molecules/SectionCard";
import { DailyAnomalyBarChart } from "@/components/organisms/DailyAnomalyBarChart";
import type { AnomalyLevelThresholds } from "@/domain/anomaly";
import { anomalyLevelLabels } from "@/domain/labels/anomalyLevel";
import type { DailyAnomalyPoint } from "@/domain/timeline";

// 추이 Card의 Height, 화면 높이의 40%를 300에서 380 사이로 제한, Loading Skeleton도 같은 Height 사용
export const DAILY_TREND_CARD_SIZE_CLASS_NAME = "min-h-0 flex-[0_0_clamp(18.75rem,40%,23.75rem)]";

interface DailyAnomalyTrendCardProps {
  points: readonly DailyAnomalyPoint[];
  levelThresholds: AnomalyLevelThresholds;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

// 일별 평균 이상비율의 추이를 Bar Chart로 보여 주는 Card 표시
export function DailyAnomalyTrendCard({
  points,
  levelThresholds,
  selectedDate,
  onSelectDate,
}: DailyAnomalyTrendCardProps) {
  const { danger, warning, caution } = anomalyLevelLabels;

  return (
    <SectionCard
      data-slot="daily-anomaly-trend-card"
      eyebrow="DAILY TREND"
      title="일별 이상 추이"
      description={`막대 높이 = 그날의 평균 이상비율 · 색 = 상태 기준(표·배지와 동일) · 점선 = ${warning.label} ${levelThresholds.warningMinPercent}% / ${danger.label} ${levelThresholds.dangerMinPercent}% 기준선`}
      aside={
        <span
          data-slot="daily-anomaly-trend-legend"
          className="flex gap-3.5 text-xs text-muted-foreground"
        >
          <LegendSwatch tone="caution" label={caution.label} />
          <LegendSwatch tone="warning" label={warning.label} />
          <LegendSwatch tone="danger" label={danger.label} />
        </span>
      }
      className={DAILY_TREND_CARD_SIZE_CLASS_NAME}
    >
      <DailyAnomalyBarChart
        points={points}
        levelThresholds={levelThresholds}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />
    </SectionCard>
  );
}
