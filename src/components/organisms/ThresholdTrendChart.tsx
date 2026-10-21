"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  XAxis,
  YAxis,
  type DotItemDotProps,
  type XAxisTickContentProps,
  type YAxisTickContentProps,
} from "recharts";
import { ChartCursorTooltip } from "@/components/molecules/ChartCursorTooltip";
import {
  AREA_Z_INDEX,
  AreaGradient,
  ChartPointDot,
  ChartTickLabel,
  ChartValueTick,
  GRID_LINE_WIDTH,
  HoveredPointBand,
  LINE_STROKE_WIDTH,
  OVERFLOWING_CHART_CLASS_NAME,
  PlotBaseline,
  TICK_LINE_HEIGHT,
  VALUE_TICK_GAP,
  chartDrawAnimation,
  evenGridLines,
  spreadPositions,
  svgSafeId,
  type ChartDotLook,
} from "@/components/organisms/chartParts";
import { ChartContainer } from "@/components/ui/chart";
import { formatIsoMonthDay } from "@/lib/formatTime";
import { useRootFontSize } from "@/lib/useRootFontSize";

// Chart 안의 길이(rem), 그림 영역 Height(아래 선 포함), 눈금 Text 영역 Width, 오른쪽 Margin, 날짜 Row의 위 간격과 Height
const PLOT_HEIGHT = 13.75;
const TICK_COLUMN_WIDTH = 2.75;
const TRAILING_GAP = 2.5;
const DATE_ROW_GAP = 0.5;
const DATE_ROW_HEIGHT = 0.875;
// 점, 지난 버전은 속이 찬 점, 마지막(현재) 버전은 Card Color의 Ring
const DOT: ChartDotLook = { diameterRem: 0.375 };
const LATEST_DOT: ChartDotLook = { diameterRem: 0.875, ringRem: 0.1875 };
// 가로 양 끝에서 첫 점과 마지막 점까지의 Margin(%)
const EDGE_PERCENT = 2;
// 세로 눈금 개수와 눈금 Text, Tooltip 값의 소수 자릿수
const TICK_COUNT = 5;
const TICK_DIGITS = 2;
const VALUE_DIGITS = 4;
// 세로 범위를 값의 폭에서 위아래로 넓히는 비율, 값이 모두 같으면 마지막 값 크기에 곱하는 비율
const RANGE_PAD_RATIO = 0.25;
const FLAT_PAD_RATIO = 0.05;
// 마지막 값도 0이라 넓힐 폭이 없을 때 위아래로 넓히는 값
const ZERO_PAD = 1;
// 영역의 위쪽 끝 투명도
const AREA_TOP_OPACITY = 0.35;

export interface ThresholdTrendPoint {
  // 버전의 날짜 "YYYY-MM-DD"
  date: string;
  value: number;
}

interface ChartPoint extends ThresholdTrendPoint {
  x: number;
}

// 받은 값의 최소와 최대를 위아래로 넓힌 세로 범위 계산
function valueRange(values: readonly number[]): { bottom: number; top: number } {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const last = values[values.length - 1];
  const pad = (high - low) * RANGE_PAD_RATIO || Math.abs(last) * FLAT_PAD_RATIO || ZERO_PAD;
  return { bottom: low - pad, top: high + pad };
}

interface ThresholdTrendChartProps {
  // 오래된 버전부터의 값, 마지막이 현재 버전
  points: readonly ThresholdTrendPoint[];
  // Tooltip에서 값 앞에 붙일 이름
  valueLabel: string;
}

