"use client";

import { useId } from "react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { ModalBodyScroll } from "@/components/atoms/ModalBodyScroll";
import { TextAreaInput } from "@/components/atoms/TextAreaInput";
import { Well } from "@/components/atoms/Well";
import { FormRow } from "@/components/molecules/FormRow";
import { KeyValueRow } from "@/components/molecules/KeyValueRow";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { Segmented } from "@/components/molecules/Segmented";
import { DateRangePicker } from "@/components/organisms/DateRangePicker";
import { measureActionLabels } from "@/domain/labels/measureAction";
import { measureInspectionLabels } from "@/domain/labels/measureInspection";
import type { Measure, MeasureActionDraft, MeasureActionOptions } from "@/domain/measures";
import { formatIsoDateTime } from "@/lib/formatTime";

// Modal의 Width(rem)
const WIDTH_REM = 55;
// 진단 값의 소수 자릿수
const VALUE_DIGITS = 2;

// 상태 이름에 Label의 코드 표기를 "미조치 (N)" 형태로 연결
function describeState(label: { stateLabel: string; codeLabel: string }): string {
  return `${label.stateLabel} (${label.codeLabel})`;
}

interface MeasureActionModalProps {
  open: boolean;
  // 조치할 건, 열기 전이면 null
  measure: Measure | null;
  options: MeasureActionOptions;
  draft: MeasureActionDraft;
  onDraftChange: (draft: MeasureActionDraft) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

// 이상 센서 한 건의 조치 여부, 조치일, 조치 내용, 검수 여부를 수정하는 Modal 표시
export function MeasureActionModal({
  open,
  measure,
  options,
  draft,
  onDraftChange,
  isSubmitting,
  onSubmit,
  onClose,
}: MeasureActionModalProps) {
  const fieldId = useId();

  return (
    <ModalFrame
      name="measure-action"
      open={open && measure !== null}
      onClose={onClose}
      title="이상 센서 조치"
      widthRem={WIDTH_REM}
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
    >
      <ModalBodyScroll>
        {measure ? (
          <Well data-slot="measure-action-target" className="flex flex-col">
            <KeyValueRow label="발생시각" value={formatIsoDateTime(measure.occurredAt)} />
            <KeyValueRow
              label="장치 / 센서"
              value={`${measure.deviceCode} · ${measure.sensorName}`}
            />
            <KeyValueRow
              label="진단"
              value={`실제≈${measure.actualValue.toFixed(VALUE_DIGITS)} / 기대≈${measure.expectedValue.toFixed(VALUE_DIGITS)} / 오차 ${measure.errorValue.toFixed(VALUE_DIGITS)}`}
            />
            <KeyValueRow label="편성 / 호차" value={`${measure.formation} · ${measure.car}호차`} />
          </Well>
        ) : null}
        <Well data-slot="measure-action-form" className="flex flex-col gap-3">
          <FormRow label="조치 여부" labelId={`${fieldId}-action`} required>
            <Segmented
              labelledBy={`${fieldId}-action`}
              value={draft.actionYn}
              options={options.actionStates.map((code) => ({
                value: code,
                label: describeState(measureActionLabels[code]),
              }))}
              onValueChange={(actionYn) => onDraftChange({ ...draft, actionYn })}
            />
          </FormRow>
          <div data-slot="measure-action-date-row" title="실제로 조치한 날 — 조치 완료일 때만 저장됩니다">
            <FormRow label="조치일" align="center">
              <DateRangePicker
                mode="single"
                label="조치일"
                value={draft.actionDate}
                onValueChange={(actionDate) => onDraftChange({ ...draft, actionDate })}
                selectableRange={options.selectableActionDates}
                placeholder="날짜 선택"
                appearance="calendar"
                highlightWhenOpen
                triggerClassName="w-[13.75rem] gap-2 normal-nums"
              />
            </FormRow>
          </div>
          <FormRow label="조치 내용" htmlFor={`${fieldId}-note`}>
            <TextAreaInput
              id={`${fieldId}-note`}
              value={draft.actionNote}
              onValueChange={(actionNote) => onDraftChange({ ...draft, actionNote })}
              placeholder="선택 입력"
              rows={3}
            />
          </FormRow>
          <FormRow label="검수 여부" labelId={`${fieldId}-inspection`} required>
            <Segmented
              labelledBy={`${fieldId}-inspection`}
              value={draft.inspectionYn}
              options={options.inspectionStates.map((code) => ({
                value: code,
                label: describeState(measureInspectionLabels[code]),
              }))}
              onValueChange={(inspectionYn) => onDraftChange({ ...draft, inspectionYn })}
            />
          </FormRow>
        </Well>
      </ModalBodyScroll>
    </ModalFrame>
  );
}
