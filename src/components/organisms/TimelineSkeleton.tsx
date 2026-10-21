import { sectionCardClassName } from "@/components/atoms/sectionCardClassName";
import { ShimmerBlock } from "@/components/atoms/ShimmerBlock";
import { CardHeadingSkeleton } from "@/components/molecules/CardHeadingSkeleton";
import { FilterBar } from "@/components/molecules/FilterBar";
import { DAILY_TREND_CARD_SIZE_CLASS_NAME } from "@/components/organisms/DailyAnomalyTrendCard";
import {
  DAILY_DETAIL_COLUMNS,
  DAILY_DETAIL_MIN_WIDTH,
} from "@/components/organisms/DailyDetailCard";
import { cn } from "@/lib/utils";

// 화면 읽기 프로그램에만 읽히는 Loading 안내 문구
const LOADING_TEXT = "이상 타임라인 화면을 불러오는 중입니다.";
// 조건 Row의 Button Skeleton Width, 장치, Model, 기간, 초기화, 조회 순서
const FILTER_BLOCK_WIDTHS: readonly string[] = ["w-[12.5rem]", "w-40", "w-[9.375rem]", "w-8", "w-[5.125rem]"];
// 추이 Card 범례(주의, 경고, 위험)의 Skeleton 개수
const LEGEND_ITEM_COUNT = 3;
// 일자별 상세 Table의 Skeleton Row 수, 한 Page에 표시할 Row 수
const DETAIL_ROW_COUNT = 5;
// 일자별 상세 Table Cell마다 Text Skeleton의 Width와 오른쪽 정렬 여부, 숫자 Column 4개는 오른쪽 정렬
const DETAIL_CELL_BLOCKS: readonly { width: string; alignEnd: boolean }[] = [
  { width: "w-[4.75rem]", alignEnd: false },
  { width: "w-8", alignEnd: true },
  { width: "w-8", alignEnd: true },
  { width: "w-12", alignEnd: true },
  { width: "w-12", alignEnd: true },
];

// 이상 타임라인 화면을 처음 불러오는 동안 조건 Row, 일별 이상 추이, 일자별 상세 위치에 빛이 지나가는 Skeleton 표시
export function TimelineSkeleton() {
  return (
    <div
      data-slot="timeline-skeleton"
      role="status"
      aria-busy="true"
      className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5"
    >
      <span className="sr-only">{LOADING_TEXT}</span>
      <FilterBar data-slot="timeline-filter-bar-skeleton">
        {FILTER_BLOCK_WIDTHS.map((width, index) => (
          <ShimmerBlock key={index} shape="line" tone="strong" className={cn("h-8", width)} />
        ))}
      </FilterBar>
      <section
        data-slot="daily-anomaly-trend-card-skeleton"
        className={cn(sectionCardClassName, DAILY_TREND_CARD_SIZE_CLASS_NAME)}
      >
        <div className="flex h-16 flex-none items-start gap-3">
          <CardHeadingSkeleton eyebrowWidth="w-[4.625rem]" titleWidth="w-24" descriptionWidth="w-[37.25rem]" />
          <span className="flex-1" />
          <div className="flex gap-3.5">
            {Array.from({ length: LEGEND_ITEM_COUNT }, (_, index) => (
              <ShimmerBlock key={index} shape="line" className="mt-0.5 h-3 w-9" />
            ))}
          </div>
        </div>
        <ShimmerBlock className="min-h-0 flex-1" />
      </section>
      <section
        data-slot="daily-detail-card-skeleton"
        className={cn(sectionCardClassName, "min-h-0 flex-[1_1_0]")}
      >
        <div className="flex h-10 flex-none items-start gap-3">
          <CardHeadingSkeleton eyebrowWidth="w-[4.75rem]" titleWidth="w-[4.875rem]" />
          <span className="flex-1" />
          <ShimmerBlock shape="line" className="mt-0.5 h-3.5 w-[3.625rem]" />
        </div>
        <div className="min-h-0 flex-[0_1_auto] overflow-hidden rounded-lg border border-border">
          <div style={{ minWidth: DAILY_DETAIL_MIN_WIDTH }}>
            <div className="h-11 border-b border-border bg-muted" />
            {Array.from({ length: DETAIL_ROW_COUNT }, (_, row) => (
              <div
                key={row}
                className="grid h-[3.25rem] items-center border-b border-border"
                style={{ gridTemplateColumns: DAILY_DETAIL_COLUMNS }}
              >
                {DETAIL_CELL_BLOCKS.map(({ width, alignEnd }, column) => (
                  <div key={column} className={cn("flex min-w-0 px-4", alignEnd && "justify-end")}>
                    <ShimmerBlock shape="line" className={cn("h-3.5", width)} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <span className="flex-1" />
        <ShimmerBlock shape="line" className="mx-auto h-8 w-[23.125rem] flex-none" />
      </section>
    </div>
  );
}
