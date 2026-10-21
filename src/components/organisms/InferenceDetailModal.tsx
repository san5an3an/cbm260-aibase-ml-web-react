"use client";

import type { ReactNode } from "react";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { ModalBodyScroll } from "@/components/atoms/ModalBodyScroll";
import { PanelEyebrow } from "@/components/atoms/PanelEyebrow";
import { Well } from "@/components/atoms/Well";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { AnomalyWindowRow } from "@/components/molecules/AnomalyWindowRow";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/molecules/DataTable";
import { EmptyState } from "@/components/molecules/EmptyState";
import { KeyValueRow } from "@/components/molecules/KeyValueRow";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { SkeletonPanel } from "@/components/molecules/SkeletonPanel";
import { CarHeatmap } from "@/components/organisms/CarHeatmap";
import {
  anomalyPercent,
  formatAnomalyPercent,
  formatThreshold,
} from "@/components/organisms/inferenceRate";
import { inferenceRateTextClassNames } from "@/components/organisms/inferenceTones";
import type { InferenceJobDetail, InferenceJobId, InferenceJobStatus } from "@/domain/inference";
import { inferenceJobStatusLabels } from "@/domain/labels/inferenceJobStatus";
import { modelStageLabels } from "@/domain/labels/modelStage";
import type { AnalysisModel } from "@/domain/model";
import {
  formatIsoDate,
  formatIsoDateTime,
  formatIsoHourMinute,
  formatIsoMonthDay,
  formatIsoTime,
  formatTimeOfDayHourMinute,
} from "@/lib/formatTime";
import type { AsyncResource } from "@/lib/useAsyncResource";
import { cn } from "@/lib/utils";

// Modal의 상태, Loading, 조회 실패, 실패한 작업, 그 밖의 작업 결과
type DetailView = "loading" | "error" | "failed" | "result";

// 상태별 Modal Width와 Height(rem), Height가 없으면 내용만큼
const frameSizes: Record<DetailView, { widthRem: number; heightRem?: number }> = {
  loading: { widthRem: 62.5, heightRem: 38.75 },
  error: { widthRem: 62.5, heightRem: 38.75 },
  failed: { widthRem: 62.5 },
  result: { widthRem: 106.25, heightRem: 56.25 },
};
// Segment별 결과 Table의 Column 폭과 최소 폭
const SEGMENT_COLUMNS = "minmax(0,1fr) 9.375rem 9.375rem 9.375rem 8.125rem";
const SEGMENT_TABLE_MIN_WIDTH = "0rem";
// 이상 점수의 소수 자릿수
const SCORE_DIGITS = 3;
// 값이 없는 Cell에 표시할 문구
const EMPTY_VALUE = "–";

type FailedDetail = Extract<InferenceJobDetail, { status: "failed" }>;
type ResultDetail = Exclude<InferenceJobDetail, { status: "failed" }>;

// 추론 취소 Button을 표시할 상태인지 판정, 끝나기 전(요청됨, 추론 중)만 취소할 수 있음. 상태마다 답을 적어 빠뜨리면 Type 오류가 발생함
function showsCancel(status: InferenceJobStatus): boolean {
  switch (status) {
    case "queued":
    case "running":
      return true;
    case "succeeded":
    case "failed":
      return false;
  }
}

// 상태별로 그릴 머리 문구, 본문, 하단 Row 정의
interface DetailContent {
  view: DetailView;
  title: string;
  body: ReactNode;
  footerStart?: ReactNode;
  footerEnd?: ReactNode;
}

// 조회 실패 안내 문구 계산, 받지 못한 이유가 있으면 괄호 안에 붙임
function describeLoadError(message: string): string {
  const reason = message.trim();
  return `서버가 응답하지 않습니다${reason === "" ? "" : ` (${reason})`}\n잠시 후 다시 시도하고, 계속되면 관리자에게 알려 주세요.`;
}

interface InferenceDetailModalProps {
  open: boolean;
  // 연 작업의 번호, 열기 전이면 null
  jobId: InferenceJobId | null;
  // 상세 조회의 현재 상태, 다시 받는 동안은 Loading으로 처리
  detail: AsyncResource<InferenceJobDetail>;
  // Model 코드에 붙일 이름 목록, 목록에 없는 코드는 코드 그대로 표시
  models: readonly AnalysisModel[];
  // Request 전송 중 재시도, 추론 실행으로 이동, 추론 취소 Button 비활성화 표시
  isRequesting: boolean;
  onReload: () => void;
  onRetry: () => void;
  onOpenRun: () => void;
  // 끝나기 전 작업의 추론 취소 Button을 Click했을 때 호출, 취소 확인 Dialog를 띄움
  onCancelJob: () => void;
  // 이 Modal 위에 겹쳐 띄울 취소 확인 Dialog
  overlays?: ReactNode;
  onClose: () => void;
}

