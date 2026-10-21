"use client";

import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { modelConfigDeleteTexts } from "@/components/organisms/modelConfigListTexts";
import type { ModelConfig } from "@/domain/modelConfig";

interface ModelConfigDeleteConfirmDialogProps {
  open: boolean;
  // 삭제하려는 Profile, 선택 전이면 null
  config: ModelConfig | null;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Profile 한 건을 삭제하기 전에 한 번 더 묻는 Dialog 표시
export function ModelConfigDeleteConfirmDialog({
  open,
  config,
  isConfirming,
  onConfirm,
  onCancel,
}: ModelConfigDeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      name="model-config-delete"
      open={open && config !== null}
      tone="danger"
      icon={<DeleteForeverRoundedIcon aria-hidden className="size-[1.375rem]" />}
      title={modelConfigDeleteTexts.title}
      description={config ? modelConfigDeleteTexts.description(config) : ""}
      confirmLabel={modelConfigDeleteTexts.confirmLabel}
      confirmTone="danger"
      cancelLabel={modelConfigDeleteTexts.cancelLabel}
      isConfirming={isConfirming}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
