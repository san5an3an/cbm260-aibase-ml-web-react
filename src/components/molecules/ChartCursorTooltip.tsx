"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useReducedMotion } from "motion/react";
import { useIsTooltipActive, type TooltipContentProps } from "recharts";
import {
  ChartTooltipBubble,
  TOOLTIP_CURSOR_GAP,
  type ChartTooltipBubbleSize,
  type ChartTooltipText,
} from "@/components/molecules/ChartTooltipBubble";
import { ChartTooltip } from "@/components/ui/chart";
import { useRootFontSize } from "@/lib/useRootFontSize";

// Tooltip이 Cursor를 따라 이동할 때의 전환 정의
const FOLLOW_TRANSITION = "transform var(--motion-duration-base) var(--motion-ease-out)";

// Chart들이 이 파일에서 가져다 쓰도록 Tooltip 두 Row의 Type을 그대로 내보냄
export type { ChartTooltipText };

interface CursorBubbleProps<Point> extends Partial<TooltipContentProps> {
  describe: (point: Point) => ChartTooltipText;
  size?: ChartTooltipBubbleSize;
}

// Cursor가 있는 Cell의 값을 Tooltip으로 표시, 나타날 때 짧게 Fade
function CursorBubble<Point>({ active, payload, describe, size }: CursorBubbleProps<Point>) {
  const point = active ? (payload?.[0]?.payload as Point | undefined) : undefined;
  if (point === undefined) return null;
  const { title, detail } = describe(point);
  return (
    <span
      data-slot="chart-hover-tooltip"
      className="block animate-in duration-(--motion-duration-base) ease-(--motion-ease-out) fade-in"
    >
      <ChartTooltipBubble title={title} detail={detail} size={size} />
    </span>
  );
}

interface ChartCursorTooltipProps<Point> {
  // Cell의 값으로 Tooltip의 Text 구성
  describe: (point: Point) => ChartTooltipText;
  // Hover한 Cell의 표시, Chart가 그 Cell의 위치와 번호(payloadIndex)를 채움
  cursor?: ReactElement;
  // Tooltip의 모양, 주지 않으면 기본 모양
  size?: ChartTooltipBubbleSize;
}

// Chart에 Hover하면 Cursor를 따라다니는 Tooltip 표시
export function ChartCursorTooltip<Point>({
  describe,
  cursor,
  size,
}: ChartCursorTooltipProps<Point>) {
  const rootFontSize = useRootFontSize();
  const shouldReduceMotion = useReducedMotion();
  const isActive = useIsTooltipActive();
  const [isFollowing, setIsFollowing] = useState(false);

  // 처음에는 제자리에 나타나고 그다음 Rendering부터 Cursor를 따라 미끄러지도록 전환 적용
  useEffect(() => {
    if (!isActive) return;
    const frame = requestAnimationFrame(() => setIsFollowing(true));
    return () => {
      cancelAnimationFrame(frame);
      setIsFollowing(false);
    };
  }, [isActive]);

  return (
    <ChartTooltip
      cursor={cursor ?? false}
      offset={TOOLTIP_CURSOR_GAP * rootFontSize}
      reverseDirection={{ x: false, y: true }}
      isAnimationActive={false}
      wrapperStyle={{
        zIndex: 3,
        transition: isFollowing && !shouldReduceMotion ? FOLLOW_TRANSITION : undefined,
      }}
      content={<CursorBubble describe={describe} size={size} />}
    />
  );
}
