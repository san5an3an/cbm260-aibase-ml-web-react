import type { TrainingJob, TrainingStepProgress } from "@/domain/training";
import { trainingJobStatusLabels } from "@/domain/labels/trainingJobStatus";
import { trainingProgressUnitLabels } from "@/domain/labels/trainingProgressUnit";
import { trainingStageLabels } from "@/domain/labels/trainingStage";

// Job의 상태 표시 Text 반환, 진행 중이면 현재 단계의 이름
export function describeTrainingJobStatus(job: TrainingJob): string {
  switch (job.status) {
    case "running":
      return trainingStageLabels[job.stage].runningLabel;
    case "queued":
    case "succeeded":
    case "failed":
      return trainingJobStatusLabels[job.status].label;
  }
}

// 현재 단계의 진행을 "epoch 7 / 10" 형식으로 변환
export function describeStepProgress(stepProgress: TrainingStepProgress): string {
  const unit = trainingProgressUnitLabels[stepProgress.unit].label;
  return `${unit} ${stepProgress.done} / ${stepProgress.total}`;
}
