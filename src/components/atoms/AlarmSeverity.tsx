import { cn } from "@/lib/utils";

export type AlarmSeverityTone = "low" | "mid" | "high" | "critical";

const toneClassNames: Record<AlarmSeverityTone, string> = {
  low: "bg-border-strong text-primary-foreground",
  mid: "bg-caution text-caution-fg",
  high: "bg-warning-strong text-warning-fg",
  critical: "bg-destructive text-danger-fg",
};

interface AlarmSeverityProps {
  tone: AlarmSeverityTone;
  label: string;
  size?: "sm" | "md";
}

// Alarm의 심각도를 Color가 있는 사각형 Cell로 표시
export function AlarmSeverity({ tone, label, size = "md" }: AlarmSeverityProps) {
  return (
    <span
      data-slot="alarm-severity"
      data-tone={tone}
      className={cn(
        "grid w-[3.25rem] place-items-center rounded-[0.25rem] text-xs font-bold tracking-[0.025rem]",
        size === "md" ? "h-6" : "h-5",
        toneClassNames[tone],
      )}
    >
      {label}
    </span>
  );
}
