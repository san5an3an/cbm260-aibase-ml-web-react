import type { ReactNode } from "react";
import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// dangerOutline은 Text만, dangerBorder는 Border까지 danger Color로 표시
export type ActionButtonVariant =
  | "primary"
  | "outline"
  | "dangerOutline"
  | "dangerBorder"
  | "danger";
// Height와 좌우 Padding 조합, mdNarrow는 md와 Height가 같고 Padding만 좁게 지정
export type ActionButtonSize = "xs" | "sm" | "md" | "mdNarrow" | "lg";
export type ActionButtonWeight = "medium" | "semibold";

// 채워진 형태(primary, danger)는 Border를 없애 배경이 Height를 가득 채우게 지정
const variantClassNames: Record<ActionButtonVariant, string> = {
  primary: "border-0 hover:bg-primary-hover",
  outline:
    "border-border bg-card text-foreground hover:bg-muted dark:border-border dark:bg-card dark:hover:bg-muted",
  dangerOutline:
    "border-border bg-card text-destructive hover:bg-danger-subtle hover:text-destructive dark:border-border dark:bg-card dark:hover:bg-danger-subtle",
  dangerBorder:
    "border-destructive bg-card text-destructive hover:bg-danger-subtle hover:text-destructive dark:border-destructive dark:bg-card dark:hover:bg-danger-subtle",
  danger: "border-0 bg-destructive text-danger-fg hover:bg-destructive/90",
};

const sizeClassNames: Record<ActionButtonSize, string> = {
  // xs는 상태 표시(StatePill md, Height 24)와 나란히 놓는 작은 Button
  xs: "h-6 px-2.5 text-xs",
  sm: "h-[1.875rem] px-3",
  md: "h-8 px-4",
  mdNarrow: "h-8 px-3.5",
  lg: "h-10 px-4",
};

const weightClassNames: Record<ActionButtonWeight, string> = {
  medium: "font-medium",
  semibold: "font-semibold",
};

// 굵기를 따로 받지 않았을 때 크기별로 쓰는 기본 Font 굵기 지정
const defaultWeights: Record<ActionButtonSize, ActionButtonWeight> = {
  xs: "semibold",
  sm: "medium",
  md: "medium",
  mdNarrow: "medium",
  lg: "semibold",
};

interface ActionButtonProps {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  // Font 굵기, 받지 않으면 크기에 맞는 굵기 사용
  weight?: ActionButtonWeight;
  title?: string;
  // Request 전송 중처럼 Click할 수 없는 상태 표시
  disabled?: boolean;
  // 이 Button이 보낸 Request의 응답을 기다리는 중, Click 불가이며 disabled보다 덜 옅게 표시
  pending?: boolean;
}

// 조회, 등록, 처리처럼 Text로 된 동작 Button 표시
export function ActionButton({
  label,
  icon,
  onClick,
  variant = "primary",
  size = "md",
  weight,
  title,
  disabled = false,
  pending = false,
}: ActionButtonProps) {
  return (
    <Button
      data-slot="action-button"
      data-variant={variant}
      variant={variant === "primary" || variant === "danger" ? "default" : "outline"}
      title={title}
      disabled={disabled || pending}
      // 비활성화된 동안에도 방금 Click한 Button이 Focus를 잃지 않도록 유지
      focusableWhenDisabled
      onClick={onClick}
      className={cn(
        "gap-1.5 rounded-sm text-sm timing-micro",
        disabledLookClassName,
        sizeClassNames[size],
        weightClassNames[weight ?? defaultWeights[size]],
        variantClassNames[variant],
        pending && "aria-disabled:opacity-70",
      )}
    >
      {icon}
      {label}
    </Button>
  );
}
