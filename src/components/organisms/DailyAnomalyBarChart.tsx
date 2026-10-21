"use client";

import { useId, useRef, type MouseEvent } from "react";
import { useReducedMotion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ReferenceLine,
  XAxis,
  YAxis,
  usePlotArea,
  type BarShapeProps,
  type XAxisTickContentProps,
  type YAxisTickContentProps,
} from "recharts";
import { ChartLabelPill } from "@/components/atoms/ChartLabelPill";
import { ChartCursorTooltip, type ChartTooltipText } from "@/components/molecules/ChartCursorTooltip";
import {
  CHART_EASING,
  HOVERED_COLUMN_CLASS_NAME,
  HOVERED_COLUMN_FILL,
  HOVERED_COLUMN_SLOT,
} from "@/components/organisms/chartParts";
import { ChartContainer } from "@/components/ui/chart";
import type { AnomalyLevelKey, AnomalyLevelThresholds } from "@/domain/anomaly";
import { anomalyLevelLabels } from "@/domain/labels/anomalyLevel";
import type { DailyAnomalyPoint } from "@/domain/timeline";
import { formatIsoMonthDay } from "@/lib/formatTime";
import { motionDuration } from "@/lib/motion";
import { useRootFontSize } from "@/lib/useRootFontSize";

// 세로 눈금의 최댓값(%)과 눈금 위치
const AXIS_MAX_PERCENT = 40;
const AXIS_TICKS = [0, 10, 20, 30, 40];
// 날짜가 이 개수 이상이면 아래 날짜를 하나씩 건너뛰며 표시
const DENSE_POINT_COUNT = 30;

// Chart 안의 길이(rem), 기준 Font 크기를 곱해 Chart에 넘김
const AXIS_WIDTH = 2.875;
const AXIS_LABEL_GAP = 0.375;
const TOP_MARGIN = 0.375;
const DATE_ROW_GAP = 0.5;
const BARS_END_PADDING = 1.25;
const BAR_WIDTH = 1.5;
const BAR_RADIUS = 0.25;
// 선택한 날과 Hover한 날의 기둥 Width
const COLUMN_WIDTH = 2.625;
const COLUMN_RISE = 0.375;
const TICK_FONT_SIZE = 0.6875;
// Font(Roboto)의 줄 높이와 기준선 위 높이가 Font 크기에서 차지하는 비율
const FONT_LINE_HEIGHT_RATIO = 1.171875;
const FONT_ASCENT_RATIO = 0.927734375;
// 날짜 Row의 Height, Chart와의 간격에 Text 한 줄 높이를 더해 계산
const DATE_ROW_HEIGHT = DATE_ROW_GAP + TICK_FONT_SIZE * FONT_LINE_HEIGHT_RATIO;
const REFERENCE_STROKE_WIDTH = 0.09375;
const REFERENCE_DASH = 0.28125;
// Bar와 기둥이 한 구간에서 차지할 수 있는 최대 비율
const BAR_MAX_BAND_RATIO = 0.7;
const COLUMN_MAX_BAND_RATIO = 0.96;

const BAR_LEVELS: readonly AnomalyLevelKey[] = ["danger", "warning", "caution", "normal"];
const levelColors: Record<AnomalyLevelKey, string> = {
  danger: "var(--danger)",
  warning: "var(--warning)",
  caution: "var(--caution)",
  normal: "var(--success)",
};

interface ChartPoint extends DailyAnomalyPoint {
  barValue: number;
}

// Tooltip의 두 줄 구성, 날짜와 평균 이상비율, 추론 건수와 이상 window
const describePoint = (point: ChartPoint): ChartTooltipText => ({
  title: `${formatIsoMonthDay(point.date)} · 평균 이상비율 ${point.averageRatePercent.toFixed(2)}%`,
  detail: `추론 ${point.inferenceCount}건 · 이상 window ${point.anomalyWindowCount}`,
});

interface ColumnHighlightProps {
  index: number;
  count: number;
  rootFontSize: number;
  fill: string;
  slot: string;
  className?: string;
}

// 한 구간의 Bar 뒤에 옅은 기둥 표시
function ColumnHighlight({ index, count, rootFontSize, fill, slot, className }: ColumnHighlightProps) {
  const plotArea = usePlotArea();
  if (!plotArea || index < 0) return null;
  const band = (plotArea.width - BARS_END_PADDING * rootFontSize) / count;
  const width = Math.min(COLUMN_WIDTH * rootFontSize, band * COLUMN_MAX_BAND_RATIO);
  const rise = COLUMN_RISE * rootFontSize;
  const radius = BAR_RADIUS * rootFontSize;
  return (
    <Rectangle
      data-slot={slot}
      className={className}
      x={plotArea.x + band * (index + 0.5) - width / 2}
      y={plotArea.y - rise}
      width={width}
      height={plotArea.height + rise}
      radius={[radius, radius, 0, 0]}
      fill={fill}
    />
  );
}

