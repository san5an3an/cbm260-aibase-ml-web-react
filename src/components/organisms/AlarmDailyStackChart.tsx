"use client";

import { useReducedMotion } from "motion/react";
import {
  Bar,
  BarChart,
  Rectangle,
  XAxis,
  YAxis,
  usePlotArea,
  type BarShapeProps,
  type YAxisTickContentProps,
} from "recharts";
import { ChartCursorTooltip, type ChartTooltipText } from "@/components/molecules/ChartCursorTooltip";
import { alarmSeverityChartColors } from "@/components/organisms/alarmTones";
import {
  CHART_EASING,
  HOVERED_COLUMN_CLASS_NAME,
  HOVERED_COLUMN_FILL,
  HOVERED_COLUMN_SLOT,
} from "@/components/organisms/chartParts";
import { ChartContainer } from "@/components/ui/chart";
import type { AlarmSeverityKey, DailyAlarmCount } from "@/domain/alarms";
import { alarmSeverityKeys, alarmSeverityLabels } from "@/domain/labels/alarmSeverity";
import { formatIsoMonthDay } from "@/lib/formatTime";
import { motionDuration } from "@/lib/motion";
import { useRootFontSize } from "@/lib/useRootFontSize";

// 세로 눈금의 구간 수, 눈금의 끝은 가장 큰 합계를 이 수의 배수로 올린 값
const AXIS_STEP_COUNT = 3;

// Chart 안의 길이(rem), 기준 Font 크기를 곱해 Chart에 넘김
const AXIS_LABEL_WIDTH = 1.25;
const AXIS_LABEL_GAP = 0.5;
const AXIS_WIDTH = AXIS_LABEL_WIDTH + AXIS_LABEL_GAP;
// Bar 위에 합계 Text가 들어가는 여백
const TOP_HEADROOM = 1.1875;
// 눈금의 끝까지 찬 Bar의 Height
const PLOT_HEIGHT = 6;
const BASELINE_WIDTH = 0.0625;
const BAND_GAP = 0.625;
const BAR_MAX_WIDTH = 1.625;
const BAR_RADIUS = 0.125;
// Hover한 날의 Bar Radius
const HOVERED_BAND_RADIUS = 0.25;
const TICK_FONT_SIZE = 0.6875;
const TOTAL_LABEL_GAP = 0.125;

type SeverityCounts = Record<AlarmSeverityKey, number>;

interface ChartDay extends SeverityCounts {
  date: string;
  total: number;
}

// 가장 위에 쌓이는 심각도 반환, Alarm이 없는 날은 null
function findTopSeverity(day: SeverityCounts): AlarmSeverityKey | null {
  return [...alarmSeverityKeys].reverse().find((severity) => day[severity] > 0) ?? null;
}

// Band의 Width 계산, 간격을 뺀 Chart 영역을 날짜 수로 나눔
function bandWidth(plotWidth: number, count: number, rootFontSize: number): number {
  return (plotWidth - BAND_GAP * rootFontSize * (count - 1)) / count;
}

// Tooltip의 두 Row 구성, 날짜와 합계, 심각도별 수
const describeDay = (day: ChartDay): ChartTooltipText => ({
  title: `${formatIsoMonthDay(day.date)} · ${day.total}건`,
  detail: alarmSeverityKeys
    .map((severity) => `${alarmSeverityLabels[severity].label} ${day[severity]}`)
    .join(" · "),
});

interface StackSegmentProps extends Partial<BarShapeProps> {
  severity: AlarmSeverityKey;
  count: number;
  rootFontSize: number;
}

// Band의 가운데에 심각도 하나의 누적 조각 표시
function StackSegment({ index, y, height, payload, severity, count, rootFontSize }: StackSegmentProps) {
  const plotArea = usePlotArea();
  if (!plotArea || index === undefined || !height) return null;
  const band = bandWidth(plotArea.width, count, rootFontSize);
  const width = Math.min(BAR_MAX_WIDTH * rootFontSize, band);
  const left = plotArea.x + (band + BAND_GAP * rootFontSize) * index + (band - width) / 2;
  const radius = BAR_RADIUS * rootFontSize;
  const isTop = findTopSeverity(payload as ChartDay) === severity;
  return (
    <Rectangle
      data-slot="chart-stack-segment"
      data-severity={severity}
      x={left}
      y={y}
      width={width}
      height={height}
      radius={isTop ? [radius, radius, 0, 0] : 0}
      fill={alarmSeverityChartColors[severity]}
    />
  );
}

interface HoveredBandProps {
  // Mouse가 있는 Band의 번호, Chart가 채움
  payloadIndex?: string | number | null;
  count: number;
  rootFontSize: number;
}

// Hover한 날의 Band 전체에 연한 회색 기둥 표시
function HoveredBand({ payloadIndex, count, rootFontSize }: HoveredBandProps) {
  const plotArea = usePlotArea();
  if (!plotArea || payloadIndex === undefined || payloadIndex === null) return null;
  const index = Number(payloadIndex);
  const band = bandWidth(plotArea.width, count, rootFontSize);
  const headroom = TOP_HEADROOM * rootFontSize;
  const radius = HOVERED_BAND_RADIUS * rootFontSize;
  return (
    <Rectangle
      key={index}
      data-slot={HOVERED_COLUMN_SLOT}
      className={HOVERED_COLUMN_CLASS_NAME}
      x={plotArea.x + (band + BAND_GAP * rootFontSize) * index}
      y={plotArea.y - headroom}
      width={band}
      height={plotArea.height + headroom}
      radius={[radius, radius, 0, 0]}
      fill={HOVERED_COLUMN_FILL}
    />
  );
}

