"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

// current는 현재 선택한 단계, past는 이미 지나온 단계, idle은 그 밖의 단계
export type StateOptionProgress = "current" | "past" | "idle";

const progressClassNames: Record<StateOptionProgress, string> = {
  current:
    "border-primary hover:bg-primary-hover hover:text-primary-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary-hover",
  past: "border-brand-line4 bg-brand-line4-subtle text-brand-line4-text hover:bg-brand-line4-muted hover:text-brand-line4-text",
  idle: "border-border bg-card text-foreground hover:bg-muted",
};

interface StateOptionProps {
  label: string;
  progress: StateOptionProgress;
  onSelect: () => void;
}

// 단계로 이어지는 상태 중 하나를 선택하는 큰 Button 표시
export function StateOption({ label, progress, onSelect }: StateOptionProps) {
  return (
    <Toggle
      data-slot="state-option"
      data-progress={progress}
      variant="outline"
      pressed={progress === "current"}
      onPressedChange={(pressed) => {
        if (pressed) onSelect();
      }}
      className={cn(
        "h-12 min-w-0 flex-1 gap-1.5 rounded-md px-0 text-sm font-bold timing-micro",
        progressClassNames[progress],
      )}
    >
      {progress === "past" ? <CheckRoundedIcon aria-hidden className="size-4" /> : null}
      {label}
    </Toggle>
  );
}