// 추론 작업 한 건의 요청 조건과 결과를 Loading, 조회 실패, 실패, 결과 상태로 보여 주는 Modal 표시
export function InferenceDetailModal({
  open,
  jobId,
  detail,
  models,
  isRequesting,
  onReload,
  onRetry,
  onOpenRun,
  onCancelJob,
  overlays,
  onClose,
}: InferenceDetailModalProps) {
  const modelName = (modelCode: string) =>
    models.find((model) => model.code === modelCode)?.name ?? modelCode;

  // 실패한 작업의 구성 계산, 실패 내용 Bar, 작업과 요청 조건 Group 둘, 추론 실행으로 이동, 닫기, 재시도
  const failedContent = (data: FailedDetail): DetailContent => ({
    view: "failed",
    title: `추론 상세 · ${data.id} · ${inferenceJobStatusLabels[data.status].label}`,
    body: (
      <>
        <AlertBanner
          tone="danger"
          layout="paragraph"
          icon={<WarningAmberRoundedIcon aria-hidden className="size-[1.125rem]" />}
        >
          {data.failureMessage}
        </AlertBanner>
        <div data-slot="inference-detail-panels" className="grid grid-cols-2 items-start gap-3.5">
          <Well data-slot="inference-detail-panel" className="flex flex-col">
            <PanelEyebrow className="pb-2" label="JOB" />
            <KeyValueRow singleLine label="Job ID" value={data.id} />
            <KeyValueRow singleLine label="상태" value={inferenceJobStatusLabels[data.status].label} />
            <KeyValueRow
              singleLine
              label="생성 · 종료"
              value={`${formatIsoDate(data.createdAt)} ${formatIsoHourMinute(data.createdAt)} · ${formatIsoHourMinute(data.endedAt)}`}
            />
            <KeyValueRow singleLine label="장치" value={data.deviceCode} />
            <KeyValueRow singleLine label="편성" value={data.formation ?? EMPTY_VALUE} />
            <KeyValueRow
              singleLine
              label="추론 기간"
              value={`${data.requestedPeriod.from} ~ ${data.requestedPeriod.to}`}
            />
          </Well>
          <Well data-slot="inference-detail-panel" className="flex flex-col">
            <PanelEyebrow className="pb-2" label="요청 조건" />
            <KeyValueRow singleLine label="모델" value={modelName(data.modelCode)} />
            <KeyValueRow singleLine label="세그먼트" value={data.segments.join(" · ")} />
            <KeyValueRow singleLine label="윈도우(초)" value={String(data.windowSeconds)} />
            <KeyValueRow
              singleLine
              label="학습본"
              value={`${modelStageLabels[data.trainedModel.stage]} · ${data.trainedModel.version}`}
            />
            <span
              data-slot="inference-detail-note"
              className="pt-3 text-xs leading-[1.0625rem] text-muted-foreground"
            >
              같은 조건으로 재시도하거나, 기간을 바꿔 추론 실행에서 새로 요청하세요
            </span>
          </Well>
        </div>
      </>
    ),
    footerStart: (
      <ActionButton
        label="추론 실행으로 이동"
        variant="outline"
        weight="semibold"
        disabled={isRequesting}
        onClick={onOpenRun}
      />
    ),
    footerEnd: (
      <>
        <ActionButton label="닫기" variant="outline" weight="semibold" onClick={onClose} />
        <ActionButton
          label="재시도"
          icon={<RefreshRoundedIcon className="size-[1.125rem]" />}
          weight="semibold"
          disabled={isRequesting}
          onClick={onRetry}
        />
      </>
    ),
  });

  // 실패가 아닌 작업의 구성 계산, 작업 Group, Segment별 결과, 이상 시간대, 편성 × 호차, 끝나기 전이면 추론 취소, 닫기
  const resultContent = (data: ResultDetail): DetailContent => ({
    view: "result",
    title: `추론 상세 · ${data.deviceCode}`,
    body: (
      <div
        data-slot="inference-detail-body"
        className="grid min-h-0 flex-1 grid-cols-[27.5rem_minmax(0,1fr)] items-stretch gap-3.5"
      >
        <Well data-slot="inference-detail-job" className="flex min-h-0 flex-col overflow-auto">
          <PanelEyebrow className="pb-2" label="JOB" />
          <KeyValueRow singleLine label="Job ID" value={data.id} />
          <KeyValueRow singleLine label="상태" value={inferenceJobStatusLabels[data.status].label} />
          <KeyValueRow
            singleLine
            label="생성 · 종료"
            value={`${formatIsoDateTime(data.createdAt)} · ${data.endedAt === null ? EMPTY_VALUE : formatIsoTime(data.endedAt)}`}
          />
          <KeyValueRow singleLine label="장치" value={data.deviceCode} />
          <KeyValueRow singleLine label="모델" value={modelName(data.modelCode)} />
          <KeyValueRow singleLine label="편성" value={data.formation ?? "전체"} />
          <KeyValueRow
            singleLine
            label="추론 기간"
            value={`${data.requestedPeriod.from} ${formatTimeOfDayHourMinute(data.requestedStartTime)} ~ ${data.requestedPeriod.to} ${formatTimeOfDayHourMinute(data.requestedEndTime)}`}
          />
          <KeyValueRow singleLine label="윈도우(초)" value={String(data.windowSeconds)} />
          <KeyValueRow singleLine label="자동 알람" value={`${data.autoAlarmCount} 건 생성`} />
        </Well>
        <Well
          data-slot="inference-detail-results"
          className="grid min-h-0 min-w-0 auto-rows-max content-start gap-3.5 overflow-auto"
        >
          <PanelEyebrow label="세그먼트별 결과" />
          <DataTable
            minWidth={SEGMENT_TABLE_MIN_WIDTH}
            frameClassName="flex-none overflow-hidden rounded-[0.625rem] bg-card"
          >
            <DataTableHeader>
              <DataTableHeaderRow columns={SEGMENT_COLUMNS}>
                <DataTableHead>세그먼트</DataTableHead>
                <DataTableHead className="text-right">전체 window</DataTableHead>
                <DataTableHead className="text-right">이상 window</DataTableHead>
                <DataTableHead className="text-right">이상 비율</DataTableHead>
                <DataTableHead className="text-right">임계값</DataTableHead>
              </DataTableHeaderRow>
            </DataTableHeader>
            <DataTableBody>
              {data.segmentResults.map((result) => {
                const percent = anomalyPercent(result.anomalyWindowCount, result.windowCount);
                return (
                  <DataTableRow
                    key={result.segment}
                    columns={SEGMENT_COLUMNS}
                    className="h-12 tabular-nums hover:bg-transparent"
                  >
                    <DataTableCell className="font-bold">{result.segment}</DataTableCell>
                    <DataTableCell className="text-right">{result.windowCount}</DataTableCell>
                    <DataTableCell className="text-right font-bold">
                      {result.anomalyWindowCount}
                    </DataTableCell>
                    <DataTableCell
                      className={cn(
                        "text-right font-bold",
                        percent === null
                          ? "text-muted-foreground"
                          : inferenceRateTextClassNames[result.anomalyRateLevel],
                      )}
                    >
                      {formatAnomalyPercent(percent)}
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      {formatThreshold(result.threshold)}
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
          <div
            data-slot="inference-detail-findings"
            className="grid grid-cols-[minmax(0,1fr)_31rem] items-start gap-6"
          >
            <div data-slot="anomaly-window-list" className="flex flex-col">
              <PanelEyebrow className="pb-2" label="이상 시간대" />
              {data.anomalyWindows.map((window) => (
                <AnomalyWindowRow
                  key={`${window.startAt}-${window.segment}-${window.formation}-${window.car}`}
                  period={`${formatIsoMonthDay(window.startAt)} ${formatIsoHourMinute(window.startAt)} ~ ${formatIsoHourMinute(window.endAt)}`}
                  segment={window.segment}
                  location={`편성 ${window.formation} · ${window.car}호차`}
                  score={`score ${window.score.toFixed(SCORE_DIGITS)}`}
                />
              ))}
            </div>
            <CarHeatmap
              formations={data.carHeatmap.formations}
              cars={data.carHeatmap.cars}
              counts={data.carHeatmap.counts}
            />
          </div>
        </Well>
      </div>
    ),
    footerStart: showsCancel(data.status) ? (
      <ActionButton
        label="추론 취소"
        variant="danger"
        weight="semibold"
        disabled={isRequesting}
        onClick={onCancelJob}
      />
    ) : undefined,
    footerEnd: <ActionButton label="닫기" weight="semibold" onClick={onClose} />,
  });

  // 조회 상태와 받은 상세의 상태로 현재 구성 계산
  const describeContent = (): DetailContent => {
    switch (detail.status) {
      case "loading":
        return {
          view: "loading",
          title: `추론 상세 · ${jobId ?? ""}`,
          body: <SkeletonPanel caption="추론 상세를 불러오는 중…" />,
        };
      case "error":
        return {
          view: "error",
          title: `추론 상세 · ${jobId ?? ""}`,
          body: (
            <div role="alert" className="flex flex-1 flex-col">
              <EmptyState
                variant="fill"
                iconTone="danger"
                icon={<ErrorRoundedIcon aria-hidden className="size-7" />}
                title="추론 상세를 불러오지 못했습니다"
                description={describeLoadError(detail.message)}
                action={<ActionButton label="다시 시도" size="lg" onClick={onReload} />}
              />
            </div>
          ),
        };
      case "success": {
        const data = detail.data;
        switch (data.status) {
          case "failed":
            return failedContent(data);
          case "queued":
          case "running":
          case "succeeded":
            return resultContent(data);
        }
      }
    }
  };
  const content = describeContent();

  return (
    <ModalFrame
      name="inference-detail"
      open={open && jobId !== null}
      onClose={onClose}
      title={content.title}
      widthRem={frameSizes[content.view].widthRem}
      heightRem={frameSizes[content.view].heightRem}
      footerStart={content.footerStart}
      footerEnd={content.footerEnd}
      overlays={overlays}
    >
      {jobId === null ? null : <ModalBodyScroll>{content.body}</ModalBodyScroll>}
    </ModalFrame>
  );
}
