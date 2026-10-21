"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
  CursorTooltip,
  CursorTooltipTarget,
  useCursorTooltipHandle,
} from "@/components/molecules/CursorTooltip";
import type { ThresholdScoreBin } from "@/domain/thresholdTuning";
import { motionDuration, motionEase } from "@/lib/motion";

// 세로축 눈금 문구 정의, Bar 높이는 각자 전체 중 비율이고 가장 높은 Bar가 96%에 닿음
const Y_TICKS = ["100%", "75%", "50%", "25%"] as const;
const BAR_PEAK_PERCENT = 96;
// 가로축 눈금 개수
const X_TICK_COUNT = 6;
// Hover한 Bar 외 다른 Bar의 투명도
const DIMMED_BAR_OPACITY = 0.55;

const trainingBarImage =
  "linear-gradient(180deg, var(--chart-1), color-mix(in srgb, var(--chart-1) 70%, var(--card)))";
const overBarImage =
  "linear-gradient(180deg, color-mix(in srgb, var(--danger) 75%, var(--card)), var(--danger))";

interface ThresholdScoreHistogramProps {
  bins: readonly ThresholdScoreBin[];
  trainingWindowCount: number;
  operatingWindowCount: number;
  savedThreshold: number;
  previewThreshold: number;
  // Slider를 끄는 중의 어림값이면 값 앞에 ≈ 표시
  isPreviewEstimate?: boolean;
  // 저장 임계값과 미리보기 임계값이 가로축에서 놓이는 위치(0부터 1)
  savedPosition: number;
  previewPosition: number;
  // 구간마다 미리보기 임계값을 넘는지 여부, bins와 같은 순서
  overPreview: readonly boolean[];
}

