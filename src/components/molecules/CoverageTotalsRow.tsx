import { coverageGridClassName, coverageGridTemplate } from "@/components/molecules/CoverageRow";
import { cn } from "@/lib/utils";

interface CoverageTotal {
  key: string;
  splitText: string;
  ownedText: string;
}

interface CoverageTotalsRowProps {
  labelLines: readonly [string, string];
  totals: readonly CoverageTotal[];
  className?: string;
}

// Model별 학습 상태 합계 표시
export function CoverageTotalsRow({ labelLines, totals, className }: CoverageTotalsRowProps) {
  return (
    <div
      data-slot="coverage-totals-row"
      className={cn(
        coverageGridClassName,
        "mt-1.5 flex-none border-t border-border pt-3",
        className,
      )}
      style={{ gridTemplateColumns: coverageGridTemplate(totals.length) }}
    >
      <span className="pl-2 text-xs leading-4 font-bold text-muted-foreground">
        {labelLines[0]}
        <br />
        {labelLines[1]}
      </span>
      {totals.map((total) => (
        <span key={total.key} className="flex flex-col items-center gap-0.5 tabular-nums">
          <span className="text-sm font-bold">{total.splitText}</span>
          <span className="text-[0.6875rem] text-muted-foreground">{total.ownedText}</span>
        </span>
      ))}
      <span />
    </div>
  );
}
