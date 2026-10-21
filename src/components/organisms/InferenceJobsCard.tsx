import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { SwitchControl } from "@/components/atoms/SwitchControl";
import { EmptyState } from "@/components/molecules/EmptyState";
import { JobCard } from "@/components/molecules/JobCard";
import { SectionCard } from "@/components/molecules/SectionCard";
import { formatAnomalyPercent } from "@/components/organisms/inferenceRate";
import { inferenceJobMetaTones, inferenceJobStatusTones } from "@/components/organisms/inferenceTones";
import type { InferenceJob, InferenceJobId } from "@/domain/inference";
import { inferenceJobStatusLabels } from "@/domain/labels/inferenceJobStatus";
import { formatIsoHourMinute, formatIsoMonthDay } from "@/lib/formatTime";

// Card 설명의 항목을 잇는 문구
const SEPARATOR = " · ";
// 진행 중 Card에서 돌아가는 표시의 Label
const PROGRESS_LABEL = "진행 중";
// 실패만 보지 않을 때 나열할 Card 개수, 한 Row에 4개
const RECENT_JOB_CARD_COUNT = 4;

// Card 설명 한 줄 계산, 생성 시각에 상태별로 편성, 진행, 이상 비율, 실패 사유를 이어 붙임
function describeJob(job: InferenceJob): string {
  const createdAt = `${formatIsoMonthDay(job.createdAt)} ${formatIsoHourMinute(job.createdAt)}`;
  const formation = `편성 ${job.formation ?? "전체"}`;
  switch (job.status) {
    case "queued":
      return [createdAt, formation].join(SEPARATOR);
    case "running": {
      const parts = [createdAt];
      const { segmentProgress } = job;
      if (segmentProgress !== null) {
        parts.push(`세그먼트 ${segmentProgress.done} / ${segmentProgress.total} 처리 중`);
      }
      if (job.isRetry) parts.push("재시도");
      return parts.join(SEPARATOR);
    }
    case "succeeded":
      return [createdAt, formation, `이상 ${formatAnomalyPercent(job.anomalyRatePercent)}`].join(SEPARATOR);
    case "failed": {
      const parts = [createdAt];
      if (job.formation !== null) parts.push(formation);
      parts.push(job.failureReason);
      return parts.join(SEPARATOR);
    }
  }
}

interface InferenceJobsCardProps {
  // Switch 상태에 맞춰 고른 작업, 실패만 볼 때는 실패한 작업 전부, 아니면 실패가 아닌 작업
  jobs: readonly InferenceJob[];
  // List가 담는 최근 일수, 실패만 볼 때 실패가 없다는 안내에 표시
  recentDays: number;
  failedOnly: boolean;
  onFailedOnlyChange: (failedOnly: boolean) => void;
  // 마지막으로 연 작업, 없으면 null
  selectedJobId: InferenceJobId | null;
  onOpenJob: (job: InferenceJob) => void;
  // List를 다시 받거나 Request를 보내는 동안 Card 비활성화 표시
  isJobDisabled: boolean;
}

// 최근 추론 작업 Card와 실패만 보기 Switch 표시
export function InferenceJobsCard({
  jobs,
  recentDays,
  failedOnly,
  onFailedOnlyChange,
  selectedJobId,
  onOpenJob,
  isJobDisabled,
}: InferenceJobsCardProps) {
  const shownJobs = failedOnly ? jobs : jobs.slice(0, RECENT_JOB_CARD_COUNT);
  return (
    <SectionCard
      data-slot="inference-jobs-card"
      eyebrow="INFERENCE JOBS"
      title="추론 진행 / 결과"
      description={
        failedOnly
          ? `실패 ${jobs.length}건만 표시 중 · 카드의 재시도 또는 상세에서 원인을 확인하세요`
          : undefined
      }
      aside={
        <>
          <span
            data-slot="inference-jobs-guide"
            className="pt-1 text-xs leading-[1.0625rem] text-muted-foreground"
          >
            카드를 누르면 상세
          </span>
          <SwitchControl label="실패만 보기" checked={failedOnly} onCheckedChange={onFailedOnlyChange} />
        </>
      }
      className="flex-none"
    >
      <div data-slot="inference-job-list" className="grid grid-cols-4 gap-3">
        {shownJobs.map((job) => (
          <JobCard
            key={job.id}
            title={`${job.deviceCode}${SEPARATOR}${job.modelCode}`}
            statusLabel={inferenceJobStatusLabels[job.status].label}
            statusTone={inferenceJobStatusTones[job.status]}
            progressText={job.status === "running" ? `${job.progressPercent}%` : null}
            progressLabel={PROGRESS_LABEL}
            meta={describeJob(job)}
            metaTone={inferenceJobMetaTones[job.status]}
            isSelected={job.id === selectedJobId}
            disabled={isJobDisabled}
            onOpen={() => onOpenJob(job)}
            className="min-h-[4.625rem]"
          />
        ))}
        {failedOnly && jobs.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<CheckRoundedIcon className="size-[1.625rem]" />}
              iconTone="success"
              title="실패한 추론이 없습니다"
              description={`최근 ${recentDays}일 추론 요청이 모두 성공했습니다.`}
              action={
                <ActionButton
                  label="전체 보기"
                  variant="outline"
                  size="lg"
                  onClick={() => onFailedOnlyChange(false)}
                />
              }
            />
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
