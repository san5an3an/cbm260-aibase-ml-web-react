"use client";

import { useId, type ReactNode } from "react";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { FieldMessage } from "@/components/atoms/FieldMessage";
import { ModalBodyScroll } from "@/components/atoms/ModalBodyScroll";
import { TextInput } from "@/components/atoms/TextInput";
import { Well } from "@/components/atoms/Well";
import { CheckboxItem } from "@/components/molecules/CheckboxItem";
import { FormRow } from "@/components/molecules/FormRow";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { SelectField } from "@/components/molecules/SelectField";
import { DateRangePicker } from "@/components/organisms/DateRangePicker";
import { Spinner } from "@/components/ui/spinner";
import type { Device } from "@/domain/device";
import type { DateRange } from "@/domain/period";
import { cn } from "@/lib/utils";

// Modal의 Width(rem)
const WIDTH_REM = 56.25;
// 장치 List 영역에 Scroll 없이 보이는 장치 수, 넘으면 N개 더 있다는 안내 표시
const VISIBLE_DEVICE_COUNT = 12;
// 장치 List의 한 Column에 위에서 아래로 채우는 장치 수
const DEVICES_PER_COLUMN = 6;
// 편성을 선택하지 않은 상태를 나타내는 값
const ALL_FORMATIONS = "";

// 수정이 필요한 값을 표시하는 Input, Model, 기간, 대상 장치
export type JobRequestField = "model" | "period" | "devices";

// Model을 뺀 요청 Form의 값, 시각은 입력한 문구 그대로
export interface JobRequestValues {
  period: DateRange;
  startTime: string;
  endTime: string;
  // 선택한 편성, 전체 편성이면 null
  formation: string | null;
  // 선택한 장치 코드 목록, 선택한 순서대로
  deviceCodes: readonly string[];
}

// 화면마다 다른 Label, 안내, Button 문구
export interface JobRequestTexts {
  dateLabel: string;
  timeLabel: string;
  modelLabel: string;
  // 하단 Row 왼쪽의 안내
  note: string;
  submitLabel: string;
  // Request를 기다리는 동안 실행 Button에 표시할 문구
  submittingLabel: string;
  // 선택할 수 없는 장치 이름 뒤에 덧붙이는 문구와 도움말
  unavailableHint: string;
  unavailableTitle: string;
}

export interface JobRequestError {
  field: JobRequestField;
  message: string;
}

// 장치를 Column 수만큼 끊어 왼쪽 Column을 위에서 아래로 채운 뒤 오른쪽 Column을 채우는 순서 계산, 마지막 Group의 빈 Cell은 앞으로 당김
function orderByColumns<Item>(items: readonly Item[]): Item[] {
  const block = DEVICES_PER_COLUMN * 2;
  const ordered: Item[] = [];
  for (let start = 0; start < items.length; start += block) {
    const left = items.slice(start, start + DEVICES_PER_COLUMN);
    const right = items.slice(start + DEVICES_PER_COLUMN, start + block);
    for (let row = 0; row < DEVICES_PER_COLUMN; row += 1) {
      if (row < left.length) ordered.push(left[row]);
      if (row < right.length) ordered.push(right[row]);
    }
  }
  return ordered;
}

// 장치 검색어에 맞는지 판정, 코드는 대소문자 구분 없이, 이름은 입력한 그대로 비교
function matchesDeviceQuery(device: Device, query: string): boolean {
  const text = query.trim();
  return text === "" || device.code.includes(text.toUpperCase()) || device.name.includes(text);
}

interface DevicePickerProps {
  devices: readonly Device[];
  unavailableDeviceCodes: readonly string[];
  selected: readonly string[];
  onSelectedChange: (deviceCodes: readonly string[]) => void;
  query: string;
  onQueryChange: (query: string) => void;
  texts: JobRequestTexts;
  error: string | null;
}

