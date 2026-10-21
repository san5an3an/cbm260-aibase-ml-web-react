import { sectionCardClassName } from "@/components/atoms/sectionCardClassName";
import { ShimmerBlock } from "@/components/atoms/ShimmerBlock";
import { CardHeadingSkeleton } from "@/components/molecules/CardHeadingSkeleton";
import { FilterBar } from "@/components/molecules/FilterBar";
import { cn } from "@/lib/utils";

// 화면 읽기 프로그램에만 읽히는 Loading 안내
const LOADING_TEXT = "모델 비교 화면을 불러오는 중입니다.";
// 작업 Card 개수
const JOB_CARD_COUNT = 5;

// 모델 비교를 처음 불러오는 동안 조건 Row, 작업 Card, 판정 영역에 빛이 지나가는 Skeleton 표시
export function EnsembleSkeleton() {
  return (
    <div data-slot="ensemble-skeleton" role="status" aria-busy="true" className="flex min-h-0 flex-[1_1_0] flex-col">
      <span className="sr-only">{LOADING_TEXT}</span>
      <div className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5">
        <FilterBar data-slot="ensemble-filter-bar-skeleton">
          <ShimmerBlock shape="line" className="h-3.5 w-[33rem]" />
          <span className="flex-1" />
          <ShimmerBlock shape="line" tone="strong" className="h-8 w-[7.5rem]" />
        </FilterBar>
        <div className="flex min-h-0 flex-[1_1_0] gap-3.5">
          <section className={cn(sectionCardClassName, "min-h-0 flex-[0_0_clamp(22.5rem,24vw,27.5rem)] overflow-hidden")}>
            <CardHeadingSkeleton eyebrowWidth="w-[6.625rem]" titleWidth="w-[7.5rem]" />
            {Array.from({ length: JOB_CARD_COUNT }, (_, index) => (
              <ShimmerBlock key={index} className="h-[4.625rem] flex-none" />
            ))}
          </section>
          <section className={cn(sectionCardClassName, "min-h-0 flex-[1_1_0] overflow-hidden")}>
            <CardHeadingSkeleton eyebrowWidth="w-[6.625rem]" titleWidth="w-[13rem]" />
            <ShimmerBlock className="h-[13rem] flex-none" />
            <ShimmerBlock className="h-[11rem] flex-none" />
          </section>
        </div>
      </div>
    </div>
  );
}
