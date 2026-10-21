"use client";

import { useState, type ReactElement } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { popupReducedMotionClassName } from "@/components/atoms/popupReducedMotionClassName";
import { tooltipBubbleClassName } from "@/components/atoms/tooltipBubbleClassName";
import { TOOLTIP_CURSOR_GAP, type ChartTooltipText } from "@/components/molecules/ChartTooltipBubble";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRootFontSize } from "@/lib/useRootFontSize";
import { cn } from "@/lib/utils";

// Tooltip 하나를 여러 요소가 함께 쓰도록 연결하는 handle
export type CursorTooltipHandle = TooltipPrimitive.Handle<ChartTooltipText>;

// Tooltip 하나와 그 Tooltip을 띄우는 요소들을 연결하는 handle 생성
export function useCursorTooltipHandle(): CursorTooltipHandle {
  const [handle] = useState(() => TooltipPrimitive.createHandle<ChartTooltipText>());
  return handle;
}

interface CursorTooltipTargetProps {
  handle: CursorTooltipHandle;
  text: ChartTooltipText;
  // Tooltip을 띄울 요소의 data-slot 값, 기본 trigger의 값이 요소의 값을 덮으므로 여기서 다시 지정
  slot: string;
  // Tooltip을 띄울 요소, 받은 props를 그 요소에 그대로 넘겨야 함
  children: ReactElement;
}

// 요소에 Hover하는 즉시 그 요소의 Text로 Tooltip을 띄우도록 연결
export function CursorTooltipTarget({ handle, text, slot, children }: CursorTooltipTargetProps) {
  return (
    <TooltipTrigger
      data-slot={slot}
      handle={handle}
      payload={text}
      delay={0}
      closeDelay={0}
      render={children}
    />
  );
}

interface CursorTooltipProps {
  handle: CursorTooltipHandle;
}

// 직접 그린 Chart의 Cell에 Hover했을 때만 뜨고 Cursor를 따라다니는 어두운 Tooltip 표시
export function CursorTooltip({ handle }: CursorTooltipProps) {
  const rootFontSize = useRootFontSize();
  return (
    <Tooltip handle={handle} trackCursorAxis="both">
      {({ payload }) => {
        const text = payload as ChartTooltipText | undefined;
        if (text === undefined) return null;
        return (
          <TooltipContent
            data-slot="cursor-tooltip"
            side="top"
            sideOffset={TOOLTIP_CURSOR_GAP * rootFontSize}
            className={cn(
              tooltipBubbleClassName,
              "pointer-events-none flex-col items-start gap-0 font-semibold whitespace-nowrap tabular-nums",
              // 기본 Component의 화살표는 그리지 않음
              "[&>[data-side]]:hidden",
              popupReducedMotionClassName,
            )}
          >
            <span data-slot="cursor-tooltip-title">{text.title}</span>
            {text.detail ? <span data-slot="cursor-tooltip-detail">{text.detail}</span> : null}
          </TooltipContent>
        );
      }}
    </Tooltip>
  );
}
