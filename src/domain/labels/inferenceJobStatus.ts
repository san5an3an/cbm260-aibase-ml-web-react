import type { InferenceJobStatus } from "@/domain/inference";

interface InferenceJobStatusLabel {
  // 상태 표시에 사용할 이름
  label: string;
  // 알림 등에서 상태 코드를 그대로 표시하는 위치의 표기
  codeLabel: string;
}

// 추론 Job 상태의 화면 표기 정의
export const inferenceJobStatusLabels: Record<InferenceJobStatus, InferenceJobStatusLabel> = {
  queued: { label: "예약", codeLabel: "QUEUED" },
  running: { label: "추론 중", codeLabel: "RUNNING" },
  succeeded: { label: "성공", codeLabel: "SUCCEEDED" },
  failed: { label: "실패", codeLabel: "FAILED" },
};
