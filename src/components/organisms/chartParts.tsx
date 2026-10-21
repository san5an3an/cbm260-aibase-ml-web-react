"use client";

import {
  DefaultZIndexes,
  Rectangle,
  ZIndexLayer,
  usePlotArea,
  type CartesianGridProps,
} from "recharts";
import type { AnimationTiming } from "recharts/types/util/types";
import { motionDuration, motionEase } from "@/lib/motion";

// 꺾은선 Chart의 Hover Column 표시는 선 위에 그려지므로 영역, 선, 점을 그보다 위 Layer에 배치
export const AREA_Z_INDEX = DefaultZIndexes.cursorLine + 1;
export const LINE_Z_INDEX = DefaultZIndexes.cursorLine + 2;
const DOT_Z_INDEX = DefaultZIndexes.cursorLine + 3;

// Hover한 Column의 이름, Color, 나타나는 움직임, Bar Chart와 꺾은선 Chart가 함께 사용
export const HOVERED_COLUMN_SLOT = "chart-hovered-column";
export const HOVERED_COLUMN_FILL = "var(--muted)";
export const HOVERED_COLUMN_CLASS_NAME =
  "animate-in duration-(--motion-duration-fast) ease-(--motion-ease-out) fade-in";

// Chart를 Card에 가득 채우고 그림 영역 밖으로 나가는 눈금 Text와 점이 보이게 하는 Chart용 class
export const OVERFLOWING_CHART_CLASS_NAME =
  "absolute inset-0 aspect-auto [&_.recharts-surface]:overflow-visible";

// 꺾은선 Chart 안의 길이(rem), 선 굵기, 가로선과 아래 선 굵기, 눈금 Cell과 그림 영역 사이 간격
export const LINE_STROKE_WIDTH = 0.125;
export const GRID_LINE_WIDTH = 0.0625;
export const VALUE_TICK_GAP = 0.5;
// 눈금 Font 크기(rem)
const TICK_FONT_SIZE = 0.6875;
export const TICK_LINE_HEIGHT = 0.8125;
const TICK_FONT_WEIGHT = 600;
// 영역 Gradient의 아래쪽 끝 투명도
const AREA_BOTTOM_OPACITY = 0.02;

// 점마다의 가로 위치와 Hover한 Column의 Width(%), Column은 점을 가운데로 둠
export interface PointBandLayout {
  // 점마다의 가로 위치(%)
  positions: readonly number[];
  // Column 하나의 Width(%)
  bandPercent: number;
}

interface HoveredPointBandProps {
  // Mouse가 있는 점의 번호, Chart가 채움
  payloadIndex?: string | number | null;
  layout: PointBandLayout;
}

// 꺾은선 Chart에서 Hover한 점을 가운데로 한 연한 회색 기둥 표시, 그림 영역 밖으로 나가는 부분은 자름
export function HoveredPointBand({ payloadIndex, layout }: HoveredPointBandProps) {
  const plotArea = usePlotArea();
  if (!plotArea || payloadIndex === undefined || payloadIndex === null) return null;
  const position = layout.positions[Number(payloadIndex)];
  if (position === undefined) return null;
  const halfBand = layout.bandPercent / 2;
  const startPercent = Math.max(0, position - halfBand);
  const endPercent = Math.min(100, position + halfBand);
  return (
    <Rectangle
      key={payloadIndex}
      data-slot={HOVERED_COLUMN_SLOT}
      className={HOVERED_COLUMN_CLASS_NAME}
      x={plotArea.x + (plotArea.width * startPercent) / 100}
      y={plotArea.y}
      width={(plotArea.width * (endPercent - startPercent)) / 100}
      height={plotArea.height}
      fill={HOVERED_COLUMN_FILL}
    />
  );
}

// 점 수에 맞춰 양 끝에서 지정한 여백(%)만큼 들인 같은 간격의 가로 위치 계산, 점이 하나면 가운데
export function spreadPositions(count: number, edgePercent: number): PointBandLayout {
  if (count <= 1) return { positions: count === 1 ? [50] : [], bandPercent: 100 };
  const step = (100 - edgePercent * 2) / (count - 1);
  return {
    positions: Array.from({ length: count }, (_, index) => edgePercent + index * step),
    bandPercent: step,
  };
}

// Gradient 등 svg 안에서 가리킬 id를 React의 id에서 쓸 수 있는 문자만 남겨 반환
export function svgSafeId(reactId: string): string {
  return reactId.replace(/[^a-zA-Z0-9_-]/g, "");
}

// 그림 영역(아래 선 포함) Height를 Cell 수로 나눈 간격마다 가로선 위치 계산, 선의 위쪽 끝이 Cell의 위쪽 끝이고 맨 아래는 아래 선이 맡음
export function evenGridLines(
  gapCount: number,
  rootFontSize: number,
): CartesianGridProps["horizontalCoordinatesGenerator"] {
  return ({ offset }) => {
    const lineWidth = GRID_LINE_WIDTH * rootFontSize;
    const gap = (offset.height + lineWidth) / gapCount;
    return Array.from({ length: gapCount }, (_, index) => offset.top + gap * index + lineWidth / 2);
  };
}

interface PlotBaselineProps {
  rootFontSize: number;
}

