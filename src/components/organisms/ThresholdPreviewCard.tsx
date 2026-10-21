"use client";

import { useId } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { TextInput } from "@/components/atoms/TextInput";
import { SectionCard } from "@/components/molecules/SectionCard";
import { ThresholdScoreHistogram } from "@/components/organisms/ThresholdScoreHistogram";
import { Slider } from "@/components/ui/slider";
import type { ModelConfig, ModelConfigScope } from "@/domain/modelConfig";
import type { ThresholdScoreBin } from "@/domain/thresholdTuning";
import { formatIsoMonthDay } from "@/lib/formatTime";
import { cn } from "@/lib/utils";

// Slider 아래 눈금 개수와 한 단계 이동량
const SLIDER_TICK_COUNT = 6;
const SLIDER_STEP = 0.1;

// 범례 항목의 이름과 Color 정의
const LEGEND = [
  { label: "학습 점수", className: "bg-chart-1" },
  { label: "운영 점수", className: "h-0.5 w-[0.5625rem] bg-warning" },
  { label: "저장 임계", className: "bg-muted-strong" },
  { label: "미리보기 임계", className: "bg-destructive" },
] as const;

const sliderClassName = cn(
  "h-7",
  "[&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:rounded-[0.125rem] [&_[data-slot=slider-track]]:bg-brand-line4-subtle [&_[data-slot=slider-track]]:overflow-visible",
  "[&_[data-slot=slider-range]]:rounded-[0.125rem] [&_[data-slot=slider-range]]:bg-brand-line4",
  "[&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-[0.1875rem] [&_[data-slot=slider-thumb]]:border-brand-line4 [&_[data-slot=slider-thumb]]:bg-card [&_[data-slot=slider-thumb]]:shadow-[0_0.0625rem_0.1875rem_rgba(0,0,0,0.2)]",
  "[&>*]:h-7 cursor-pointer",
);

// Thumb 하나짜리 Slider가 넘긴 값에서 숫자 하나를 꺼냄, 라이브러리는 Thumb 수를 배열 길이로 정함
function firstValue(value: number | readonly number[]): number {
  return typeof value === "number" ? value : (value[0] ?? 0);
}

interface ThresholdPreviewCardProps {
  scope: ModelConfigScope;
  modelVersion: string;
  operatingDates: readonly string[];
  overflowOperatingCount: number;
  bins: readonly ThresholdScoreBin[];
  trainingWindowCount: number;
  operatingWindowCount: number;
  savedThreshold: number;
  previewThreshold: number;
  // 미리보기 선이 Slider를 끄는 중의 어림값인지 여부
  isPreviewEstimate: boolean;
  savedPosition: number;
  previewPosition: number;
  overPreview: readonly boolean[];
  percentileRange: { min: number; max: number };
  percentile: number;
  percentileText: string;
  onPercentileDrag: (percentile: number) => void;
  onPercentileCommit: (percentile: number) => void;
  onPercentileTextChange: (text: string) => void;
  onPercentileTextCommit: () => void;
  // 같은 범위의 Profile, 없으면 null
  profile: ModelConfig | null;
  onSaveNew: () => void;
  onApply: () => void;
  disabled: boolean;
  // 다시 받는 동안 옅게 표시하고 조작 비활성화
  isReloading: boolean;
}

