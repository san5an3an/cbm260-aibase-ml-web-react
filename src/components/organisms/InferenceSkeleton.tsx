import { sectionCardClassName } from "@/components/atoms/sectionCardClassName";
import { ShimmerBlock } from "@/components/atoms/ShimmerBlock";
import { CardHeadingSkeleton } from "@/components/molecules/CardHeadingSkeleton";
import { FilterBar } from "@/components/molecules/FilterBar";
import {
  INFERENCE_RESULT_COLUMNS,
  INFERENCE_RESULT_MIN_WIDTH,
} from "@/components/organisms/InferenceResultsCard";
import { cn } from "@/lib/utils";

// 화면 읽기 프로그램에만 읽히는 Loading 안내
const LOADING_TEXT = "추론 화면을 불러오는 중입니다.";
// 조건 Row의 Button 위치별 Width, 추론 Model, 장치, 추론 일시, 초기화, 검색, (빈 공간) 추론 실행
const FILTER_BLOCK_WIDTHS: readonly string[] = ["w-[10.625rem]", "w-[11.875rem]", "w-[20.625rem]", "w-8", "w-[5.125rem]"];
const RUN_BLOCK_WIDTH = "w-[6.9375rem]";
// 실패만 보지 않을 때 한 Row에 놓이는 작업 Card 개수
const JOB_CARD_COUNT = 4;
// 결과 Table의 Skeleton Row 개수, 넘치면 Table Frame 안에서 잘림
const RESULT_ROW_COUNT = 9;
// 결과 Table Cell별 Text Skeleton의 Width와 오른쪽 정렬 여부, 숫자 Column 3개는 오른쪽 정렬
const RESULT_CELL_BLOCKS: readonly { width: string; alignEnd: boolean }[] = [
  { width: "w-[7.5rem]", alignEnd: false },
  { width: "w-[6.875rem]", alignEnd: false },
  { width: "w-[5.625rem]", alignEnd: false },
  { width: "w-[3.75rem]", alignEnd: false },
  { width: "w-[4.375rem]", alignEnd: true },
  { width: "w-[3.125rem]", alignEnd: true },
  { width: "w-[3.75rem]", alignEnd: true },
];

// 추론 화면을 처음 불러오는 동안 조건 Row, 추론 작업 Card, 결과 Table 위치에 빛이 지나가는 Skeleton 표시
export function InferenceSkeleton() {
  return (
    <div
      data-slot="inference-skeleton"
      role="status"
      aria-busy="true"
      className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5"
    >
      <span className="sr-only">{LOADING_TEXT}</span>
      <FilterBar data-slot="inference-filter-bar-skeleton">
        {FILTER_BLOCK_WIDTHS.map((width, index) => (
          <ShimmerBlock key={index} shape="line" tone="strong" className={cn("h-8", width)} />
        ))}
        <span className="flex-1" />
        <ShimmerBlock shape="line" tone="strong" className={cn("h-8", RUN_BLOCK_WIDTH)} />
      </FilterBar>
      <section data-slot="inference-jobs-card-skeleton" className={cn(sectionCardClassName, "flex-none")}>
        <div className="flex h-10 flex-none items-start gap-3">
          <CardHeadingSkeleton eyebrowWidth="w-[6.625rem]" titleWidth="w-[7.5rem]" />
          <span className="flex-1" />
          <ShimmerBlock shape="line" className="mt-0.5 h-3 w-[5.875rem]" />
          <ShimmerBlock shape="line" className="h-6 w-[7.5rem]" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: JOB_CARD_COUNT }, (_, index) => (
            <ShimmerBlock key={index} className="h-[4.75rem]" />
          ))}
        </div>
      </section>
      <section
        data-slot="inference-results-card-skeleton"
        className={cn(sectionCardClassName, "min-h-0 flex-[1_1_0]")}
      >
        <div className="flex h-16 flex-none items-start gap-3">
          <CardHeadingSkeleton eyebrowWidth="w-[6.625rem]" titleWidth="w-[7.5rem]" descriptionWidth="w-[26.375rem]" />
          <span className="flex-1" />
          <ShimmerBlock shape="line" className="mt-2.5 h-3.5 w-12" />
          <ShimmerBlock shape="line" className="h-8 w-[8.75rem]" />
        </div>
        <div className="min-h-0 flex-[0_1_auto] overflow-hidden rounded-lg border border-border">
          <div style={{ minWidth: INFERENCE_RESULT_MIN_WIDTH }}>
            <div className="h-11 border-b border-border bg-muted" />
            {Array.from({ length: RESULT_ROW_COUNT }, (_, row) => (
              <div
                key={row}
                className="grid h-12 items-center border-b border-border"
                style={{ gridTemplateColumns: INFERENCE_RESULT_COLUMNS }}
              >
                {RESULT_CELL_BLOCKS.map(({ width, alignEnd }, column) => (
                  <div key={column} className={cn("flex min-w-0 px-4", alignEnd && "justify-end")}>
                    <ShimmerBlock shape="line" className={cn("h-3.5", width)} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <span className="flex-1" />
        <ShimmerBlock shape="line" className="mx-auto h-8 w-[19rem] flex-none" />
      </section>
    </div>
  );
}
