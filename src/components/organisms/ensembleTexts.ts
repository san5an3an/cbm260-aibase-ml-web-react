import { commonToastTexts } from "@/components/organisms/commonToastTexts";
import { ensembleConsensusRuleLabels } from "@/domain/labels/ensembleConsensusRule";
import { inferenceJobStatusLabels } from "@/domain/labels/inferenceJobStatus";

// 모델 비교 화면에서 동작이 끝난 뒤 화면 구석에 띄우는 Toast 문구
export const ensembleToastTexts = {
  exported: commonToastTexts.exported,
  // 요청한 첫 Job의 번호와 요청됨 상태의 코드
  requested: (jobId: string) => `요청 완료 — ${jobId} / ${inferenceJobStatusLabels.queued.codeLabel}`,
  // 재시도로 새로 만든 Job의 번호
  retried: (jobId: string) => `${jobId} 재시도 요청 — 원래 조건으로 다시 요청했습니다.`,
  // 취소해서 List에서 지운 Job의 번호
  canceled: (jobId: string) => `${jobId} 앙상블 추론을 취소했습니다.`,
  exportFailed: commonToastTexts.exportFailed,
  requestFailed: "앙상블 실행을 요청하지 못했습니다.",
  retryFailed: commonToastTexts.retryFailed,
  cancelFailed: "앙상블 취소를 요청하지 못했습니다.",
} as const;

// 판정에서 Alarm으로 등록할 때 Comment에 미리 채울 문구 반환, Job 번호와 모든 Model 일치 규칙
export function ensembleAlarmComment(jobId: string): string {
  return `앙상블 ${jobId} · ${ensembleConsensusRuleLabels.all.codeLabel} 일치 구간`;
}
