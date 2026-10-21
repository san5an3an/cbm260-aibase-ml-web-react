import { kpiStatFrameClassName } from "@/components/atoms/kpiStatFrameClassName";
import { sectionCardClassName } from "@/components/atoms/sectionCardClassName";
import { ShimmerBlock } from "@/components/atoms/ShimmerBlock";
import { CardHeadingSkeleton } from "@/components/molecules/CardHeadingSkeleton";
import { FilterBar } from "@/components/molecules/FilterBar";
import {
  MEASURE_WORKLIST_COLUMNS,
  MEASURE_WORKLIST_MIN_WIDTH,
} from "@/components/organisms/MeasureWorklistCard";
import { SENSOR_FREQUENCY_COLUMNS } from "@/components/organisms/SensorFrequencyRankingCard";
import { cn } from "@/lib/utils";

// 화면 읽기 프로그램에만 읽히는 Loading 안내
const LOADING_TEXT = "조치 관리 화면을 불러오는 중입니다.";
// 조건 Row의 Button 위치별 Width, 장치, 조치 여부, 검수 여부, 발생 기간, 초기화, 검색, (빈 공간) 조치 전후 비교, CSV 내보내기
const FILTER_BLOCK_WIDTHS: readonly string[] = ["w-[11.25rem]", "w-[9.375rem]", "w-[9.375rem]", "w-[16.25rem]", "w-8", "w-[5.125rem]"];
const FILTER_END_BLOCK_WIDTHS: readonly string[] = ["w-[7.625rem]", "w-[8.75rem]"];
// KPI Card 개수, 총 조치대상, 미조치, 조치완료, 미검수
const KPI_CARD_COUNT = 4;
// 워크List와 순위 Table의 Skeleton Row 개수, 실제 화면의 Row 수와 같고 넘치면 Table Frame 안에서 잘림
const WORKLIST_ROW_COUNT = 9;
const RANKING_ROW_COUNT = 10;

// Table Cell 하나의 배치 방법과 그 안의 Text Skeleton별 Height와 Width(두 줄 Cell은 둘)
interface CellSkeleton {
  className: string;
  blocks: readonly string[];
}

// 워크List Cell별 Text Skeleton, 선택, 발생시각, 장치 / 센서, 진단, 편성 / 호차, 조치, 조치일, 검수, 처리
const WORKLIST_CELLS: readonly CellSkeleton[] = [
  { className: "justify-center px-0", blocks: ["size-4"] },
  { className: "flex-col gap-1 px-2", blocks: ["h-3.5 w-10", "h-3 w-8"] },
  { className: "flex-col gap-1 px-4", blocks: ["h-3.5 w-[6.25rem]", "h-3 w-[5rem]"] },
  { className: "flex-col gap-1 px-4", blocks: ["h-3.5 w-[9.5rem]", "h-3 w-[4.375rem]"] },
  { className: "px-4", blocks: ["h-3.5 w-[4.375rem]"] },
  { className: "justify-center px-0", blocks: ["h-6 w-[2.625rem]"] },
  { className: "px-3", blocks: ["h-3.5 w-9"] },
  { className: "justify-center px-0", blocks: ["h-6 w-[2.625rem]"] },
  { className: "justify-center px-0", blocks: ["h-[1.875rem] w-[3.25rem]"] },
];

// 순위 Table Cell별 Text Skeleton, 순위, 센서 / 장치, 발생 횟수(Bar와 수), 미조치, 최근 발생
const RANKING_CELLS: readonly CellSkeleton[] = [
  { className: "justify-center px-4", blocks: ["h-3.5 w-4"] },
  { className: "flex-col gap-1 px-4", blocks: ["h-3.5 w-[6.25rem]", "h-3 w-[5.625rem]"] },
  { className: "items-center gap-2 px-4", blocks: ["h-2 w-[6.5rem]", "h-3.5 w-5"] },
  { className: "justify-end px-4", blocks: ["h-3.5 w-5"] },
  { className: "px-4", blocks: ["h-3.5 w-10"] },
];

