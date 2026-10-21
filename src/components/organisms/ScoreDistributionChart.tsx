"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";
import { Bar, BarChart, Rectangle, XAxis, YAxis, usePlotArea, type BarShapeProps } from "recharts";
import { ChartLabelPill } from "@/components/atoms/ChartLabelPill";
import { ChartCursorTooltip } from "@/components/molecules/ChartCursorTooltip";
import {
  CHART_EASING,
  HOVERED_COLUMN_CLASS_NAME,
  HOVERED_COLUMN_FILL,
  HOVERED_COLUMN_SLOT,
  svgSafeId,
} from "@/components/organisms/chartParts";
import { ChartContainer } from "@/components/ui/chart";
import type { ScoreDistribution, ScoreDistributionBin } from "@/domain/diagnostics";
import { motionDuration } from "@/lib/motion";
import { useRootFontSize } from "@/lib/useRootFontSize";

// Bar 사이 간격, Bar 위 모서리(rem), 가장 긴 Bar가 차지하는 높이 비율
const BAR_GAP = 0.125;
const BAR_RADIUS = 0.125;
const TALLEST_BAR_RATIO = 0.92;
// 임계값과 점수 범위의 소수 자릿수
const THRESHOLD_DIGITS = 4;
// 가로 눈금 개수와 소수 자릿수
const X_TICK_COUNT = 6;
const X_TICK_DIGITS = 3;

// 점수 구간의 가운데 값이 임계값 이상인지 판정
const isBinOverThreshold = (bin: ScoreDistributionBin, threshold: number) => (bin.start + bin.end) / 2 >= threshold;

interface ChartBin extends ScoreDistributionBin {
  isOver: boolean;
}

// 구간 번호로 Bar가 놓일 가로 위치와 Width 계산, 구간 사이에 Bar 간격을 둠
function barSlot(plotX: number, plotWidth: number, index: number, count: number, gap: number) {
  const pitch = (plotWidth + gap) / count;
  return { x: plotX + pitch * index, width: Math.max(0, pitch - gap) };
}

interface ScoreBarProps extends Partial<BarShapeProps> {
  count: number;
  rootFontSize: number;
  gradientId: string;
}

// 구간 하나의 Bar를 임계값 초과 여부에 따른 Color로 표시
function ScoreBar({ index, y, height, payload, count, rootFontSize, gradientId }: ScoreBarProps) {
  const plotArea = usePlotArea();
  if (!plotArea || index === undefined) return null;
  const { x, width } = barSlot(plotArea.x, plotArea.width, index, count, BAR_GAP * rootFontSize);
  const radius = BAR_RADIUS * rootFontSize;
  const tone = (payload as ChartBin).isOver ? "over" : "under";
  return (
    <Rectangle
      data-slot="chart-bar"
      data-tone={tone}
      x={x}
      y={y}
      width={width}
      height={height}
      radius={[radius, radius, 0, 0]}
      fill={`url(#${gradientId}-${tone})`}
    />
  );
}

interface HoveredBarColumnProps {
  // Mouse가 있는 구간의 번호, Chart가 채움
  payloadIndex?: string | number | null;
  count: number;
  rootFontSize: number;
}

// Hover한 구간의 Bar 뒤에 연한 회색 기둥 표시
function HoveredBarColumn({ payloadIndex, count, rootFontSize }: HoveredBarColumnProps) {
  const plotArea = usePlotArea();
  if (!plotArea || payloadIndex === undefined || payloadIndex === null) return null;
  const { x, width } = barSlot(plotArea.x, plotArea.width, Number(payloadIndex), count, BAR_GAP * rootFontSize);
  return (
    <Rectangle
      key={payloadIndex}
      data-slot={HOVERED_COLUMN_SLOT}
      className={HOVERED_COLUMN_CLASS_NAME}
      x={x}
      y={plotArea.y}
      width={width}
      height={plotArea.height}
      fill={HOVERED_COLUMN_FILL}
    />
  );
}

interface ScoreDistributionChartProps {
  distribution: ScoreDistribution;
}

