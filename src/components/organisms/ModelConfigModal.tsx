"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ActionButton } from "@/components/atoms/ActionButton";
import { FieldMessage } from "@/components/atoms/FieldMessage";
import { IconButton } from "@/components/atoms/IconButton";
import { ModalBodyScroll } from "@/components/atoms/ModalBodyScroll";
import { StatePill } from "@/components/atoms/StatePill";
import { SwitchControl } from "@/components/atoms/SwitchControl";
import { TextInput } from "@/components/atoms/TextInput";
import { Well } from "@/components/atoms/Well";
import { AddRowButton } from "@/components/molecules/AddRowButton";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { EmptyState } from "@/components/molecules/EmptyState";
import { FormRow } from "@/components/molecules/FormRow";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { Segmented } from "@/components/molecules/Segmented";
import { SelectField } from "@/components/molecules/SelectField";
import { SkeletonPanel } from "@/components/molecules/SkeletonPanel";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import {
  modelConfigFieldKeys,
  modelConfigFieldTexts,
  modelConfigModeTexts,
  modelConfigParamProblemText,
  modelConfigRowListTexts,
  modelConfigTexts,
  modelConfigUseLabels,
  type ModelConfigFieldKey,
} from "@/components/organisms/modelConfigTexts";
import type { Device } from "@/domain/device";
import {
  modelConfigParamTypeRules,
  modelConfigParamTypes,
  type ModelConfigParamType,
} from "@/domain/labels/modelConfigParamType";
import type {
  ModelConfigDraft,
  ModelConfigMode,
  ModelConfigOptions,
  ModelConfigParamProblem,
  ModelConfigProblems,
  ModelConfigResultOrigin,
  ModelConfigRowDraft,
  ModelConfigRowList,
  ModelConfigTrainingMethod,
} from "@/domain/modelConfig";
import { motionTransition } from "@/lib/motion";
import { useAfterPress } from "@/lib/useAfterPress";

// Modal의 Width와 Height(rem) 정의, 1500 × 900 크기에 맞춤
const WIDTH_REM = 93.75;
const HEIGHT_REM = 56.25;

// 형식 선택지 정의, 형식 Table에 나열한 순서 사용
const PARAM_TYPE_OPTIONS = modelConfigParamTypes.map((type) => ({
  value: type,
  label: modelConfigParamTypeRules[type].label,
}));

// Modal 본문의 상태 정의, loading은 불러오는 중, error는 불러오지 못함, ready는 수정 가능
export type ModelConfigModalContent =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      draft: ModelConfigDraft;
      options: ModelConfigOptions;
      // 재학습 결과에서 열었으면 그 출처, 아니면 null
      origin: ModelConfigResultOrigin | null;
      // 현재 표시할 오류, 저장을 누른 뒤나 값 Input에서 Focus가 나간 뒤의 것만 담음
      problems: ModelConfigProblems;
      // 연 뒤로 입력이 바뀌었는지 여부, 바뀐 채 닫으려 하면 확인 Dialog를 띄움
      isDirty: boolean;
    };

interface ModelConfigModalProps {
  open: boolean;
  mode: ModelConfigMode;
  content: ModelConfigModalContent;
  devices: readonly Device[];
  isSaving: boolean;
  onDraftChange: (draft: ModelConfigDraft) => void;
  // Model을 바꾸면 Hyperparameter를 그 Model의 프리셋으로 다시 채우도록 호출
  onModelChange: (modelCode: string) => void;
  onAddRow: (list: ModelConfigRowList) => void;
  onRemoveRow: (list: ModelConfigRowList, rowId: number) => void;
  // Hyperparameter 값 Input에서 Focus가 나갈 때 호출
  onParamBlur: (rowId: number) => void;
  onSave: () => void;
  // 불러오지 못한 설정을 다시 불러올 때 호출
  onRetry: () => void;
  // 닫기로 확정됐을 때 호출, 바뀐 채 닫으려 하면 확인을 받은 뒤에만 호출
  onClose: () => void;
}

interface FieldControl {
  control: ReactNode;
  htmlFor?: string;
  labelId?: string;
  error?: string | null;
  hint?: string;
}

interface RowListProps {
  idPrefix: string;
  list: ModelConfigRowList;
  rows: readonly ModelConfigRowDraft[];
  // Row별로 표시할 오류, Row 순서대로 담고 없으면 null
  problems: readonly (ModelConfigParamProblem | null)[];
  onRowChange: (rowId: number, patch: Partial<ModelConfigRowDraft>) => void;
  onRemove: (rowId: number) => void;
  onValueBlur: (rowId: number) => void;
}

