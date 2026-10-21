import type { Matcher } from "react-day-picker";
import type { DateRange } from "@/domain/period";
import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
import { popupReducedMotionClassName } from "@/components/atoms/popupReducedMotionClassName";
import { formatIsoDate, formatLocalIsoDateTime } from "@/lib/formatTime";

// Button과 Calendar 사이의 간격(rem)
export const CALENDAR_POPUP_OFFSET_REM = 0.25;
// 한 번에 나란히 표시할 달의 수
export const CALENDAR_MONTH_COUNT = 2;

// Calendar 팝업의 모양, 기본 Width, Border, 그림자를 지정 값으로 덮고 움직임 줄이기 설정에서는 팝업 방향과 상관없이 Fade만 남김
export const calendarPopupClassName = `w-auto gap-0 rounded-[0.625rem] border border-border bg-card p-3 text-foreground shadow-[0_0.5rem_1.5rem_rgba(11,31,46,0.14)] ring-0 ${popupReducedMotionClassName}`;

// Calendar 자체의 Cell 크기와 모서리 지정
export const calendarRootClassName = "p-0 [--cell-radius:0.25rem] [--cell-size:2.25rem]";

// 이전, 다음 달 Button의 모양
const navButtonClassName =
  `inline-flex size-7 items-center justify-center rounded-sm border border-border bg-card p-0 text-foreground outline-none select-none timing-micro hover:bg-muted focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 ${disabledLookClassName}`;

// 날짜 Button의 모양, 선택한 날과 기간의 양 끝만 칠하고 사이의 날은 Cell의 배경으로 표시
const dayButtonClassName =
  "aspect-auto h-10 w-9 min-w-0 text-sm font-normal tabular-nums timing-micro hover:bg-transparent hover:text-inherit hover:shadow-[inset_0_0_0_0.0625rem_var(--border-strong)] dark:hover:bg-transparent dark:hover:text-inherit data-[range-middle=true]:bg-transparent data-[range-middle=true]:text-inherit data-[range-end=true]:font-bold data-[range-start=true]:font-bold data-[selected-single=true]:font-bold data-[range-end=true]:hover:bg-primary data-[range-start=true]:hover:bg-primary data-[selected-single=true]:hover:bg-primary data-[range-end=true]:hover:text-primary-foreground data-[range-start=true]:hover:text-primary-foreground data-[selected-single=true]:hover:text-primary-foreground";

// Calendar 각 부분의 모양, 기본값을 바꿀 부분만 지정
export const calendarClassNames = {
  months: "relative flex flex-row gap-4",
  month: "flex w-[15.75rem] flex-col gap-1",
  nav: "absolute inset-x-0 top-0.5 flex items-center justify-between",
  button_previous: navButtonClassName,
  button_next: navButtonClassName,
  chevron: "size-[1.125rem]",
  month_caption: "flex h-8 items-center justify-center",
  weekday: "grid h-8 w-9 place-items-center p-0 text-xs font-normal text-muted-foreground",
  week: "mt-1 flex",
  day: "relative h-10 w-9 p-0 text-center select-none",
  range_start: "",
  range_middle: "",
  range_end: "",
  today: "",
  outside: "text-disabled",
  disabled: "text-disabled",
  day_button: dayButtonClassName,
};

// Calendar가 읽어 주는 Button Label
export const calendarLabels = {
  labelPrevious: () => "이전 달",
  labelNext: () => "다음 달",
};

// "YYYY-MM-DD"를 해당 날짜 0시의 Date로 변환
export function toCalendarDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Date를 "YYYY-MM-DD"로 변환
export function toIsoDate(date: Date): string {
  return formatIsoDate(formatLocalIsoDateTime(date));
}

// 선택할 수 있는 날짜 범위를 Calendar의 비활성화 날짜와 이동할 수 있는 첫 달, 마지막 달로 변환
export function selectableCalendarBounds(selectableRange: DateRange): {
  unselectable: Matcher[];
  startMonth: Date | undefined;
  endMonth: Date | undefined;
} {
  const first = selectableRange.from === null ? undefined : toCalendarDate(selectableRange.from);
  const last = selectableRange.to === null ? undefined : toCalendarDate(selectableRange.to);
  return {
    unselectable: [...(first ? [{ before: first }] : []), ...(last ? [{ after: last }] : [])],
    startMonth: first,
    endMonth: last,
  };
}
