"use client";

import { useId } from "react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { AnimatePresence } from "motion/react";
import { ActionButton } from "@/components/atoms/ActionButton";
import { ModalBodyScroll } from "@/components/atoms/ModalBodyScroll";
import { TextAreaInput } from "@/components/atoms/TextAreaInput";
import { TextInput } from "@/components/atoms/TextInput";
import { Well } from "@/components/atoms/Well";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { FormRow } from "@/components/molecules/FormRow";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { Segmented } from "@/components/molecules/Segmented";
import { SelectField } from "@/components/molecules/SelectField";
import type {
  AlarmCreateCheckedField,
  AlarmCreateDraft,
  AlarmCreateOptions,
} from "@/domain/alarms";
import type { Device } from "@/domain/device";
import { alarmSeverityLabels } from "@/domain/labels/alarmSeverity";
import type { AnalysisModel } from "@/domain/model";

// Modal의 Width(rem)
const WIDTH_REM = 67.5;

interface AlarmCreateModalProps {
  open: boolean;
  devices: readonly Device[];
  models: readonly AnalysisModel[];
  options: AlarmCreateOptions;
  draft: AlarmCreateDraft;
  onDraftChange: (draft: AlarmCreateDraft) => void;
  // 등록을 Click해 확인했을 때 고쳐야 하는 항목, Click하기 전에는 빈 List
  invalidFields: readonly AlarmCreateCheckedField[];
  isSubmitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

// 사람이 직접 Alarm을 등록하는 Modal 표시
export function AlarmCreateModal({
  open,
  devices,
  models,
  options,
  draft,
  onDraftChange,
  invalidFields,
  isSubmitting,
  onSubmit,
  onClose,
}: AlarmCreateModalProps) {
  const fieldId = useId();
  const change = (patch: Partial<AlarmCreateDraft>) => onDraftChange({ ...draft, ...patch });
  const { formationRange, carRange, anomalyRateRange } = options;
  const formationText = `${formationRange.min} ~ ${formationRange.max}`;
  const anomalyRateText = `${anomalyRateRange.min} ~ ${anomalyRateRange.max}`;

  return (
    <ModalFrame
      name="alarm-create"
      open={open}
      onClose={onClose}
      title="알람 등록"
      widthRem={WIDTH_REM}
      footerStart={
        <span data-slot="modal-footnote" className="text-xs text-muted-foreground">
          상태는 신규(NEW)로 등록됩니다
        </span>
      }
      footerEnd={
        <>
          <ActionButton label="취소" variant="outline" weight="semibold" onClick={onClose} />
          <ActionButton
            label="등록"
            icon={<CheckRoundedIcon className="size-[1.125rem]" />}
            weight="semibold"
            disabled={isSubmitting}
            onClick={onSubmit}
          />
        </>
      }
    >
      <ModalBodyScroll>
        <AnimatePresence initial={false}>
          {invalidFields.length > 0 ? (
            <AlertBanner
              key="error"
              tone="danger"
              icon={<WarningAmberRoundedIcon aria-hidden className="size-5" />}
              animated
            >
              {`입력값 ${invalidFields.length}개를 확인하세요. 표시된 칸을 수정하면 등록할 수 있습니다.`}
            </AlertBanner>
          ) : null}
        </AnimatePresence>
        <Well
          data-slot="alarm-create-form"
          className="grid grid-cols-[minmax(0,1.95fr)_minmax(0,1fr)] gap-6"
        >
          <div className="flex flex-col gap-3">
            <FormRow label="장치" htmlFor={`${fieldId}-device`} required labelWidth="md">
              <SelectField
                id={`${fieldId}-device`}
                label="장치"
                value={draft.deviceCode}
                options={devices.map((device) => ({ value: device.code, label: device.code }))}
                onValueChange={(deviceCode) => change({ deviceCode })}
                className="w-full"
              />
            </FormRow>
            <FormRow label="모델" htmlFor={`${fieldId}-model`} required labelWidth="md">
              <SelectField
                id={`${fieldId}-model`}
                label="모델"
                value={draft.modelCode}
                options={models.map((model) => ({ value: model.code, label: model.code }))}
                onValueChange={(modelCode) => change({ modelCode })}
                className="w-full"
              />
            </FormRow>
            <FormRow label="세그먼트" htmlFor={`${fieldId}-segment`} labelWidth="md">
              <TextInput
                id={`${fieldId}-segment`}
                value={draft.segment}
                onValueChange={(segment) => change({ segment })}
                placeholder={options.defaults.segment}
              />
            </FormRow>
            <FormRow
              label="편성"
              htmlFor={`${fieldId}-formation`}
              required
              labelWidth="md"
              error={
                invalidFields.includes("formation")
                  ? `편성 번호는 ${formationText} 사이 ${String(formationRange.max).length}자리입니다`
                  : null
              }
            >
              <TextInput
                id={`${fieldId}-formation`}
                value={draft.formation}
                onValueChange={(formation) => change({ formation })}
                placeholder={formationText}
                invalid={invalidFields.includes("formation")}
                required
              />
            </FormRow>
            <FormRow label="호차" htmlFor={`${fieldId}-car`} required labelWidth="md">
              <TextInput
                id={`${fieldId}-car`}
                value={draft.car}
                onValueChange={(car) => change({ car })}
                placeholder={`${carRange.min} ~ ${carRange.max}`}
                required
              />
            </FormRow>
          </div>
          <div className="flex flex-col gap-3">
            <FormRow label="심각도" labelId={`${fieldId}-severity`} required labelWidth="md">
              <Segmented
                labelledBy={`${fieldId}-severity`}
                value={draft.severity}
                options={options.severities.map((severity) => ({
                  value: severity,
                  label: alarmSeverityLabels[severity].label,
                }))}
                onValueChange={(severity) => change({ severity })}
                stretch
              />
            </FormRow>
            <FormRow
              label="이상비율"
              htmlFor={`${fieldId}-rate`}
              required
              labelWidth="md"
              error={
                invalidFields.includes("anomalyRatePercent")
                  ? `${anomalyRateText} 사이로 입력하세요`
                  : null
              }
            >
              <TextInput
                id={`${fieldId}-rate`}
                value={draft.anomalyRatePercent}
                onValueChange={(anomalyRatePercent) => change({ anomalyRatePercent })}
                placeholder={anomalyRateText}
                unit="%"
                invalid={invalidFields.includes("anomalyRatePercent")}
                required
              />
            </FormRow>
            <FormRow
              label="발생시각"
              htmlFor={`${fieldId}-occurred`}
              required
              labelWidth="md"
              error={invalidFields.includes("occurredAt") ? "발생시각을 입력하세요" : null}
            >
              <TextInput
                id={`${fieldId}-occurred`}
                value={draft.occurredAt}
                onValueChange={(occurredAt) => change({ occurredAt })}
                placeholder="YYYY-MM-DD HH:MM:SS"
                invalid={invalidFields.includes("occurredAt")}
                required
                className="tabular-nums"
              />
            </FormRow>
            <FormRow label="담당자" htmlFor={`${fieldId}-assignee`} labelWidth="md">
              <TextInput
                id={`${fieldId}-assignee`}
                value={draft.assignee}
                onValueChange={(assignee) => change({ assignee })}
                placeholder="정비사 ID"
              />
            </FormRow>
            <FormRow label="코멘트" htmlFor={`${fieldId}-comment`} labelWidth="md">
              <TextAreaInput
                id={`${fieldId}-comment`}
                value={draft.comment}
                onValueChange={(comment) => change({ comment })}
                placeholder="선택 입력"
                rows={3}
              />
            </FormRow>
          </div>
        </Well>
      </ModalBodyScroll>
    </ModalFrame>
  );
}
