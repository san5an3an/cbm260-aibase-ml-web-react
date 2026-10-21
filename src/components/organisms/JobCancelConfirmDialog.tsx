"use client";

import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";

interface JobCancelConfirmDialogProps {
  // 검사 도구와 개발자 도구에서 Dialog를 찾는 이름
  name: string;
  // 확인 Button의 문구, 화면마다 무엇을 취소하는지 적음
  confirmLabel: string;
  open: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// 끝나기 전 Job을 취소하기 전에 한 번 더 묻는 Dialog 표시, 제목과 설명은 호출하는 곳이 정한 문구를 사용하며 재학습 설정과 추론 화면에서 함께 사용
export function JobCancelConfirmDialog({
  name,
  confirmLabel,
  open,
  isConfirming,
  onConfirm,
  onCancel,
}: JobCancelConfirmDialogProps) {
  return (
    <ConfirmDialog
      name={name}
      open={open}
      tone="danger"
      icon={<CancelRoundedIcon aria-hidden className="size-[1.375rem]" />}
      title="정말 취소하시겠습니까?"
      description="해당 작업은 되돌릴 수 없습니다."
      confirmLabel={confirmLabel}
      confirmTone="danger"
      cancelLabel="돌아가기"
      isConfirming={isConfirming}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