// 대상 장치 수, 검색, 전체 선택과 두 Column으로 나열한 장치 List 표시
function DevicePicker({
  devices,
  unavailableDeviceCodes,
  selected,
  onSelectedChange,
  query,
  onQueryChange,
  texts,
  error,
}: DevicePickerProps) {
  const availableCodes = devices
    .map((device) => device.code)
    .filter((code) => !unavailableDeviceCodes.includes(code));
  const isAllSelected =
    availableCodes.length > 0 && availableCodes.every((code) => selected.includes(code));
  const hiddenCount = devices.length - VISIBLE_DEVICE_COUNT;

  const toggleDevice = (code: string, checked: boolean) => {
    onSelectedChange(checked ? [...selected, code] : selected.filter((item) => item !== code));
  };

  return (
    <Well
      data-slot="job-request-devices"
      className={cn("flex flex-col gap-3", error !== null && "border-destructive")}
    >
      <div data-slot="job-request-devices-header" className="flex items-center gap-2">
        <span className="text-sm font-bold">대상 장치</span>
        <span
          data-slot="job-request-device-count"
          className="pl-1 text-sm font-bold text-brand-line4-text"
        >
          {`${selected.length} / ${devices.length}`}
        </span>
        {hiddenCount > 0 ? (
          <span data-slot="job-request-device-more" className="text-xs text-muted-foreground">
            {`· 스크롤하면 ${hiddenCount}개 더 있습니다`}
          </span>
        ) : null}
        <span className="flex-1" />
        <TextInput
          label="장치 검색"
          value={query}
          onValueChange={onQueryChange}
          placeholder="장치 검색"
          leadingIcon={<SearchRoundedIcon aria-hidden />}
          className="w-[12.5rem]"
        />
        <ActionButton
          label={isAllSelected ? "전체 해제" : "전체 선택"}
          variant="outline"
          size="mdNarrow"
          weight="semibold"
          onClick={() => onSelectedChange(isAllSelected ? [] : availableCodes)}
        />
      </div>
      <Well
        variant="list"
        data-slot="job-request-device-list"
        className="grid h-[15.375rem] auto-rows-[2.5rem] grid-cols-2 gap-x-6 overflow-auto"
      >
        {orderByColumns(devices)
          .filter((device) => matchesDeviceQuery(device, query))
          .map((device) => {
            const isUnavailable = unavailableDeviceCodes.includes(device.code);
            return (
              <CheckboxItem
                key={device.code}
                appearance="row"
                label={device.name}
                hint={isUnavailable ? texts.unavailableHint : undefined}
                title={isUnavailable ? texts.unavailableTitle : device.code}
                disabled={isUnavailable}
                checked={selected.includes(device.code)}
                onCheckedChange={(checked) => toggleDevice(device.code, checked)}
              />
            );
          })}
      </Well>
      {error !== null ? <FieldMessage message={error} /> : null}
    </Well>
  );
}

