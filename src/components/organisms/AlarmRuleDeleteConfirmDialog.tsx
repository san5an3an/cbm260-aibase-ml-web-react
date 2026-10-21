"use client";

import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";

interface AlarmRuleDeleteConfirmDialogProps {
  open: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Alarm 규칙 하나를 삭제하기 전에 한 번 더 묻는 Dialog 표시
export function AlarmRuleDeleteConfirmDialog({
  open,
  isConfirming,
  onConfirm,
  onCancel,
}: AlarmRuleDeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      name="alarm-rule-delete"
      open={open}
      tone="danger"
      icon={<DeleteForeverRoundedIcon aria-hidden className="size-[1.375rem]" />}
      title="알람 규칙을 삭제할까요?"
      // 문장마다 줄을 바꿔 두 Row로 표시
      description={"이 알람 규칙을 삭제할까요?\n이 범위는 더 넓은 규칙(예: 전체 규칙)을 따르게 됩니다."}
      confirmLabel="삭제"
      confirmTone="danger"
      cancelLabel="취소"
      isConfirming={isConfirming}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
