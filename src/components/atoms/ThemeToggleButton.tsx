"use client";

import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { motionTransition } from "@/lib/motion";

interface ThemeToggleButtonProps {
  isDark: boolean;
  label: string;
  onToggle: () => void;
}

// 라이트, 다크 전환 Button 표시
export function ThemeToggleButton({ isDark, label, onToggle }: ThemeToggleButtonProps) {
  const Icon = isDark ? LightModeRoundedIcon : DarkModeRoundedIcon;

  return (
    <Button
      data-slot="theme-toggle-button"
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      onClick={onToggle}
      className="size-8 rounded-md bg-card text-foreground transition-colors timing-micro hover:bg-surface-low hover:text-foreground dark:hover:bg-surface-low"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "light" : "dark"}
          className="flex"
          initial={{ opacity: 0, rotate: -45 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 45 }}
          transition={motionTransition.micro}
        >
          <Icon className="size-[1.375rem]" />
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
