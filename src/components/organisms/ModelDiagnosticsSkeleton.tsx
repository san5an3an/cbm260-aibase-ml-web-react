import { sectionCardClassName } from "@/components/atoms/sectionCardClassName";
import { ShimmerBlock } from "@/components/atoms/ShimmerBlock";
import { CardHeadingSkeleton } from "@/components/molecules/CardHeadingSkeleton";
import { FilterBar } from "@/components/molecules/FilterBar";
import { DIAGNOSTICS_FILTER_WIDTHS } from "@/components/organisms/DiagnosticsFilterBar";
import { LEARNING_HEALTH_CARD_SIZE_CLASS_NAME } from "@/components/organisms/LearningHealthCard";
import { VAE_ROOT_CAUSE_CARD_SIZE_CLASS_NAME } from "@/components/organisms/VaeRootCauseCard";
import { cn } from "@/lib/utils";

// 화면 읽기 프로그램에만 읽히는 Loading 안내
const LOADING_TEXT = "모델 진단 화면을 불러오는 중입니다.";

// 모델 진단 화면을 처음 불러오는 동안 조건 Row와 Card 3개 위치에 빛이 지나가는 Skeleton 표시
export function ModelDiagnosticsSkeleton() {
  return (
    <div
      data-slot="model-diagnostics-skeleton"
      role="status"
      aria-busy="true"
      className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5"
    >
      <span className="sr-only">{LOADING_TEXT}</span>
      <FilterBar data-slot="diagnostics-filter-bar-skeleton">
        {DIAGNOSTICS_FILTER_WIDTHS.map((width, index) => (
          <ShimmerBlock key={index} shape="line" tone="strong" className={cn("h-8", width)} />
        ))}
      </FilterBar>
      <div className="flex min-h-0 flex-[1_1_0] gap-3.5">
        <div className="flex min-h-0 min-w-0 flex-[1_1_0] flex-col gap-3.5">
          <section className={cn(sectionCardClassName, LEARNING_HEALTH_CARD_SIZE_CLASS_NAME)}>
            <CardHeadingSkeleton eyebrowWidth="w-[6.25rem]" titleWidth="w-28" descriptionWidth="w-80" />
            <ShimmerBlock className="min-h-0 flex-1" />
          </section>
          <section className={cn(sectionCardClassName, "min-h-0 flex-[1_1_0]")}>
            <CardHeadingSkeleton eyebrowWidth="w-28" titleWidth="w-28" descriptionWidth="w-96" />
            <ShimmerBlock className="min-h-0 flex-1" />
          </section>
        </div>
        <section className={cn(sectionCardClassName, VAE_ROOT_CAUSE_CARD_SIZE_CLASS_NAME)}>
          <CardHeadingSkeleton eyebrowWidth="w-[4.75rem]" titleWidth="w-36" descriptionWidth="w-72" />
          <ShimmerBlock className="min-h-0 flex-1" />
        </section>
      </div>
    </div>
  );
}
