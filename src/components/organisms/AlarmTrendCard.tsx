import { LegendDot } from "@/components/atoms/LegendDot";
import { TallyChip } from "@/components/atoms/TallyChip";
import { SectionCard } from "@/components/molecules/SectionCard";
import { AlarmDailyStackChart } from "@/components/organisms/AlarmDailyStackChart";
import { alarmSeverityLegendTones } from "@/components/organisms/alarmTones";
import type { AlarmTrend } from "@/domain/alarms";
import { alarmSeverityKeys, alarmSeverityLabels } from "@/domain/labels/alarmSeverity";
import { alarmSourceLabels } from "@/domain/labels/alarmSource";
import { cn } from "@/lib/utils";

interface TallyRow {
  label: string;
  chips: readonly { key: string; label: string; count: number }[];
}

interface AlarmTrendCardProps {
  trend: AlarmTrend;
  // 추이를 다시 받는 동안 Chart와 집계를 옅게 하고 화면 읽기 도구에 대기 중임을 알림
  isWaiting: boolean;
}

// 날짜별 Alarm 수의 누적 Bar와 심각도, 출처, Model별 집계를 보여 주는 Card 표시
export function AlarmTrendCard({ trend, isWaiting }: AlarmTrendCardProps) {
  const tallyRows: readonly TallyRow[] = [
    {
      label: "심각도",
      chips: trend.severityTallies.map((tally) => ({
        key: tally.severity,
        label: alarmSeverityLabels[tally.severity].label,
        count: tally.count,
      })),
    },
    {
      label: "출처",
      chips: trend.sourceTallies.map((tally) => ({
        key: tally.source,
        label: alarmSourceLabels[tally.source],
        count: tally.count,
      })),
    },
    {
      label: "모델",
      chips: trend.modelTallies.map((tally) => ({
        key: tally.modelCode,
        label: tally.modelCode,
        count: tally.count,
      })),
    },
  ];

  return (
    <SectionCard
      data-slot="alarm-trend-card"
      eyebrow="ALARM TREND"
      title="날짜별 알람 수"
      aside={
        <span
          data-slot="alarm-trend-legend"
          className="flex gap-3 text-[0.6875rem] leading-[0.8125rem] text-muted-foreground"
        >
          {alarmSeverityKeys.map((severity) => (
            <LegendDot
              key={severity}
              tone={alarmSeverityLegendTones[severity]}
              label={alarmSeverityLabels[severity].label}
            />
          ))}
        </span>
      }
      className="flex-none"
    >
      <div
        data-slot="alarm-trend-panel"
        aria-busy={isWaiting || undefined}
        className={cn(
          "flex flex-col gap-2.5 rounded-lg border border-border px-3.5 pt-3.5 pb-3",
          isWaiting && "*:opacity-50",
        )}
      >
        <AlarmDailyStackChart days={trend.days} />
        <div data-slot="alarm-trend-tallies" className="flex flex-col gap-1.5">
          {tallyRows.map((row) => (
            <div
              key={row.label}
              data-slot="alarm-trend-tally-row"
              className="flex items-center gap-1.5 text-[0.6875rem]"
            >
              <span className="w-12 flex-none text-muted-foreground">{row.label}</span>
              {row.chips.map((chip) => (
                <TallyChip key={chip.key} label={chip.label} count={String(chip.count)} />
              ))}
            </div>
          ))}
        </div>
        <div data-slot="alarm-trend-note" className="text-xs leading-4 text-muted-foreground">
          알람 {trend.totalCount}건 기준 · 날짜 = 알람이 난 데이터 날짜 · 막대에 마우스를 올리면
          심각도별 수
        </div>
      </div>
    </SectionCard>
  );
}
