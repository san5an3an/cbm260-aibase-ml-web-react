"use client";

import { useId, type ReactNode } from "react";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { AnimatePresence } from "motion/react";
import { ActionButton } from "@/components/atoms/ActionButton";
import { ModalBodyScroll } from "@/components/atoms/ModalBodyScroll";
import { TextInput } from "@/components/atoms/TextInput";
import { Well } from "@/components/atoms/Well";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { FormRow } from "@/components/molecules/FormRow";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { SelectField } from "@/components/molecules/SelectField";
import { alarmRuleScopeText } from "@/components/organisms/alarmRuleTexts";
import type { AlarmRule, AlarmRuleDraft, AlarmRuleNumberField } from "@/domain/alarms";
import type { Device } from "@/domain/device";
import { alarmSeverityLabels } from "@/domain/labels/alarmSeverity";
import type { AnalysisModel } from "@/domain/model";

// Modal의 Width(rem)
const WIDTH_REM = 45;
// 장치와 Model을 정하지 않은 상태를 나타내는 값
const ALL = "";
const ENABLED = "Y";
const DISABLED = "N";

// add는 새 규칙, edit는 기존 규칙 수정, global은 전체 규칙 수정(범위 고정)
export type AlarmRuleEditMode = "add" | "edit" | "global";
// 저장을 Click해 확인했을 때의 오류 종류, empty는 빈 Input, negative는 0 이상의 숫자가 아닌 값
export type AlarmRuleEditError = "empty" | "negative";

const errorTexts: Record<AlarmRuleEditError, string> = {
  empty: "빈 칸이 있습니다. 조건을 쓰지 않으려면 0 을 입력하세요.",
  negative: "값은 0 이상 숫자로 입력하세요.",
};

// 숫자 Input의 Label과 단위, 발생 조건 3개와 심각도 기준 2개
const conditionFields: readonly { field: AlarmRuleNumberField; label: string; unit: string }[] = [
  { field: "consecutiveMinutes", label: "연속 지속(분)", unit: "분" },
  { field: "anomalyWindowCount", label: "이상 window 수", unit: "개" },
  { field: "mergeGapSeconds", label: "이어 붙일 간격(초)", unit: "초" },
];
const severityFields: readonly { field: AlarmRuleNumberField; label: string; unit: string }[] = [
  { field: "midMinMinutes", label: `${alarmSeverityLabels.MID.label} (분 이상)`, unit: "분" },
  { field: "highMinMinutes", label: `${alarmSeverityLabels.HIGH.label} (분 이상)`, unit: "분" },
];

interface AlarmRuleEditModalProps {
  open: boolean;
  mode: AlarmRuleEditMode;
  draft: AlarmRuleDraft;
  onDraftChange: (draft: AlarmRuleDraft) => void;
  devices: readonly Device[];
  models: readonly AnalysisModel[];
  // 현재 적용 중인 값을 미리 채워 둔 범위, 미리 채우지 않았으면 null
  prefilledScope: Pick<AlarmRule, "deviceCode" | "modelCode"> | null;
  // 저장을 Click해 확인했을 때의 오류와 고쳐야 하는 Input, Click하기 전에는 null과 빈 List
  error: AlarmRuleEditError | null;
  invalidFields: readonly AlarmRuleNumberField[];
  isSubmitting: boolean;
  onSubmit: () => void;
  onDelete: () => void;
  onClose: () => void;
  // 이 Modal 위에 겹쳐 띄울 확인 Dialog
  overlays?: ReactNode;
}

interface SectionHeadingProps {
  title: string;
  hint: string;
}

// Input Group의 제목과 그 옆의 짧은 설명 표시
function SectionHeading({ title, hint }: SectionHeadingProps) {
  return (
    <div data-slot="alarm-rule-edit-heading" className="-mb-2 flex items-baseline gap-2">
      <span className="text-sm leading-5 font-bold">{title}</span>
      <span className="text-[0.6875rem] leading-4 text-muted-foreground">{hint}</span>
    </div>
  );
}

