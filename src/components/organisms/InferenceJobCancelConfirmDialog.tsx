"use client";

import { JobCancelConfirmDialog } from "@/components/organisms/JobCancelConfirmDialog";

interface InferenceJobCancelConfirmDialogProps {
  open: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// 끝나기 전 추론 작업을 취소하기 전에 한 번 더 묻는 Dialog 표시, 확인 Button은 추론 취소
export function InferenceJobCancelConfirmDialog(props: InferenceJobCancelConfirmDialogProps) {
  return <JobCancelConfirmDialog {...props} name="inference-job-cancel" confirmLabel="추론 취소" />;
}
