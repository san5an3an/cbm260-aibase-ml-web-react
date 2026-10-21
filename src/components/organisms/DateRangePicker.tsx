"use client";

import { useState, type ReactNode } from "react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { ko } from "react-day-picker/locale";
import { DateRangeTrigger } from "@/components/atoms/DateRangeTrigger";
import { DropdownTrigger } from "@/components/atoms/DropdownTrigger";
import {
  CALENDAR_MONTH_COUNT,
  CALENDAR_POPUP_OFFSET_REM,
  calendarClassNames,
  calendarLabels,
  calendarPopupClassName,
  calendarRootClassName,
  selectableCalendarBounds,
  toCalendarDate,
  toIsoDate,
} from "@/components/organisms/calendarParts";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "@/domain/period";
import { useRootFontSize } from "@/lib/useRootFontSize";
import { cn } from "@/lib/utils";

// calendar는 Calendar Icon이 앞에 붙은 Button, dropdown은 Dropdown 모양의 Button
type DateRangePickerAppearance = "calendar" | "dropdown";

// Calendar가 열려 있는 동안 Button의 Border Color
const OPEN_TRIGGER_CLASS_NAME =
  "aria-expanded:border-brand-line4 dark:aria-expanded:border-brand-line4";

// 수정이 필요한 값일 때 Button의 Border, 굵은 빨간 Border가 열린 동안의 Border Color보다 우선함
const INVALID_TRIGGER_CLASS_NAME =
  "aria-invalid:border-[0.125rem] aria-invalid:border-destructive aria-invalid:ring-0 aria-invalid:aria-expanded:border-destructive dark:aria-invalid:border-destructive dark:aria-invalid:aria-expanded:border-destructive";

// 시작일과 종료일 사이(양 끝 포함)의 Cell을 칠하는 표시의 모양
const rangeFillClassNames = {
  rangeFill: "bg-brand-line4-subtle",
  rangeFillStart: "rounded-l-(--cell-radius)",
  rangeFillEnd: "rounded-r-(--cell-radius)",
};

// Click한 날짜로 다음 기간 계산, 기간이 확정됐거나 시작일보다 이전 날짜면 그 날짜부터 다시 시작
function nextRange(current: DateRange, picked: string): DateRange {
  if (current.from === null || current.to !== null || picked < current.from) {
    return { from: picked, to: null };
  }
  return { from: current.from, to: picked };
}

// Button에 표시할 기간 문구 계산, 종료일을 고르기 전이면 시작일만 표시
function describeRange(range: DateRange, placeholder: string): string {
  if (range.from === null) return placeholder;
  return range.to === null ? range.from : `${range.from} ~ ${range.to}`;
}

interface DateRangePickerBaseProps {
  // Button의 이름 앞에 붙여 읽어 줄 문구
  label: string;
  // 이름을 Button 문구 앞에도 표시할지 여부, 지정하지 않으면 읽어 주기만 함
  showLabel?: boolean;
  // 선택할 수 있는 날짜 범위, 끝이 null이면 그쪽 끝은 제한 없음
  selectableRange: DateRange;
  // 선택한 날짜가 없을 때 Button에 표시할 안내 문구
  placeholder: string;
  // Button의 모양, 지정하지 않으면 Calendar Icon Button
  appearance?: DateRangePickerAppearance;
  // Calendar가 열려 있는 동안 Button의 Border를 brand Color로 바꿀지 여부, 쓰는 곳마다 다름
  highlightWhenOpen?: boolean;
  // 수정이 필요한 값인지 여부, 참이면 Button을 굵은 빨간 Border로 표시
  invalid?: boolean;
  // Button의 Width와 간격
  triggerClassName?: string;
}

interface RangeModeProps extends DateRangePickerBaseProps {
  // 시작일과 종료일을 차례로 선택
  mode: "range";
  value: DateRange;
  onValueChange: (value: DateRange) => void;
  // 종료일까지 선택하면 Calendar를 닫을지 여부, 지정하지 않으면 날짜를 Click해도 닫히지 않음
  closeOnComplete?: boolean;
}

