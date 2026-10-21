"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  type DotItemDotProps,
  type YAxisTickContentProps,
} from "recharts";
import { ChartCursorTooltip } from "@/components/molecules/ChartCursorTooltip";
import {
  AREA_Z_INDEX,
  AreaGradient,
  ChartPointDot,
  ChartValueTick,
  GRID_LINE_WIDTH,
  HoveredPointBand,
  LINE_STROKE_WIDTH,
  LINE_Z_INDEX,
  OVERFLOWING_CHART_CLASS_NAME,
  PlotBaseline,
  VALUE_TICK_GAP,
  chartDrawAnimation,
  evenGridLines,
  spreadPositions,
  svgSafeId,
  type ChartDotLook,
} from "@/components/organisms/chartParts";
import { ChartContainer } from "@/components/ui/chart";
import { useRootFontSize } from "@/lib/useRootFontSize";

// 선 끝에 표시할 Card Color의 Ring
const END_RING: ChartDotLook = { diameterRem: 1, ringRem: 0.25 };
// Tooltip 점수의 소수 자릿수
const SCORE_DIGITS = 3;
// 학습 곡선 아래 영역의 위쪽 끝 투명도
const AREA_TOP_OPACITY = 0.3;

export interface LearningHealthCurvePoint {
  epoch: number;
  train: number;
  validation: number;
}

interface ChartPoint extends LearningHealthCurvePoint {
  x: number;
}

interface LearningHealthCurveChartProps {
  // 학습 반복 순서대로의 학습 점수와 검증 점수
  points: readonly LearningHealthCurvePoint[];
  // 위에서 아래로 놓을 세로 눈금 값, 첫 값이 위쪽 끝이고 마지막 값이 아래쪽 끝
  tickValues: readonly number[];
  tickDigits: number;
  // 그림 영역의 Height(아래 선 포함), 눈금 Text 영역의 Width, 오른쪽 Margin(rem)
  plotHeightRem: number;
  axisWidthRem: number;
  trailingGapRem: number;
  // Chart 바깥 Layout 크기 조정
  className?: string;
}

// 학습 반복마다의 학습 점수(선과 아래 영역)와 검증 점수(선)를 그리고 두 선 끝에 Ring을 붙인 Chart 표시
export function LearningHealthCurveChart({
  points,
  tickValues,
  tickDigits,
  plotHeightRem,
  axisWidthRem,
  trailingGapRem,
  className,
}: LearningHealthCurveChartProps) {
  const rootFontSize = useRootFontSize();
  const shouldReduceMotion = useReducedMotion();
  const gradientId = `learning-health-area-${svgSafeId(useId())}`;
  const top = tickValues[0];
  const bottom = tickValues[tickValues.length - 1];
  // 그릴 점이 없거나 세로 범위가 없으면 그리지 않음, 범위로 나눌 때 0이 되지 않게 함
  if (points.length === 0 || tickValues.length < 2 || top === bottom) return null;

  const px = (rem: number) => rem * rootFontSize;
  const layout = spreadPositions(points.length, 0);
  const data: ChartPoint[] = points.map((point, index) => ({
    ...point,
    x: layout.positions[index],
  }));
  const lastIndex = data.length - 1;
  const animation = chartDrawAnimation(shouldReduceMotion);
  // 선의 마지막 점에만 Ring 표시
  const endRing = ({ cx, cy, index }: DotItemDotProps, color: string) =>
    index === lastIndex ? (
      <ChartPointDot cx={cx} cy={cy} look={END_RING} color={color} rootFontSize={rootFontSize} />
    ) : null;

  return (
    <div data-slot="learning-health-curve-chart" className={className}>
      <div className="relative" style={{ height: `${plotHeightRem}rem` }}>
        <ChartContainer config={{}} className={OVERFLOWING_CHART_CLASS_NAME}>
          <ComposedChart
            accessibilityLayer
            data={data}
            margin={{ top: 0, right: px(trailingGapRem), bottom: px(GRID_LINE_WIDTH), left: 0 }}
          >
            <AreaGradient id={gradientId} topOpacity={AREA_TOP_OPACITY} />
            <CartesianGrid
              vertical={false}
              stroke="var(--muted)"
              strokeWidth={px(GRID_LINE_WIDTH)}
              horizontalCoordinatesGenerator={evenGridLines(tickValues.length - 1, rootFontSize)}
            />
            <XAxis type="number" dataKey="x" domain={[0, 100]} hide />
            <YAxis
              type="number"
              domain={[bottom, top]}
              allowDataOverflow
              ticks={[...tickValues]}
              interval={0}
              width={px(axisWidthRem + VALUE_TICK_GAP)}
              tickSize={0}
              tickMargin={px(VALUE_TICK_GAP)}
              axisLine={false}
              tickLine={false}
              tick={({ x, index, payload }: YAxisTickContentProps) => (
                <ChartValueTick
                  index={index}
                  x={x}
                  label={Number(payload.value).toFixed(tickDigits)}
                  count={tickValues.length}
                  dropsLast
                  rootFontSize={rootFontSize}
                />
              )}
            />
            <PlotBaseline rootFontSize={rootFontSize} />
            <ChartCursorTooltip
              size="compact"
              describe={(point: ChartPoint) => ({
                title: `epoch ${point.epoch}`,
                detail: `train ${point.train.toFixed(SCORE_DIGITS)} · val ${point.validation.toFixed(SCORE_DIGITS)}`,
              })}
              cursor={<HoveredPointBand layout={layout} />}
            />
            <Area
              type="linear"
              dataKey="train"
              baseValue={bottom}
              stroke="var(--brand-line4)"
              strokeWidth={px(LINE_STROKE_WIDTH)}
              fill={`url(#${gradientId})`}
              fillOpacity={1}
              dot={(dot: DotItemDotProps) => endRing(dot, "var(--brand-line4)")}
              activeDot={false}
              zIndex={AREA_Z_INDEX}
              {...animation}
            />
            <Line
              type="linear"
              dataKey="validation"
              stroke="var(--chart-2)"
              strokeWidth={px(LINE_STROKE_WIDTH)}
              dot={(dot: DotItemDotProps) => endRing(dot, "var(--chart-2)")}
              activeDot={false}
              zIndex={LINE_Z_INDEX}
              {...animation}
            />
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  );
}
