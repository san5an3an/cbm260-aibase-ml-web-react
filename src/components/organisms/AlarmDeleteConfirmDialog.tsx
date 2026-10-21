"use client";

import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import type { Alarm } from "@/domain/alarms";
import { formatIsoDateTime } from "@/lib/formatTime";

interface AlarmDeleteConfirmDialogProps {
  open: boolean;
  // 삭제하려는 Alarm, 선택하기 전이면 null
  alarm: Alarm | null;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Alarm 1건을 삭제하기 전에 한 번 더 묻는 Dialog 표시
export function AlarmDeleteConfirmDialog({
  open,
  alarm,
  isConfirming,
  onConfirm,
  onCancel,
}: AlarmDeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      name="alarm-delete"
      open={open && alarm !== null}
      tone="danger"
      icon={<DeleteForeverRoundedIcon aria-hidden className="size-[1.375rem]" />}
      title="알람을 삭제할까요?"
      description={
        alarm
          ? `${alarm.deviceCode} · ${alarm.modelCode} · ${formatIsoDateTime(alarm.occurredAt)} 알람이 삭제됩니다.\n삭제한 알람은 되돌릴 수 없습니다.\n오탐이라면 삭제 대신 상태를 오탐으로 바꾸세요.`
          : ""
      }
      confirmLabel="삭제"
      confirmTone="danger"
      cancelLabel="취소"
      isConfirming={isConfirming}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
