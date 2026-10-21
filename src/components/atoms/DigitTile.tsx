"use client";

import { AnimatePresence, motion } from "motion/react";
import { motionTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface DigitTileProps {
  character: string;
}

// KPI 숫자 한 Text 표시, 숫자는 Cell 위에, 기호는 Cell 없이 표시
export function DigitTile({ character }: DigitTileProps) {
  const isDigit = /\d/.test(character);

  return (
    <span
      data-slot="digit-tile"
      className={cn(
        "relative flex h-[4.3125rem] justify-center overflow-hidden rounded-[0.25rem] text-[2.75rem] leading-none font-bold text-foreground tabular-nums",
        isDigit ? "w-[2.6875rem] items-center bg-muted-strong" : "w-4",
        !isDigit && (character === "." ? "items-end pb-1.5" : "items-center"),
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={character}
          initial={{ opacity: 0, y: "40%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "-40%" }}
          transition={motionTransition.move}
        >
          {character}
        </motion.span>
      </AnimatePresence>
      {isDigit ? (
        <span className="absolute inset-x-0 top-[calc(50%-0.125rem)] h-1 bg-card opacity-[0.78]" />
      ) : null}
    </span>
  );
}
