"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { motionTransition } from "@/lib/motion";

interface MonitoringShellTemplateProps {
  rail: ReactNode;
  // 레일 오른쪽 영역 위에 겹쳐 뜨는 전체 Menu와 열림 여부
  sidebar: ReactNode;
  isSidebarOpen: boolean;
  topBar: ReactNode;
  pageBar: ReactNode;
  contentKey: string;
  children: ReactNode;
}

// 왼쪽 레일, 전체 Menu, 상단 바, Page 바, 본문의 Layout 구성
export function MonitoringShellTemplate({
  rail,
  sidebar,
  isSidebarOpen,
  topBar,
  pageBar,
  contentKey,
  children,
}: MonitoringShellTemplateProps) {
  return (
    <div data-slot="monitoring-shell" className="relative flex h-dvh min-h-[50rem] min-w-[90rem] overflow-hidden bg-background text-foreground">
      {rail}
      <div data-slot="monitoring-body" className="relative flex min-w-0 flex-1 flex-col">
        {sidebar}
        {/* 전체 Menu가 덮고 있는 동안에는 아래 영역에 Focus가 가지 않게 차단 */}
        <div data-slot="monitoring-body-content" className="contents" inert={isSidebarOpen}>
          {topBar}
          {pageBar}
          <main data-slot="monitoring-main" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3.5">
            <AnimatePresence initial={false}>
              <motion.div
                key={contentKey}
                className="flex min-h-0 min-w-0 flex-1 flex-col"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={motionTransition.enter}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
