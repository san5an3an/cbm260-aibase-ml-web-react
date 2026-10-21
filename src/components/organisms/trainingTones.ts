import type { StatePillTone } from "@/components/atoms/StatePill";
import type { JobCardMetaTone } from "@/components/molecules/JobCard";
import type { TrainingJobStatus } from "@/domain/training";

// 학습 Job 상태 표시의 Color 지정
export const trainingJobStatusTones: Record<TrainingJobStatus, StatePillTone> = {
  queued: "muted",
  running: "brand",
  succeeded: "success",
  failed: "danger",
};

// 실패만 빨간 Text로 표시하는 학습 Job Card 설명 Row의 Color 지정
export const trainingJobMetaTones: Record<TrainingJobStatus, JobCardMetaTone> = {
  queued: "muted",
  running: "muted",
  succeeded: "muted",
  failed: "danger",
};
