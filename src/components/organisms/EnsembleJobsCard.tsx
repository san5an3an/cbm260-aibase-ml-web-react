import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { EmptyState } from "@/components/molecules/EmptyState";
import { JobCard } from "@/components/molecules/JobCard";
import { SectionCard } from "@/components/molecules/SectionCard";
import { inferenceJobMetaTones, inferenceJobStatusTones } from "@/components/organisms/inferenceTones";
import type { EnsembleJob, EnsembleJobId } from "@/domain/ensemble";
import { inferenceJobStatusLabels } from "@/domain/labels/inferenceJobStatus";
import { formatIsoHourMinute, formatIsoMonthDay } from "@/lib/formatTime";
import { MarqueeText } from "@/components/atoms/MarqueeText";
import { cn } from "@/lib/utils";

// Card 설명의 항목을 잇는 문구, Card 제목의 Model을 잇는 문구
const SEPARATOR = " · ";
const MODEL_SEPARATOR = "·";
// 진행 중 Card에서 돌아가는 표시의 Label
const PROGRESS_LABEL = "진행 중";

// Card 설명 한 줄 계산, 생성 시각에 상태별로 편성, 추론 기간, 재시도, 실패 사유를 이어 붙임
function describeJob(job: EnsembleJob): string {
  const createdAt = `${formatIsoMonthDay(job.createdAt)} ${formatIsoHourMinute(job.createdAt)}`;
  const formation = `편성 ${job.formation ?? "전체"}`;
  switch (job.status) {
    case "queued":
      return [createdAt, formation].join(SEPARATOR);
    case "running":
      return [createdAt, formation, ...(job.isRetry ? ["재시도"] : [])].join(SEPARATOR);
    case "succeeded": {
      const { from, to } = job.requestedPeriod;
      return [createdAt, formation, `${formatIsoMonthDay(from)} ~ ${formatIsoMonthDay(to)}`].join(SEPARATOR);
    }
    case "failed":
      return [createdAt, job.failureReason].join(SEPARATOR);
  }
}

interface EnsembleJobsCardProps {
  jobs: readonly EnsembleJob[];
  // 마지막으로 연 작업, 없으면 null
  selectedJobId: EnsembleJobId | null;
  onOpenJob: (job: EnsembleJob) => void;
  onRetryJob: (job: EnsembleJob) => void;
  // List를 다시 받거나 Request를 보내는 동안 Card와 재시도 Button 비활성화 표시
  isJobDisabled: boolean;
  className?: string;
}

// Ensemble 작업 Card List와 실패 Card의 재시도 Button 표시
export function EnsembleJobsCard({
  jobs,
  selectedJobId,
  onOpenJob,
  onRetryJob,
  isJobDisabled,
  className,
}: EnsembleJobsCardProps) {
  return (
    <SectionCard
      data-slot="ensemble-jobs-card"
      eyebrow="ENSEMBLE JOBS"
      title="앙상블 추론 결과"
      aside={<span className="text-xs text-muted-foreground">카드를 누르면 상세</span>}
      className={cn("min-h-0 overflow-y-auto", className)}
    >
      {jobs.map((job) => (
        <div key={job.id} data-slot="ensemble-job-item" className="relative flex flex-col">
          <JobCard
            title={`${job.deviceCode}${SEPARATOR}${job.modelCodes.join(MODEL_SEPARATOR)}`}
            statusLabel={inferenceJobStatusLabels[job.status].label}
            statusTone={inferenceJobStatusTones[job.status]}
            progressText={null}
            progressLabel={PROGRESS_LABEL}
            // 실패 사유가 길면 Hover했을 때 흘러가며 끝까지 표시
            meta={<MarqueeText>{describeJob(job)}</MarqueeText>}
            metaTone={inferenceJobMetaTones[job.status]}
            isSelected={job.id === selectedJobId}
            disabled={isJobDisabled}
            onOpen={() => onOpenJob(job)}
            // 실패 Card는 이름과 상태 Badge 사이에 재시도 Button 공간을 남김
            className={cn("gap-2", job.status === "failed" && "[&_[data-slot=job-card-title]]:mr-16")}
          />
          {job.status === "failed" ? (
            // Card Button 안에 Button을 둘 수 없어 형제로 두고 상태 Badge 왼쪽에 겹쳐 배치
            <div data-slot="ensemble-job-retry" className="absolute top-[0.9375rem] right-[4.1875rem] flex">
              <ActionButton
                label="재시도"
                variant="primary"
                size="xs"
                disabled={isJobDisabled}
                onClick={() => onRetryJob(job)}
              />
            </div>
          ) : null}
        </div>
      ))}
      {jobs.length === 0 ? <EmptyState icon={<InboxRoundedIcon className="size-[1.625rem]" />} title="앙상블 작업이 없습니다" description="앙상블 실행으로 작업을 요청하세요." /> : null}
    </SectionCard>
  );
}
