"use client";

import type { ReactNode } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { eyebrowClassName } from "@/components/atoms/eyebrowClassName";
import { ModalBodyScroll } from "@/components/atoms/ModalBodyScroll";
import { StatePill } from "@/components/atoms/StatePill";
import { Well } from "@/components/atoms/Well";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { KeyValueRow } from "@/components/molecules/KeyValueRow";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { EnsembleConsensusCards, EnsembleModelTable, rangeWindowCount } from "@/components/organisms/ensembleVerdictParts";
import { EnsembleWindowStrip } from "@/components/organisms/EnsembleWindowStrip";
import { inferenceJobStatusTones } from "@/components/organisms/inferenceTones";
import type {
  EnsembleAnomalySegment,
  EnsembleJob,
  EnsembleJobDetail,
  EnsembleJobStatus,
} from "@/domain/ensemble";
import { ensembleSegmentAgreementLabels } from "@/domain/labels/ensembleSegmentAgreement";
import { inferenceJobStatusLabels } from "@/domain/labels/inferenceJobStatus";
import type { AnalysisModel } from "@/domain/model";
import { formatIsoDate, formatIsoHourMinute } from "@/lib/formatTime";

// 상태별 Dialog Frame 크기(rem), 판정은 1700 × 900, 실패와 진행 중은 Width 1000에 내용 높이만큼
const FRAME_SIZES: Record<"verdict" | "summary", { widthRem: number; heightRem?: number }> = {
  verdict: { widthRem: 106.25, heightRem: 56.25 },
  summary: { widthRem: 62.5 },
};
// 값이 아직 없을 때 표시할 문구, Model을 잇는 문구
const EMPTY_VALUE = "–";
const MODEL_SEPARATOR = " · ";

// 이상 구간에서 Model이 잡은 정도 문구 계산, 모두 일치면 "잡은 모델 수 / 모델 수", 아니면 구간 전체를 잡은 Model 수와 일부만 잡은 Model 수
function describeSegmentHits(segment: EnsembleAnomalySegment, modelCount: number): string {
  if (segment.agreement === "unanimous") return `${segment.modelHits.length} / ${modelCount}`;
  const length = rangeWindowCount(segment.range);
  const full = segment.modelHits.filter((hit) => hit.anomalyWindowCount === length);
  const partial = segment.modelHits.filter((hit) => hit.anomalyWindowCount < length);
  const head = full.map((hit) => hit.modelCode).join("·");
  if (partial.length === 0) return head;
  return `${head} (+${partial.map((hit) => `${hit.modelCode} ${hit.anomalyWindowCount}`).join(", +")})`;
}

// 요청 조건 Row의 이름과 값 반환, 판정 상태는 Segment와 window 길이까지, 그 밖에는 상태를 둘째 Row로 표시
function jobRows(job: EnsembleJob, detail: EnsembleJobDetail | null): { label: string; value: string }[] {
  const source = detail ?? job;
  const endedAt = "endedAt" in source ? formatIsoHourMinute(source.endedAt) : EMPTY_VALUE;
  const { from, to } = source.requestedPeriod;
  const rows = [
    { label: "Job ID", value: source.id },
    { label: "생성 · 종료", value: `${formatIsoDate(source.createdAt)} ${formatIsoHourMinute(source.createdAt)} · ${endedAt}` },
    { label: "장치", value: source.deviceCode },
    { label: "사용 모델", value: `${source.modelCodes.join(MODEL_SEPARATOR)} (${source.modelCodes.length}종 고정)` },
    { label: "편성", value: source.formation ?? "전체" },
    { label: "추론 기간", value: `${from} ~ ${to}` },
  ];
  if (detail?.status === "succeeded") {
    return [
      ...rows,
      { label: "세그먼트", value: `${detail.segment} · 전체 ${detail.verdict.windowCount} window` },
      { label: "윈도우(초)", value: String(detail.windowSeconds) },
    ];
  }
  return [rows[0], { label: "상태", value: inferenceJobStatusLabels[source.status].label }, ...rows.slice(1)];
}

