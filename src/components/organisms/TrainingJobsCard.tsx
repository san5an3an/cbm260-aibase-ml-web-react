import { Fragment } from "react";
import { StepDot } from "@/components/atoms/StepDot";
import { JobCard } from "@/components/molecules/JobCard";
import { SectionCard } from "@/components/molecules/SectionCard";
import {
  describeStepProgress,
  describeTrainingJobStatus,
} from "@/components/organisms/trainingJobTexts";
import { trainingJobMetaTones, trainingJobStatusTones } from "@/components/organisms/trainingTones";
import type { TrainingJob, TrainingJobId, TrainingStageKey } from "@/domain/training";
import { trainingStageKeys, trainingStageLabels } from "@/domain/labels/trainingStage";
import { formatIsoHourMinute, formatIsoMonthDay } from "@/lib/formatTime";

// Card 설명의 항목을 잇는 구분 문자
const SEPARATOR = " · ";
// 진행 중 Card에 표시할 Label
const PROGRESS_LABEL = "진행 중";

// Card 설명 Text 계산, 생성 시각에 상태별로 편성, 진행, 완료, 시작 예정, 실패 사유를 이어 붙임
function describeJob(job: TrainingJob): string {
  const createdAt = `${formatIsoMonthDay(job.createdAt)} ${formatIsoHourMinute(job.createdAt)}`;
  const formation = `편성 ${job.formation ?? "전체"}`;
  switch (job.status) {
    case "queued":
      return [createdAt, formation, `${formatIsoHourMinute(job.scheduledStartAt)} 시작 예정`].join(
        SEPARATOR,
      );
    case "running": {
      const { stepProgress } = job;
      const parts = [createdAt];
      if (stepProgress !== null) parts.push(describeStepProgress(stepProgress));
      if (job.isRetry) parts.push("재시도");
      return parts.join(SEPARATOR);
    }
    case "succeeded":
      return [createdAt, formation, `완료 ${formatIsoHourMinute(job.completedAt)}`].join(SEPARATOR);
    case "failed":
      return [
        createdAt,
        `${trainingStageLabels[job.stage].label} 생성 실패: ${job.failureReason}`,
      ].join(SEPARATOR);
  }
}

// 진행 중인 Job의 단계 Row 표시, 현재 단계 앞까지 칠하고 첫 단계는 항상 칠함
function StageTrail({ stage }: { stage: TrainingStageKey }) {
  const reachedCount = Math.max(1, trainingStageKeys.indexOf(stage));
  return (
    <span
      data-slot="job-card-steps"
      className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground"
    >
      {trainingStageKeys.map((key, index) => (
        <Fragment key={key}>
          <StepDot label={trainingStageLabels[key].label} reached={index < reachedCount} />
          {index < trainingStageKeys.length - 1 ? (
            <span aria-hidden className="h-[0.0625rem] min-w-2 flex-1 bg-border" />
          ) : null}
        </Fragment>
      ))}
    </span>
  );
}

interface TrainingJobsCardProps {
  jobs: readonly TrainingJob[];
  // 마지막으로 연 Job, 없으면 null
  selectedJobId: TrainingJobId | null;
  onOpenJob: (job: TrainingJob) => void;
  // List를 다시 조회하거나 Request 전송 중 Card 비활성화
  isJobDisabled: boolean;
}

// 예약, 진행 중, 최근 학습 Job을 가로로 나열한 Card Row 표시
export function TrainingJobsCard({
  jobs,
  selectedJobId,
  onOpenJob,
  isJobDisabled,
}: TrainingJobsCardProps) {
  const stageGuide = trainingStageKeys.map((key) => trainingStageLabels[key].label).join(" → ");
  return (
    <SectionCard
      data-slot="training-jobs-card"
      eyebrow="TRAINING JOBS"
      title="장치 학습 예약"
      aside={
        <span
          data-slot="training-jobs-guide"
          className="text-xs leading-4 text-muted-foreground"
        >
          카드를 누르면 상세 · 단계: {stageGuide}
        </span>
      }
      className="flex-none"
    >
      <div
        data-slot="training-job-list"
        // Card의 그림자, Focus Border, Click 시 이동이 잘리거나 세로로 넘치지 않도록 Padding을 두고 같은 크기의 Margin을 빼서 위치를 유지
        className="-mx-2 -my-3 grid auto-cols-[minmax(16.25rem,1fr)] grid-flow-col gap-3 overflow-x-auto overflow-y-hidden px-2 py-3"
      >
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            title={`${job.deviceCode}${SEPARATOR}${job.modelCode}`}
            statusLabel={describeTrainingJobStatus(job)}
            statusTone={trainingJobStatusTones[job.status]}
            progressText={job.status === "running" ? `${job.progressPercent}%` : null}
            progressLabel={PROGRESS_LABEL}
            meta={describeJob(job)}
            metaTone={trainingJobMetaTones[job.status]}
            isSelected={job.id === selectedJobId}
            disabled={isJobDisabled}
            onOpen={() => onOpenJob(job)}
            className="min-h-[6.125rem]"
          >
            {job.status === "running" ? <StageTrail stage={job.stage} /> : null}
          </JobCard>
        ))}
      </div>
    </SectionCard>
  );
}
