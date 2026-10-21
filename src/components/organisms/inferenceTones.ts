import { levelTextClassNames } from "@/components/atoms/levelTextClassNames";
import type { StatePillTone } from "@/components/atoms/StatePill";
import type { JobCardMetaTone } from "@/components/molecules/JobCard";
import type { AnomalyLevelKey } from "@/domain/anomaly";
import type { InferenceJobStatus } from "@/domain/inference";

// 추론 Job 상태 표시의 Color 지정, 요청됨은 학습 예약과 같은 회색
export const inferenceJobStatusTones: Record<InferenceJobStatus, StatePillTone> = {
  queued: "muted",
  running: "brand",
  succeeded: "success",
  failed: "danger",
};

// 실패만 빨간 Text로 표시하는 추론 Job Card 설명 Row의 Color 지정
export const inferenceJobMetaTones: Record<InferenceJobStatus, JobCardMetaTone> = {
  queued: "muted",
  running: "muted",
  succeeded: "muted",
  failed: "danger",
};

// 추론 결과 이상 비율의 등급별 Text Color 지정, 이상이 없으면 회색
export const inferenceRateTextClassNames: Record<AnomalyLevelKey, string> = {
  ...levelTextClassNames,
  normal: "text-muted-foreground",
};
