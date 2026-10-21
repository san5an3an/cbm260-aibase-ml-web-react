"use client";

import { Fragment, useId, type ReactNode } from "react";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { AlarmSeverity } from "@/components/atoms/AlarmSeverity";
import { ModalBodyScroll } from "@/components/atoms/ModalBodyScroll";
import { StateOption, type StateOptionProgress } from "@/components/atoms/StateOption";
import { TextAreaInput } from "@/components/atoms/TextAreaInput";
import { TextInput } from "@/components/atoms/TextInput";
import { Well } from "@/components/atoms/Well";
import { FormRow } from "@/components/molecules/FormRow";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { alarmSeverityTones } from "@/components/organisms/alarmTones";
import type { Alarm, AlarmStatusKey } from "@/domain/alarms";
import { alarmSeverityLabels } from "@/domain/labels/alarmSeverity";
import { alarmStatusKeys, alarmStatusLabels } from "@/domain/labels/alarmStatus";
import { formatIsoDateTime } from "@/lib/formatTime";
import { cn } from "@/lib/utils";

// Modal의 Width(rem)
const WIDTH_REM = 62.5;
// 흐름의 끝에서 해소 대신 선택할 수 있는 상태, 화살표 대신 "또는"으로 이어 표시
const ALTERNATIVE_END_STATUS: AlarmStatusKey = "FALSE_POSITIVE";
// 화살표로 이어지는 처리 흐름의 단계, 상태 순서 List에서 흐름 밖의 끝 상태를 빼고 나열
const flowStatuses: readonly AlarmStatusKey[] = alarmStatusKeys.filter(
  (status) => status !== ALTERNATIVE_END_STATUS,
);
// 단계를 그리는 순서, 흐름의 단계를 먼저 놓고 흐름 밖의 끝 상태를 맨 뒤에 배치
const stepStatuses: readonly AlarmStatusKey[] = [...flowStatuses, ALTERNATIVE_END_STATUS];

// Alarm 처리에서 입력 중인 값
export interface AlarmProcessDraft {
  status: AlarmStatusKey;
  assignee: string;
  comment: string;
}

interface AlarmProcessModalProps {
  open: boolean;
  // 처리할 Alarm, 선택하기 전이면 null
  alarm: Alarm | null;
  draft: AlarmProcessDraft;
  onDraftChange: (draft: AlarmProcessDraft) => void;
  // 지금 선택한 상태로 저장하면 확인 시각과 해소 시각이 기록되는지 여부
  willRecordAcknowledgedAt: boolean;
  willRecordResolvedAt: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onDelete: () => void;
  onClose: () => void;
  // 이 Modal 위에 겹쳐 띄울 확인 Dialog
  overlays?: ReactNode;
}

// 지금 선택한 상태를 기준으로 그 단계의 표시 방법 결정, 흐름 밖의 끝 상태를 선택하면 흐름의 마지막 단계 앞까지 지나온 단계로 표시
function progressOf(status: AlarmStatusKey, selected: AlarmStatusKey): StateOptionProgress {
  if (status === selected) return "current";
  const reachedIndex =
    selected === ALTERNATIVE_END_STATUS ? flowStatuses.length - 1 : flowStatuses.indexOf(selected);
  const flowIndex = flowStatuses.indexOf(status);
  return flowIndex !== -1 && flowIndex < reachedIndex ? "past" : "idle";
}

interface StampWellProps {
  label: string;
  // 기록된 시각, 아직 없으면 null
  recordedAt: string | null;
  pendingText: string;
}

// 자동으로 기록되는 시각 하나를 표시, 아직 없으면 점선 상자에 안내 문구 표시
function StampWell({ label, recordedAt, pendingText }: StampWellProps) {
  return (
    <Well
      variant="field"
      dashed={recordedAt === null}
      data-slot="alarm-process-stamp"
      className="flex flex-col gap-1"
    >
      <span className="text-xs leading-[1.0625rem] text-muted-foreground">{label}</span>
      <span
        data-slot="alarm-process-stamp-value"
        className={cn(
          "text-sm leading-5 tabular-nums",
          recordedAt === null ? "text-muted-foreground" : "font-bold",
        )}
      >
        {recordedAt === null ? pendingText : formatIsoDateTime(recordedAt)}
      </span>
    </Well>
  );
}

