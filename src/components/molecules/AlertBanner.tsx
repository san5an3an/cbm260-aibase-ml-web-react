"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motionTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

const MotionAlert = motion.create(Alert);

// 나타날 때와 사라질 때의 짧은 Fade와 이동
const slideMotion = {
  initial: { opacity: 0, y: "0.25rem" },
  animate: { opacity: 1, y: "0rem", transition: motionTransition.default },
  exit: { opacity: 0, y: "0.25rem", transition: motionTransition.exit },
};
// reduced motion에서는 이동 없이 제자리에서 Fade만 적용
const fadeMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: motionTransition.default },
  exit: { opacity: 0, transition: motionTransition.exit },
};

// 띠의 Color 정의, danger는 고쳐야 할 내용, brand는 알아 둘 내용, warning은 주의할 내용
export type AlertBannerTone = "danger" | "brand" | "warning";
// Icon의 Color, inherit는 문구와 같은 Color
export type AlertBannerIconTone = "inherit" | "danger" | "brandText" | "primary" | "warningStrong";
// strong은 굵은 문구, plain은 보통 굵기의 안내
export type AlertBannerEmphasis = "strong" | "plain";

const toneClassNames: Record<AlertBannerTone, string> = {
  danger: "bg-danger-subtle text-on-danger-subtle",
  brand: "bg-brand-line4-subtle text-foreground",
  warning: "bg-warning-subtle text-on-warning-subtle",
};

const iconToneClassNames: Record<AlertBannerIconTone, string> = {
  inherit: "*:[svg]:text-current",
  danger: "*:[svg]:text-destructive",
  brandText: "*:[svg]:text-brand-line4-text",
  primary: "*:[svg]:text-primary",
  warningStrong: "*:[svg]:text-warning-strong",
};

const emphasisClassNames: Record<AlertBannerEmphasis, string> = {
  strong: "px-4 font-medium",
  plain: "px-3.5 font-normal",
};

// 배치 정의, line은 Icon과 한 Row 문구를 가운데 맞춤, paragraph는 여러 Row 보통 굵기 설명을 위쪽 맞춤, block은 여러 Row 중간 굵기 문구를 가운데 맞춤, paragraph와 block은 굵기, Padding, 모서리를 스스로 정함
export type AlertBannerLayout = "line" | "paragraph" | "block";

const layoutClassNames: Record<AlertBannerLayout, string> = {
  line: "",
  paragraph: "items-start px-4 py-3 font-normal *:[svg]:my-px",
  block: "rounded-[0.625rem] px-3.5 py-3 leading-5 font-medium break-keep",
};

interface AlertBannerBaseProps {
  tone: AlertBannerTone;
  icon: ReactNode;
  iconTone?: AlertBannerIconTone;
  // 조건에 따라 나중에 나타나는 띠에 지정, 나타나고 사라질 때 짧은 움직임 적용
  animated?: boolean;
  children: ReactNode;
}

// paragraph와 block은 굵기와 좌우 Padding을 스스로 정하므로 emphasis를 받지 않음
type AlertBannerProps = AlertBannerBaseProps &
  (
    | { layout?: Extract<AlertBannerLayout, "line">; emphasis?: AlertBannerEmphasis }
    | { layout: Extract<AlertBannerLayout, "paragraph" | "block">; emphasis?: never }
  );

// Icon과 한 Row 문구로 된 알림 띠 표시
export function AlertBanner({
  tone,
  icon,
  iconTone = "inherit",
  emphasis = "strong",
  layout = "line",
  animated = false,
  children,
}: AlertBannerProps) {
  const shouldReduceMotion = useReducedMotion();
  const Root = animated ? MotionAlert : Alert;
  const revealMotion = shouldReduceMotion ? fadeMotion : slideMotion;

  return (
    <Root
      data-slot="alert-banner"
      data-tone={tone}
      // 고쳐야 할 내용은 표시 즉시 읽어 주고 안내는 순서대로 읽게 함
      role={tone === "danger" ? "alert" : "note"}
      className={cn(
        "flex min-h-11 flex-none items-center gap-2.5 rounded-md border-0 py-2.5 text-sm has-[>svg]:gap-x-2.5 *:[svg]:translate-y-0 *:[svg]:shrink-0 *:[svg:not([class*='size-'])]:size-5",
        toneClassNames[tone],
        iconToneClassNames[iconTone],
        emphasisClassNames[emphasis],
        layoutClassNames[layout],
      )}
      {...(animated ? revealMotion : {})}
    >
      {icon}
      <AlertDescription className="text-inherit">{children}</AlertDescription>
    </Root>
  );
}
