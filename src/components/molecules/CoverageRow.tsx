import { CoverageCell, type CoverageStatus } from "@/components/atoms/CoverageCell";
import { cn } from "@/lib/utils";

export const coverageGridClassName = "grid items-center gap-x-1.5";

// 이름 Column, Model 수만큼의 Column, 보유 Column으로 격자 Column 구성
export function coverageGridTemplate(modelCount: number): string {
  // Model이 없으면 이름 Column이 남는 Width를 차지
  if (modelCount <= 0) return "minmax(9.75rem, 1fr) 3.375rem";
  return `9.75rem repeat(${modelCount}, minmax(0, 1fr)) 3.375rem`;
}

interface CoverageRowCell {
  key: string;
  status: CoverageStatus;
  segmentCount: number;
}

interface CoverageRowProps {
  name: string;
  cells: readonly CoverageRowCell[];
  ownedText: string;
  isStriped: boolean;
}

// 장치 한 Row의 Model별 학습 상태 표시
export function CoverageRow({ name, cells, ownedText, isStriped }: CoverageRowProps) {
  return (
    <div
      data-slot="coverage-row"
      className={cn(
        coverageGridClassName,
        "min-h-6 flex-[1_0_1.5rem] rounded-[0.25rem]",
        isStriped && "bg-surface-low",
      )}
      style={{ gridTemplateColumns: coverageGridTemplate(cells.length) }}
    >
      <span data-slot="coverage-row-name" className="truncate pl-2 text-sm font-bold">
        {name}
      </span>
      {cells.map((cell) => (
        <CoverageCell key={cell.key} status={cell.status} segmentCount={cell.segmentCount} />
      ))}
      <span
        data-slot="coverage-row-owned"
        className="text-right text-xs text-muted-foreground tabular-nums"
      >
        {ownedText}
      </span>
    </div>
  );
}
