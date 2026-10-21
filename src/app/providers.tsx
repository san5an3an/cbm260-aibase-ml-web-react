"use client";

import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { ToastHost } from "@/components/molecules/Toast";

interface AppProvidersProps {
  children: ReactNode;
}

// Theme 전환, reduced motion 설정, Toast 표시 위치, Drag 방지를 적용하는 공통 Provider
export function AppProviders({ children }: AppProvidersProps) {
  // Input을 제외한 이미지, Link, Text를 Drag해서 옮기지 못하게 막음
  useEffect(() => {
    const blockDrag = (event: DragEvent) => {
      if (event.target instanceof Element && event.target.closest("input, textarea, [contenteditable='true']")) return;
      event.preventDefault();
    };
    document.addEventListener("dragstart", blockDrag);
    return () => document.removeEventListener("dragstart", blockDrag);
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <MotionConfig reducedMotion="user">
        <ToastHost>{children}</ToastHost>
      </MotionConfig>
    </ThemeProvider>
  );
}
