import type { TrainingJobStatus } from "@/domain/training";

interface TrainingJobStatusLabel {
  // 상태 표시에 사용할 이름
  label: string;
  // 알림 등에서 상태 코드를 그대로 표시하는 위치의 표기
  codeLabel: string;
}

// 진행 중이 아닌 학습 Job 상태의 화면 표기 정의, 진행 중인 Job은 현재 단계의 runningLabel을 표시
export const trainingJobStatusLabels: Record<
  Exclude<TrainingJobStatus, "running">,
  TrainingJobStatusLabel
> = {
  queued: { label: "예약", codeLabel: "QUEUED" },
  succeeded: { label: "성공", codeLabel: "SUCCEEDED" },
  failed: { label: "실패", codeLabel: "FAILED" },
};
