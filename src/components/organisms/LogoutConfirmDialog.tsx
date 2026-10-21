"use client";

import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";

interface LogoutConfirmDialogProps {
  open: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// 왼쪽 Menu의 모니터링 종료를 누르면 종료할지 한 번 더 묻는 Dialog 표시, Logout 확인
export function LogoutConfirmDialog({ open, isConfirming, onConfirm, onCancel }: LogoutConfirmDialogProps) {
  return (
    <ConfirmDialog
      name="logout-confirm"
      open={open}
      tone="danger"
      icon={<PowerSettingsNewRoundedIcon aria-hidden className="size-[1.375rem]" />}
      title="모니터링을 종료할까요?"
      description="진행 중인 학습·추론 작업은 서버에서 계속 실행됩니다."
      confirmLabel="모니터링 종료"
      confirmTone="danger"
      cancelLabel="취소"
      isConfirming={isConfirming}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
