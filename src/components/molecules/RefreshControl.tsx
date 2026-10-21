import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Button } from "@/components/ui/button";

interface RefreshControlProps {
  refreshedText: string;
  buttonLabel: string;
  onRefresh: () => void;
}

// 마지막 갱신 시각과 새Logo침 Button 표시
export function RefreshControl({ refreshedText, buttonLabel, onRefresh }: RefreshControlProps) {
  return (
    <>
      <span data-slot="refresh-time" className="text-xs text-muted-foreground tabular-nums">
        {refreshedText}
      </span>
      <Button
        data-slot="refresh-button"
        variant="outline"
        onClick={onRefresh}
        className="h-8 gap-1.5 rounded-sm border-border bg-card px-3 text-sm font-semibold text-foreground timing-micro dark:border-border dark:bg-card"
      >
        <RefreshRoundedIcon className="size-[1.125rem]" />
        {buttonLabel}
      </Button>
    </>
  );
}
