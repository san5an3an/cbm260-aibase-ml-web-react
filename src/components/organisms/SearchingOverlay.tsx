"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ActionButton } from "@/components/atoms/ActionButton";
import { LoaderSpinner } from "@/components/atoms/LoaderSpinner";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

// Overlay 안내 문구, 첫 줄은 제목, 나머지 줄은 설명(줄바꿈과 빈 줄 그대로)
const TITLE = "데이터를 불러오는 중입니다.";
const DESCRIPTION = "잠시만 기다려주세요\n\n취소 버튼을 누르거나, esc로 취소 할 수 있습니다.";
const CANCEL_LABEL = "취소";

// 나타날 때와 사라질 때의 짧은 Fade, 움직임 줄이기 설정에서도 Fade는 남김
const FADE_CLASS_NAME =
  "duration-(--motion-duration-base) data-open:ease-(--motion-ease-out) data-closed:ease-(--motion-ease-in)";
// 안내 Text 스타일, 검정 Overlay 위의 흰 Text, 줄바꿈 유지
const MESSAGE_CLASS_NAME = "text-base leading-6 font-medium whitespace-pre-line text-white";
// 안내 첫 줄 스타일, Modal 제목과 같은 크기와 굵기의 흰 Text
const TITLE_CLASS_NAME = "text-[1.375rem] leading-7 font-bold text-white";

interface SearchingOverlayProps {
  open: boolean;
  // 취소 Button이나 Esc로 검색을 그만둘 때 호출
  onCancel: () => void;
}

// 검색 Response를 기다리는 동안 머리글 Row와 왼쪽 Menu까지 화면 전체를 덮는 검정 Overlay과 안내, 취소 Button 표시
export function SearchingOverlay({ open, onCancel }: SearchingOverlayProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
      disablePointerDismissal
    >
      <DialogPortal>
        <DialogOverlay
          data-overlay="searching"
          // Modal과 펼친 Menu보다 위, Toast보다 아래에 표시
          className={`z-60 [--overlay-color:rgba(0,0,0,0.8)] ${FADE_CLASS_NAME}`}
        />
        <DialogPrimitive.Popup
          data-slot="searching-overlay"
          className={`fixed top-1/2 left-1/2 z-60 flex max-w-[calc(100vw-4rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-6 text-center outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 ${FADE_CLASS_NAME}`}
        >
          <LoaderSpinner
            // 검색 중임은 제목이 전하므로 Spinner는 화면 읽기 도구에 숨김, 라이브러리의 영문 기본 이름도 덮어씀
            aria-label={TITLE}
            aria-hidden
            className="size-10 text-white motion-reduce:animate-none"
          />
          <div data-slot="searching-overlay-message" className="flex flex-col gap-1">
            <DialogTitle className={TITLE_CLASS_NAME}>{TITLE}</DialogTitle>
            {/* 문단 앞뒤에 빈 줄이 더 읽히지 않도록 p 대신 div로 그림 */}
            <DialogDescription render={<div />} className={MESSAGE_CLASS_NAME}>
              {DESCRIPTION}
            </DialogDescription>
          </div>
          <ActionButton label={CANCEL_LABEL} variant="outline" size="lg" onClick={onCancel} />
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
