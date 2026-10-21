import type { ComponentProps } from "react";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DateRangeTriggerProps extends Omit<ComponentProps<typeof Button>, "children"> {
  // Button에 표시할 기간이나 안내 문구
  text: string;
  // 선택한 날짜가 없어 안내 문구를 표시 중인지 여부
  isEmpty: boolean;
}

// Calendar Icon과 선택한 기간을 표시하는 기간 선택 Button 표시
export function DateRangeTrigger({ text, isEmpty, className, ...props }: DateRangeTriggerProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        "h-8 justify-start gap-2.5 rounded-sm border-border bg-card px-3 text-sm font-normal tabular-nums timing-micro hover:bg-card aria-expanded:bg-card dark:border-border dark:bg-card dark:hover:bg-card",
        isEmpty ? "text-muted-foreground hover:text-muted-foreground aria-expanded:text-muted-foreground" : "text-foreground",
        className,
      )}
      {...props}
    >
      <CalendarTodayRoundedIcon className="size-[1.125rem] text-foreground" />
      {text}
    </Button>
  );
}
