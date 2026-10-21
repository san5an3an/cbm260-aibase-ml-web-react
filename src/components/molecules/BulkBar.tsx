"use client";

import type { ReactNode } from "react";
import { motion, useIsPresent, useReducedMotion } from "motion/react";
import { motionTransition } from "@/lib/motion";

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

interface BulkBarProps {
  label: string;
  children: ReactNode;
}

// 선택한 건수와 일괄 실행 Button을 한 Row로 표시
export function BulkBar({ label, children }: BulkBarProps) {
  // 사라지는 동안에는 안의 Button을 Click할 수 없게 처리
  const isPresent = useIsPresent();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      data-slot="bulk-bar"
      inert={!isPresent}
      className="flex h-10 items-center gap-2 rounded-lg border border-brand-line4 bg-brand-line4-subtle pr-1 pl-3.5"
      {...(shouldReduceMotion ? fadeMotion : slideMotion)}
    >
      <span data-slot="bulk-bar-label" className="pr-1 text-sm font-bold text-brand-line4-text">
        {label}
      </span>
      {children}
    </motion.div>
  );
}
