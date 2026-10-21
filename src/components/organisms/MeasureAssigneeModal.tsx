"use client";

import { AssigneeBulkModal } from "@/components/organisms/AssigneeBulkModal";
import { measureActionLabels } from "@/domain/labels/measureAction";
import type { Measure } from "@/domain/measures";
import { formatIsoDateTime } from "@/lib/formatTime";

interface MeasureAssigneeModalProps {
  open: boolean;
  // 담당자를 지정할 조치 건 목록, 제목의 건수도 이 개수로 표시
  measures: readonly Measure[];
  assignees: readonly string[];
  assignee: string | null;
  onAssigneeChange: (assignee: string) => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  showAssigneeError: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

// 선택한 조치 건들에 담당자를 한꺼번에 지정하는 Modal 표시
export function MeasureAssigneeModal({ measures, ...props }: MeasureAssigneeModalProps) {
  return (
    <AssigneeBulkModal
      {...props}
      listTitle="선택한 조치 건"
      items={measures.map((measure) => ({
        id: measure.id,
        // 조치 건에는 심각도가 없어 그 위치(52 × 24)를 비워 둠
        badge: <span aria-hidden className="h-6 w-13 flex-none" />,
        title: measure.deviceCode,
        meta: `${formatIsoDateTime(measure.occurredAt)} · ${measure.sensorName} · 편성 ${measure.formation} · ${measure.car}호차 · ${measureActionLabels[measure.actionYn].stateLabel}`,
      }))}
    />
  );
}
