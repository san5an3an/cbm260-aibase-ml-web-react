"use client";

import { useEffect } from "react";
import TimerOffRoundedIcon from "@mui/icons-material/TimerOffRounded";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";

interface SessionExpiredDialogProps {
  open: boolean;
  onConfirm: () => void;
}

// Session이 만료되면 다시 Login하도록 알리는 Dialog 표시, 닫기, Esc, 바깥 Click으로는 닫히지 않음
export function SessionExpiredDialog({ open, onConfirm }: SessionExpiredDialogProps) {
  // 열린 동안 Esc가 이 Dialog와 뒤의 Modal, 검색 Overlay, Menu에 전달되지 않도록 Dialog 전체에서 먼저 차단
  useEffect(() => {
    if (!open) return;
    const blockEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", blockEscape, true);
    return () => window.removeEventListener("keydown", blockEscape, true);
  }, [open]);

  return (
    <ConfirmDialog
      name="session-expired"
      open={open}
      tone="warning"
      icon={<TimerOffRoundedIcon aria-hidden className="size-[1.375rem]" />}
      title="세션이 만료되었습니다"
      description="다시 로그인하면 보던 화면으로 돌아갑니다."
      confirmLabel="다시 로그인"
      confirmTone="primary"
      // 검색 Overlay이 떠 있어도 그 위에서 다시 Login Button을 Click할 수 있게 함
      layer="aboveSearch"
      onConfirm={onConfirm}
      // 다시 Login 말고는 닫지 않음
      onCancel={() => {}}
    />
  );
}
