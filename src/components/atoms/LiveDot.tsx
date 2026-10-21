"use client";

import { motion } from "motion/react";
import { motionEase } from "@/lib/motion";

// 실시간 수신 중임을 알리는 점 표시
export function LiveDot() {
  return (
    <span data-slot="live-dot" className="relative flex size-1.5">
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full bg-success"
        animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
        transition={{ duration: 2, ease: motionEase.out, repeat: Infinity, repeatDelay: 0.4 }}
      />
      <span className="relative size-1.5 rounded-full bg-success" />
    </span>
  );
}