// 학습 점수 분포 Bar, 운영 점수 계단선, 저장과 미리보기 임계값 선 표시, Bar에 Hover하면 그 구간의 학습과 운영 개수를 Tooltip으로 표시
export function ThresholdScoreHistogram({
  bins,
  trainingWindowCount,
  operatingWindowCount,
  savedThreshold,
  previewThreshold,
  isPreviewEstimate = false,
  savedPosition,
  previewPosition,
  overPreview,
}: ThresholdScoreHistogramProps) {
  const tooltip = useCursorTooltipHandle();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  // 처음 그릴 때 Bar는 아래에서 자라고 계단선은 그 뒤 왼쪽부터 그어짐, 다른 Chart와 같은 길이와 감속 곡선, 움직임 줄이기 설정이면 바로 표시
  const shouldReduceMotion = useReducedMotion();
  const trainingSum = bins.reduce((sum, bin) => sum + bin.trainingCount, 0) || 1;
  const operatingSum = bins.reduce((sum, bin) => sum + bin.operatingCount, 0) || 1;
  const peakShare = Math.max(
    ...bins.map((bin) => bin.trainingCount / trainingSum),
    ...bins.map((bin) => bin.operatingCount / operatingSum),
    Number.MIN_VALUE,
  );
  const first = bins[0];
  const last = bins[bins.length - 1];
  const xTicks =
    first === undefined || last === undefined
      ? []
      : Array.from({ length: X_TICK_COUNT }, (_, index) => {
          const ratio = index / (X_TICK_COUNT - 1);
          return { ratio, label: (first.start + (last.end - first.start) * ratio).toFixed(1) };
        });
  const previewLeft = `${previewPosition * 100}%`;
  const savedLeft = `${savedPosition * 100}%`;
  const barHeight = (share: number) => (share / peakShare) * BAR_PEAK_PERCENT;
  // 학습은 구간마다 Bar 하나, 운영은 같은 구간 Width로 그리는 계단선
  const bars = bins.map((bin, index) => {
    const over = overPreview[index] === true;
    const range = `${bin.start.toFixed(3)} ~ ${bin.end.toFixed(3)}`;
    return {
      key: `b${index}`,
      height: barHeight(bin.trainingCount / trainingSum),
      image: over ? overBarImage : trainingBarImage,
      title: `점수 ${range}`,
      detail: [
        `학습 ${bin.trainingCount.toLocaleString()}개 (${((bin.trainingCount / trainingWindowCount) * 100).toFixed(2)}%)`,
        `운영 ${bin.operatingCount.toLocaleString()}개 (${((bin.operatingCount / operatingWindowCount) * 100).toFixed(2)}%)`,
        ...(over ? ["미리보기 임계 초과"] : []),
      ].join(" · "),
    };
  });
  // 운영 계단선 path, 가로는 구간 번호, 세로는 위에서부터 0부터 100
  const operatingPath = bins
    .map((bin, index) => {
      const y = 100 - barHeight(bin.operatingCount / operatingSum);
      return `${index === 0 ? `M0 ${y}` : `V${y}`} H${index + 1}`;
    })
    .join(" ");
  return (
    <div
      data-slot="threshold-score-histogram"
      className="grid min-h-[6.25rem] flex-[1_1_0] grid-cols-[2.5rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-2 pt-6"
    >
      <div className="mb-[1.375rem] flex flex-col justify-between text-right text-[0.6875rem] font-semibold text-muted-foreground">
        {Y_TICKS.map((label) => (
          <span key={label} className="-translate-y-1/2">
            {label}
          </span>
        ))}
        <span className="translate-y-1/2">0</span>
      </div>
      <div className="flex min-h-0 min-w-0 flex-col gap-2 pr-11">
        <div
          data-slot="threshold-histogram-plot"
          className="relative min-h-0 flex-[1_1_0] border-b border-muted-strong"
        >
          <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,var(--muted)_0_0.0625rem,transparent_0.0625rem_25%)]" />
          <div
            data-slot="threshold-preview-region"
            className="absolute inset-y-0 right-0 bg-danger-subtle opacity-80"
            style={{ left: previewLeft }}
          />
          <div
            data-slot="threshold-preview-line"
            className="absolute inset-y-0 border-l-[0.09375rem] border-dashed border-destructive"
            style={{ left: previewLeft }}
          />
          <span
            data-slot="threshold-preview-pill"
            className="absolute -top-[1.375rem] flex h-[1.125rem] translate-x-2 items-center rounded-[0.25rem] bg-danger-subtle px-1.5 text-[0.6875rem] font-bold whitespace-nowrap text-destructive"
            style={{ left: previewLeft }}
          >
            미리보기 {isPreviewEstimate ? "≈ " : ""}
            {previewThreshold.toFixed(4)}
          </span>
          <div
            data-slot="threshold-saved-line"
            className="absolute inset-y-0 border-l-[0.09375rem] border-dashed border-border-strong"
            style={{ left: savedLeft }}
          />
          <span
            data-slot="threshold-saved-pill"
            className="absolute -top-[1.375rem] flex h-[1.125rem] translate-x-[calc(-100%-0.375rem)] items-center rounded-[0.25rem] bg-muted px-1.5 text-[0.6875rem] font-bold whitespace-nowrap text-muted-foreground"
            style={{ left: savedLeft }}
          >
            저장 {savedThreshold.toFixed(4)}
          </span>
          <div className="absolute inset-0 flex items-end">
            {bars.map((bar, index) => (
              <CursorTooltipTarget
                key={bar.key}
                handle={tooltip}
                slot="threshold-histogram-bar"
                text={{ title: bar.title, detail: bar.detail }}
              >
                <span
                  className="relative flex h-full min-w-0 flex-1 items-end"
                  onPointerEnter={() => setHoveredBar(index)}
                  onPointerLeave={() => setHoveredBar((current) => (current === index ? null : current))}
                >
                  <motion.span
                    data-slot="threshold-histogram-bar-fill"
                    className="w-full origin-bottom rounded-t-[0.125rem] border-r border-card"
                    initial={shouldReduceMotion ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: motionDuration.slow, ease: motionEase.out }}
                    style={{
                      height: `${bar.height}%`,
                      backgroundImage: bar.image,
                      opacity: hoveredBar === null || hoveredBar === index ? 1 : DIMMED_BAR_OPACITY,
                    }}
                  />
                </span>
              </CursorTooltipTarget>
            ))}
          </div>
          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={shouldReduceMotion ? false : { clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: motionDuration.slow, ease: motionEase.out, delay: motionDuration.slow }}
          >
            <svg
              data-slot="threshold-operating-line"
              aria-hidden
              className="pointer-events-none absolute inset-0 size-full overflow-visible"
              viewBox={`0 0 ${Math.max(bins.length, 1)} 100`}
              preserveAspectRatio="none"
            >
              <path
                d={operatingPath}
                fill="none"
                // Bar 위에서 눈에 띄게 굵게 표시, rem 단위라 큰 화면에서도 같은 비율로 굵어짐
                className="stroke-warning [stroke-width:0.1875rem]"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="miter"
              />
            </svg>
          </motion.div>
        </div>
        <div className="relative h-3.5 text-[0.6875rem] font-semibold text-muted-foreground">
          {xTicks.map((tick) => (
            <span
              key={tick.ratio}
              className="absolute -translate-x-1/2"
              style={{ left: `${tick.ratio * 100}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>
      </div>
      <CursorTooltip handle={tooltip} />
    </div>
  );
}
