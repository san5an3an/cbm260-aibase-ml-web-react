import { commonToastTexts } from "@/components/organisms/commonToastTexts";
import { trainingJobStatusLabels } from "@/domain/labels/trainingJobStatus";

// 재학습 설정 화면에서 동작이 끝난 뒤 화면 구석에 띄우는 Toast 문구
export const trainingToastTexts = {
  exported: commonToastTexts.exported,
  // 예약한 첫 Job의 번호와 예약 상태의 코드
  scheduled: (jobId: string) =>
    `학습 예약 완료 — ${jobId} / ${trainingJobStatusLabels.queued.codeLabel}`,
  // 재시도로 새로 만든 Job의 번호
  retried: (jobId: string) => `${jobId} 재시도 요청 — 원래 조건으로 다시 예약했습니다.`,
  // 취소해서 List에서 지운 Job의 번호
  canceled: (jobId: string) => `${jobId} 학습을 취소했습니다.`,
  // Request 실패 시 표시할 문구
  exportFailed: commonToastTexts.exportFailed,
  scheduleFailed: "학습 예약을 요청하지 못했습니다.",
  retryFailed: commonToastTexts.retryFailed,
  cancelFailed: "학습 취소를 요청하지 못했습니다.",
} as const;
