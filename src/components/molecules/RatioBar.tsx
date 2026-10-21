"use client";

import { motion, useReducedMotion } from "motion/react";
import { motionTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

// brandGradient와 warningGradient는 채움이 Gradient이고 Text는 본문 Color
export type RatioBarTone =
  | "danger"
  | "warning"
  | "caution"
  | "normal"
  | "brandGradient"
  | "warningGradient";
// 크기별 Bar와 Text, sm은 Bar 최대 84, Height 6, Text는 남는 Width, md는 Bar가 남는 Width, Height 8, Text Width 22, xs는 Bar 90 고정, Height 6, Text 12, Width 52(sm과 md의 Font 크기는 주변을 따름)
export type RatioBarSize = "sm" | "md" | "xs";

const toneClassNames: Record<RatioBarTone, { track: string; fill: string; text: string }> = {
  danger: { track: "bg-danger-subtle", fill: "bg-destructive", text: "text-destructive" },
  warning: { track: "bg-warning-subtle", fill: "bg-warning", text: "text-on-warning-subtle" },
  caution: { track: "bg-caution-subtle", fill: "bg-caution", text: "text-on-caution-subtle" },
  normal: { track: "bg-success-subtle", fill: "bg-success", text: "text-on-success-subtle" },
  brandGradient: {
    track: "bg-brand-line4-subtle",
    fill: "bg-(image:--gradient-brand-line4)",
    text: "text-foreground",
  },
  warningGradient: {
    track: "bg-warning-subtle",
    fill: "bg-[linear-gradient(90deg,color-mix(in_srgb,var(--warning)_70%,var(--card)),var(--warning))]",
    text: "text-foreground",
  },
};

const sizeClassNames: Record<
  RatioBarSize,
  { root: string; track: string; fill: string; label: string }
> = {
  sm: {
    root: "gap-3",
    track: "h-1.5 max-w-[5.25rem] flex-1 rounded-[0.1875rem]",
    fill: "block h-1.5 rounded-[0.1875rem]",
    label: "flex-1",
  },
  md: {
    root: "gap-3",
    track: "h-2 flex-1 rounded-[0.25rem]",
    fill: "block h-2 rounded-[0.25rem]",
    label: "w-[1.375rem] flex-none",
  },
  xs: {
    root: "gap-2.5",
    track: "h-1.5 w-[5.625rem] flex-none rounded-[0.1875rem]",
    fill: "block h-1.5 rounded-[0.1875rem]",
    label: "w-[3.25rem] flex-none text-xs leading-[0.875rem]",
  },
};

interface RatioBarProps {
  tone: RatioBarTone;
  fillPercent: number;
  label: string;
  size?: RatioBarSize;
}

// 비율을 Bar와 숫자로 표시
export function RatioBar({ tone, fillPercent, label, size = "sm" }: RatioBarProps) {
  const classNames = toneClassNames[tone];
  const sizes = sizeClassNames[size];
  const width = `${Math.min(100, Math.max(0, fillPercent))}%`;
  // reduced motion을 켠 사용자에게는 자라나는 움직임 없이 바로 표시
  const shouldReduceMotion = useReducedMotion();

  return (
    <span data-slot="ratio-bar" className={cn("flex items-center", sizes.root)}>
      <span data-slot="ratio-bar-track" className={cn(sizes.track, classNames.track)}>
        <motion.span
          data-slot="ratio-bar-fill"
          className={cn(sizes.fill, classNames.fill)}
          initial={shouldReduceMotion ? false : { width: 0 }}
          animate={{ width }}
          transition={shouldReduceMotion ? { duration: 0 } : motionTransition.enter}
        />
      </span>
      <span
        data-slot="ratio-bar-label"
        className={cn(sizes.label, "text-right font-bold tabular-nums", classNames.text)}
      >
        {label}
      </span>
    </span>
  );
}
