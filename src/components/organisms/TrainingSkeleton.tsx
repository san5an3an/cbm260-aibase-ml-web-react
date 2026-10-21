import { kpiStatFrameClassName } from "@/components/atoms/kpiStatFrameClassName";
import { sectionCardClassName } from "@/components/atoms/sectionCardClassName";
import { ShimmerBlock } from "@/components/atoms/ShimmerBlock";
import { CardHeadingSkeleton } from "@/components/molecules/CardHeadingSkeleton";
import { FilterBar } from "@/components/molecules/FilterBar";
import {
  TRAINING_RESULT_COLUMNS,
  TRAINING_RESULT_MIN_WIDTH,
} from "@/components/organisms/TrainingResultsCard";
import { cn } from "@/lib/utils";

// 화면 읽기 프로그램에만 읽히는 Loading 안내 문구
const LOADING_TEXT = "재학습 설정 화면을 불러오는 중입니다.";
// 조건 Row의 Button Skeleton Width, 학습 Model, 장치, 학습일시, 초기화, 검색, 빈 위치, 학습 예약 순서
const FILTER_BLOCK_WIDTHS: readonly string[] = ["w-[10.625rem]", "w-[11.875rem]", "w-[20.625rem]", "w-8", "w-[5.125rem]"];
const SCHEDULE_BLOCK_WIDTH = "w-[6.9375rem]";
// KPI Card 수, 학습 이력, Model 종류, 진행 중, 최근 학습, 실패
const KPI_CARD_COUNT = 5;
// 처음 List의 학습 Job Card 수, 넘치면 Card Row 안에서 잘림
const JOB_CARD_COUNT = 6;
// 결과 Table의 Skeleton Row 수와 Row Height, 결과 Table의 Row와 같음
const RESULT_ROW_COUNT = 6;
const RESULT_ROW_HEIGHT = "h-[3.125rem]";
// 결과 Table Cell마다 Skeleton의 크기와 Cell 안 정렬 방향, 임계값은 오른쪽, 임계값 관리는 가운데 Button 위치
const RESULT_CELL_BLOCKS: readonly { block: string; cell: string }[] = [
  { block: "h-3.5 w-[8.5rem]", cell: "px-4" },
  { block: "h-3.5 w-[6.125rem]", cell: "px-4" },
  { block: "h-3.5 w-[6.25rem]", cell: "px-4" },
  { block: "h-3.5 w-11", cell: "px-4" },
  { block: "h-3.5 w-11", cell: "justify-end px-4" },
  { block: "size-8", cell: "justify-center" },
];

// 재학습 설정을 처음 불러오는 동안 조건 Row, KPI Row, 학습 Job Card, 결과 Table 위치에 빛이 지나가는 Skeleton 표시
export function TrainingSkeleton() {
  return (
    <div
      data-slot="training-skeleton"
      role="status"
      aria-busy="true"
      className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5"
    >
      <span className="sr-only">{LOADING_TEXT}</span>
      <FilterBar data-slot="training-filter-bar-skeleton">
        {FILTER_BLOCK_WIDTHS.map((width, index) => (
          <ShimmerBlock key={index} shape="line" tone="strong" className={cn("h-8", width)} />
        ))}
        <span className="flex-1" />
        <ShimmerBlock shape="line" tone="strong" className={cn("h-8", SCHEDULE_BLOCK_WIDTH)} />
      </FilterBar>
      <div data-slot="training-kpi-row-skeleton" className="grid h-28 flex-none grid-cols-5 gap-4">
        {Array.from({ length: KPI_CARD_COUNT }, (_, index) => (
          <div key={index} data-slot="training-kpi-card-skeleton" className={cn(kpiStatFrameClassName, "min-w-0")}>
            <div className="flex h-[1.375rem] items-center">
              <ShimmerBlock shape="line" className="h-4 w-24" />
            </div>
            <div className="flex h-[2.125rem] items-center">
              <ShimmerBlock shape="line" className="h-7 w-20" />
            </div>
            <div className="flex h-4 items-center">
              <ShimmerBlock shape="line" className="h-3 w-40 max-w-full" />
            </div>
          </div>
        ))}
      </div>
      <section data-slot="training-jobs-card-skeleton" className={cn(sectionCardClassName, "flex-none")}>
        <div className="flex h-10 flex-none items-start gap-3">
          <CardHeadingSkeleton eyebrowWidth="w-[5.5rem]" titleWidth="w-24" />
          <span className="flex-1" />
          <ShimmerBlock shape="line" className="mt-0.5 h-3 w-[19.125rem]" />
        </div>
        <div
          data-slot="training-job-list-skeleton"
          className="grid auto-cols-[minmax(16.25rem,1fr)] grid-flow-col gap-3 overflow-hidden"
        >
          {Array.from({ length: JOB_CARD_COUNT }, (_, index) => (
            <ShimmerBlock key={index} className="h-[6.125rem]" />
          ))}
        </div>
      </section>
      <section
        data-slot="training-results-card-skeleton"
        className={cn(sectionCardClassName, "min-h-0 flex-[1_1_0]")}
      >
        <div className="flex h-16 flex-none items-start gap-3">
          <CardHeadingSkeleton eyebrowWidth="w-[6.75rem]" titleWidth="w-24" descriptionWidth="w-[40.5rem]" />
          <span className="flex-1" />
          <div className="flex h-8 items-center gap-3">
            <ShimmerBlock shape="line" className="h-3.5 w-[2.875rem]" />
            <ShimmerBlock shape="line" className="h-8 w-[6.875rem]" />
            <ShimmerBlock shape="line" className="h-8 w-[8.75rem]" />
          </div>
        </div>
        <div
          data-slot="training-results-table-skeleton"
          className="min-h-0 flex-[0_1_auto] overflow-hidden rounded-lg border border-border"
        >
          <div style={{ minWidth: TRAINING_RESULT_MIN_WIDTH }}>
            <div className="h-11 border-b border-border bg-muted" />
            {Array.from({ length: RESULT_ROW_COUNT }, (_, row) => (
              <div
                key={row}
                data-slot="training-result-row-skeleton"
                className={cn("grid items-center border-b border-border", RESULT_ROW_HEIGHT)}
                style={{ gridTemplateColumns: TRAINING_RESULT_COLUMNS }}
              >
                {RESULT_CELL_BLOCKS.map(({ block, cell }, column) => (
                  <div key={column} className={cn("flex min-w-0", cell)}>
                    <ShimmerBlock shape="line" className={block} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <span className="flex-1" />
        <ShimmerBlock shape="line" className="mx-auto h-8 w-[20.75rem] flex-none" />
      </section>
    </div>
  );
}