interface EnsembleDetailModalProps {
  open: boolean;
  // 연 작업, 상세를 받기 전에도 제목과 상태 구성을 정함, 연 적이 없으면 null
  job: EnsembleJob | null;
  // 연 작업의 상세, 받는 동안은 null
  detail: EnsembleJobDetail | null;
  isDetailFailed: boolean;
  analysisModels: readonly AnalysisModel[];
  isRequesting: boolean;
  onExportCsv: () => void;
  onOpenAlarm: () => void;
  onRetry: () => void;
  onCancelJob: () => void;
  onClose: () => void;
  overlays?: ReactNode;
}

// Ensemble 작업 한 건의 판정(모델 비교), 실패, 진행 중 상태를 그 상태에 맞게 Modal로 표시
export function EnsembleDetailModal({
  open,
  job,
  detail,
  isDetailFailed,
  analysisModels,
  isRequesting,
  onExportCsv,
  onOpenAlarm,
  onRetry,
  onCancelJob,
  onClose,
  overlays,
}: EnsembleDetailModalProps) {
  if (job === null) return null;
  const status: EnsembleJobStatus = detail?.status ?? job.status;
  const content = describeContent(status, job, detail, isDetailFailed, analysisModels, isRequesting, {
    onExportCsv,
    onOpenAlarm,
    onRetry,
    onCancelJob,
    onClose,
  });
  return (
    <ModalFrame
      name="ensemble-detail"
      open={open}
      onClose={onClose}
      title={content.title}
      {...FRAME_SIZES[content.size]}
      footerStart={content.footerStart}
      footerEnd={content.footerEnd}
      overlays={overlays}
    >
      {content.body}
    </ModalFrame>
  );
}

interface DetailActions {
  onExportCsv: () => void;
  onOpenAlarm: () => void;
  onRetry: () => void;
  onCancelJob: () => void;
  onClose: () => void;
}

interface DetailContent {
  title: string;
  size: keyof typeof FRAME_SIZES;
  body: ReactNode;
  footerStart?: ReactNode;
  footerEnd: ReactNode;
}

// 요청 조건 Row 모음 표시, 머리에 JOB을 표시하고 판정 상태에서는 상태도 표시
function JobSection({ job, detail, withStatus }: { job: EnsembleJob; detail: EnsembleJobDetail | null; withStatus: boolean }) {
  return (
    <>
      <div className="flex items-center pb-2">
        <div className={eyebrowClassName}>JOB</div>
        <span className="flex-1" />
        {withStatus ? (
          <StatePill size="md" tone={inferenceJobStatusTones[job.status]} label={inferenceJobStatusLabels[job.status].label} />
        ) : null}
      </div>
      {jobRows(job, detail).map((row) => (
        <KeyValueRow key={row.label} label={row.label} value={row.value} singleLine />
      ))}
    </>
  );
}