// 임계 민감도 Card 표시, 점수 분포, 임계 백분위 Slider, 적용 대상, 저장 Button 포함
export function ThresholdPreviewCard({
  scope,
  modelVersion,
  operatingDates,
  overflowOperatingCount,
  bins,
  trainingWindowCount,
  operatingWindowCount,
  savedThreshold,
  previewThreshold,
  isPreviewEstimate,
  savedPosition,
  previewPosition,
  overPreview,
  percentileRange,
  percentile,
  percentileText,
  onPercentileDrag,
  onPercentileCommit,
  onPercentileTextChange,
  onPercentileTextCommit,
  profile,
  onSaveNew,
  onApply,
  disabled,
  isReloading,
}: ThresholdPreviewCardProps) {
  const labelId = useId();
  const span = percentileRange.max - percentileRange.min || 1;
  const sliderTicks = Array.from({ length: SLIDER_TICK_COUNT }, (_, index) => {
    const value = percentileRange.min + (span * index) / (SLIDER_TICK_COUNT - 1);
    return { value, left: `${((value - percentileRange.min) / span) * 100}%` };
  });
  const target =
    profile === null
      ? `적용 대상: ${scope.deviceCode} ${scope.modelCode} 프로파일 없음`
      : `적용 대상: ${profile.name} · 사용 ${profile.use} · 현재 ${profile.thresholdPercentile.toFixed(1)}%`;
  return (
    <SectionCard
      data-slot="threshold-preview-card"
      eyebrow="SENSITIVITY PREVIEW"
      title="임계 민감도"
      description="학습 점수 분포로 임계를 정하고, 추론이 저장한 운영 window 점수로 실제 이상 비율을 봄"
      className={cn(
        "min-h-0 flex-[1_1_0] overflow-hidden transition-opacity",
        isReloading && "opacity-60",
      )}
    >
      <div aria-busy={isReloading} className="flex flex-none flex-col gap-2">
        <div data-slot="threshold-preview-memo" className="text-xs leading-4 text-muted-foreground">
          모델 버전 {modelVersion} · 운영 데이터: {operatingDates.map(formatIsoMonthDay).join(", ")}{" "}
          (지금 모델 버전으로 저장된 날짜) · 학습 점수 범위를 넘은 운영 점수 {overflowOperatingCount}개는
          마지막 칸에 합쳐 그림
        </div>
        <div className="flex items-center gap-3 text-[0.6875rem] text-muted-foreground">
          {LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span className={cn("size-[0.5625rem] rounded-[0.125rem]", item.className)} />
              {item.label}
            </span>
          ))}
          <span>막대 = 학습 · 계단선 = 운영 · 높이 = 각자 전체 중 비율(%)</span>
        </div>
      </div>
      <ThresholdScoreHistogram
        bins={bins}
        trainingWindowCount={trainingWindowCount}
        operatingWindowCount={operatingWindowCount}
        savedThreshold={savedThreshold}
        previewThreshold={previewThreshold}
        isPreviewEstimate={isPreviewEstimate}
        savedPosition={savedPosition}
        previewPosition={previewPosition}
        overPreview={overPreview}
      />
      <div className="grid grid-cols-[7.875rem_minmax(0,1fr)_8.375rem] items-center gap-4 pt-1.5">
        <span id={labelId} className="text-sm font-bold">
          임계 백분위
        </span>
        <Slider
          aria-labelledby={labelId}
          value={[percentile]}
          min={percentileRange.min}
          max={percentileRange.max}
          step={SLIDER_STEP}
          thumbAlignment="center"
          disabled={disabled}
          onValueChange={(value) => onPercentileDrag(firstValue(value))}
          onValueCommitted={(value) => onPercentileCommit(firstValue(value))}
          className={sliderClassName}
        />
        <TextInput
          label="임계 백분위 입력"
          value={percentileText}
          onValueChange={onPercentileTextChange}
          onBlur={onPercentileTextCommit}
          inputMode="decimal"
          leadingIcon={<span className="text-sm text-muted-foreground">%</span>}
          className="tabular-nums"
        />
        <span />
        <div className="flex flex-col gap-1.5">
          <div className="relative h-3.5 text-[0.6875rem] font-semibold text-muted-foreground">
            {sliderTicks.map((tick) => (
              <span key={tick.value} className="absolute -translate-x-1/2" style={{ left: tick.left }}>
                {String(Math.round(tick.value * 10) / 10)}
              </span>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">슬라이더를 놓으면 다시 계산합니다</span>
        </div>
        <span />
      </div>
      <div className="flex items-center gap-2.5 pt-1">
        <div className="flex flex-col gap-0.5">
          <span data-slot="threshold-apply-target" className="text-sm font-bold">
            {target}
          </span>
          <span className="text-xs text-muted-foreground">
            같은 장치·모델·세그먼트 프로파일이 있으면 그 임계 백분위를 변경합니다. 사용 여부는 변경되지 않습니다.
          </span>
        </div>
        <span className="flex-1" />
        <ActionButton
          label="새 프로파일로 저장 (N)"
          icon={<AddRoundedIcon className="size-[1.125rem]" />}
          variant="outline"
          weight="semibold"
          onClick={onSaveNew}
          disabled={disabled}
        />
        <ActionButton
          label="기존 프로파일에 반영"
          icon={<CheckRoundedIcon className="size-[1.125rem]" />}
          weight="semibold"
          onClick={onApply}
          disabled={disabled}
        />
      </div>
    </SectionCard>
  );
}
