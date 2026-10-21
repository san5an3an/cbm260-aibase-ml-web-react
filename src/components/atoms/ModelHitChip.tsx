import { cn } from "@/lib/utils";

interface ModelHitChipProps {
  label: string;
  isEmphasized: boolean;
}

// Model별 이상 window 수 표시
export function ModelHitChip({ label, isEmphasized }: ModelHitChipProps) {
  return (
    <span
      data-slot="model-hit-chip"
      className={cn(
        "flex h-5 items-center rounded-[0.25rem] px-[0.4375rem] text-[0.6875rem] whitespace-nowrap",
        isEmphasized
          ? "bg-danger-subtle font-bold text-on-danger-subtle"
          : "bg-muted font-medium text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
