"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { LegendSwatch } from "@/components/atoms/LegendSwatch";
import { SectionCard } from "@/components/molecules/SectionCard";
import { VALUE_TICK_GAP } from "@/components/organisms/chartParts";
import { LearningHealthCurveChart } from "@/components/organisms/LearningHealthCurveChart";
import type { LearningCurvePoint } from "@/domain/diagnostics";
import { useRootFontSize } from "@/lib/useRootFontSize";

// Card Height, 남는 높이의 45%를 320에서 404 사이로 제한, Loading Skeleton도 같은 Height 사용
export const LEARNING_HEALTH_CARD_SIZE_CLASS_NAME = "min-h-0 flex-[0_0_clamp(20rem,45%,25.25rem)] overflow-hidden";

// 세로 눈금(위에서 아래)과 소수 자릿수, 눈금 Text 영역 Width, 그림 오른쪽 Margin(rem)
const CURVE_TICKS = [1, 0.75, 0.5, 0.25, 0] as const;
const CURVE_TICK_DIGITS = 2;
const CURVE_AXIS_WIDTH = 2.25;
const CURVE_TRAILING_GAP = 0.75;
// 그림 아래 반복 횟수 Text Row의 간격 수
const EPOCH_LABEL_GAPS = 4;

// 반복 횟수 Text를 놓을 점 번호, 같은 간격 4개와 마지막
function epochLabelIndexes(count: number): number[] {
  if (count === 0) return [];
  const step = Math.max(1, Math.ceil((count - 1) / EPOCH_LABEL_GAPS));
  const indexes: number[] = [];
  for (let index = 0; index < count - 1 && indexes.length < EPOCH_LABEL_GAPS; index += step) indexes.push(index);
  indexes.push(count - 1);
  return indexes;
}

interface LearningHealthCardProps {
  points: readonly LearningCurvePoint[];
}

// 학습 반복마다의 학습 점수와 검증 점수를 남는 높이를 채운 곡선으로 보여 주는 Card 표시
export function LearningHealthCard({ points }: LearningHealthCardProps) {
  const rootFontSize = useRootFontSize();
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotHeight, setPlotHeight] = useState(0);

  // 그림 영역의 Height를 측정해 Chart에 넘김, 창 크기가 바뀌면 다시 측정
  useLayoutEffect(() => {
    const element = plotRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setPlotHeight(element.getBoundingClientRect().height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <SectionCard
      data-slot="learning-health-card"
      eyebrow="LEARNING HEALTH"
      title="학습 건강도 곡선"
      description="정상데이터 학습 수렴 · 커버리지 — 과소·과대적합 점검"
      aside={
        <span
          data-slot="learning-health-legend"
          className="flex items-center gap-3 text-[0.6875rem] text-muted-foreground"
        >
          <LegendSwatch shape="line" tone="brand" label="train" />
          <LegendSwatch shape="line" tone="chart2" label="val" />
        </span>
      }
      className={LEARNING_HEALTH_CARD_SIZE_CLASS_NAME}
    >
      <div
        data-slot="learning-health-chart-box"
        className="flex min-h-0 flex-[1_1_0] flex-col gap-1.5 rounded-[0.625rem] border border-border bg-card p-4"
      >
        <div ref={plotRef} className="min-h-0 flex-[1_1_0]">
          {plotHeight > 0 && rootFontSize > 0 ? (
            // 크기가 바뀌면 새로 그림, 그대로 다시 그리면 선 끝의 Ring이 사라짐
            <LearningHealthCurveChart
              key={`${rootFontSize}-${plotHeight}`}
              points={points}
              tickValues={CURVE_TICKS}
              tickDigits={CURVE_TICK_DIGITS}
              plotHeightRem={plotHeight / rootFontSize}
              axisWidthRem={CURVE_AXIS_WIDTH}
              trailingGapRem={CURVE_TRAILING_GAP}
            />
          ) : null}
        </div>
        <div
          data-slot="learning-health-epoch-labels"
          className="flex justify-between text-[0.6875rem] font-semibold text-muted-foreground"
          style={{ marginLeft: `${CURVE_AXIS_WIDTH + VALUE_TICK_GAP}rem`, marginRight: `${CURVE_TRAILING_GAP}rem` }}
        >
          {epochLabelIndexes(points.length).map((index) => (
            <span key={index}>epoch {points[index].epoch}</span>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
