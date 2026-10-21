"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DialogHeader } from "@/components/molecules/DialogHeader";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";

// 지금 그리는 위치가 열린 Modal의 안쪽인지 알리는 값
const InsideModalContext = createContext(false);

// Modal 위에 겹쳐 뜨는 Dialog가 뒤를 덮는 Overlay를 직접 그려야 하는지 반환
export function useIsInsideModal(): boolean {
  return useContext(InsideModalContext);
}

// scrim은 화면을 덮는 기본 Color, soft는 아래 Modal이 비쳐 보이는 옅은 Color
export type ModalOverlayTone = "scrim" | "soft";

const nestedOverlayClassNames: Record<ModalOverlayTone, string | undefined> = {
  scrim: undefined,
  soft: "[--overlay-color:rgba(7,21,31,0.55)]",
};

interface ModalFrameProps {
  // 검사와 개발자 도구에서 Modal을 찾는 이름
  name: string;
  open: boolean;
  // 닫기 Button, Esc, 바깥 Click으로 닫으려 할 때 호출
  onClose: () => void;
  title: string;
  // Modal의 Width(rem), window가 좁으면 window Width에서 Margin을 뺀 만큼까지 축소
  widthRem: number;
  // Modal의 Height(rem), 주지 않으면 내용만큼이고 주면 window가 낮을 때 window Height에서 Margin을 뺀 만큼까지 축소
  heightRem?: number;
  // Modal 바깥을 Click해도 닫히게 할지 지정
  closeOnOutsidePress?: boolean;
  // 다른 Modal 위에 겹쳐 뜰 때 뒤를 덮는 Overlay의 Color
  nestedOverlayTone?: ModalOverlayTone;
  // 하단 Row의 왼쪽(안내문, 삭제 Button)과 오른쪽(취소, 저장 Button)
  footerStart?: ReactNode;
  footerEnd?: ReactNode;
  // 이 Modal 위에 겹쳐 띄울 Modal과 확인 Dialog
  overlays?: ReactNode;
  children: ReactNode;
}

// 머리, 본문, 하단 Button Row로 된 Modal의 공통 Layout 표시
export function ModalFrame({
  name,
  open,
  onClose,
  title,
  widthRem,
  heightRem,
  closeOnOutsidePress = false,
  nestedOverlayTone = "scrim",
  footerStart,
  footerEnd,
  overlays,
  children,
}: ModalFrameProps) {
  const isNested = useIsInsideModal();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      disablePointerDismissal={!closeOnOutsidePress}
    >
      {isNested ? (
        <DialogPortal>
          <DialogOverlay forceRender className={nestedOverlayClassNames[nestedOverlayTone]} />
        </DialogPortal>
      ) : null}
      <DialogContent
        data-modal={name}
        showCloseButton={false}
        style={{
          width: `${widthRem}rem`,
          height: heightRem === undefined ? undefined : `min(${heightRem}rem, calc(100dvh - 4rem))`,
        }}
        // 열린 채 Width나 Height가 바뀔 때 늘어나 보이지 않도록 기본 Component가 모든 속성에 거는 duration-100 전환을 transition-none으로 해제, 열고 닫는 움직임은 Animation이라 그대로 유지
        className="flex max-h-[calc(100dvh-4rem)] max-w-[calc(100vw-4rem)] flex-col gap-3.5 overflow-hidden rounded-[1rem] border border-border bg-dialog p-4 text-foreground shadow-[0_1.5rem_4rem_rgba(0,0,0,0.3)] ring-0 transition-none sm:max-w-[calc(100vw-4rem)] motion-reduce:data-closed:zoom-out-100 motion-reduce:data-open:zoom-in-100"
      >
        <InsideModalContext.Provider value={true}>
          <DialogHeader title={title} />
          {children}
          {footerStart || footerEnd ? (
            <DialogFooter className="m-0 flex-none flex-row items-center gap-2 rounded-none border-t-0 bg-transparent p-0 sm:justify-start">
              {footerStart}
              <span className="flex-1" />
              {footerEnd}
            </DialogFooter>
          ) : null}
          {overlays}
        </InsideModalContext.Provider>
      </DialogContent>
    </Dialog>
  );
}
