import SyncAltRoundedIcon from "@mui/icons-material/SyncAltRounded";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";

interface ThresholdApplyConfirmDialogProps {
  open: boolean;
  profileName: string;
  fromPercentile: number;
  toPercentile: number;
  use: string;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// 기존 Profile의 임계 백분위를 바꾸기 전에 한 번 더 묻는 Dialog 표시(10-1)
export function ThresholdApplyConfirmDialog({
  open,
  profileName,
  fromPercentile,
  toPercentile,
  use,
  isConfirming,
  onConfirm,
  onCancel,
}: ThresholdApplyConfirmDialogProps) {
  return (
    <ConfirmDialog
      name="threshold-apply-existing"
      open={open}
      tone="brand"
      icon={<SyncAltRoundedIcon aria-hidden className="size-[1.375rem]" />}
      title="기존 프로파일에 반영할까요?"
      description={`${profileName}의 임계 백분위를 ${fromPercentile.toFixed(1)}%에서 ${toPercentile}%로 바꿉니다. 사용 여부(${use})는 그대로이며, 다음 재학습부터 적용됩니다.`}
      confirmLabel="반영"
      confirmTone="primary"
      cancelLabel="취소"
      isConfirming={isConfirming}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
