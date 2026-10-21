import { cn } from "@/lib/utils";

interface StepDotProps {
  label: string;
  // 이미 지났거나 현재 단계라 점을 칠하고 Text를 굵게 표시할지 여부
  reached: boolean;
}

// 단계 하나를 작은 점과 Label로 표시
export function StepDot({ label, reached }: StepDotProps) {
  return (
    <span
      data-slot="step-dot"
      data-reached={reached}
      className={cn(
        "flex items-center gap-1 whitespace-nowrap",
        reached ? "font-semibold text-foreground" : "font-normal text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 flex-none rounded-[50%]", reached ? "bg-brand-line4" : "bg-disabled")}
      />
      {label}
    </span>
  );
}