// 그림 영역 바로 아래에 아래 선 표시
export function PlotBaseline({ rootFontSize }: PlotBaselineProps) {
  const plotArea = usePlotArea();
  if (!plotArea) return null;
  const strokeWidth = GRID_LINE_WIDTH * rootFontSize;
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

interface ChartTickLabelProps {
  slot: string;
  x: number | string;
  // Text Row의 세로 가운데 위치
  y: number;
  textAnchor: "end" | "middle";
  // 숫자를 같은 Width로 그릴지 여부
  isTabular?: boolean;
  rootFontSize: number;
  children: string;
}

// 축의 눈금 Text(11, 600, --muted-fg)를 지정 위치에 세로 가운데로 맞춰 표시
export function ChartTickLabel({
  slot,
  x,
  y,
  textAnchor,
  isTabular = false,
  rootFontSize,
  children,
}: ChartTickLabelProps) {
  return (
    <text
      data-slot={slot}
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="central"
      fontSize={TICK_FONT_SIZE * rootFontSize}
      fontWeight={TICK_FONT_WEIGHT}
      fill="var(--muted-fg)"
      className={isTabular ? "tabular-nums" : undefined}
    >
      {children}
    </text>
  );
}

interface ChartValueTickProps {
  // Chart가 채우는 눈금 순서(위부터), Text의 오른쪽 끝
  index: number;
  x: number | string;
  label: string;
  count: number;
  // 마지막 눈금을 아래 선 아래로 내림
  dropsLast?: boolean;
  isTabular?: boolean;
  rootFontSize: number;
}

// 세로 눈금 Text를 그림 영역(아래 선 포함) Height에서 Text 한 줄을 뺀 길이를 고르게 나눈 위치에 표시
export function ChartValueTick({
  index,
  x,
  label,
  count,
  dropsLast = false,
  isTabular = false,
  rootFontSize,
}: ChartValueTickProps) {
  const plotArea = usePlotArea();
  if (!plotArea || count < 2) return null;
  const lineHeight = TICK_LINE_HEIGHT * rootFontSize;
  const boxHeight = plotArea.height + GRID_LINE_WIDTH * rootFontSize;
  const drop = dropsLast && index === count - 1 ? lineHeight : 0;
  const center = plotArea.y + (index * (boxHeight - lineHeight)) / (count - 1) + drop;
  return (
    <ChartTickLabel
      slot="chart-value-tick"
      x={x}
      y={center}
      textAnchor="end"
      isTabular={isTabular}
      rootFontSize={rootFontSize}
    >
      {label}
    </ChartTickLabel>
  );
}

// 점의 지름과 고리 굵기(rem), 고리가 있으면 속은 Card Color
export interface ChartDotLook {
  diameterRem: number;
  ringRem?: number;
}

interface ChartPointDotProps {
  // Chart가 채우는 점의 위치
  cx?: number;
  cy?: number;
  look: ChartDotLook;
  // 점과 고리의 Color
  color: string;
  rootFontSize: number;
}

// 선 위 한 점에 속이 찬 점이나 Card Color 고리를 영역, 선, Hover한 Column보다 위 Layer에 표시
export function ChartPointDot({ cx, cy, look, color, rootFontSize }: ChartPointDotProps) {
  if (cx === undefined || cy === undefined) return null;
  const diameter = look.diameterRem * rootFontSize;
  if (look.ringRem === undefined) {
    return (
      <ZIndexLayer zIndex={DOT_Z_INDEX}>
        <circle data-slot="chart-dot" cx={cx} cy={cy} r={diameter / 2} fill={color} />
      </ZIndexLayer>
    );
  }
  const ring = look.ringRem * rootFontSize;
  // 고리 선의 가운데를 지름에서 고리 굵기를 뺀 원에 두어 바깥 지름을 맞춤
  return (
    <ZIndexLayer zIndex={DOT_Z_INDEX}>
      <circle
        data-slot="chart-dot"
        cx={cx}
        cy={cy}
        r={(diameter - ring) / 2}
        fill="var(--card)"
        stroke={color}
        strokeWidth={ring}
      />
    </ZIndexLayer>
  );
}

interface AreaGradientProps {
  id: string;
  topOpacity: number;
}

// 영역을 기본 선 Color로 위에서 아래로 옅어지게 칠할 Gradient 정의
export function AreaGradient({ id, topOpacity }: AreaGradientProps) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--brand-line4)" stopOpacity={topOpacity} />
        <stop offset="1" stopColor="var(--brand-line4)" stopOpacity={AREA_BOTTOM_OPACITY} />
      </linearGradient>
    </defs>
  );
}

// Recharts의 이름 "ease-out"은 다른 곡선이라 motionEase.out을 cubic-bezier 문자열로 넘김. 부품 Type은 이름만 받아 Type을 덮어씀
export const CHART_EASING = `cubic-bezier(${motionEase.out.join(",")})` as AnimationTiming;

// 선과 영역이 처음 보일 때 한 번 그려지는 움직임 값 반환, 움직임 줄이기 설정에서는 비활성화
export function chartDrawAnimation(shouldReduceMotion: boolean | null) {
  return {
    isAnimationActive: !shouldReduceMotion,
    animationDuration: motionDuration.slow * 1000,
    animationEasing: CHART_EASING,
  } as const;
}