interface HoveredColumnProps {
  // Mouse가 있는 구간의 번호, Chart가 채움
  payloadIndex?: string | number | null;
  selectedIndex: number;
  count: number;
  rootFontSize: number;
}

// Hover한 구간의 Bar 뒤에 연한 회색 기둥 표시, 선택한 날은 선택 Color를 그대로 유지
function HoveredColumn({ payloadIndex, selectedIndex, count, rootFontSize }: HoveredColumnProps) {
  if (payloadIndex === undefined || payloadIndex === null) return null;
  const index = Number(payloadIndex);
  if (index === selectedIndex) return null;
  return (
    <ColumnHighlight
      key={index}
      index={index}
      count={count}
      rootFontSize={rootFontSize}
      fill={HOVERED_COLUMN_FILL}
      slot={HOVERED_COLUMN_SLOT}
      className={HOVERED_COLUMN_CLASS_NAME}
    />
  );
}

interface LevelBarProps extends Partial<BarShapeProps> {
  count: number;
  rootFontSize: number;
  gradientId: string;
}

// 구간 가운데에 등급 Color의 Bar 하나 표시
function LevelBar({ index, y, height, payload, count, rootFontSize, gradientId }: LevelBarProps) {
  const plotArea = usePlotArea();
  if (!plotArea || index === undefined) return null;
  const band = (plotArea.width - BARS_END_PADDING * rootFontSize) / count;
  const width = Math.min(BAR_WIDTH * rootFontSize, band * BAR_MAX_BAND_RATIO);
  const radius = BAR_RADIUS * rootFontSize;
  return (
    <Rectangle
      data-slot="chart-bar"
      x={plotArea.x + band * (index + 0.5) - width / 2}
      y={y}
      width={width}
      height={height}
      radius={[radius, radius, 0, 0]}
      fill={`url(#${gradientId}-${(payload as ChartPoint).level})`}
    />
  );
}

