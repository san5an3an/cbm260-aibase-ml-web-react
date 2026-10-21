import { cn } from "@/lib/utils";

export type StatusTone = "danger" | "warning" | "caution" | "normal";

const chipClassNames: Record<StatusTone, string> = {
  danger: "bg-destructive text-danger-fg",
  warning: "bg-warning-strong text-warning-fg",
  caution: "bg-caution text-caution-fg",
  normal: "bg-success-strong text-success-fg",
};

interface StatusBadgeProps {
  tone: StatusTone;
  shortLabel: string;
  label: string;
}

// 등급을 한 Text Badge와 Label로 표시
export function StatusBadge({ tone, shortLabel, label }: StatusBadgeProps) {
  return (
    <span data-slot="status-badge" className="flex items-center gap-2 font-bold">
      <span
        data-slot="status-badge-chip"
        className={cn(
          "grid size-5 place-items-center rounded-[0.25rem] text-xs font-bold",
          chipClassNames[tone],
        )}
      >
        {shortLabel}
      </span>
      {label}
    </span>
  );
}
