import { ShimmerBlock } from "@/components/atoms/ShimmerBlock";
import { cardSectionClassName } from "@/components/atoms/Well";
import { cn } from "@/lib/utils";

// 위쪽에 늘어놓는 큰 Skeleton Cell 수와 그 아래 Row들의 Width
const TILE_COUNT = 4;
const LINE_WIDTHS: readonly string[] = ["w-full", "w-[92%]", "w-full", "w-[86%]", "w-[96%]", "w-[70%]"];

interface SkeletonPanelProps {
  // Skeleton 아래에 표시할 Loading 안내 문구
  caption: string;
}

// 내용을 불러오는 동안 남는 Height를 채우는 Skeleton 모음과 안내 문구 표시
export function SkeletonPanel({ caption }: SkeletonPanelProps) {
  return (
    <div
      data-slot="skeleton-panel"
      role="status"
      className={cn("flex flex-1 flex-col gap-3.5", cardSectionClassName)}
    >
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: TILE_COUNT }, (_, index) => (
          <ShimmerBlock key={index} className="h-16" />
        ))}
      </div>
      {LINE_WIDTHS.map((width, index) => (
        <ShimmerBlock key={index} shape="line" className={cn("h-7 rounded-sm", width)} />
      ))}
      <span
        data-slot="skeleton-panel-caption"
        className="pt-2 text-center text-xs leading-[1.0625rem] text-muted-foreground"
      >
        {caption}
      </span>
    </div>
  );
}
