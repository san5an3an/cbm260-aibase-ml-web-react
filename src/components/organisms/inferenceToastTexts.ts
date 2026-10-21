import { commonToastTexts } from "@/components/organisms/commonToastTexts";
import { inferenceJobStatusLabels } from "@/domain/labels/inferenceJobStatus";

// 추론 화면에서 동작이 끝난 뒤 화면 구석에 띄우는 Toast 문구
export const inferenceToastTexts = {
  exported: commonToastTexts.exported,
  // 요청한 첫 Job의 번호와 요청됨 상태의 코드
  requested: (jobId: string) =>
    `추론 요청 완료 — ${jobId} / ${inferenceJobStatusLabels.queued.codeLabel}`,
  // 재시도로 새로 만든 Job의 번호
  retried: (jobId: string) => `${jobId} 재시도 요청 — 원래 조건으로 다시 요청했습니다.`,
  // 취소해서 List에서 지운 Job의 번호
  canceled: (jobId: string) => `${jobId} 추론을 취소했습니다.`,
  // Request 실패 시 표시할 문구
  exportFailed: commonToastTexts.exportFailed,
  requestFailed: "추론 실행을 요청하지 못했습니다.",
  retryFailed: commonToastTexts.retryFailed,
  cancelFailed: "추론 취소를 요청하지 못했습니다.",
} as const;
