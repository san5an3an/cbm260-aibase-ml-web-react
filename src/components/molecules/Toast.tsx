"use client";

import type { ReactNode } from "react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Toast as ToastRoot,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastViewport,
  toast,
  useToastManager,
} from "@/components/ui/toast";

// success는 완료된 작업의 알림, error는 실패나 고쳐야 할 내용의 알림
export type ToastTone = "success" | "error";

// Toast가 저절로 사라지기까지의 시간(ms)
const TOAST_TIMEOUT_MS = 2600;

// 화면 오른쪽 아래에 Toast 한 Row 표시, 떠 있던 Toast는 새 Toast로 교체
export function showToast(text: string, tone: ToastTone = "success"): void {
  toast.close();
  toast.add({ description: text, type: tone });
}

function ToastIcon({ tone }: { tone: string | undefined }) {
  if (tone === "error") {
    return (
      <WarningAmberRoundedIcon
        aria-hidden
        data-slot="toast-icon"
        className="size-5 flex-none text-destructive"
      />
    );
  }
  return (
    <CheckRoundedIcon aria-hidden data-slot="toast-icon" className="size-5 flex-none text-success" />
  );
}

function ToastItems() {
  const { toasts } = useToastManager();
  return toasts.map((item) => (
    <ToastRoot
      key={item.id}
      toast={item}
      data-tone={item.type}
      className="w-max max-w-[40rem] min-w-[27.5rem] rounded-md border-border bg-card text-sm text-foreground shadow-[0_0.5rem_1.5rem_rgba(7,21,31,0.16)] motion-reduce:[transition:opacity_var(--motion-duration-base)_var(--motion-ease-out)] motion-reduce:data-ending-style:opacity-0 motion-reduce:data-starting-style:opacity-0 motion-reduce:data-starting-style:[transform:none] motion-reduce:[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:none]"
    >
      <ToastContent className="gap-3 px-[1.125rem] py-3">
        <ToastIcon tone={item.type} />
        <ToastDescription className="min-w-0 flex-1 leading-5 text-foreground" />
      </ToastContent>
    </ToastRoot>
  ));
}

interface ToastHostProps {
  children: ReactNode;
}

// Toast가 뜨는 위치를 화면 오른쪽 아래로 지정, Modal, 검색 Overlay(z-60), 장치 고장 Dialog(z-80)보다 위에 표시
export function ToastHost({ children }: ToastHostProps) {
  return (
    <ToastProvider toastManager={toast} timeout={TOAST_TIMEOUT_MS} limit={1}>
      {children}
      <ToastPortal>
        <ToastViewport
          aria-label="알림"
          className="inset-x-auto right-6 bottom-6 z-90 mx-0 w-0 max-w-none sm:right-6 sm:w-0"
        >
          <ToastItems />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}