// 상태별 제목, Frame 크기, 본문, 하단 Button 반환
function describeContent(
  status: EnsembleJobStatus,
  job: EnsembleJob,
  detail: EnsembleJobDetail | null,
  isDetailFailed: boolean,
  analysisModels: readonly AnalysisModel[],
  isRequesting: boolean,
  actions: DetailActions,
): DetailContent {
  const closeButton = (variant: "primary" | "outline") => (
    <ActionButton label="닫기" variant={variant} weight="semibold" onClick={actions.onClose} />
  );
  if (isDetailFailed) {
    return {
      title: `앙상블 상세 · ${job.id}`,
      size: "summary",
      body: (
        <AlertBanner tone="danger" layout="paragraph" icon={<WarningAmberRoundedIcon className="size-[1.125rem]" />}>
          앙상블 상세를 불러오지 못했습니다.
        </AlertBanner>
      ),
      footerEnd: closeButton("outline"),
    };
  }
  switch (status) {
    case "succeeded": {
      const verdict = detail?.status === "succeeded" ? detail.verdict : null;
      const modelCount = verdict?.models.length ?? 0;
      return {
        title: `앙상블 상세 · ${job.deviceCode} · 편성 ${job.formation ?? "전체"}`,
        size: "verdict",
        body: (
          <ModalBodyScroll>
            <div data-slot="ensemble-detail-body" className="grid min-h-0 flex-1 grid-cols-[27.5rem_minmax(0,1fr)] gap-3.5">
              <Well data-slot="ensemble-detail-job" className="flex flex-col overflow-auto">
                <JobSection job={job} detail={detail} withStatus />
                <div className="pt-4 pb-2 text-sm font-bold">이상 구간</div>
                {verdict?.segments.map((segment) => (
                  <div
                    key={segment.range.startWindow}
                    data-slot="ensemble-segment-row"
                    className="grid h-9 flex-none grid-cols-[8.75rem_2.875rem_minmax(0,1fr)_auto] items-center gap-1.5 border-b border-dashed border-border text-sm"
                  >
                    <b>{`window ${segment.range.startWindow} – ${segment.range.endWindow}`}</b>
                    <span className="text-xs text-muted-foreground">{`${rangeWindowCount(segment.range)}개`}</span>
                    <span className="truncate text-xs text-muted-foreground">{describeSegmentHits(segment, modelCount)}</span>
                    <StatePill
                      size="md"
                      tone={segment.agreement === "unanimous" ? "danger" : "muted"}
                      label={ensembleSegmentAgreementLabels[segment.agreement](modelCount)}
                    />
                  </div>
                ))}
              </Well>
              <Well data-slot="ensemble-detail-verdict" className="flex min-w-0 flex-col gap-3.5 overflow-auto">
                <div className={eyebrowClassName}>모델별 판정</div>
                {verdict === null ? null : (
                  <>
                    <EnsembleModelTable models={verdict.models} windowCount={verdict.windowCount} analysisModels={analysisModels} scrollable={false} />
                    <div className={eyebrowClassName}>다수결 판정</div>
                    <EnsembleConsensusCards consensus={verdict.consensus} windowCount={verdict.windowCount} compact />
                    <EnsembleWindowStrip verdict={verdict} />
                  </>
                )}
              </Well>
            </div>
          </ModalBodyScroll>
        ),
        footerEnd: (
          <>
            <ActionButton
              label="CSV 내보내기"
              icon={<DownloadRoundedIcon className="size-[1.125rem]" />}
              variant="outline"
              weight="semibold"
              disabled={verdict === null}
              pending={isRequesting}
              onClick={actions.onExportCsv}
            />
            <ActionButton
              label="알람으로 등록"
              icon={<AddRoundedIcon className="size-[1.125rem]" />}
              variant="outline"
              weight="semibold"
              disabled={verdict === null || isRequesting}
              onClick={actions.onOpenAlarm}
            />
            {closeButton("primary")}
          </>
        ),
      };
    }
    case "failed":
      return {
        title: `앙상블 상세 · ${job.id} · 실패`,
        size: "summary",
        body: (
          <>
            <AlertBanner tone="danger" layout="paragraph" icon={<WarningAmberRoundedIcon className="size-[1.125rem]" />}>
              {detail?.status === "failed" ? detail.failureMessage : job.status === "failed" ? job.failureReason : EMPTY_VALUE}
            </AlertBanner>
            <Well data-slot="ensemble-detail-job">
              <JobSection job={job} detail={detail} withStatus={false} />
            </Well>
          </>
        ),
        footerEnd: (
          <>
            {closeButton("outline")}
            <ActionButton
              label="재시도"
              icon={<RefreshRoundedIcon className="size-[1.125rem]" />}
              weight="semibold"
              pending={isRequesting}
              onClick={actions.onRetry}
            />
          </>
        ),
      };
    case "queued":
    case "running":
      return {
        title: `앙상블 상세 · ${job.id}`,
        size: "summary",
        body: (
          <>
            <AlertBanner tone="brand" layout="paragraph" icon={<HourglassTopRoundedIcon className="size-[1.125rem]" />}>
              추론이 진행 중입니다. 완료되면 판정이 표시됩니다.
            </AlertBanner>
            <Well data-slot="ensemble-detail-job">
              <JobSection job={job} detail={detail} withStatus={false} />
            </Well>
          </>
        ),
        footerStart: (
          <ActionButton label="앙상블 취소" variant="danger" weight="semibold" pending={isRequesting} onClick={actions.onCancelJob} />
        ),
        footerEnd: closeButton("outline"),
      };
  }
}
