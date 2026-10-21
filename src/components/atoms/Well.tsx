import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// section은 Modal 안의 한 영역, inset은 Card Color의 안쪽 상자, field는 값 하나를 담는 작은 상자, list는 선택할 항목을 늘어놓는 상자
export type WellVariant = "section" | "inset" | "field" | "list";

// Modal 안 한 영역의 모서리, Border Color, 안쪽 Padding, 배경은 쓰는 곳이 지정
const sectionShapeClassName = "rounded-[0.75rem] border-border px-[1.125rem] py-4";

// section과 같은 모양에 Card Color 배경을 깐 상자 class 정의, Well로 감쌀 수 없는 부품(Skeleton, 빈 상태)이 사용
export const cardSectionClassName = `border border-solid ${sectionShapeClassName} bg-card`;

const variantClassNames: Record<WellVariant, string> = {
  section: `${sectionShapeClassName} bg-surface-low`,
  inset: "rounded-[0.75rem] border-border bg-card p-3",
  field: "rounded-[0.625rem] border-border-strong bg-card px-3.5 py-3",
  list: "rounded-[0.625rem] border-border bg-card p-1",
};

interface WellProps {
  variant?: WellVariant;
  // 아직 정해지지 않은 값을 담을 때 점선 Border로 표시
  dashed?: boolean;
  className?: string;
  children: ReactNode;
}

// 안쪽에 무엇이든 담는 Border 있는 배경 상자 표시
export function Well({
  variant = "section",
  dashed = false,
  className,
  children,
  ...props
}: WellProps & { "data-slot"?: string }) {
  return (
    <div
      data-slot="well"
      data-variant={variant}
      className={cn(
        "border",
        dashed ? "border-dashed" : "border-solid",
        variantClassNames[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