interface JobRequestModalProps {
  // 검사 도구와 개발자 도구에서 Modal을 찾는 이름
  name: string;
  open: boolean;
  title: string;
  texts: JobRequestTexts;
  // 실행 Button 앞의 Icon
  submitIcon: ReactNode;
  values: JobRequestValues;
  onValuesChange: (values: JobRequestValues) => void;
  // Model Row의 Input, 넘겨받은 Label id를 Group의 이름으로 사용
  renderModelField: (labelId: string) => ReactNode;
  selectablePeriod: DateRange;
  formations: readonly string[];
  devices: readonly Device[];
  unavailableDeviceCodes: readonly string[];
  deviceQuery: string;
  onDeviceQueryChange: (query: string) => void;
  // 실행을 눌렀을 때 수정이 필요한 Input과 문구, 없으면 null
  error: JobRequestError | null;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

// 기간, 시각, Model, 편성, 대상 장치를 선택해 작업을 요청하는 Modal 표시
export function JobRequestModal({
  name,
  open,
  title,
  texts,
  submitIcon,
  values,
  onValuesChange,
  renderModelField,
  selectablePeriod,
  formations,
  devices,
  unavailableDeviceCodes,
  deviceQuery,
  onDeviceQueryChange,
  error,
  isSubmitting,
  onSubmit,
  onClose,
}: JobRequestModalProps) {
  const fieldId = useId();
  const change = (patch: Partial<JobRequestValues>) => onValuesChange({ ...values, ...patch });
  const errorFor = (field: JobRequestField) => (error?.field === field ? error.message : null);
  const allFormationsLabel =
    formations.length > 0
      ? `전체 (${formations[0]} – ${formations[formations.length - 1]})`
      : "전체";

  return (
    <ModalFrame
      name={name}
      open={open}
      onClose={onClose}
      title={title}
      widthRem={WIDTH_REM}
      footerStart={
        <span data-slot="modal-footnote" className="text-xs text-muted-foreground">
          {texts.note}
        </span>
      }
      footerEnd={
        <>
          <ActionButton label="취소" variant="outline" weight="semibold" onClick={onClose} />
          <ActionButton
            label={isSubmitting ? texts.submittingLabel : texts.submitLabel}
            icon={
              isSubmitting ? (
                <Spinner
                  aria-label={texts.submittingLabel}
                  // Request 중임은 Button 문구가 전하므로 Spinner는 화면 읽기 도구에 숨김, 라이브러리의 영문 기본 이름도 덮어씀
                  aria-hidden
                  className="size-[0.8125rem] animate-[spin_0.8s_linear_infinite] motion-reduce:animate-none"
                />
              ) : (
                submitIcon
              )
            }
            weight="semibold"
            pending={isSubmitting}
            onClick={onSubmit}
          />
        </>
      }
    >
      <ModalBodyScroll>
        <Well data-slot="job-request-fields" className="flex flex-col gap-3">
          <FormRow label={texts.dateLabel} required error={errorFor("period")}>
            <DateRangePicker
              mode="range"
              label={texts.dateLabel}
              value={values.period}
              onValueChange={(period) => change({ period })}
              selectableRange={selectablePeriod}
              placeholder="기간 선택"
              highlightWhenOpen
              invalid={errorFor("period") !== null}
              triggerClassName="w-[19.125rem]"
            />
          </FormRow>
          <FormRow label={texts.timeLabel} labelId={`${fieldId}-time`}>
            <div
              role="group"
              aria-labelledby={`${fieldId}-time`}
              className="flex items-center gap-2.5"
            >
              <TextInput
                label={`${texts.timeLabel} 시작`}
                value={values.startTime}
                onValueChange={(startTime) => change({ startTime })}
                placeholder="00:00:00"
                className="w-[8.75rem] tabular-nums"
              />
              <span aria-hidden className="text-base text-muted-foreground">
                ~
              </span>
              <TextInput
                label={`${texts.timeLabel} 끝`}
                value={values.endTime}
                onValueChange={(endTime) => change({ endTime })}
                placeholder="23:59:59"
                className="w-[8.75rem] tabular-nums"
              />
            </div>
          </FormRow>
          <FormRow
            label={texts.modelLabel}
            labelId={`${fieldId}-model`}
            required
            error={errorFor("model")}
          >
            {renderModelField(`${fieldId}-model`)}
          </FormRow>
          <FormRow label="편성 번호" htmlFor={`${fieldId}-formation`}>
            <SelectField
              id={`${fieldId}-formation`}
              label="편성 번호"
              value={values.formation ?? ALL_FORMATIONS}
              options={[
                { value: ALL_FORMATIONS, label: allFormationsLabel },
                ...formations.map((formation) => ({ value: formation, label: formation })),
              ]}
              onValueChange={(formation) =>
                change({ formation: formation === ALL_FORMATIONS ? null : formation })
              }
              className="w-[19.125rem]"
            />
          </FormRow>
        </Well>
        <DevicePicker
          devices={devices}
          unavailableDeviceCodes={unavailableDeviceCodes}
          selected={values.deviceCodes}
          onSelectedChange={(deviceCodes) => change({ deviceCodes })}
          query={deviceQuery}
          onQueryChange={onDeviceQueryChange}
          texts={texts}
          error={errorFor("devices")}
        />
      </ModalBodyScroll>
    </ModalFrame>
  );
}
