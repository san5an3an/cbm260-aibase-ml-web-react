"use client";

import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { AnimatePresence } from "motion/react";
import { ActionButton } from "@/components/atoms/ActionButton";
import { LegendSwatch } from "@/components/atoms/LegendSwatch";
import { ModalBodyScroll } from "@/components/atoms/ModalBodyScroll";
import { PanelEyebrow } from "@/components/atoms/PanelEyebrow";
import { Well } from "@/components/atoms/Well";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { KeyValueRow } from "@/components/molecules/KeyValueRow";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { LearningHealthCurveChart } from "@/components/organisms/LearningHealthCurveChart";
import { ThresholdTrendChart } from "@/components/organisms/ThresholdTrendChart";
import type { AnalysisModel } from "@/domain/model";
import type { TrainingResult, TrainingResultDetail } from "@/domain/training";
import { trainingJobStatusLabels } from "@/domain/labels/trainingJobStatus";
import { formatIsoDateTime } from "@/lib/formatTime";

// Modal의 Width(rem)
const WIDTH_REM = 106.25;
const HEIGHT_REM = 56.25;
// 임계값의 소수 자릿수
const THRESHOLD_DIGITS = 4;
// 학습 곡선의 세로 눈금 값(위에서 아래로)
const CURVE_TICKS: readonly number[] = [1, 0.5, 0];
const CURVE_TICK_DIGITS = 1;
const CURVE_PLOT_HEIGHT = 15.5;
const CURVE_AXIS_WIDTH = 2.75;
const CURVE_TRAILING_GAP = 2.5;
// 값이 없는 Cell에 표시할 문구
const EMPTY_VALUE = "–";

interface TrainingResultDetailModalProps {
  open: boolean;
  // 연 결과 Row, 열기 전이면 null
  result: TrainingResult | null;
  models: readonly AnalysisModel[];
  // 학습 지표, 버전별 임계값, 학습 곡선, 받기 전이거나 받지 못했으면 null
  detail: TrainingResultDetail | null;
  isDetailFailed: boolean;
  // 임계값 관리를 열 수 없는 상태, 결과 Row의 임계값 관리 Button 비활성화 조건과 같음
  isThresholdDisabled: boolean;
  onOpenThreshold: () => void;
  onClose: () => void;
}

// 학습 결과 1건의 학습 지표, 임계값 추이, 학습 건강도 곡선을 보여 주는 Modal 표시
export function TrainingResultDetailModal({
  open,
  result,
  models,
  detail,
  isDetailFailed,
  isThresholdDisabled,
  onOpenThreshold,
  onClose,
}: TrainingResultDetailModalProps) {
  const valueOf = (read: (loaded: TrainingResultDetail) => string) =>
    detail === null ? EMPTY_VALUE : read(detail);
  const modelName =
    result === null
      ? ""
      : (models.find((model) => model.code === result.modelCode)?.name ?? result.modelCode);

  return (
    <ModalFrame
      name="training-result-detail"
      open={open && result !== null}
      onClose={onClose}
      title={result === null ? "" : `학습 결과 상세 · ${result.deviceCode} ${result.modelCode}`}
      widthRem={WIDTH_REM}
      heightRem={HEIGHT_REM}
      footerEnd={
        <>
          <ActionButton
            label="임계치 관리 (모델 커스텀)"
            icon={<TuneRoundedIcon className="size-[1.125rem]" />}
            variant="outline"
            weight="semibold"
            disabled={isThresholdDisabled}
            onClick={onOpenThreshold}
          />
          <ActionButton label="닫기" weight="semibold" onClick={onClose} />
        </>
      }
    >
      {result === null ? null : (
        <ModalBodyScroll>
          <AnimatePresence initial={false}>
            {isDetailFailed ? (
              <AlertBanner
                key="detail-error"
                tone="danger"
                icon={<WarningAmberRoundedIcon aria-hidden className="size-5" />}
                animated
              >
                학습 지표와 임계치 추이를 불러오지 못했습니다.
              </AlertBanner>
            ) : null}
          </AnimatePresence>
          <div
            data-slot="training-result-detail-body"
            className="grid min-h-0 flex-1 grid-cols-[27.5rem_minmax(0,1fr)] gap-3.5"
          >
            <Well data-slot="training-result-metrics" className="flex flex-col overflow-auto">
              <PanelEyebrow className="pb-2" label="학습 지표" />
              <KeyValueRow singleLine label="모델" value={`${modelName} (${result.modelCode})`} />
              <KeyValueRow singleLine label="장치" value={result.deviceCode} />
              <KeyValueRow
                singleLine
                label="세그먼트 · 편성"
                value={`${result.segment} · ${valueOf((loaded) => loaded.formation ?? "전체")}`}
              />
              <KeyValueRow
                singleLine
                label="학습 일시"
                value={formatIsoDateTime(result.trainedAt)}
              />
              <KeyValueRow
                singleLine
                label="모델 버전"
                value={valueOf((loaded) => loaded.modelVersion)}
              />
              <KeyValueRow
                singleLine
                label="임계치"
                value={result.threshold.toFixed(THRESHOLD_DIGITS)}
              />
              <KeyValueRow
                singleLine
                label="윈도우(초)"
                value={valueOf((loaded) => String(loaded.windowSeconds))}
              />
              <KeyValueRow
                singleLine
                label="학습 window 수"
                value={valueOf((loaded) => String(loaded.windowCount))}
              />
              <KeyValueRow
                singleLine
                label="특징 수"
                value={valueOf((loaded) => String(loaded.featureCount))}
              />
              <KeyValueRow
                singleLine
                label="학습 방식 · 상태"
                value={valueOf(
                  (loaded) =>
                    `${loaded.trainingMethod} · ${trainingJobStatusLabels.succeeded.label}`,
                )}
              />
            </Well>
            <Well
              data-slot="training-result-charts"
              className="flex min-w-0 flex-col gap-3 overflow-auto"
            >
              <PanelEyebrow label="임계치 추이 (버전별)" />
              {detail === null ? null : (
                <ThresholdTrendChart
                  valueLabel="임계값"
                  points={detail.thresholdHistory.map((point) => ({
                    date: point.trainedOn,
                    value: point.threshold,
                  }))}
                />
              )}
              <div data-slot="learning-curve-header" className="flex items-center gap-3 pt-2.5">
                <PanelEyebrow label="학습 건강도 곡선" />
                <span className="flex-1" />
                <span
                  data-slot="learning-curve-legend"
                  className="flex gap-3 text-[0.6875rem] leading-[0.8125rem] text-muted-foreground"
                >
                  <LegendSwatch shape="line" tone="brand" label="train" />
                  <LegendSwatch shape="line" tone="chart2" label="val" />
                </span>
              </div>
              {detail === null ? null : (
                <LearningHealthCurveChart
                  points={detail.learningCurve}
                  tickValues={CURVE_TICKS}
                  tickDigits={CURVE_TICK_DIGITS}
                  plotHeightRem={CURVE_PLOT_HEIGHT}
                  axisWidthRem={CURVE_AXIS_WIDTH}
                  trailingGapRem={CURVE_TRAILING_GAP}
                  className="min-h-[12.5rem] flex-1"
                />
              )}
            </Well>
          </div>
        </ModalBodyScroll>
      )}
    </ModalFrame>
  );
}
