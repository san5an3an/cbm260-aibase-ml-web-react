import { sectionCardClassName } from "@/components/atoms/sectionCardClassName";
import { ShimmerBlock } from "@/components/atoms/ShimmerBlock";
import { CardHeadingSkeleton } from "@/components/molecules/CardHeadingSkeleton";
import { FilterBar } from "@/components/molecules/FilterBar";
import {
  MODEL_CONFIG_COLUMNS,
  MODEL_CONFIG_MIN_WIDTH,
} from "@/components/organisms/ModelConfigListCard";
import { modelConfigListTexts } from "@/components/organisms/modelConfigListTexts";
import { cn } from "@/lib/utils";

// 조건 Row의 Button 위치별 Width, 장치, Model, 사용 여부, 초기화, 검색, (빈 공간) 새 설정
const FILTER_BLOCK_WIDTHS: readonly string[] = ["w-[11.875rem]", "w-[9.375rem]", "w-[10.625rem]", "w-8", "w-[5.125rem]"];
const NEW_BLOCK_WIDTH = "w-[6.375rem]";
// Table의 Skeleton Row 개수, 넘치면 Table Frame 안에서 잘림
const ROW_COUNT = 10;
// Table의 Cell 개수, 머리글 개수와 같음
const CELL_COUNT = 9;

// 모델 커스텀 화면을 처음 불러오는 동안 조건 Row와 Table 위치에 빛이 지나가는 Skeleton 표시
export function ModelConfigSkeleton() {
  return (
    <div
      data-slot="model-config-skeleton"
      role="status"
      aria-busy="true"
      className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5"
    >
      <span className="sr-only">{modelConfigListTexts.loading}</span>
      <FilterBar data-slot="model-config-filter-bar-skeleton">
        {FILTER_BLOCK_WIDTHS.map((width, index) => (
          <ShimmerBlock key={index} shape="line" tone="strong" className={cn("h-8", width)} />
        ))}
        <span className="flex-1" />
        <ShimmerBlock shape="line" tone="strong" className={cn("h-8", NEW_BLOCK_WIDTH)} />
      </FilterBar>
      <section className={cn(sectionCardClassName, "min-h-0 flex-[1_1_0]")}>
        <div className="flex h-16 flex-none items-start gap-3">
          <CardHeadingSkeleton eyebrowWidth="w-[6.625rem]" titleWidth="w-[7.5rem]" descriptionWidth="w-[35rem]" />
          <span className="flex-1" />
          <ShimmerBlock shape="line" className="mt-0.5 h-3.5 w-8" />
        </div>
        <div className="min-h-0 flex-[0_1_auto] overflow-hidden rounded-lg border border-border">
          <div style={{ minWidth: MODEL_CONFIG_MIN_WIDTH }}>
            <div className="h-11 border-b border-border bg-muted" />
            {Array.from({ length: ROW_COUNT }, (_, row) => (
              <div
                key={row}
                className="grid h-[3.25rem] items-center border-b border-border"
                style={{ gridTemplateColumns: MODEL_CONFIG_COLUMNS }}
              >
                {Array.from({ length: CELL_COUNT }, (_, column) => (
                  <div key={column} className="flex min-w-0 px-4">
                    <ShimmerBlock shape="line" className="h-3.5 w-3/5" />
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
