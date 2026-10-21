import { cn } from "@/lib/utils";

export type CoverageStatus = "production" | "staging" | "none";

interface CoverageCellProps {
  status: CoverageStatus;
  segmentCount: number;
}

// 장치와 Model 조합 한 Cell의 학습 상태 표시, 점 개수는 Segment 수
export function CoverageCell({ status, segmentCount }: CoverageCellProps) {
  return (
    <span
      data-slot="coverage-cell"
      data-status={status}
      className={cn(
        "flex h-[calc(100%-0.375rem)] max-h-[1.5625rem] min-h-[1.125rem] items-center justify-center gap-1 rounded-[0.25rem] border text-xs text-disabled",
        status === "production" && "border-transparent bg-brand-line4-subtle",
        status === "staging" && "border-dashed border-brand-line4",
        status === "none" && "border-transparent",
      )}
    >
      {status === "none"
        ? "—"
        : Array.from({ length: segmentCount }, (_, index) => (
            <span
              key={index}
              className={cn(
                "box-border size-[0.5625rem] rounded-full",
                status === "production"
                  ? "bg-brand-line4"
                  : "border-[0.09375rem] border-brand-line4",
              )}
            />
          ))}
    </span>
  );
}
