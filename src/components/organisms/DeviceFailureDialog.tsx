"use client";

import { useEffect, useRef } from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// emphasis는 크게, normal은 보통, danger는 빨간 Text(여러 줄)로 표시하는 값
export type DeviceFailureRowTone = "emphasis" | "normal" | "danger";

// Dialog의 이름과 값 한 Row 정의
export interface DeviceFailureDialogRow {
  label: string;
  value: string;
  tone: DeviceFailureRowTone;
}

// Dialog의 고정 문구, 안내의 줄바꿈은 그대로 표시
export interface DeviceFailureDialogTexts {
  eyebrow: string;
  title: string;
  message: string;
  confirmLabel: string;
}

const valueToneClassNames: Record<DeviceFailureRowTone, string> = {
  emphasis: "text-[1.375rem] leading-7 font-bold text-foreground",
  normal: "text-base font-medium tracking-[0.009375rem] text-foreground",
  danger: "text-sm font-medium tracking-[0.015625rem] text-on-danger-subtle",
};

// 값이 여러 줄이면 이름을 첫 줄에 맞추고, 한 줄 값이면 이름을 세로 가운데에 맞춤
const rowAlignClassNames: Record<DeviceFailureRowTone, string> = {
  emphasis: "items-center",
  normal: "items-center",
  danger: "items-start",
};

// 다른 Modal, 확인 Dialog(z-50), 검색 Overlay(z-60)보다 위이고 실패 Toast(z-90)보다 아래에 배치하는 Layer
const LAYER_CLASS_NAME = "z-80";

// 빨간 Border 바깥의 붉은 빛, Color는 디자인 시스템의 danger를 섞어 Theme를 따름
const FRAME_SHADOW_CLASS_NAME =
  "shadow-[0_1rem_3rem_rgba(20,32,52,0.24),0_0.75rem_4rem_color-mix(in_srgb,var(--danger)_38%,transparent),0_0_0_0.375rem_color-mix(in_srgb,var(--danger)_20%,transparent)]";

interface DeviceFailureDialogProps {
  open: boolean;
  texts: DeviceFailureDialogTexts;
  rows: readonly DeviceFailureDialogRow[];
  // 확인 Request를 기다리는 동안 Button 비활성화 표시
  isAcknowledging: boolean;
  onAcknowledge: () => void;
}

// 어느 화면이나 Modal 위에서도 맨 앞에 뜨고 확인 Button으로만 닫히는 장치 고장 알림 Dialog 표시
export function DeviceFailureDialog({
  open,
  texts,
  rows,
  isAcknowledging,
  onAcknowledge,
}: DeviceFailureDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // 열린 동안 Esc가 이 Dialog와 뒤의 Modal, 검색 Overlay, Menu에 전달되지 않도록 Dialog 전체에서 먼저 차단
  useEffect(() => {
    if (!open) return;
    const blockEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", blockEscape, true);
    return () => window.removeEventListener("keydown", blockEscape, true);
  }, [open]);

  return (
    <AlertDialog open={open}>
      <AlertDialogPortal>
        <AlertDialogOverlay
          data-overlay="device-failure"
          className={`${LAYER_CLASS_NAME} [--overlay-color:rgba(0,0,0,0.8)]`}
        />
        <AlertDialogPrimitive.Popup
          data-dialog="device-failure"
          initialFocus={confirmRef}
          className={cn(
            "fixed top-1/2 left-1/2 flex max-h-[calc(100dvh-4rem)] w-[35rem] max-w-[calc(100vw-4rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[1rem] border-[0.125rem] border-destructive bg-surface-low text-foreground outline-none",
            "duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:data-closed:zoom-out-100 motion-reduce:data-open:zoom-in-100",
            LAYER_CLASS_NAME,
            FRAME_SHADOW_CLASS_NAME,
          )}
        >
          <div
            data-slot="device-failure-header"
            className="flex flex-none items-center gap-3.5 bg-destructive px-6 py-5 text-danger-fg"
          >
            <span
              data-slot="device-failure-icon"
              className="grid size-12 flex-none place-items-center rounded-full bg-[color-mix(in_srgb,var(--danger-fg)_18%,transparent)]"
            >
              <WarningAmberRoundedIcon aria-hidden className="size-[1.625rem]" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p
                data-slot="device-failure-eyebrow"
                className="text-xs leading-4 font-semibold tracking-[0.03125rem] opacity-85"
              >
                {texts.eyebrow}
              </p>
              <AlertDialogTitle className="text-[1.375rem] leading-7 font-bold">
                {texts.title}
              </AlertDialogTitle>
            </div>
          </div>
          <div data-slot="device-failure-body" className="flex min-h-0 flex-col gap-4 px-6 pt-5 pb-6">
            {/* 안내와 이름, 값 Row를 함께 Dialog의 설명으로 읽히게 Group, Row가 많아 넘치면 이 영역만 Scroll */}
            <AlertDialogDescription
              render={<div />}
              className="flex min-h-0 flex-col gap-4 overflow-y-auto text-sm text-wrap md:text-wrap"
            >
              <p
                data-slot="device-failure-message"
                className="leading-5 tracking-[0.015625rem] whitespace-pre-line text-muted-foreground"
              >
                {texts.message}
              </p>
              {rows.length > 0 ? (
                <dl
                  data-slot="device-failure-fields"
                  className="flex flex-none flex-col rounded-[0.75rem] border border-border bg-card px-4 py-0.5"
                >
                  {rows.map((row, index) => (
                    <div
                      key={`${row.label}-${index}`}
                      data-slot="device-failure-row"
                      data-tone={row.tone}
                      className={cn(
                        "flex gap-4 border-b border-border py-3.5 last:border-b-0",
                        rowAlignClassNames[row.tone],
                      )}
                    >
                      <dt
                        data-slot="device-failure-label"
                        className="w-[4.5rem] flex-none text-sm leading-5 font-medium tracking-[0.00625rem] text-muted-foreground"
                      >
                        {row.label}
                      </dt>
                      <dd
                        data-slot="device-failure-value"
                        className={cn(
                          "min-w-0 flex-1 break-words break-keep whitespace-pre-line",
                          valueToneClassNames[row.tone],
                        )}
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </AlertDialogDescription>
            <Button
              ref={confirmRef}
              data-slot="device-failure-confirm"
              disabled={isAcknowledging}
              // 비활성화된 동안에도 방금 Click한 Button이 Focus를 잃지 않게 유지
              focusableWhenDisabled
              onClick={onAcknowledge}
              className={cn(
                "h-12 w-full flex-none rounded-[0.5rem] border-0 bg-destructive text-base font-bold tracking-[0.009375rem] text-danger-fg timing-micro hover:bg-destructive/90",
                disabledLookClassName,
                "aria-disabled:opacity-70",
              )}
            >
              {texts.confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPortal>
    </AlertDialog>
  );
}
