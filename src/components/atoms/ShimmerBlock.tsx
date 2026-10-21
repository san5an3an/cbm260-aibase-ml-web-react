import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// block은 큰 영역(모서리 10), line은 Text 한 Row 영역(모서리 6)
export type ShimmerBlockShape = "block" | "line";

const shapeClassNames: Record<ShimmerBlockShape, string> = {
  block: "rounded-[0.625rem]",
  line: "rounded-[0.375rem]",
};

// default는 Card의 흰 배경 위, strong은 조건 Row처럼 옅은 회색 배경 위
export type ShimmerBlockTone = "default" | "strong";

const toneClassNames: Record<ShimmerBlockTone, string> = {
  default: "bg-[linear-gradient(90deg,var(--muted)_0%,var(--surface-low)_50%,var(--muted)_100%)]",
  strong: "bg-[linear-gradient(90deg,var(--border)_0%,var(--muted)_50%,var(--border)_100%)]",
};

interface ShimmerBlockProps {
  shape?: ShimmerBlockShape;
  // Skeleton의 Color, 놓이는 배경에 따라 선택, 주지 않으면 default
  tone?: ShimmerBlockTone;
  // Skeleton의 Width, Height, 배치 위치 지정
  className?: string;
}

// Loading 동안 내용 위치에 빛이 왼쪽에서 오른쪽으로 지나가는 Skeleton 표시, reduced motion에서는 빛이 멈춤
export function ShimmerBlock({ shape = "block", tone = "default", className }: ShimmerBlockProps) {
  return (
    <Skeleton
      data-slot="shimmer-block"
      aria-hidden
      className={cn(
        // 기본 Component의 깜빡임(animate-pulse)을 빛이 지나가는 효과로 강제로 덮어씀
        "animate-skeleton-shimmer! bg-size-[200%_100%] motion-reduce:animate-none!",
        toneClassNames[tone],
        shapeClassNames[shape],
        className,
      )}
    />
  );
}
