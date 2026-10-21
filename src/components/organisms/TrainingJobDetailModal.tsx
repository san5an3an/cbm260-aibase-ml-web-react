"use client";

import { Fragment, type ReactNode } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { AnimatePresence } from "motion/react";
import { ActionButton } from "@/components/atoms/ActionButton";
import { ModalBodyScroll } from "@/components/atoms/ModalBodyScroll";
import { PanelEyebrow } from "@/components/atoms/PanelEyebrow";
import { StatePill } from "@/components/atoms/StatePill";
import { StepConnector } from "@/components/atoms/StepConnector";
import { Well } from "@/components/atoms/Well";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { KeyValueRow } from "@/components/molecules/KeyValueRow";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { ProgressBar } from "@/components/molecules/ProgressBar";
import { StepItem, type StepItemState } from "@/components/molecules/StepItem";
import {
  describeStepProgress,
  describeTrainingJobStatus,
} from "@/components/organisms/trainingJobTexts";
import { trainingJobStatusTones } from "@/components/organisms/trainingTones";
import type { TrainingJob, TrainingJobDetail, TrainingJobStatus } from "@/domain/training";
import { trainingStageKeys, trainingStageLabels } from "@/domain/labels/trainingStage";
import { formatIsoDateTime, formatIsoTime, formatTimeOfDayHourMinute } from "@/lib/formatTime";

// Modal의 Width(rem)
const WIDTH_REM = 62.5;
// 값이 없는 Cell에 표시할 문구
const EMPTY_VALUE = "–";

// 실패 안내, 재시도 Button, 종료의 " (실패)" 표시 여부 판정, 상태마다 결과를 적어 빠뜨리면 Type 오류가 발생함
function showsFailure(status: TrainingJobStatus): boolean {
  switch (status) {
    case "failed":
      return true;
    case "queued":
    case "running":
    case "succeeded":
      return false;
  }
}

// 학습 취소 Button 표시 여부 판정, 끝나기 전(예약, 진행 중) 상태만 취소할 수 있음. 상태마다 결과를 적어 빠뜨리면 Type 오류가 발생함
function showsCancel(status: TrainingJobStatus): boolean {
  switch (status) {
    case "queued":
    case "running":
      return true;
    case "succeeded":
    case "failed":
      return false;
  }
}

// 단계 하나의 표시 상태 계산, 성공은 전부 완료, 예약은 전부 대기, 진행 중과 실패는 해당 단계 앞까지 완료
function stepState(job: TrainingJob, index: number): StepItemState {
  switch (job.status) {
    case "succeeded":
      return "done";
    case "queued":
      return "pending";
    case "running": {
      const current = trainingStageKeys.indexOf(job.stage);
      return index < current ? "done" : index === current ? "current" : "pending";
    }
    case "failed": {
      const stopped = trainingStageKeys.indexOf(job.stage);
      return index < stopped ? "done" : index === stopped ? "failed" : "pending";
    }
  }
}

// Progress Bar 뒤의 설명 계산, 단계 진행이 있으면 "epoch 7 / 10", 재시도로 만든 Job이면 "재시도"
function describeProgressMeta(job: Extract<TrainingJob, { status: "running" }>): string {
  if (job.stepProgress !== null) return describeStepProgress(job.stepProgress);
  return job.isRetry ? "재시도" : "";
}

// "YYYY-MM-DD HH:mm ~ YYYY-MM-DD HH:mm" 형식의 학습 기간 계산
function describeRequestedPeriod(detail: TrainingJobDetail): string {
  const { requestedPeriod, requestedStartTime, requestedEndTime } = detail;
  const from = `${requestedPeriod.from} ${formatTimeOfDayHourMinute(requestedStartTime)}`;
  const to = `${requestedPeriod.to} ${formatTimeOfDayHourMinute(requestedEndTime)}`;
  return `${from} ~ ${to}`;
}

interface TrainingJobDetailModalProps {
  open: boolean;
  // 연 Job, 열기 전이면 null
  job: TrainingJob | null;
  // 요청 조건과 시작, 종료 시각, 받기 전이거나 받지 못했으면 null
  detail: TrainingJobDetail | null;
  isDetailFailed: boolean;
  isRetrying: boolean;
  onRetry: () => void;
  // 취소 Request 대기 중 학습 취소 Button 비활성화
  isCanceling: boolean;
  // 끝나기 전 Job의 학습 취소 Click 시 호출, 취소 확인 Dialog를 띄움
  onCancelJob: () => void;
  // 이 Modal 위에 겹쳐 띄울 취소 확인 Dialog
  overlays?: ReactNode;
  onClose: () => void;
}