// 버전별 값을 선, 아래 영역, 점으로 잇고 세로 눈금과 날짜를 붙인 Chart 표시
export function ThresholdTrendChart({ points, valueLabel }: ThresholdTrendChartProps) {
  const rootFontSize = useRootFontSize();
  const shouldReduceMotion = useReducedMotion();
  const gradientId = `threshold-area-${svgSafeId(useId())}`;
  if (points.length === 0) return null;

  const px = (rem: number) => rem * rootFontSize;
  const layout = spreadPositions(points.length, EDGE_PERCENT);
  const data: ChartPoint[] = points.map((point, index) => ({
    ...point,
    x: layout.positions[index],
  }));
  const lastIndex = data.length - 1;
  const { bottom, top } = valueRange(points.map((point) => point.value));
  const ticks = Array.from(
    { length: TICK_COUNT },
    (_, index) => bottom + ((top - bottom) * (TICK_COUNT - 1 - index)) / (TICK_COUNT - 1),
  );
  // 날짜 축은 아래 선, 위 간격, 날짜 Row를 담음
  const dateAxisHeight = GRID_LINE_WIDTH + DATE_ROW_GAP + DATE_ROW_HEIGHT;

  return (
    <div
      data-slot="threshold-trend-chart"
      // Modal 내용이 Scroll될 만큼 많아도 줄어들지 않게 Height 고정
      className="relative shrink-0"
      style={{ height: `${PLOT_HEIGHT + DATE_ROW_GAP + DATE_ROW_HEIGHT}rem` }}
    >
      <ChartContainer config={{}} className={OVERFLOWING_CHART_CLASS_NAME}>
        <ComposedChart
          accessibilityLayer
          data={data}
          margin={{ top: 0, right: px(TRAILING_GAP), bottom: 0, left: 0 }}
        >
          <AreaGradient id={gradientId} topOpacity={AREA_TOP_OPACITY} />
          <CartesianGrid
            vertical={false}
            stroke="var(--muted)"
            strokeWidth={px(GRID_LINE_WIDTH)}
            horizontalCoordinatesGenerator={evenGridLines(TICK_COUNT - 1, rootFontSize)}
          />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 100]}
            ticks={[...layout.positions]}
            interval={0}
            height={px(dateAxisHeight)}
            tickSize={0}
            tickMargin={0}
            axisLine={false}
            tickLine={false}
            tick={({ x, y, index }: XAxisTickContentProps) => (
              <ChartTickLabel
                slot="chart-date-tick"
                x={x}
                y={Number(y) + px(GRID_LINE_WIDTH + DATE_ROW_GAP + TICK_LINE_HEIGHT / 2)}
                textAnchor="middle"
                rootFontSize={rootFontSize}
              >
                {formatIsoMonthDay(data[index].date)}
              </ChartTickLabel>
            )}
          />
          <YAxis
            type="number"
            domain={[bottom, top]}
            allowDataOverflow
            ticks={ticks}
            interval={0}
            width={px(TICK_COLUMN_WIDTH + VALUE_TICK_GAP)}
            tickSize={0}
            tickMargin={px(VALUE_TICK_GAP)}
            axisLine={false}
            tickLine={false}
            tick={({ x, index, payload }: YAxisTickContentProps) => (
              <ChartValueTick
                index={index}
                x={x}
                label={Number(payload.value).toFixed(TICK_DIGITS)}
                count={TICK_COUNT}
                isTabular
                rootFontSize={rootFontSize}
              />
            )}
          />
          <PlotBaseline rootFontSize={rootFontSize} />
          <ChartCursorTooltip
            size="compact"
            describe={(point: ChartPoint) => ({
              title: formatIsoMonthDay(point.date),
              detail: `${valueLabel} ${point.value.toFixed(VALUE_DIGITS)}`,
            })}
            cursor={<HoveredPointBand layout={layout} />}
          />
          <Area
            type="linear"
            dataKey="value"
            baseValue={bottom}
            stroke="var(--brand-line4)"
            strokeWidth={px(LINE_STROKE_WIDTH)}
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            dot={({ cx, cy, index }: DotItemDotProps) => (
              <ChartPointDot
                cx={cx}
                cy={cy}
                look={index === lastIndex ? LATEST_DOT : DOT}
                color="var(--brand-line4)"
                rootFontSize={rootFontSize}
              />
            )}
            activeDot={false}
            zIndex={AREA_Z_INDEX}
            {...chartDrawAnimation(shouldReduceMotion)}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
