"use client";

import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";

// 문장마다 줄을 나눠 세 줄로 표시
const DESCRIPTION = [
  "계속 작업하려면 연장하세요.",
  "만료되면 저장하지 않은 입력은 사라지고",
  "로그인 화면으로 이동합니다.",
].join("\n");

interface SessionExpiryWarningDialogProps {
  open: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Session 만료가 1분 남았을 때 연장할지 묻는 Dialog 표시
export function SessionExpiryWarningDialog({
  open,
  isConfirming,
  onConfirm,
  onCancel,
}: SessionExpiryWarningDialogProps) {
  return (
    <ConfirmDialog
      name="session-expiry-warning"
      open={open}
      tone="caution"
      icon={<ScheduleRoundedIcon aria-hidden className="size-[1.375rem]" />}
      title="세션이 1분 후 만료됩니다"
      description={DESCRIPTION}
      confirmLabel="세션 연장하기"
      confirmTone="primary"
      cancelLabel="닫기"
      isConfirming={isConfirming}
      // 검색 Overlay이 떠 있어도 그 위에서 연장과 닫기 Button을 Click할 수 있게 함
      layer="aboveSearch"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