// Alarm 규칙 하나를 새로 만들거나 수정하는 Modal 표시
export function AlarmRuleEditModal({
  open,
  mode,
  draft,
  onDraftChange,
  devices,
  models,
  prefilledScope,
  error,
  invalidFields,
  isSubmitting,
  onSubmit,
  onDelete,
  onClose,
  overlays,
}: AlarmRuleEditModalProps) {
  const fieldId = useId();
  const isGlobal = mode === "global";
  const scopeText = alarmRuleScopeText(draft, devices);
  const hasScope = draft.deviceCode !== null || draft.modelCode !== null;
  const title =
    mode === "add"
      ? hasScope
        ? `알람 규칙 추가 — ${scopeText}`
        : "알람 규칙 추가"
      : `알람 규칙 수정 — ${scopeText}`;

  const numberRow = ({ field, label, unit }: (typeof conditionFields)[number]) => (
    <FormRow key={field} label={label} htmlFor={`${fieldId}-${field}`} align="center">
      <TextInput
        id={`${fieldId}-${field}`}
        value={draft[field]}
        onValueChange={(value) => onDraftChange({ ...draft, [field]: value })}
        unit={unit}
        inputMode="decimal"
        invalid={invalidFields.includes(field)}
      />
    </FormRow>
  );

  return (
    <ModalFrame
      name="alarm-rule-edit"
      open={open}
      onClose={onClose}
      title={title}
      widthRem={WIDTH_REM}
      closeOnOutsidePress
      nestedOverlayTone="soft"
      footerStart={
        mode === "edit" ? (
          <ActionButton
            label="삭제"
            variant="dangerBorder"
            size="mdNarrow"
            disabled={isSubmitting}
            onClick={onDelete}
          />
        ) : null
      }
      footerEnd={
        <>
          <ActionButton label="취소" variant="outline" size="mdNarrow" onClick={onClose} />
          <ActionButton label="저장" disabled={isSubmitting} onClick={onSubmit} />
        </>
      }
      overlays={overlays}
    >
      <ModalBodyScroll bleed={false} data-slot="alarm-rule-edit-body">
        {/* 오류 띠와 안내 띠는 같은 위치를 쓰므로 앞의 띠가 완전히 사라진 뒤에 다음 띠를 표시 */}
        <AnimatePresence initial={false} mode="wait">
          {error ? (
            <AlertBanner
              key="error"
              tone="danger"
              icon={<WarningAmberRoundedIcon aria-hidden className="size-5" />}
              iconTone="danger"
              animated
            >
              {errorTexts[error]}
            </AlertBanner>
          ) : mode === "add" && prefilledScope ? (
            <AlertBanner
              key="prefilled"
              tone="brand"
              icon={<InfoRoundedIcon aria-hidden className="size-5" />}
              iconTone="brandText"
            >
              {`지금 적용 중인 「${alarmRuleScopeText(prefilledScope, devices)}」 값을 채워 두었습니다. 바꿀 값만 고쳐 저장하세요.`}
            </AlertBanner>
          ) : null}
        </AnimatePresence>
        <Well data-slot="alarm-rule-edit-scope" className="flex flex-none flex-col gap-5">
          <FormRow label="장치" htmlFor={`${fieldId}-device`} align="center">
            <SelectField
              id={`${fieldId}-device`}
              label="장치"
              value={draft.deviceCode ?? ALL}
              options={[
                { value: ALL, label: "(전체 장치)" },
                ...devices.map((device) => ({ value: device.code, label: device.name })),
              ]}
              onValueChange={(value) =>
                onDraftChange({ ...draft, deviceCode: value === ALL ? null : value })
              }
              disabled={isGlobal}
              className="w-full"
            />
          </FormRow>
          <FormRow label="모델" htmlFor={`${fieldId}-model`} align="center">
            <SelectField
              id={`${fieldId}-model`}
              label="모델"
              value={draft.modelCode ?? ALL}
              options={[
                { value: ALL, label: "(전체 모델)" },
                ...models.map((model) => ({ value: model.code, label: model.code })),
              ]}
              onValueChange={(value) =>
                onDraftChange({ ...draft, modelCode: value === ALL ? null : value })
              }
              disabled={isGlobal}
              className="w-full"
            />
          </FormRow>
          <FormRow label="사용 여부" htmlFor={`${fieldId}-enabled`} align="center">
            <SelectField
              id={`${fieldId}-enabled`}
              label="사용 여부"
              value={draft.isEnabled ? ENABLED : DISABLED}
              options={[
                { value: ENABLED, label: "Y (자동 알람 켬)" },
                { value: DISABLED, label: "N (이 범위 자동 알람 끔)" },
              ]}
              onValueChange={(value) => onDraftChange({ ...draft, isEnabled: value === ENABLED })}
              className="w-full"
            />
          </FormRow>
        </Well>
        <Well data-slot="alarm-rule-edit-conditions" className="flex flex-none flex-col gap-5">
          <SectionHeading title="발생 조건" hint="(둘 중 하나라도 맞으면 알람 · 0 = 안 씀)" />
          {conditionFields.map(numberRow)}
          <SectionHeading
            title="심각도 기준"
            hint={`(가장 긴 연속 구간 기준 · 그 외 ${alarmSeverityLabels.LOW.label} · ${alarmSeverityLabels.CRIT.label} 는 수동)`}
          />
          {severityFields.map(numberRow)}
          <FormRow label="설명" htmlFor={`${fieldId}-description`} align="center">
            <TextInput
              id={`${fieldId}-description`}
              value={draft.description}
              onValueChange={(description) => onDraftChange({ ...draft, description })}
              placeholder="(선택)"
            />
          </FormRow>
        </Well>
      </ModalBodyScroll>
    </ModalFrame>
  );
}