interface SingleModeProps extends DateRangePickerBaseProps {
  // 하루를 선택하면 닫힘
  mode: "single";
  // 선택한 날짜 "YYYY-MM-DD", 선택 전이면 null
  value: string | null;
  onValueChange: (value: string) => void;
}

type DateRangePickerProps = RangeModeProps | SingleModeProps;

// Button을 누르면 두 달짜리 Calendar를 띄워 기간이나 하루를 선택하는 날짜 선택 Component 표시
export function DateRangePicker(props: DateRangePickerProps) {
  const {
    label,
    showLabel = false,
    selectableRange,
    placeholder,
    appearance = "calendar",
    highlightWhenOpen = false,
    invalid = false,
    triggerClassName,
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const rootFontSize = useRootFontSize();
  const { unselectable, startMonth, endMonth } = selectableCalendarBounds(selectableRange);
  const calendarProps = {
    locale: ko,
    numberOfMonths: CALENDAR_MONTH_COUNT,
    startMonth,
    endMonth,
    disabled: unselectable,
    labels: calendarLabels,
    className: calendarRootClassName,
    classNames: calendarClassNames,
  };

  let text: string;
  let isEmpty: boolean;
  let calendar: ReactNode;
  if (props.mode === "single") {
    const { value, onValueChange } = props;
    const selected = value === null ? undefined : toCalendarDate(value);
    text = value ?? placeholder;
    isEmpty = value === null;
    calendar = (
      <Calendar
        {...calendarProps}
        mode="single"
        defaultMonth={selected}
        selected={selected}
        onSelect={(_date, pickedDate) => {
          onValueChange(toIsoDate(pickedDate));
          setIsOpen(false);
        }}
      />
    );
  } else {
    const { value, onValueChange, closeOnComplete = false } = props;
    const startDate = value.from === null ? undefined : toCalendarDate(value.from);
    const endDate = value.to === null ? undefined : toCalendarDate(value.to);
    const selected: DayPickerRange | undefined =
      startDate === undefined ? undefined : { from: startDate, to: endDate };
    // 시작일과 종료일이 다른 날일 때만 사이의 Cell을 칠함
    const fillModifiers =
      startDate !== undefined && endDate !== undefined && startDate < endDate
        ? {
            rangeFill: { from: startDate, to: endDate },
            rangeFillStart: startDate,
            rangeFillEnd: endDate,
          }
        : undefined;
    text = describeRange(value, placeholder);
    isEmpty = value.from === null;
    calendar = (
      <Calendar
        {...calendarProps}
        mode="range"
        defaultMonth={startDate}
        selected={selected}
        onSelect={(_range, pickedDate) => {
          const next = nextRange(value, toIsoDate(pickedDate));
          onValueChange(next);
          if (closeOnComplete && next.to !== null) setIsOpen(false);
        }}
        modifiers={fillModifiers}
        modifiersClassNames={rangeFillClassNames}
      />
    );
  }

  const triggerProps = {
    text: showLabel ? `${label} ${text}` : text,
    isEmpty,
    "aria-label": `${label} ${text}`,
    "aria-invalid": invalid || undefined,
    className: cn(
      highlightWhenOpen && OPEN_TRIGGER_CLASS_NAME,
      invalid && INVALID_TRIGGER_CLASS_NAME,
      triggerClassName,
    ),
  };

  return (
    <Popover modal open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        data-slot="date-range-trigger"
        render={
          appearance === "calendar" ? (
            <DateRangeTrigger {...triggerProps} />
          ) : (
            <DropdownTrigger {...triggerProps} />
          )
        }
      />
      <PopoverContent
        data-picker={props.mode}
        align="start"
        sideOffset={CALENDAR_POPUP_OFFSET_REM * rootFontSize}
        className={calendarPopupClassName}
      >
        {calendar}
      </PopoverContent>
    </Popover>
  );
}