// 학습 Job 1건의 진행 단계, 진행률, 실패 내용, Job과 요청 조건을 보여 주는 Modal 표시
export function TrainingJobDetailModal({
  open,
  job,
  detail,
  isDetailFailed,
  isRetrying,
  onRetry,
  isCanceling,
  onCancelJob,
  overlays,
  onClose,
}: TrainingJobDetailModalProps) {
  const isFailed = job !== null && showsFailure(job.status);
  const canCancel = job !== null && showsCancel(job.status);
  const valueOf = (read: (loaded: TrainingJobDetail) => string) =>
    detail === null ? EMPTY_VALUE : read(detail);

  return (
    <ModalFrame
      name="training-job-detail"
      open={open && job !== null}
      onClose={onClose}
      title={job === null ? "" : `학습 상세 · ${job.id}`}
      widthRem={WIDTH_REM}
      footerStart={
        <>
          {canCancel ? (
            <ActionButton
              label="학습 취소"
              variant="danger"
              weight="semibold"
              disabled={isCanceling}
              onClick={onCancelJob}
            />
          ) : null}
          <span data-slot="modal-footnote" className="min-w-0 text-xs text-muted-foreground">
            {isFailed
              ? "실패한 잡은 결과 표에 남지 않습니다 · 재시도하면 같은 조건으로 새 잡을 만듭니다"
              : "실패 시 오류 메시지가 이 자리에 표시됩니다 · 완료되면 결과(세그먼트·window·특징 수)가 표시됩니다"}
          </span>
        </>
      }
      footerEnd={
        <>
          <ActionButton
            label="닫기"
            variant={isFailed ? "outline" : "primary"}
            weight="semibold"
            onClick={onClose}
          />
          {isFailed ? (
            <ActionButton
              label="재시도"
              icon={<RefreshRoundedIcon className="size-[1.125rem]" />}
              weight="semibold"
              disabled={isRetrying}
              onClick={onRetry}
            />
          ) : null}
        </>
      }
      overlays={overlays}
    >
      {job === null ? null : (
        <ModalBodyScroll>
          <Well data-slot="training-job-stages" className="flex flex-col gap-3.5">
            <div className="flex items-center">
              <span className="text-base leading-6 font-bold">진행 단계</span>
              <span className="flex-1" />
              <StatePill
                size="md"
                label={describeTrainingJobStatus(job)}
                tone={trainingJobStatusTones[job.status]}
              />
            </div>
            <div data-slot="training-job-step-track" className="flex items-center gap-2.5">
              {trainingStageKeys.map((key, index) => {
                const state = stepState(job, index);
                return (
                  <Fragment key={key}>
                    <StepItem
                      label={trainingStageLabels[key].label}
                      order={index + 1}
                      state={state}
                    />
                    {index < trainingStageKeys.length - 1 ? (
                      <StepConnector reached={state === "done"} />
                    ) : null}
                  </Fragment>
                );
              })}
            </div>
            {job.status === "running" ? (
              <ProgressBar
                label="학습 진행률"
                percent={job.progressPercent}
                meta={describeProgressMeta(job)}
              />
            ) : null}
          </Well>
          {job.status === "failed" ? (
            <AlertBanner
              tone="danger"
              layout="paragraph"
              icon={<WarningAmberRoundedIcon aria-hidden className="size-[1.125rem]" />}
            >
              {`${trainingStageLabels[job.stage].label} 생성 실패 — ${detail?.failureMessage ?? job.failureReason}`}
            </AlertBanner>
          ) : null}
          <AnimatePresence initial={false}>
            {isDetailFailed ? (
              <AlertBanner
                key="detail-error"
                tone="danger"
                icon={<WarningAmberRoundedIcon aria-hidden className="size-5" />}
                animated
              >
                학습 작업의 요청 조건을 불러오지 못했습니다.
              </AlertBanner>
            ) : null}
          </AnimatePresence>
          <div data-slot="training-job-panels" className="grid grid-cols-2 gap-3.5">
            <Well data-slot="training-job-panel" className="flex flex-col">
              <PanelEyebrow className="pb-2" label="JOB" />
              <KeyValueRow singleLine label="Job ID" value={job.id} />
              <KeyValueRow singleLine label="종류" value="학습" />
              <KeyValueRow singleLine label="라벨" value={`${job.deviceCode} ${job.modelCode}`} />
              <KeyValueRow
                singleLine
                label="생성 · 시작"
                value={`${formatIsoDateTime(job.createdAt)} · ${valueOf((loaded) =>
                  loaded.startedAt === null ? EMPTY_VALUE : formatIsoTime(loaded.startedAt),
                )}`}
              />
              <KeyValueRow
                singleLine
                label="종료"
                value={valueOf((loaded) =>
                  loaded.endedAt === null
                    ? EMPTY_VALUE
                    : `${formatIsoTime(loaded.endedAt)}${isFailed ? " (실패)" : ""}`,
                )}
              />
            </Well>
            <Well data-slot="training-job-panel" className="flex flex-col">
              <PanelEyebrow className="pb-2" label="REQUEST" />
              <KeyValueRow singleLine label="장치" value={job.deviceCode} />
              <KeyValueRow singleLine label="모델" value={job.modelCode} />
              <KeyValueRow singleLine label="편성" value={job.formation ?? "전체"} />
              <KeyValueRow singleLine label="학습 기간" value={valueOf(describeRequestedPeriod)} />
              <KeyValueRow
                singleLine
                label="윈도우(초)"
                value={valueOf((loaded) => String(loaded.windowSeconds))}
              />
            </Well>
          </div>
        </ModalBodyScroll>
      )}
    </ModalFrame>
  );
}