interface DailyAnomalyBarChartProps {
  points: readonly DailyAnomalyPoint[];
  levelThresholds: AnomalyLevelThresholds;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

// 날짜별 평균 이상비율을 Bar로, 등급 기준을 점선으로 표시
export function DailyAnomalyBarChart({
  points,
  levelThresholds,
  selectedDate,
  onSelectDate,
}: DailyAnomalyBarChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const rootFontSize = useRootFontSize();
  const shouldReduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  const px = (rem: number) => rem * rootFontSize;
  const data: ChartPoint[] = points.map((point) => ({
    ...point,
    barValue: Math.min(AXIS_MAX_PERCENT, point.averageRatePercent),
  }));
  const selectedIndex = data.findIndex((point) => point.date === selectedDate);
  const isDense = data.length >= DENSE_POINT_COUNT;

  const isTickVisible = (index: number) =>
    index === selectedIndex || ((!isDense || index % 2 === 0) && !(isDense && index === data.length - 1));

  const referenceTop = (percent: number) => `${(1 - percent / AXIS_MAX_PERCENT) * 100}%`;

  // Mouse 위치가 몇 번째 날의 구간인지 계산, 그림 영역 밖이면 null
  const indexAt = (event: MouseEvent): number | null => {
    const root = rootRef.current;
    if (!root || data.length === 0) return null;
    const rect = root.getBoundingClientRect();
    const x = event.clientX - rect.left - px(AXIS_WIDTH);
    const y = event.clientY - rect.top;
    const band = (rect.width - px(AXIS_WIDTH) - px(BARS_END_PADDING)) / data.length;
    const index = Math.floor(x / band);
    const isInsidePlot = y >= 0 && y <= rect.height - px(DATE_ROW_HEIGHT);
    return isInsidePlot && index >= 0 && index < data.length ? index : null;
  };

  return (
    <div ref={rootRef} data-slot="daily-anomaly-bar-chart" className="relative min-h-0 flex-[1_1_0]">
      <ChartContainer config={{}} className="absolute inset-0 aspect-auto">
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ top: px(TOP_MARGIN), right: 0, bottom: 0, left: 0 }}
          onClick={(_, event) => {
            const index = indexAt(event);
            if (index !== null) onSelectDate(data[index].date);
          }}
          className="cursor-pointer"
        >
          <defs>
            {BAR_LEVELS.map((level) => (
              <linearGradient key={level} id={`${gradientId}-${level}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={levelColors[level]} />
                <stop
                  offset="1"
                  stopColor={`color-mix(in srgb, ${levelColors[level]} 70%, var(--card))`}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--muted)" strokeWidth={px(0.0625)} />
          <YAxis
            domain={[0, AXIS_MAX_PERCENT]}
            ticks={AXIS_TICKS}
            width={px(AXIS_WIDTH)}
            tickSize={0}
            tickMargin={px(AXIS_LABEL_GAP)}
            axisLine={false}
            tickLine={false}
            tick={({ x, payload }: YAxisTickContentProps) => (
              <text
                data-slot="chart-rate-tick"
                x={x}
                y={payload.coordinate}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={px(TICK_FONT_SIZE)}
                fontWeight={600}
                fill="var(--muted-fg)"
              >
                {payload.value}%
              </text>
            )}
          />
          <XAxis
            dataKey="date"
            interval={0}
            height={px(DATE_ROW_HEIGHT)}
            padding={{ left: 0, right: px(BARS_END_PADDING) }}
            tickSize={0}
            tickMargin={0}
            axisLine={{ stroke: "var(--muted-strong)", strokeWidth: px(0.0625) }}
            tickLine={false}
            tick={({ x, y, index }: XAxisTickContentProps) => (
              <text
                data-slot="chart-date-tick"
                x={x}
                y={Number(y) + px(DATE_ROW_GAP + TICK_FONT_SIZE * FONT_ASCENT_RATIO)}
                textAnchor="middle"
                fontSize={px(TICK_FONT_SIZE)}
                fontWeight={index === selectedIndex ? 700 : 400}
                fill={index === selectedIndex ? "var(--fg)" : "var(--muted-fg)"}
              >
                {isTickVisible(index) ? formatIsoMonthDay(data[index].date) : ""}
              </text>
            )}
          />
          <ReferenceLine
            y={levelThresholds.dangerMinPercent}
            stroke="var(--danger)"
            strokeWidth={px(REFERENCE_STROKE_WIDTH)}
            strokeDasharray={`${px(REFERENCE_DASH)} ${px(REFERENCE_DASH)}`}
          />
          <ReferenceLine
            y={levelThresholds.warningMinPercent}
            stroke="var(--warning)"
            strokeWidth={px(REFERENCE_STROKE_WIDTH)}
            strokeDasharray={`${px(REFERENCE_DASH)} ${px(REFERENCE_DASH)}`}
          />
          <ColumnHighlight
            index={selectedIndex}
            count={data.length}
            rootFontSize={rootFontSize}
            fill="var(--brand-line4-subtle)"
            slot="chart-selected-column"
          />
          <Bar
            dataKey="barValue"
            isAnimationActive={!shouldReduceMotion}
            animationDuration={motionDuration.slow * 1000}
            animationEasing={CHART_EASING}
            shape={
              <LevelBar count={data.length} rootFontSize={rootFontSize} gradientId={gradientId} />
            }
          />
          <ChartCursorTooltip
            describe={describePoint}
            cursor={
              <HoveredColumn selectedIndex={selectedIndex} count={data.length} rootFontSize={rootFontSize} />
            }
          />
        </BarChart>
      </ChartContainer>
      <div
        data-slot="chart-plot-overlay"
        className="pointer-events-none absolute"
        style={{
          left: `${AXIS_WIDTH}rem`,
          top: `${TOP_MARGIN}rem`,
          right: 0,
          bottom: `${DATE_ROW_HEIGHT}rem`,
        }}
      >
        <span
          className="absolute right-1.5 z-[1]"
          style={{ top: `calc(${referenceTop(levelThresholds.dangerMinPercent)} - 1.25rem)` }}
        >
          <ChartLabelPill
            tone="danger"
            label={`${anomalyLevelLabels.danger.label} ${levelThresholds.dangerMinPercent}%`}
          />
        </span>
        <span
          className="absolute right-1.5 z-[1]"
          style={{ top: `calc(${referenceTop(levelThresholds.warningMinPercent)} - 1.25rem)` }}
        >
          <ChartLabelPill
            tone="warning"
            label={`${anomalyLevelLabels.warning.label} ${levelThresholds.warningMinPercent}%`}
          />
        </span>
      </div>
    </div>
  );
}
