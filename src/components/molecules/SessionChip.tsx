import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SessionChipProps {
  label: string;
  remainingText: string;
  isExpiringSoon: boolean;
  extendLabel: string;
  onExtend: () => void;
}

// Session 만료까지 남은 시간과 연장 Button 표시
export function SessionChip({
  label,
  remainingText,
  isExpiringSoon,
  extendLabel,
  onExtend,
}: SessionChipProps) {
  return (
    <span data-slot="session-chip" className="flex h-8 items-center gap-2 rounded-md border border-border bg-card pr-1 pl-3 text-xs text-muted-foreground tabular-nums">
      <ScheduleRoundedIcon className="size-4" />
      {label}
      <b
        data-slot="session-chip-remaining"
        className={cn(
          "text-sm transition-colors timing-default",
          isExpiringSoon ? "text-destructive" : "text-foreground",
        )}
      >
        {remainingText}
      </b>
      <Button
        variant="outline"
        size="xs"
        onClick={onExtend}
        className="h-6 rounded-sm border-border bg-card px-2.5 text-xs font-semibold text-foreground dark:border-border dark:bg-card"
      >
        {extendLabel}
      </Button>
    </span>
  );
}
