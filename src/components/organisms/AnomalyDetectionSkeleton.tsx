import { sectionCardClassName } from "@/components/atoms/sectionCardClassName";
import { ShimmerBlock } from "@/components/atoms/ShimmerBlock";
import { CardHeadingSkeleton } from "@/components/molecules/CardHeadingSkeleton";
import { FilterBar } from "@/components/molecules/FilterBar";
import { cn } from "@/lib/utils";

// 화면 읽기 프로그램에만 읽히는 Loading 안내
const LOADING_TEXT = "이상 감지 내역 화면을 불러오는 중입니다.";
// 조건 Row의 영역 Width, 편성, 기간, 최근 N일
const FILTER_BLOCK_WIDTHS: readonly string[] = ["w-40", "w-[17.5rem]", "w-[11.25rem]"];
// 격자 Row의 Skeleton 수
const HEATMAP_ROW_COUNT = 3;

// 이상 감지 내역 Page를 처음 불러오는 동안 조건 Row, 장치별 이상 현황, 상세 위치에 빛이 지나가는 Skeleton 표시
export function AnomalyDetectionSkeleton() {
  return (
    <div
      data-slot="anomaly-detection-skeleton"
      role="status"
      aria-busy="true"
      className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5"
    >
      <span className="sr-only">{LOADING_TEXT}</span>
      <FilterBar>
        {FILTER_BLOCK_WIDTHS.map((width) => (
          <ShimmerBlock key={width} shape="line" tone="strong" className={cn("h-8", width)} />
        ))}
      </FilterBar>
      <div className={cn(sectionCardClassName, "flex-none")}>
        <CardHeadingSkeleton eyebrowWidth="w-28" titleWidth="w-32" descriptionWidth="w-80" />
        {Array.from({ length: HEATMAP_ROW_COUNT }, (_, index) => (
          <ShimmerBlock key={index} className="h-[2.375rem] w-full" />
        ))}
      </div>
      <div className={cn(sectionCardClassName, "min-h-60 flex-[1_1_0]")}>
        <CardHeadingSkeleton eyebrowWidth="w-28" titleWidth="w-32" />
        <ShimmerBlock className="h-[3.25rem] w-full" />
        <ShimmerBlock className="min-h-0 w-full flex-[1_1_0]" />
      </div>
    </div>
  );
}
