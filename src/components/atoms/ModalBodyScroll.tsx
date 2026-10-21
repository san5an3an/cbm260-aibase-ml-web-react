import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ModalBodyScrollProps {
  // Scroll Bar가 내용을 가리지 않도록 좌우로 조금 넓힘
  bleed?: boolean;
  children: ReactNode;
}

// Modal의 머리와 바닥 사이에서 넘치는 내용을 Scroll하는 영역 표시
export function ModalBodyScroll({
  bleed = true,
  children,
  ...props
}: ModalBodyScrollProps & { "data-slot"?: string }) {
  return (
    <div
      data-slot="modal-body-scroll"
      className={cn(
        "flex min-h-0 flex-[1_1_auto] flex-col gap-3.5 overflow-auto",
        bleed && "-mx-1 px-1",
      )}
      {...props}
    >
      {children}
    </div>
  );
}