// 점수 구간별 window 수를 Bar로, 임계값을 점선, 위험 영역, Label로 표시하고 아래에 가로 눈금 표시
export function ScoreDistributionChart({ distribution }: ScoreDistributionChartProps) {
  const gradientId = `score-distribution-${svgSafeId(useId())}`;
  const rootFontSize = useRootFontSize();
  const shouldReduceMotion = useReducedMotion();
  const { rangeStart, rangeEnd, bins, threshold } = distribution;
  const span = rangeEnd - rangeStart;
  const data: ChartBin[] = bins.map((bin) => ({ ...bin, isOver: isBinOverThreshold(bin, threshold) }));
  const tallest = Math.max(0, ...bins.map((bin) => bin.windowCount));
  const thresholdLeft = `${span > 0 ? ((threshold - rangeStart) / span) * 100 : 0}%`;
  const xTicks = Array.from(
    { length: X_TICK_COUNT },
    (_, index) => rangeStart + (span * index) / (X_TICK_COUNT - 1),
  );

  return (
    <>
      <div
        data-slot="score-distribution-chart"
        className="relative min-h-[3.75rem] flex-[1_1_0] border-b border-muted-strong"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, var(--muted) 0 0.0625rem, transparent 0.0625rem calc(50% - 0.03125rem), var(--muted) calc(50% - 0.03125rem) calc(50% + 0.03125rem), transparent calc(50% + 0.03125rem))",
          }}
        />
        <div
          data-slot="score-distribution-danger-area"
          className="absolute inset-y-0 right-0 bg-danger-subtle opacity-80"
          style={{ left: thresholdLeft }}
        />
        <div
          data-slot="score-distribution-threshold-line"
          // Hover한 구간의 회색 기둥보다 위에 그려 점선이 가려지지 않게 함
          className="pointer-events-none absolute inset-y-0 z-10 border-l-[0.09375rem] border-dashed border-destructive"
          style={{ left: thresholdLeft }}
        />
        <span
          data-slot="score-distribution-threshold-label"
          className="absolute top-[-1.375rem] -translate-x-1/2"
          style={{ left: thresholdLeft }}
        >
          <ChartLabelPill tone="danger" label={`임계 ${threshold.toFixed(THRESHOLD_DIGITS)}`} />
        </span>
        {tallest > 0 ? (
          <ChartContainer config={{}} className="absolute inset-0 aspect-auto">
            <BarChart accessibilityLayer data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`${gradientId}-under`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--chart-1)" />
                  <stop offset="1" stopColor="color-mix(in srgb, var(--chart-1) 70%, var(--card))" />
                </linearGradient>
                <linearGradient id={`${gradientId}-over`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="color-mix(in srgb, var(--danger) 75%, var(--card))" />
                  <stop offset="1" stopColor="var(--danger)" />
                </linearGradient>
              </defs>
              <XAxis dataKey="start" hide />
              <YAxis domain={[0, tallest / TALLEST_BAR_RATIO]} hide />
              <Bar
                dataKey="windowCount"
                isAnimationActive={!shouldReduceMotion}
                animationDuration={motionDuration.slow * 1000}
                animationEasing={CHART_EASING}
                shape={<ScoreBar count={data.length} rootFontSize={rootFontSize} gradientId={gradientId} />}
              />
              <ChartCursorTooltip
                size="compact"
                describe={(bin: ChartBin) => ({
                  title: `재구성오차 ${bin.start.toFixed(THRESHOLD_DIGITS)} – ${bin.end.toFixed(THRESHOLD_DIGITS)}`,
                  detail: `${bin.windowCount.toLocaleString()} window${bin.isOver ? " · 임계 초과" : ""}`,
                })}
                cursor={<HoveredBarColumn count={data.length} rootFontSize={rootFontSize} />}
              />
            </BarChart>
          </ChartContainer>
        ) : null}
      </div>
      <div
        data-slot="score-distribution-x-ticks"
        className="flex justify-between text-[0.6875rem] font-semibold text-muted-foreground"
      >
        {xTicks.map((value, index) => (
          <span key={index}>{value.toFixed(X_TICK_DIGITS)}</span>
        ))}
      </div>
    </>
  );
}
