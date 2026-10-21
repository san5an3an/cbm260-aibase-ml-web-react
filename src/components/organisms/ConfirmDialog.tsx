"use client";

import type { ReactNode } from "react";
import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
import { useIsInsideModal } from "@/components/molecules/ModalFrame";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// danger는 되돌릴 수 없는 동작, brand는 값을 바꾸는 동작, caution은 주의가 필요한 동작, warning은 끝난 일의 알림
export type ConfirmDialogTone = "danger" | "brand" | "caution" | "warning";

const mediaToneClassNames: Record<ConfirmDialogTone, string> = {
  danger: "bg-danger-subtle text-destructive",
  brand: "bg-brand-line4-subtle text-primary",
  caution: "bg-caution-subtle text-on-caution-subtle",
  warning: "bg-warning-subtle text-warning",
};

// Dialog를 배치할 Layer 지정, modal은 화면 Modal과 확인 Dialog와 같은 Layer(z-50), aboveSearch는 검색 Overlay(z-60) 위이며 장치 고장 Dialog(z-80) 아래(z-70, globals.css)
export type ConfirmDialogLayer = "modal" | "aboveSearch";

const confirmToneClassNames = {
  danger: "bg-destructive hover:bg-destructive/90",
  primary: "bg-primary hover:bg-primary-hover",
} as const;

interface ConfirmDialogProps {
  // 검사 도구와 개발자 도구에서 Dialog를 찾는 이름
  name: string;
  open: boolean;
  tone: ConfirmDialogTone;
  icon: ReactNode;
  title: string;
  // 본문 문구, 줄바꿈(\n) 위치에서 줄을 바꿔 표시
  description: string;
  confirmLabel: string;
  confirmTone: keyof typeof confirmToneClassNames;
  // 취소 Button의 문구, 지정하지 않으면 확인 Button만 표시
  cancelLabel?: string;
  // Request 전송 중 확인 Button 비활성화 표시
  isConfirming?: boolean;
  // 배치할 Layer, 지정하지 않으면 modal
  layer?: ConfirmDialogLayer;
  onConfirm: () => void;
  // 취소 Button이나 Esc로 닫으려 할 때 호출
  onCancel: () => void;
}

// 되돌리기 어려운 동작을 하기 전에 한 번 더 묻는 Dialog 표시
export function ConfirmDialog({
  name,
  open,
  tone,
  icon,
  title,
  description,
  confirmLabel,
  confirmTone,
  cancelLabel,
  isConfirming = false,
  layer = "modal",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isNested = useIsInsideModal();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      {isNested ? (
        <AlertDialogPortal>
          <AlertDialogOverlay forceRender />
        </AlertDialogPortal>
      ) : null}
      <AlertDialogContent
        data-dialog={name}
        // Layer을 올린 Dialog는 globals.css가 이 속성으로 Dialog, Overlay, 바깥 Click 차단 Layer이 든 portal 전체를 위로 올림
        data-layer={layer === "aboveSearch" ? "above-search" : undefined}
        className="flex w-[32.5rem] max-w-[calc(100vw-4rem)] flex-col gap-2.5 rounded-[1rem] border border-border bg-surface-low p-6 text-foreground shadow-[0_1.5rem_4rem_rgba(0,0,0,0.3)] ring-0 data-[size=default]:max-w-[calc(100vw-4rem)] data-[size=default]:sm:max-w-[calc(100vw-4rem)] motion-reduce:data-closed:zoom-out-100 motion-reduce:data-open:zoom-in-100"
      >
        <AlertDialogHeader className="flex flex-col items-start gap-2.5 text-left">
          <AlertDialogMedia
            className={cn(
              "mb-1 size-11 rounded-[50%] *:[svg:not([class*='size-'])]:size-[1.375rem]",
              mediaToneClassNames[tone],
            )}
          >
            {icon}
          </AlertDialogMedia>
          <AlertDialogTitle className="text-[1.375rem] leading-7 font-medium">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-5 text-pretty whitespace-pre-line text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="m-0 flex-row justify-end gap-2 rounded-none border-t-0 bg-transparent p-0 pt-2">
          {cancelLabel ? (
            <AlertDialogCancel className="h-10 rounded-sm border-border bg-card px-4 text-sm font-semibold text-foreground timing-micro dark:border-border dark:bg-card dark:hover:bg-muted">
              {cancelLabel}
            </AlertDialogCancel>
          ) : null}
          <AlertDialogAction
            disabled={isConfirming}
            // 비활성화된 동안에도 방금 Click한 Button이 Focus를 잃지 않게 유지
            focusableWhenDisabled
            // Response 후 닫히는 동안 남은 확인 Button을 겹쳐 Click해도 Request를 또 보내지 않도록, 열린 동안에만 확인을 처리
            onClick={() => {
              if (open) onConfirm();
            }}
            className={cn(
              "h-10 rounded-sm border-0 px-4 text-sm font-semibold text-primary-foreground timing-micro",
              disabledLookClassName,
              confirmToneClassNames[confirmTone],
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