// Alarm 1건의 상태, 담당자, Comment를 바꾸는 Modal 표시
export function AlarmProcessModal({
  open,
  alarm,
  draft,
  onDraftChange,
  willRecordAcknowledgedAt,
  willRecordResolvedAt,
  isSubmitting,
  onSubmit,
  onDelete,
  onClose,
  overlays,
}: AlarmProcessModalProps) {
  const fieldId = useId();

  return (
    <ModalFrame
      name="alarm-process"
      open={open}
      onClose={onClose}
      title="알람 처리"
      widthRem={WIDTH_REM}
      footerStart={
        <ActionButton
          label="삭제"
          variant="danger"
          weight="semibold"
          disabled={isSubmitting}
          onClick={onDelete}
        />
      }
      footerEnd={
        <>
          <ActionButton label="취소" variant="outline" weight="semibold" onClick={onClose} />
          <ActionButton
            label="저장"
            icon={<CheckRoundedIcon className="size-[1.125rem]" />}
            weight="semibold"
            disabled={isSubmitting}
            onClick={onSubmit}
          />
        </>
      }
      overlays={overlays}
    >
      {alarm ? (
        <ModalBodyScroll>
          <Well data-slot="alarm-process-target" className="flex items-center gap-3">
            <AlarmSeverity
              tone={alarmSeverityTones[alarm.severity]}
              label={alarmSeverityLabels[alarm.severity].label}
            />
            <span data-slot="alarm-process-target-title" className="text-base font-bold">
              {`${alarm.deviceCode} · ${alarm.modelCode}`}
            </span>
            <span data-slot="alarm-process-target-meta" className="text-sm text-muted-foreground">
              {`편성 ${alarm.formation} · ${alarm.car}호차 · 이상비율 ${alarm.anomalyRatePercent.toFixed(1)}% · 발생 ${formatIsoDateTime(alarm.occurredAt)}`}
            </span>
          </Well>
          <Well data-slot="alarm-process-form" className="flex flex-col gap-3">
            <FormRow label="상태" labelId={`${fieldId}-status`} required>
              <div
                role="group"
                aria-labelledby={`${fieldId}-status`}
                className="flex items-center gap-2.5"
              >
                {stepStatuses.map((status, index) => (
                  <Fragment key={status}>
                    {status === ALTERNATIVE_END_STATUS ? (
                      <span className="text-xs text-muted-foreground">또는</span>
                    ) : index > 0 ? (
                      <ArrowForwardRoundedIcon
                        aria-hidden
                        data-slot="state-option-arrow"
                        className="size-[1.375rem] flex-none text-border-strong"
                      />
                    ) : null}
                    <StateOption
                      label={alarmStatusLabels[status].label}
                      progress={progressOf(status, draft.status)}
                      onSelect={() => onDraftChange({ ...draft, status })}
                    />
                  </Fragment>
                ))}
              </div>
            </FormRow>
            <FormRow label="담당자" htmlFor={`${fieldId}-assignee`}>
              <TextInput
                id={`${fieldId}-assignee`}
                value={draft.assignee}
                onValueChange={(assignee) => onDraftChange({ ...draft, assignee })}
                placeholder="정비사 ID"
              />
            </FormRow>
            <FormRow label="코멘트" htmlFor={`${fieldId}-comment`}>
              <TextAreaInput
                id={`${fieldId}-comment`}
                value={draft.comment}
                onValueChange={(comment) => onDraftChange({ ...draft, comment })}
                placeholder="선택 입력"
                rows={4}
              />
            </FormRow>
          </Well>
          <Well data-slot="alarm-process-stamps" className="grid grid-cols-2 gap-3">
            <StampWell
              label="확인 시각 · 자동 기록"
              recordedAt={alarm.acknowledgedAt}
              pendingText={
                willRecordAcknowledgedAt ? "저장하면 기록됩니다" : "확인으로 저장하면 기록됩니다"
              }
            />
            <StampWell
              label="해소 시각 · 자동 기록"
              recordedAt={alarm.resolvedAt}
              pendingText={
                willRecordResolvedAt
                  ? "저장하면 기록됩니다"
                  : "해소 또는 오탐으로 저장하면 기록됩니다"
              }
            />
          </Well>
        </ModalBodyScroll>
      ) : null}
    </ModalFrame>
  );
}
