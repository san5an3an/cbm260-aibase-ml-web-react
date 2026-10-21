"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { motionTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface ScreenTab {
  key: string;
  label: string;
  href: string;
}

interface ScreenTabsProps {
  tabs: readonly ScreenTab[];
  activeKey: string;
  label: string;
}

// Group 안의 화면을 오가는 Tab 표시
export function ScreenTabs({ tabs, activeKey, label }: ScreenTabsProps) {
  return (
    <nav
      data-slot="screen-tabs"
      aria-label={label}
      className="flex h-8 gap-0.5 rounded-md border border-border bg-muted p-0.5"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Link
            key={tab.key}
            data-slot="screen-tab"
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex h-[1.625rem] w-36 flex-none items-center justify-center gap-2.5 rounded-sm px-3 text-sm whitespace-nowrap text-foreground hover:no-underline",
              isActive
                ? "font-bold"
                : "font-medium transition-colors timing-micro hover:bg-card/60",
            )}
          >
            {isActive ? (
              <motion.span
                layoutId="screen-tab-indicator"
                data-slot="screen-tab-indicator"
                transition={motionTransition.move}
                className="absolute inset-0 rounded-sm bg-card shadow-[0_0.0625rem_0.125rem_rgba(11,31,46,0.14)]"
              />
            ) : null}
            {isActive ? (
              <span data-slot="screen-tab-dot" className="relative size-1.5 rounded-full bg-brand-line4" />
            ) : null}
            <span className="relative">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
