import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";

interface ClockChipProps {
  text: string;
}

// 현재 날짜와 시각 표시
export function ClockChip({ text }: ClockChipProps) {
  return (
    <span data-slot="clock-chip" className="flex h-8 items-center gap-2 rounded-md bg-card px-3 text-sm font-semibold tabular-nums">
      <CalendarTodayRoundedIcon className="size-[1.125rem]" />
      {text}
    </span>
  );
}
