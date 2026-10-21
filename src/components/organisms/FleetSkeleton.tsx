import { kpiFlipCardClassName } from "@/components/atoms/kpiFlipCardClassName";
import { sectionCardClassName } from "@/components/atoms/sectionCardClassName";
import { ShimmerBlock, type ShimmerBlockTone } from "@/components/atoms/ShimmerBlock";
import { CardHeadingSkeleton } from "@/components/molecules/CardHeadingSkeleton";
import { coverageGridClassName, coverageGridTemplate } from "@/components/molecules/CoverageRow";
import {
  ANOMALY_HISTORY_COLUMNS,
  ANOMALY_HISTORY_MIN_WIDTH,
} from "@/components/organisms/AnomalyHistoryCard";
import {
  RISK_RANKING_COLUMNS,
  RISK_RANKING_MIN_WIDTH,
} from "@/components/organisms/RiskRankingCard";
import { cn } from "@/lib/utils";

// 화면 읽기 프로그램에만 읽히는 Loading 안내
const LOADING_TEXT = "플릿 개요 화면을 불러오는 중입니다.";
// KPI Card 개수, 총 추론 건수, 커버 장치와 Segment, 평균 이상비율, 경보, 최근 추론
const KPI_CARD_COUNT = 5;
// 위험 장치 랭킹과 이상 감지 내역 Table의 Skeleton Row 개수, 넘치면 Table Frame 안에서 잘림
const RISK_ROW_COUNT = 10;
const HISTORY_ROW_COUNT = 7;
// Model 커버리지의 Model Column 개수와 장치 Row 개수
const COVERAGE_MODEL_COUNT = 4;
const COVERAGE_ROW_COUNT = 21;
// Model 커버리지 범례 4개의 Width, 운영, 스테이징, 미학습, 점 개수, 좁으면 실제 범례처럼 다음 Row로 넘어감
const LEGEND_BLOCK_WIDTHS: readonly string[] = ["w-[3.625rem]", "w-20", "w-[7.25rem]", "w-36"];

// Table Cell 하나의 내부 Skeleton과 Text Skeleton(Height, Width), 오른쪽 정렬 Cell은 alignEnd
interface TableCellBlocks {
  padding: string;
  blocks: readonly string[];
  alignEnd?: boolean;
}

// 위험 장치 랭킹의 Cell 구성, 상태, 장치, Segment, 이상비율, 이상 / 전체(오른쪽 정렬), 최근 추론
const RISK_CELLS: readonly TableCellBlocks[] = [
  { padding: "px-4", blocks: ["h-3.5 w-16"] },
  { padding: "px-4", blocks: ["h-3.5 w-[7.5rem]"] },
  { padding: "px-4", blocks: ["h-3.5 w-11"] },
  { padding: "px-4", blocks: ["h-3.5 w-[8.75rem]"] },
  { padding: "px-4", blocks: ["h-3.5 w-[3.25rem]"], alignEnd: true },
  { padding: "px-4", blocks: ["h-3.5 w-32"] },
];

// 이상 감지 내역의 Cell 구성, 번호, 편성, 호차, 위치, Model Badge 둘, 날짜별 Bar
const HISTORY_CELLS: readonly TableCellBlocks[] = [
  { padding: "px-4", blocks: ["h-3.5 w-2.5"] },
  { padding: "px-3", blocks: ["h-3.5 w-[4.25rem]"] },
  { padding: "px-3", blocks: ["h-3.5 w-[5.875rem]"] },
  { padding: "px-3", blocks: ["h-5 w-[4.125rem]", "h-5 w-[4.125rem]"] },
  { padding: "px-3", blocks: ["h-3.5 w-[8.875rem]"] },
];

interface TableBlocksProps {
  columns: string;
  minWidth: string;
  rowCount: number;
  rowHeight: string;
  cells: readonly TableCellBlocks[];
}

