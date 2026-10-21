"use client";

import { JobCancelConfirmDialog } from "@/components/organisms/JobCancelConfirmDialog";

interface TrainingJobCancelConfirmDialogProps {
  open: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// 끝나기 전 학습 Job을 취소하기 전에 한 번 더 확인하는 Dialog 표시, 확인 Button은 학습 취소
export function TrainingJobCancelConfirmDialog(props: TrainingJobCancelConfirmDialogProps) {
  return <JobCancelConfirmDialog {...props} name="training-job-cancel" confirmLabel="학습 취소" />;
}
