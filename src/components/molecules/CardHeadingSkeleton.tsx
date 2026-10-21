import { ShimmerBlock } from "@/components/atoms/ShimmerBlock";
import { cn } from "@/lib/utils";

interface CardHeadingSkeletonProps {
  // 작은 머리글과 제목 Text 영역의 Width
  eyebrowWidth: string;
  titleWidth: string;
  // 설명 Row가 있는 Card에만 Width 지정
  descriptionWidth?: string;
}

// Loading 동안 Card 머리의 작은 머리글, 제목, 설명 위치에 빛이 지나가는 Skeleton 표시
export function CardHeadingSkeleton({ eyebrowWidth, titleWidth, descriptionWidth }: CardHeadingSkeletonProps) {
  return (
    <div className="flex flex-col gap-2 pt-0.5">
      <ShimmerBlock shape="line" className={cn("h-3", eyebrowWidth)} />
      <ShimmerBlock shape="line" className={cn("h-4", titleWidth)} />
      {descriptionWidth ? <ShimmerBlock shape="line" className={cn("h-3.5", descriptionWidth)} /> : null}
    </div>
  );
}
