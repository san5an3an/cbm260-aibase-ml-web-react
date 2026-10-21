"use client";

import { JobCancelConfirmDialog } from "@/components/organisms/JobCancelConfirmDialog";

interface EnsembleJobCancelConfirmDialogProps {
  open: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// 끝나기 전 Ensemble 작업을 취소하기 전에 한 번 더 묻는 Dialog 표시, 확인 Button은 Ensemble 취소
export function EnsembleJobCancelConfirmDialog(props: EnsembleJobCancelConfirmDialogProps) {
  return <JobCancelConfirmDialog {...props} name="ensemble-job-cancel" confirmLabel="앙상블 취소" />;
}
