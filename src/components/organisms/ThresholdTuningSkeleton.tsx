import { kpiStatFrameClassName } from "@/components/atoms/kpiStatFrameClassName";
import { sectionCardClassName } from "@/components/atoms/sectionCardClassName";
import { ShimmerBlock } from "@/components/atoms/ShimmerBlock";
import { CardHeadingSkeleton } from "@/components/molecules/CardHeadingSkeleton";
import { FilterBar } from "@/components/molecules/FilterBar";
import { cn } from "@/lib/utils";

// 조건 Row의 Skeleton Width, 장치, Model, Segment, 불러오기 Button 순서
const FILTER_WIDTHS = ["w-[11.875rem]", "w-[7.5rem]", "w-[13.75rem]", "w-[6.5rem]"] as const;
const KPI_COUNT = 6;

// 임계값 튜닝을 처음 불러오는 동안 화면 배치와 같은 Skeleton 표시
export function ThresholdTuningSkeleton() {
  return (
    <div
      data-slot="threshold-tuning-skeleton"
      role="status"
      aria-busy="true"
      aria-label="임계 튜닝 불러오는 중"
      className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5"
    >
      <FilterBar>
        {FILTER_WIDTHS.map((width) => (
          <ShimmerBlock key={width} shape="line" tone="strong" className={cn("h-8", width)} />
        ))}
      </FilterBar>
      <div className="grid h-28 flex-none grid-cols-6 gap-3.5">
        {Array.from({ length: KPI_COUNT }, (_, index) => (
          <div key={index} className={cn(kpiStatFrameClassName, "min-w-0 border-l-border")}>
            <ShimmerBlock shape="line" className="h-4 w-24" />
            <ShimmerBlock shape="line" className="h-7 w-20" />
            <ShimmerBlock shape="line" className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className={cn(sectionCardClassName, "min-h-0 flex-[1_1_0]")}>
        <CardHeadingSkeleton eyebrowWidth="w-32" titleWidth="w-24" descriptionWidth="w-[28rem]" />
        <ShimmerBlock className="min-h-0 flex-1" />
        <ShimmerBlock shape="line" className="h-7 w-full flex-none" />
        <ShimmerBlock shape="line" className="h-8 w-full flex-none" />
      </div>
    </div>
  );
}