// 이름, 값, 형식, 삭제 Row List 표시, 새로 더한 Row는 짧게 나타나게 함
function ConfigRowList({
  idPrefix,
  list,
  rows,
  problems,
  onRowChange,
  onRemove,
  onValueBlur,
}: RowListProps) {
  const shouldReduceMotion = useReducedMotion();
  const texts = modelConfigRowListTexts[list];
  return (
    <AnimatePresence initial={false}>
      {rows.map((row, index) => {
        const problem = problems[index] ?? null;
        const rowLabel = `${texts.title} ${index + 1}`;
        return (
          <motion.div
            key={row.rowId}
            data-slot="model-config-row"
            className="flex flex-col"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: "-0.25rem" }}
            animate={
              shouldReduceMotion
                ? { opacity: 1, transition: motionTransition.default }
                : { opacity: 1, y: "0rem", transition: motionTransition.default }
            }
          >
            <div className="flex items-center gap-2">
              <TextInput
                id={`${idPrefix}-${list}-${row.rowId}-key`}
                label={`${rowLabel} ${texts.keyPlaceholder}`}
                value={row.key}
                placeholder={texts.keyPlaceholder}
                onValueChange={(key) => onRowChange(row.rowId, { key })}
                className="w-[12.5rem] flex-none"
              />
              <TextInput
                label={`${rowLabel} ${texts.valuePlaceholder}`}
                value={row.value}
                placeholder={texts.valuePlaceholder}
                invalid={problem !== null}
                onValueChange={(value) => onRowChange(row.rowId, { value })}
                onBlur={() => onValueBlur(row.rowId)}
                className="min-w-0 flex-1"
              />
              <SelectField<ModelConfigParamType>
                label={`${rowLabel} ${modelConfigTexts.rowTypeLabel}`}
                value={row.type}
                options={PARAM_TYPE_OPTIONS}
                onValueChange={(type) => onRowChange(row.rowId, { type })}
                className="w-24 flex-none"
              />
              <IconButton
                label={modelConfigTexts.rowRemoveLabel}
                icon={<CloseRoundedIcon aria-hidden className="size-4" />}
                onClick={() => onRemove(row.rowId)}
              />
            </div>
            {problem !== null ? <FieldMessage message={modelConfigParamProblemText(problem)} /> : null}
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

// 장치, Model, Segment별 재학습 Profile을 수정하는 Modal 표시, 임계치 관리 화면과 설정 수정, 새 설정, 복제에서 함께 사용
export function ModelConfigModal({
  open,
  mode,
  content,
  devices,
  isSaving,
  onDraftChange,
  onModelChange,
  onAddRow,
  onRemoveRow,
  onParamBlur,
  onSave,
  onRetry,
  onClose,
}: ModelConfigModalProps) {
  const fieldId = useId();
  const modeTexts = modelConfigModeTexts[mode];
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  // Row를 더한 뒤 Focus를 옮길 이름 Input의 id 보관
  const pendingFocusIdRef = useRef<string | null>(null);
  // Click하는 중에 값 Input에서 나가면 오류 Row를 그 Click 뒤에 표시, Parameter 추가와 삭제 Button이 밀려 Click이 빗나가지 않게 함
  const afterPress = useAfterPress(open);

  useEffect(() => {
    const pendingId = pendingFocusIdRef.current;
    if (pendingId === null) return;
    const input = document.getElementById(pendingId);
    if (input === null) return;
    pendingFocusIdRef.current = null;
    input.focus();
  });

  // 저장하는 동안에는 닫지 않고, 바뀐 채면 확인 Dialog를 먼저 띄움
  const requestClose = () => {
    if (isSaving) return;
    if (content.status === "ready" && content.isDirty) {
      setIsConfirmingClose(true);
      return;
    }
    onClose();
  };

  const confirmClose = () => {
    setIsConfirmingClose(false);
    onClose();
  };

  const renderBody = () => {
    switch (content.status) {
      case "loading":
        return <SkeletonPanel caption={modelConfigTexts.loading} />;
      case "error":
        return (
          <div role="alert" className="flex flex-1 flex-col">
            <EmptyState
              variant="fill"
              iconTone="danger"
              icon={<ErrorRoundedIcon aria-hidden className="size-7" />}
              title={modelConfigTexts.loadFailedTitle}
              description={modelConfigTexts.loadFailedDescription}
              action={
                <ActionButton label={modelConfigTexts.retryLabel} size="lg" onClick={onRetry} />
              }
            />
          </div>
        );
      case "ready":
        return renderForm(content);
    }
  };

  const renderForm = ({
    draft,
    options,
    origin,
    problems,
  }: Extract<ModelConfigModalContent, { status: "ready" }>) => {
    const change = (patch: Partial<ModelConfigDraft>) => onDraftChange({ ...draft, ...patch });
    const changeRow = (list: ModelConfigRowList, rowId: number, patch: Partial<ModelConfigRowDraft>) =>
      change({ [list]: draft[list].map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)) });
    const addRow = (list: ModelConfigRowList) => {
      pendingFocusIdRef.current = `${fieldId}-${list}-${draft.nextRowId}-key`;
      onAddRow(list);
    };

    const fields: Record<ModelConfigFieldKey, FieldControl> = {
      name: {
        htmlFor: `${fieldId}-name`,
        error: problems.isNameMissing ? modelConfigTexts.nameMissing : null,
        control: (
          <TextInput
            id={`${fieldId}-name`}
            value={draft.name}
            required
            invalid={problems.isNameMissing}
            onValueChange={(name) => change({ name })}
          />
        ),
      },
      deviceCode: {
        htmlFor: `${fieldId}-device`,
        control: (
          <SelectField
            id={`${fieldId}-device`}
            label={modelConfigFieldTexts.deviceCode.label}
            value={draft.deviceCode}
            options={devices.map((device) => ({ value: device.code, label: device.code }))}
            onValueChange={(deviceCode) => change({ deviceCode })}
            className="w-full"
          />
        ),
      },
      modelCode: {
        labelId: `${fieldId}-model`,
        hint: modelConfigTexts.modelHint,
        control: (
          <Segmented
            labelledBy={`${fieldId}-model`}
            value={draft.modelCode}
            options={options.modelCodes.map((code) => ({ value: code, label: code }))}
            onValueChange={(modelCode) => {
              if (modelCode !== draft.modelCode) onModelChange(modelCode);
            }}
          />
        ),
      },
      segment: {
        htmlFor: `${fieldId}-segment`,
        control: (
          <TextInput
            id={`${fieldId}-segment`}
            value={draft.segment}
            onValueChange={(segment) => change({ segment })}
          />
        ),
      },
      thresholdPercentile: {
        htmlFor: `${fieldId}-percentile`,
        error: problems.isPercentileOutOfRange
          ? modelConfigTexts.percentileOutOfRange(options.percentileRange)
          : null,
        hint: modelConfigTexts.percentileHint(options.percentileRange),
        control: (
          <TextInput
            id={`${fieldId}-percentile`}
            value={draft.thresholdPercentile}
            unit={modelConfigTexts.percentileUnit}
            inputMode="decimal"
            required
            invalid={problems.isPercentileOutOfRange}
            onValueChange={(thresholdPercentile) => change({ thresholdPercentile })}
            className="w-40"
          />
        ),
      },
      windowSeconds: {
        htmlFor: `${fieldId}-window`,
        control: (
          <TextInput
            id={`${fieldId}-window`}
            value={draft.windowSeconds}
            unit={modelConfigTexts.windowUnit}
            inputMode="numeric"
            onValueChange={(windowSeconds) => change({ windowSeconds })}
            className="w-40"
          />
        ),
      },
      trainingMethod: {
        labelId: `${fieldId}-method`,
        control: (
          <Segmented<ModelConfigTrainingMethod>
            labelledBy={`${fieldId}-method`}
            value={draft.trainingMethod}
            options={options.trainingMethods.map((method) => ({ value: method, label: method }))}
            onValueChange={(trainingMethod) => change({ trainingMethod })}
          />
        ),
      },
      use: {
        hint: modelConfigTexts.useHint,
        control: (
          <SwitchControl
            label={modelConfigUseLabels[draft.use]}
            labelWeight="medium"
            checked={draft.use === "Y"}
            onCheckedChange={(checked) => change({ use: checked ? "Y" : "N" })}
          />
        ),
      },
      description: {
        htmlFor: `${fieldId}-description`,
        control: (
          <TextInput
            id={`${fieldId}-description`}
            value={draft.description}
            onValueChange={(description) => change({ description })}
          />
        ),
      },
    };

    const notAppliedPill = (
      <StatePill size="md" tone="caution" label={modelConfigTexts.notAppliedPill} />
    );

    return (
      <>
        {origin !== null ? (
          <AlertBanner
            tone="brand"
            iconTone="brandText"
            layout="block"
            icon={<InfoRoundedIcon aria-hidden className="size-[1.125rem]" />}
          >
            {modelConfigTexts.resultOrigin(origin)}
          </AlertBanner>
        ) : null}
        <div
          data-slot="model-config-body"
          className="grid min-h-0 flex-1 grid-cols-2 gap-3.5"
        >
          <Well
            data-slot="model-config-fields"
            className="flex min-h-0 flex-col gap-2.5 overflow-y-auto"
          >
            {modelConfigFieldKeys.map((key) => {
              const text = modelConfigFieldTexts[key];
              const field = fields[key];
              return (
                <FormRow
                  key={key}
                  label={text.label}
                  required={text.required}
                  htmlFor={field.htmlFor}
                  labelId={field.labelId}
                  labelWidth="mdLoose"
                  align="top"
                  error={field.error}
                  hint={field.hint}
                >
                  {text.isNotApplied ? (
                    <div data-slot="model-config-not-applied" className="flex items-center gap-2.5">
                      {field.control}
                      {notAppliedPill}
                    </div>
                  ) : (
                    field.control
                  )}
                </FormRow>
              );
            })}
          </Well>
          <Well data-slot="model-config-rows" className="flex min-h-0 flex-col overflow-y-auto">
            <div className="flex flex-1 flex-col gap-[1.125rem]">
              <section
                data-slot="model-config-row-list"
                data-list="params"
                className="flex flex-col gap-2"
              >
                <div
                  data-slot="model-config-row-list-header"
                  className="flex h-5 items-center gap-2"
                >
                  <h3 className="text-sm leading-5 font-bold">
                    {modelConfigRowListTexts.params.title}
                  </h3>
                  <span className="flex-1" />
                  <span
                    data-slot="model-config-params-note"
                    className="text-xs leading-4 text-muted-foreground"
                  >
                    {modelConfigTexts.paramsNote(draft.modelCode)}
                  </span>
                </div>
                <ConfigRowList
                  idPrefix={fieldId}
                  list="params"
                  rows={draft.params}
                  problems={problems.params}
                  onRowChange={(rowId, patch) => changeRow("params", rowId, patch)}
                  onRemove={(rowId) => onRemoveRow("params", rowId)}
                  onValueBlur={(rowId) => afterPress(() => onParamBlur(rowId))}
                />
                <AddRowButton
                  label={modelConfigRowListTexts.params.addLabel}
                  onClick={() => addRow("params")}
                />
              </section>
              <section
                data-slot="model-config-row-list"
                data-list="sensorWeights"
                className="flex flex-1 flex-col gap-2"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <div
                    data-slot="model-config-row-list-header"
                    className="flex h-6 items-center gap-2"
                  >
                    <h3 className="text-sm leading-5 font-bold">
                      {modelConfigRowListTexts.sensorWeights.title}
                    </h3>
                    {notAppliedPill}
                  </div>
                  <ConfigRowList
                    idPrefix={fieldId}
                    list="sensorWeights"
                    rows={draft.sensorWeights}
                    problems={[]}
                    onRowChange={(rowId, patch) => changeRow("sensorWeights", rowId, patch)}
                    onRemove={(rowId) => onRemoveRow("sensorWeights", rowId)}
                    onValueBlur={() => {}}
                  />
                  <AddRowButton
                    label={modelConfigRowListTexts.sensorWeights.addLabel}
                    onClick={() => addRow("sensorWeights")}
                  />
                </div>
                <AlertBanner
                  tone="warning"
                  iconTone="warningStrong"
                  layout="block"
                  icon={<WarningAmberRoundedIcon aria-hidden className="size-[1.125rem]" />}
                >
                  {/* 문구 속 줄바꿈(\n)을 그대로 표시 */}
                  <span className="whitespace-pre-line">{modelConfigTexts.notAppliedBanner}</span>
                </AlertBanner>
              </section>
            </div>
          </Well>
        </div>
      </>
    );
  };

  return (
    <ModalFrame
      name="model-config"
      open={open}
      onClose={requestClose}
      title={modeTexts.title}
      widthRem={WIDTH_REM}
      heightRem={HEIGHT_REM}
      footerStart={
        <span data-slot="model-config-note" className="text-xs leading-4 text-muted-foreground">
          {modeTexts.note}
        </span>
      }
      footerEnd={
        <>
          <ActionButton
            label={modelConfigTexts.cancelLabel}
            variant="outline"
            disabled={isSaving}
            onClick={requestClose}
          />
          <ActionButton
            label={modeTexts.submitLabel}
            icon={<CheckRoundedIcon aria-hidden className="size-4" />}
            disabled={content.status !== "ready"}
            pending={isSaving}
            onClick={onSave}
          />
        </>
      }
      overlays={
        <ConfirmDialog
          name="model-config-unsaved"
          open={open && isConfirmingClose}
          tone="caution"
          icon={<WarningAmberRoundedIcon aria-hidden />}
          title={modelConfigTexts.unsavedTitle}
          description={modelConfigTexts.unsavedDescription(
            content.status === "ready" ? content.draft.name : "",
          )}
          confirmLabel={modelConfigTexts.unsavedConfirmLabel}
          confirmTone="primary"
          cancelLabel={modelConfigTexts.cancelLabel}
          onConfirm={confirmClose}
          onCancel={() => setIsConfirmingClose(false)}
        />
      }
    >
      <ModalBodyScroll>{renderBody()}</ModalBodyScroll>
    </ModalFrame>
  );
}