// 머리글 Row와 데이터 Row의 Skeleton으로 Table Frame 표시, 실제 Table과 같은 Column과 Row Height 사용
function TableBlocks({ columns, minWidth, rowCount, rowHeight, cells }: TableBlocksProps) {
  return (
    <div
      data-slot="data-table-skeleton"
      className="min-h-0 flex-[0_1_auto] overflow-hidden rounded-lg border border-border"
    >
      <div style={{ minWidth }}>
        <div className="h-11 border-b border-border bg-muted" />
        {Array.from({ length: rowCount }, (_, row) => (
          <div
            key={row}
            data-slot="table-row-skeleton"
            className={cn("grid items-center border-b border-border", rowHeight)}
            style={{ gridTemplateColumns: columns }}
          >
            {cells.map(({ padding, blocks, alignEnd }, column) => (
              <div
                key={column}
                className={cn("flex min-w-0 items-center gap-1.5", padding, alignEnd && "justify-end")}
              >
                {blocks.map((block, index) => (
                  <ShimmerBlock key={index} shape="line" className={cn("flex-none", block)} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// 플릿 개요를 처음 불러오는 동안 KPI Column, 위험 장치 랭킹, 이상 감지 내역, Model 커버리지 위치에 빛이 지나가는 Skeleton 표시
export function FleetSkeleton() {
  const coverageColumns = coverageGridTemplate(COVERAGE_MODEL_COUNT);
  return (
    <div
      data-slot="fleet-skeleton"
      role="status"
      aria-busy="true"
      className="flex min-h-0 flex-[1_1_0] gap-3.5"
    >
      <span className="sr-only">{LOADING_TEXT}</span>
      <div
        data-slot="fleet-kpi-column-skeleton"
        className="flex min-h-0 flex-[0_0_clamp(14.5rem,15vw,18rem)] flex-col gap-3.5 overflow-hidden"
      >
        {Array.from({ length: KPI_CARD_COUNT }, (_, index) => (
          <div key={index} data-slot="kpi-flip-card-skeleton" className={kpiFlipCardClassName}>
            <div className="flex h-[1.125rem] items-center">
              <ShimmerBlock shape="line" className="h-4 w-[7.5rem]" />
            </div>
            <ShimmerBlock className="h-[4.3125rem] w-[11.5rem] max-w-full" />
            <div className="flex h-4 items-center">
              <ShimmerBlock shape="line" className="h-3 w-[12.5rem] max-w-full" />
            </div>
          </div>
        ))}
      </div>
      <div
        data-slot="fleet-overview-center-skeleton"
        className="flex min-h-0 min-w-[37.5rem] flex-[1_1_0] flex-col gap-2.5"
      >
        <section
          data-slot="risk-ranking-card-skeleton"
          className={cn(sectionCardClassName, "min-h-0 flex-[0_1_auto]")}
        >
          <div className="flex h-10 flex-none items-start gap-3">
            <CardHeadingSkeleton eyebrowWidth="w-20" titleWidth="w-64" />
            <span className="flex-1" />
            <ShimmerBlock shape="line" className="mt-0.5 h-3 w-[14.4375rem]" />
          </div>
          <TableBlocks
            columns={RISK_RANKING_COLUMNS}
            minWidth={RISK_RANKING_MIN_WIDTH}
            rowCount={RISK_ROW_COUNT}
            rowHeight="h-9"
            cells={RISK_CELLS}
          />
        </section>
        <section
          data-slot="anomaly-history-card-skeleton"
          className={cn(sectionCardClassName, "min-h-60 flex-[1_1_0]")}
        >
          <div className="flex h-10 flex-none items-start gap-3">
            <CardHeadingSkeleton eyebrowWidth="w-[6.75rem]" titleWidth="w-24" />
            <span className="flex-1" />
            <ShimmerBlock shape="line" className="h-8 w-40" />
            <ShimmerBlock shape="line" className="h-8 w-[8.125rem]" />
          </div>
          <div className="flex min-h-0 flex-[1_1_0] flex-col gap-2.5">
            <TableBlocks
              columns={ANOMALY_HISTORY_COLUMNS}
              minWidth={ANOMALY_HISTORY_MIN_WIDTH}
              rowCount={HISTORY_ROW_COUNT}
              rowHeight="h-[2.375rem]"
              cells={HISTORY_CELLS}
            />
            <div className="flex flex-none flex-col">
              <div className="flex h-[1.125rem] items-center">
                <ShimmerBlock shape="line" className="h-3 w-[31.25rem] max-w-full" />
              </div>
              <div className="flex h-[1.125rem] items-center">
                <ShimmerBlock shape="line" className="h-3 w-[21.875rem] max-w-full" />
              </div>
            </div>
          </div>
        </section>
      </div>
      <section
        data-slot="model-coverage-card-skeleton"
        className={cn(sectionCardClassName, "min-h-0 flex-[0_0_clamp(30rem,33vw,40rem)]")}
      >
        <div className="flex h-16 flex-none items-start gap-3">
          <CardHeadingSkeleton
            eyebrowWidth="w-[6.5rem]"
            titleWidth="w-[9.75rem]"
            descriptionWidth="w-[21.75rem]"
          />
        </div>
        <div className="flex min-h-0 flex-[1_1_0] flex-col">
          <div className="mb-1.5 flex flex-none flex-wrap items-center gap-4">
            {LEGEND_BLOCK_WIDTHS.map((width, index) => (
              <div key={index} className="flex h-[1.125rem] items-center">
                <ShimmerBlock shape="line" className={cn("h-3.5", width)} />
              </div>
            ))}
          </div>
          <div
            className={cn(coverageGridClassName, "h-[1.875rem] flex-none")}
            style={{ gridTemplateColumns: coverageColumns }}
          >
            <ShimmerBlock shape="line" className="ml-2 h-3 w-10" />
            {Array.from({ length: COVERAGE_MODEL_COUNT }, (_, index) => (
              <ShimmerBlock key={index} shape="line" className="mx-auto h-3 w-6" />
            ))}
            <ShimmerBlock shape="line" className="ml-auto h-3 w-6" />
          </div>
          <div
            data-slot="model-coverage-rows-skeleton"
            className="flex min-h-0 flex-[1_1_0] flex-col overflow-hidden"
          >
            {Array.from({ length: COVERAGE_ROW_COUNT }, (_, row) => {
              // 실제 Row처럼 한 Row 걸러 옅은 회색 배경, 그 위 Skeleton은 진한 Color
              const isStriped = row % 2 === 1;
              const tone: ShimmerBlockTone = isStriped ? "strong" : "default";
              return (
                <div
                  key={row}
                  data-slot="coverage-row-skeleton"
                  className={cn(
                    coverageGridClassName,
                    "min-h-6 flex-[1_0_1.5rem] rounded-[0.25rem]",
                    isStriped && "bg-surface-low",
                  )}
                  style={{ gridTemplateColumns: coverageColumns }}
                >
                  <ShimmerBlock shape="line" tone={tone} className="ml-2 h-3.5 w-[7.5rem]" />
                  {Array.from({ length: COVERAGE_MODEL_COUNT }, (_, index) => (
                    <ShimmerBlock
                      key={index}
                      shape="line"
                      tone={tone}
                      className="h-[calc(100%-0.375rem)] max-h-[1.5625rem] min-h-[1.125rem]"
                    />
                  ))}
                  <ShimmerBlock shape="line" tone={tone} className="ml-auto h-3 w-6" />
                </div>
              );
            })}
          </div>
          <div
            data-slot="coverage-totals-row-skeleton"
            className={cn(coverageGridClassName, "mt-1.5 flex-none border-t border-border pt-3")}
            style={{ gridTemplateColumns: coverageColumns }}
          >
            <div className="flex flex-col gap-1.5 pl-2">
              <ShimmerBlock shape="line" className="h-3 w-[4.5rem]" />
              <ShimmerBlock shape="line" className="h-3 w-[5.5rem]" />
            </div>
            {Array.from({ length: COVERAGE_MODEL_COUNT }, (_, index) => (
              <div
                key={index}
                className="flex h-[2.40625rem] flex-col items-center justify-center gap-1.5"
              >
                <ShimmerBlock shape="line" className="h-3.5 w-10" />
                <ShimmerBlock shape="line" className="h-2.5 w-7" />
              </div>
            ))}
            <span />
          </div>
        </div>
      </section>
    </div>
  );
}
