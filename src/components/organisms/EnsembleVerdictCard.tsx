import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { StatePill } from "@/components/atoms/StatePill";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { EmptyState } from "@/components/molecules/EmptyState";
import { SectionCard } from "@/components/molecules/SectionCard";
import { SkeletonPanel } from "@/components/molecules/SkeletonPanel";
import { EnsembleConsensusCards, EnsembleModelTable } from "@/components/organisms/ensembleVerdictParts";
import { inferenceJobStatusTones } from "@/components/organisms/inferenceTones";
import type { EnsembleJobDetail } from "@/domain/ensemble";
import { inferenceJobStatusLabels } from "@/domain/labels/inferenceJobStatus";
import type { AnalysisModel } from "@/domain/model";
import { formatIsoDate, formatIsoHourMinute } from "@/lib/formatTime";
import { cn } from "@/lib/utils";

// 값이 아직 없을 때 표시할 문구
const EMPTY_VALUE = "–";

interface EnsembleVerdictCardProps {
  // 선택한 작업의 상세, 받는 동안은 null
  detail: EnsembleJobDetail | null;
  isDetailFailed: boolean;
  // 작업 List가 비어 선택할 작업이 없는지 여부, 참이면 상세를 기다리지 않고 빈 상태 표시
  hasNoJob?: boolean;
  analysisModels: readonly AnalysisModel[];
  className?: string;
}

// 선택한 Ensemble 작업의 Model별 판정과 다수결 판정 표시, 실패나 진행 중이면 알림 Bar 표시
export function EnsembleVerdictCard({
  detail,
  isDetailFailed,
  hasNoJob = false,
  analysisModels,
  className,
}: EnsembleVerdictCardProps) {
  const title =
    detail === null ? "앙상블 판정" : `앙상블 판정 · ${detail.deviceCode} · 편성 ${detail.formation ?? "전체"}`;
  const endedAt = detail !== null && "endedAt" in detail ? formatIsoHourMinute(detail.endedAt) : EMPTY_VALUE;
  const windowText = detail?.status === "succeeded" ? ` · 전체 ${detail.verdict.windowCount} window` : "";

  return (
    <SectionCard
      data-slot="ensemble-verdict-card"
      eyebrow="ENSEMBLE DETAIL"
      title={title}
      aside={
        detail === null ? undefined : (
          <span className="flex flex-none">
            <StatePill size="md" tone={inferenceJobStatusTones[detail.status]} label={inferenceJobStatusLabels[detail.status].label} />
          </span>
        )
      }
      className={cn("min-h-0 overflow-y-auto", className)}
    >
      {hasNoJob ? (
        <EmptyState
          icon={<InboxRoundedIcon className="size-[1.625rem]" />}
          title="고를 앙상블 작업이 없습니다"
          description="앙상블 실행으로 작업을 요청하면 판정이 표시됩니다."
        />
      ) : isDetailFailed ? (
        <AlertBanner tone="danger" layout="paragraph" icon={<WarningAmberRoundedIcon className="size-[1.125rem]" />}>
          앙상블 판정을 불러오지 못했습니다.
        </AlertBanner>
      ) : detail === null ? (
        <SkeletonPanel caption="앙상블 판정을 불러오는 중…" />
      ) : (
        <>
          <div data-slot="ensemble-verdict-meta" className="-mt-1 flex gap-6 text-xs text-muted-foreground tabular-nums">
            <span>{`Job ${detail.id}`}</span>
            <span>{`생성 ${formatIsoDate(detail.createdAt)} ${formatIsoHourMinute(detail.createdAt)} · 종료 ${endedAt}`}</span>
            <span>{`세그먼트 ${detail.segment}${windowText}`}</span>
          </div>
          {describeBody(detail, analysisModels)}
        </>
      )}
    </SectionCard>
  );
}

// 상세의 상태별 판정, 실패 Bar, 진행 중 Bar 반환
function describeBody(detail: EnsembleJobDetail, analysisModels: readonly AnalysisModel[]) {
  switch (detail.status) {
    case "succeeded":
      return (
        <>
          <div className="text-sm font-bold">모델별 판정</div>
          <EnsembleModelTable
            models={detail.verdict.models}
            windowCount={detail.verdict.windowCount}
            analysisModels={analysisModels}
            scrollable
          />
          <div className="text-sm font-bold">다수결 판정</div>
          <EnsembleConsensusCards consensus={detail.verdict.consensus} windowCount={detail.verdict.windowCount} compact={false} />
        </>
      );
    case "failed":
      return (
        <AlertBanner tone="danger" layout="paragraph" icon={<WarningAmberRoundedIcon className="size-[1.125rem]" />}>
          {detail.failureMessage}
        </AlertBanner>
      );
    case "queued":
    case "running":
      return (
        <AlertBanner tone="brand" layout="paragraph" icon={<HourglassTopRoundedIcon className="size-[1.125rem]" />}>
          추론이 진행 중입니다. 완료되면 판정이 표시됩니다.
        </AlertBanner>
      );
  }
}
