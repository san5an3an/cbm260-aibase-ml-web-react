"use client";

import { AlarmSeverity } from "@/components/atoms/AlarmSeverity";
import { alarmSeverityTones } from "@/components/organisms/alarmTones";
import { AssigneeBulkModal } from "@/components/organisms/AssigneeBulkModal";
import type { Alarm } from "@/domain/alarms";
import { alarmSeverityLabels } from "@/domain/labels/alarmSeverity";
import { alarmStatusLabels } from "@/domain/labels/alarmStatus";
import { formatIsoDateTime } from "@/lib/formatTime";

interface AlarmAssigneeModalProps {
  open: boolean;
  // 담당자를 지정할 Alarm, 제목의 건수도 이 수로 표시
  alarms: readonly Alarm[];
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

// 선택한 Alarm들에 담당자를 한꺼번에 지정하는 Modal 표시
export function AlarmAssigneeModal({ alarms, ...props }: AlarmAssigneeModalProps) {
  return (
    <AssigneeBulkModal
      {...props}
      listTitle="선택한 알람"
      items={alarms.map((alarm) => ({
        id: alarm.id,
        badge: (
          <AlarmSeverity
            tone={alarmSeverityTones[alarm.severity]}
            label={alarmSeverityLabels[alarm.severity].label}
          />
        ),
        title: `${alarm.deviceCode} · ${alarm.modelCode}`,
        meta: `${formatIsoDateTime(alarm.occurredAt)} · 편성 ${alarm.formation} · ${alarm.car}호차 · ${alarmStatusLabels[alarm.status].label}`,
      }))}
      notice="신규 상태인 알람은 담당자를 지정하면 확인(ACK)으로 바뀌고 확인 시각이 자동 기록됩니다."
    />
  );
}
