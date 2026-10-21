import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  CursorTooltip,
  CursorTooltipTarget,
  useCursorTooltipHandle,
} from "@/components/molecules/CursorTooltip";
import { SectionCard } from "@/components/molecules/SectionCard";
import type {
  AnomalyCellCount,
  AnomalyCellKey,
  AnomalyCountBands,
  AnomalyCountTone,
  AnomalyHeatmap,
} from "@/domain/anomalyDetection";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

// 날짜의 요일 순번(일 0 ~ 토 6) 계산
export function weekdayIndex(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

// 날짜의 요일 이름 반환
export function weekdayName(isoDate: string): string {
  return WEEKDAYS[weekdayIndex(isoDate)];
}

// Cell Color 단계별 배경, Text Color, 점선
const toneClassNames: Record<AnomalyCountTone, string> = {
  none: "bg-card text-muted-foreground outline outline-dashed outline-border-strong -outline-offset-[0.0625rem]",
  zero: "bg-muted text-muted-foreground",
  caution: "bg-caution-subtle text-on-caution-subtle",
  warning: "bg-warning text-warning-fg",
  danger: "bg-destructive text-danger-fg",
};

// 추론 결과가 없는 장치의 Cell, 빗금 배경
const NO_RESULT_CELL_CLASS_NAME =
  "bg-[repeating-linear-gradient(135deg,var(--card)_0_0.1875rem,var(--muted)_0.1875rem_0.3125rem)] text-muted-foreground outline outline-dashed outline-border-strong -outline-offset-[0.0625rem]";

// 범례 항목 하나의 배경과 Border
const legendClassNames: Record<AnomalyCountTone, string> = {
  zero: "bg-muted",
  caution: "bg-caution-subtle",
  warning: "bg-warning",
  danger: "bg-destructive",
  none: "border border-dashed border-border-strong bg-card",
};

const LEGEND_ORDER: readonly AnomalyCountTone[] = ["zero", "caution", "warning", "danger", "none"];

// 범례의 이름, 기준 횟수로 Text 계산
function legendLabel(tone: AnomalyCountTone, bands: AnomalyCountBands): string {
  switch (tone) {
    case "zero":
      return "이상 없음";
    case "caution":
      return bands.cautionMax === 1 ? "1회" : `1~${bands.cautionMax}회`;
    case "warning":
      return `${bands.cautionMax + 1}~${bands.warningMax}회`;
    case "danger":
      return `${bands.warningMax + 1}회 이상`;
    case "none":
      return "추론 결과 없음";
  }
}

// 날짜 머리의 위 Text, 첫 Cell과 매달 1일은 월/일, 나머지는 일
function dateTopLabel(isoDate: string, index: number): string {
  const [, m, d] = isoDate.split("-").map(Number);
  return index === 0 || d === 1 ? `${m}/${d}` : String(d);
}

// Row 하나의 합계 Text 계산
function totalLabel(counts: readonly AnomalyCellCount[]): string {
  let total = 0;
  let days = 0;
  for (const count of counts) {
    if (count !== null && count > 0) {
      total += count;
      days += 1;
    }
  }
  return total > 0 ? `${days}일 · ${total}회` : "없음";
}

interface HeatRowProps {
  name: string;
  hasResult: boolean;
  cells: readonly { date: string; count: AnomalyCellCount }[];
  total: string;
  children: (cell: { date: string; count: AnomalyCellCount }, index: number) => ReactNode;
}

// 장치 한 Row(이름, Cell, 합계) 표시
function HeatRow({ name, hasResult, cells, total, children }: HeatRowProps) {
  return (
    <div
      data-slot="anomaly-heatmap-row"
      className={cn("flex items-center gap-1.5", !hasResult && "opacity-55")}
    >
      <span className="flex min-w-0 flex-[0_0_11.875rem] items-center gap-2 text-sm font-bold">
        <span
          data-slot="anomaly-heatmap-lamp"
          className={cn("size-3.5 flex-none rounded-full", hasResult ? "bg-destructive" : "bg-border-strong")}
        />
        <span data-slot="anomaly-heatmap-device" className="truncate">
          {name}
        </span>
      </span>
      {cells.map(children)}
      <span
        data-slot="anomaly-heatmap-total"
        className="flex-[0_0_6.875rem] text-center text-xs text-muted-foreground tabular-nums"
      >
        {total}
      </span>
    </div>
  );
}

interface AnomalyHeatmapCardProps {
  heatmap: AnomalyHeatmap;
  formation: string | null;
  selectedCell: AnomalyCellKey | null;
  onSelectCell: (cell: AnomalyCellKey) => void;
  // 새 현황을 기다리는 동안 격자를 옅게 표시
  isWaiting: boolean;
}

// 장치와 날짜 격자로 이상 판정 횟수와 범례, 추론 결과 없는 장치 보기 표시
export function AnomalyHeatmapCard({
  heatmap,
  formation,
  selectedCell,
  onSelectCell,
  isWaiting,
}: AnomalyHeatmapCardProps) {
  const tooltip = useCursorTooltipHandle();
  const [showsNoResult, setShowsNoResult] = useState(false);
  const { dates, rows, noResultDevices, countBands } = heatmap;
  const anomalyDeviceCount = rows.filter((row) => row.counts.some((count) => count !== null && count > 0)).length;
  const description = `${formation === null ? "전체 편성" : `편성 ${formation}`} · 추론 결과가 있는 장치 ${rows.length}개 중 ${anomalyDeviceCount}개에서 이상`;

  return (
    <SectionCard
      data-slot="anomaly-heatmap-card"
      eyebrow="ANOMALY HISTORY"
      title="장치별 이상 현황"
      description={description}
      aside={
        <div data-slot="anomaly-heatmap-legend" className="flex gap-3 text-[0.6875rem] text-muted-foreground">
          {LEGEND_ORDER.map((tone) => (
            <span key={tone} className="flex items-center gap-1">
              <span
                data-slot="anomaly-heatmap-legend-mark"
                className={cn("size-[0.5625rem] rounded-[0.125rem]", legendClassNames[tone])}
              />
              {legendLabel(tone, countBands)}
            </span>
          ))}
        </div>
      }
      className="min-h-0 flex-[0_1_auto]"
    >
      <div
        data-slot="anomaly-heatmap-scroll"
        aria-busy={isWaiting}
        className={cn("min-h-0 flex-[0_1_auto] overflow-auto timing-micro", isWaiting && "opacity-50")}
      >
        <div
          className="flex flex-col gap-1.5"
          style={{ minWidth: `${(312 + dates.length * 34) / 16}rem` }}
        >
          <div className="sticky top-0 z-[1] flex items-end gap-1.5 bg-card pb-1">
            <span className="flex-[0_0_11.875rem] pb-1.5 text-[0.6875rem] text-muted-foreground">장치</span>
            {dates.map((date, index) => {
              const weekday = weekdayIndex(date);
              return (
                <span
                  key={date}
                  data-slot="anomaly-heatmap-date"
                  className={cn(
                    "flex w-0 min-w-7 flex-[1_1_0] flex-col items-center text-[0.6875rem] leading-[0.875rem] font-semibold",
                    weekday === 0 || weekday === 6 ? "text-warning-strong" : "text-foreground",
                  )}
                >
                  <span>{dateTopLabel(date, index)}</span>
                  <span className="font-normal">{WEEKDAYS[weekday]}</span>
                </span>
              );
            })}
            <span className="flex-[0_0_6.875rem] pb-1.5 text-center text-[0.6875rem] text-muted-foreground">합계</span>
          </div>
          {rows.map((row) => (
            <HeatRow
              key={row.deviceCode}
              name={row.deviceName}
              hasResult
              cells={dates.map((date, index) => ({ date, count: row.counts[index] ?? null }))}
              total={totalLabel(row.counts)}
            >
              {({ date, count }) => {
                const isSelected = selectedCell?.deviceCode === row.deviceCode && selectedCell.date === date;
                return (
                  <CursorTooltipTarget
                    key={date}
                    handle={tooltip}
                    slot="anomaly-heatmap-cell"
                    text={{
                      title: `${row.deviceName} · ${date}`,
                      detail: count === null ? "추론 결과 없음" : `이상 ${count}회`,
                    }}
                  >
                    <button
                      type="button"
                      aria-label={`${row.deviceName} ${date} ${count === null ? "추론 결과 없음" : `이상 ${count}회`}`}
                      aria-pressed={isSelected}
                      aria-disabled={count === null || undefined}
                      onClick={() => {
                        if (count !== null) onSelectCell({ deviceCode: row.deviceCode, date });
                      }}
                      className={cn(
                        "h-[2.375rem] w-0 min-w-7 flex-[1_1_0] rounded-[0.125rem] border-0 p-0 text-[0.8125rem] font-bold",
                        toneClassNames[anomalyCountToneOf(count, countBands)],
                        count === null ? "cursor-default" : "cursor-pointer",
                        isSelected && "shadow-[inset_0_0_0_0.125rem_var(--brand-line4)]",
                      )}
                    >
                      {count ? String(count) : ""}
                    </button>
                  </CursorTooltipTarget>
                );
              }}
            </HeatRow>
          ))}
          {showsNoResult
            ? noResultDevices.map((device) => (
                <HeatRow
                  key={device.deviceCode}
                  name={device.deviceName}
                  hasResult={false}
                  cells={dates.map((date) => ({ date, count: null }))}
                  total="결과 없음"
                >
                  {({ date }) => (
                    <span
                      key={date}
                      data-slot="anomaly-heatmap-cell"
                      className={cn("h-[2.375rem] w-0 min-w-7 flex-[1_1_0] rounded-[0.125rem]", NO_RESULT_CELL_CLASS_NAME)}
                    />
                  )}
                </HeatRow>
              ))
            : null}
        </div>
      </div>
      <div className="flex flex-none items-center gap-4">
        <Button
          data-slot="anomaly-heatmap-none-toggle"
          variant="outline"
          onClick={() => setShowsNoResult((current) => !current)}
          className="h-8 rounded-sm px-3 text-sm font-medium timing-micro"
        >
          {showsNoResult ? "추론 결과 없는 장치 숨기기" : `추론 결과 없는 장치 ${noResultDevices.length}개 보기`}
        </Button>
        <span className="text-xs text-muted-foreground">
          칸 숫자 = 그날 30분마다 돈 자동 추론 중 이상으로 판정된 횟수 · 칸을 누르면 아래에 그 장치·그날의 상세가 나옵니다
        </span>
      </div>
      <CursorTooltip handle={tooltip} />
    </SectionCard>
  );
}

// Cell의 횟수와 받은 기준으로 Color 단계 판정
function anomalyCountToneOf(count: AnomalyCellCount, bands: AnomalyCountBands): AnomalyCountTone {
  if (count === null) return "none";
  if (count === 0) return "zero";
  if (count <= bands.cautionMax) return "caution";
  if (count <= bands.warningMax) return "warning";
  return "danger";
}
