"use client";

import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import type { Measure } from "@/domain/measures";

interface MeasureBulkCompleteDialogProps {
  open: boolean;
  // 조치완료로 바꿀 건 목록, 제목의 건수도 이 개수로 표시
  measures: readonly Measure[];
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// 선택한 조치 건을 한꺼번에 조치완료로 바꾸기 전에 한 번 더 묻는 Dialog 표시
export function MeasureBulkCompleteDialog({
  open,
  measures,
  isConfirming,
  onConfirm,
  onCancel,
}: MeasureBulkCompleteDialogProps) {
  const count = measures.length;
  // 장치 이름은 처음 나온 순서대로 한 번씩만 표시
  const deviceNames = [...new Set(measures.map((measure) => measure.deviceCode))].join(" · ");

  return (
    <ConfirmDialog
      name="measure-bulk-complete"
      open={open}
      tone="brand"
      icon={<ScheduleRoundedIcon aria-hidden className="size-[1.375rem]" />}
      title={`선택한 ${count}건을 조치완료로 바꿀까요?`}
      // 문장마다 줄을 바꿔 세 줄로 표시
      description={`${deviceNames} 이상 센서 ${count}건의 조치 여부가 Y로 바뀝니다.\n조치 내용은 비어 있으니 필요하면 건별 처리에서 입력하세요.\n검수 여부는 바뀌지 않습니다.`}
      confirmLabel="확인"
      confirmTone="primary"
      cancelLabel="취소"
      isConfirming={isConfirming}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