// 머리글 Row 배경과 Row마다 같은 Text Skeleton을 놓은 Table Frame 표시
function TableSkeleton({
  slot,
  columns,
  minWidth,
  rowCount,
  rowClassName,
  cells,
}: {
  slot: string;
  columns: string;
  minWidth: string;
  rowCount: number;
  rowClassName: string;
  cells: readonly CellSkeleton[];
}) {
  return (
    <div
      data-slot={slot}
      className="min-h-0 flex-[0_1_auto] overflow-hidden rounded-lg border border-border"
    >
      <div style={{ minWidth }}>
        <div className="h-11 border-b border-border bg-muted" />
        {Array.from({ length: rowCount }, (_, row) => (
          <div
            key={row}
            className={cn("grid items-center border-b border-border", rowClassName)}
            style={{ gridTemplateColumns: columns }}
          >
            {cells.map((cell, column) => (
              <div key={column} className={cn("flex min-w-0", cell.className)}>
                {cell.blocks.map((block, index) => (
                  <ShimmerBlock key={index} shape="line" className={block} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// 조치 관리 화면을 처음 불러오는 동안 조건 Row, KPI Row, 워크List, 센서 순위 위치에 빛이 지나가는 Skeleton 표시
export function MeasuresSkeleton() {
  return (
    <div
      data-slot="measures-skeleton"
      role="status"
      aria-busy="true"
      className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5"
    >
      <span className="sr-only">{LOADING_TEXT}</span>
      <FilterBar data-slot="measures-filter-bar-skeleton">
        {FILTER_BLOCK_WIDTHS.map((width, index) => (
          <ShimmerBlock key={index} shape="line" tone="strong" className={cn("h-8", width)} />
        ))}
        <span className="flex-1" />
        {FILTER_END_BLOCK_WIDTHS.map((width, index) => (
          <ShimmerBlock key={index} shape="line" tone="strong" className={cn("h-8", width)} />
        ))}
      </FilterBar>
      <div
        data-slot="measures-kpi-row-skeleton"
        className="grid h-28 flex-none gap-4"
        style={{ gridTemplateColumns: `repeat(${KPI_CARD_COUNT}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: KPI_CARD_COUNT }, (_, index) => (
          <div key={index} data-slot="measures-kpi-skeleton" className={kpiStatFrameClassName}>
            <div className="flex h-[1.375rem] items-center">
              <ShimmerBlock shape="line" className="h-4 w-[5.5rem]" />
            </div>
            <div className="flex h-[2.125rem] items-center">
              <ShimmerBlock shape="line" className="h-[1.875rem] w-[4.5rem]" />
            </div>
            <div className="flex h-4 items-center">
              <ShimmerBlock shape="line" className="h-3 w-[8.75rem]" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-[1_1_0] gap-3.5">
        <section
          data-slot="measures-worklist-card-skeleton"
          className={cn(sectionCardClassName, "min-h-0 min-w-0 flex-[1_1_0]")}
        >
          <div className="flex h-10 flex-none items-start gap-3">
            <CardHeadingSkeleton eyebrowWidth="w-[6.625rem]" titleWidth="w-[10.875rem]" />
          </div>
          <TableSkeleton
            slot="measures-worklist-table-skeleton"
            columns={MEASURE_WORKLIST_COLUMNS}
            minWidth={MEASURE_WORKLIST_MIN_WIDTH}
            rowCount={WORKLIST_ROW_COUNT}
            rowClassName="h-[3.625rem]"
            cells={WORKLIST_CELLS}
          />
          <span className="flex-1" />
          <ShimmerBlock shape="line" className="mx-auto h-8 w-[20.75rem] flex-none" />
        </section>
        <section
          data-slot="measures-ranking-card-skeleton"
          className={cn(sectionCardClassName, "min-h-0 min-w-0 flex-[0_0_clamp(27.5rem,33vw,40rem)]")}
        >
          <div className="flex h-16 flex-none items-start gap-3">
            <CardHeadingSkeleton eyebrowWidth="w-[6.625rem]" titleWidth="w-[7.5rem]" descriptionWidth="w-[17.5rem]" />
          </div>
          <TableSkeleton
            slot="measures-ranking-table-skeleton"
            columns={SENSOR_FREQUENCY_COLUMNS}
            minWidth="0"
            rowCount={RANKING_ROW_COUNT}
            rowClassName="h-[3.125rem]"
            cells={RANKING_CELLS}
          />
        </section>
      </div>
    </div>
  );
}
