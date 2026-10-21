import type { ReactNode } from "react";
import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 왼쪽 띠의 Color로 이 Cell의 값이 어느 범위의 규칙에서 왔는지 표시, none은 적용되는 규칙이 없는 Cell에 지정
export type RuleCellTone = "own" | "device" | "model" | "global" | "off" | "none";

// 기본 Component의 다크 Theme용 Border Color가 띠의 Color를 덮지 않도록 같은 Color를 다크에도 지정
const toneClassNames: Record<RuleCellTone, string> = {
  own: "border-l-caution dark:border-l-caution",
  device: "border-l-brand-line4-text dark:border-l-brand-line4-text",
  model: "border-l-success dark:border-l-success",
  global: "border-l-border-strong dark:border-l-border-strong",
  off: "border-l-destructive dark:border-l-destructive",
  none: "border-l-border dark:border-l-border",
};

interface RuleCellProps {
  tone: RuleCellTone;
  // 이 Cell에만 따로 정한 값일 때 배경을 칠해 강조
  highlighted?: boolean;
  // Hover했을 때 밝기를 낮추는 대신 배경을 칠할지 지정
  hoverFill?: boolean;
  // 첫 Row의 값, 꺼진 규칙은 danger, 전체 규칙 Cell은 덜 굵게
  primary: string;
  primaryTone?: "default" | "danger" | "soft";
  secondary?: string;
  tertiary?: ReactNode;
  title?: string;
  // 값을 다시 받는 동안처럼 Click할 수 없는 상태 표시, Focus는 받을 수 있게 유지
  disabled?: boolean;
  onClick: () => void;
}

// 규칙 Table의 Cell 하나에 적용되는 조건을 세 Row로 표시
export function RuleCell({
  tone,
  highlighted = false,
  hoverFill = false,
  primary,
  primaryTone = "default",
  secondary,
  tertiary,
  title,
  disabled = false,
  onClick,
}: RuleCellProps) {
  return (
    <Button
      data-slot="rule-cell"
      data-tone={tone}
      variant="outline"
      title={title}
      disabled={disabled}
      focusableWhenDisabled
      onClick={onClick}
      className={cn(
        "h-[4.125rem] w-full min-w-0 shrink flex-col items-start justify-start gap-0.5 overflow-hidden rounded-[0.25rem] border-l-[0.25rem] px-2.5 py-2 text-left text-[0.6875rem] leading-4 font-normal text-foreground timing-micro",
        disabledLookClassName,
        highlighted
          ? "border-[color-mix(in_srgb,var(--caution)_45%,var(--card))] bg-caution-subtle hover:bg-caution-subtle dark:border-[color-mix(in_srgb,var(--caution)_45%,var(--card))] dark:bg-caution-subtle dark:hover:bg-caution-subtle"
          : "border-border bg-card hover:bg-card dark:border-border dark:bg-card dark:hover:bg-card",
        hoverFill ? "hover:bg-muted dark:hover:bg-muted" : "hover:brightness-[0.97]",
        toneClassNames[tone],
      )}
    >
      <span
        data-slot="rule-cell-primary"
        className={cn(
          "max-w-full truncate",
          primaryTone === "soft" ? "font-semibold" : "font-bold",
          primaryTone === "danger" && "text-destructive",
        )}
      >
        {primary}
      </span>
      {secondary ? (
        <span data-slot="rule-cell-secondary" className="max-w-full truncate text-muted-foreground">
          {secondary}
        </span>
      ) : null}
      {tertiary ? (
        <span
          data-slot="rule-cell-tertiary"
          className="flex max-w-full items-center gap-0.5 text-muted-foreground"
        >
          {tertiary}
        </span>
      ) : null}
    </Button>
  );
}
