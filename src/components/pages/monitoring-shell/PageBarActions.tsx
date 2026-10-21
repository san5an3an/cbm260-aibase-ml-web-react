"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Page 바 안에서 화면별 Button을 둘 위치 공유
export const PageBarActionsContext = createContext<HTMLElement | null>(null);

interface PageBarActionsProps {
  children: ReactNode;
}

// 화면이 Page 바에 넣을 Button 배치
export function PageBarActions({ children }: PageBarActionsProps) {
  const slotElement = useContext(PageBarActionsContext);
  return slotElement ? createPortal(children, slotElement) : null;
}