interface BaselineProps {
  rootFontSize: number;
}

// Bar 아래에 바닥선 표시
function Baseline({ rootFontSize }: BaselineProps) {
  const plotArea = usePlotArea();
  if (!plotArea) return null;
  const strokeWidth = BASELINE_WIDTH * rootFontSize;
  const y = plotArea.y + plotArea.height + strokeWidth / 2;
  return (
    <line
      data-slot="chart-baseline"
      x1={plotArea.x}
      x2={plotArea.x + plotArea.width}
      y1={y}
      y2={y}
      stroke="var(--muted-strong)"
      strokeWidth={strokeWidth}
    />
  );
}

interface AlarmDailyStackChartProps {
  days: readonly DailyAlarmCount[];
}

// 날짜별 Alarm 수를 심각도별로 쌓은 Bar로 표시
export function AlarmDailyStackChart({ days }: AlarmDailyStackChartProps) {
  const rootFontSize = useRootFontSize();
  const shouldReduceMotion = useReducedMotion();

  const px = (rem: number) => rem * rootFontSize;
  const data: ChartDay[] = days.map((day) => ({
    date: day.date,
    ...day.countsBySeverity,
    total: alarmSeverityKeys.reduce((sum, severity) => sum + day.countsBySeverity[severity], 0),
  }));
  const maxTotal = Math.max(0, ...data.map((day) => day.total));
  const axisMax = Math.max(1, Math.ceil(maxTotal / AXIS_STEP_COUNT)) * AXIS_STEP_COUNT;
  const axisTicks = Array.from(
    { length: AXIS_STEP_COUNT + 1 },
    (_, index) => (axisMax / AXIS_STEP_COUNT) * index,
  );

  // 가로 위치는 간격을 뺀 Chart 영역을 날짜 수로 나눈 Band의 가운데
  const bandCenter = (index: number) =>
    `calc((100% - ${BAND_GAP * (data.length - 1)}rem) * ${(index + 0.5) / data.length} + ${BAND_GAP * index}rem)`;
  const barTop = (day: ChartDay) => `${(day.total / axisMax) * 100}%`;

  return (
    <div data-slot="alarm-daily-stack-chart" className="flex flex-col gap-1.5">
      <div
        data-slot="chart-stack-plot"
        className="relative"
        style={{ height: `${TOP_HEADROOM + PLOT_HEIGHT + BASELINE_WIDTH}rem` }}
      >
        <ChartContainer
          config={{}}
          className="absolute inset-0 aspect-auto [&_.recharts-surface]:overflow-visible"
        >
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: px(TOP_HEADROOM), right: 0, bottom: px(BASELINE_WIDTH), left: 0 }}
          >
            <YAxis
              domain={[0, axisMax]}
              ticks={axisTicks}
              interval={0}
              width={px(AXIS_WIDTH)}
              tickSize={0}
              tickMargin={px(AXIS_LABEL_GAP)}
              axisLine={false}
              tickLine={false}
              tick={({ x, payload }: YAxisTickContentProps) => (
                <text
                  data-slot="chart-count-tick"
                  x={x}
                  y={payload.coordinate}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={px(TICK_FONT_SIZE)}
                  fontWeight={600}
                  fill="var(--muted-fg)"
                >
                  {payload.value}
                </text>
              )}
            />
            <XAxis
              dataKey="date"
              hide
              padding={{ left: -px(BAND_GAP) / 2, right: -px(BAND_GAP) / 2 }}
            />
            <Baseline rootFontSize={rootFontSize} />
            {alarmSeverityKeys.map((severity) => (
              <Bar
                key={severity}
                dataKey={severity}
                stackId="alarms"
                isAnimationActive={!shouldReduceMotion}
                animationDuration={motionDuration.slow * 1000}
                animationEasing={CHART_EASING}
                shape={
                  <StackSegment severity={severity} count={data.length} rootFontSize={rootFontSize} />
                }
              />
            ))}
            <ChartCursorTooltip
              size="compact"
              describe={describeDay}
              cursor={<HoveredBand count={data.length} rootFontSize={rootFontSize} />}
            />
          </BarChart>
        </ChartContainer>
        <div
          data-slot="chart-plot-overlay"
          className="pointer-events-none absolute right-0"
          style={{
            left: `${AXIS_WIDTH}rem`,
            top: `${TOP_HEADROOM}rem`,
            height: `${PLOT_HEIGHT}rem`,
          }}
        >
          {data.map((day, index) => (
            <span
              key={day.date}
              data-slot="chart-total-label"
              className="absolute -translate-x-1/2 text-[0.6875rem] leading-4 font-bold"
              style={{
                left: bandCenter(index),
                bottom: `calc(${barTop(day)} + ${TOTAL_LABEL_GAP}rem)`,
              }}
            >
              {day.total}
            </span>
          ))}
        </div>
      </div>
      <div
        data-slot="chart-date-row"
        className="flex gap-2.5 text-[0.6875rem] leading-[0.8125rem] font-semibold text-muted-foreground"
        style={{ marginLeft: `${AXIS_WIDTH}rem` }}
      >
        {data.map((day) => (
          <span
            key={day.date}
            data-slot="chart-date-label"
            className="min-w-0 flex-[1_1_0] text-center whitespace-nowrap"
          >
            {formatIsoMonthDay(day.date)}
          </span>
        ))}
      </div>
    </div>
  );
}
