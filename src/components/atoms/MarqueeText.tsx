"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// 1 Cell 흐르는 속도(rem / 초)
const MARQUEE_SPEED_REM_PER_SECOND = 3;

interface MarqueeTextProps {
  children: ReactNode;
  className?: string;
  // 바깥 Component의 data-slot, 없으면 marquee-text
  "data-slot"?: string;
}

// 한 Row를 넘치는 Text, 감싼 Button에 Hover하면 넘친 만큼 왼쪽으로 흘려 끝까지 표시, 넘치지 않으면 그대로
export function MarqueeText({ children, className, "data-slot": slot = "marquee-text" }: MarqueeTextProps) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const [shiftRem, setShiftRem] = useState(0);

  // 넘친 길이를 rem으로 측정해 저장, 크기가 바뀔 때마다 다시 측정
  useEffect(() => {
    const box = boxRef.current;
    const text = box?.firstElementChild;
    if (!box || !(text instanceof HTMLElement)) return;
    const observer = new ResizeObserver(() => {
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
      setShiftRem(Math.max(0, text.scrollWidth - box.clientWidth) / rootFontSize);
    });
    observer.observe(box);
    observer.observe(text);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={boxRef}
      data-slot={slot}
      data-overflowing={shiftRem > 0 ? "" : undefined}
      className={cn(
        "block overflow-hidden whitespace-nowrap data-overflowing:[mask-image:linear-gradient(to_right,black_85%,transparent)] group-hover/button:data-overflowing:[mask-image:none]",
        className,
      )}
    >
      <span
        className="inline-block transition-transform ease-linear group-hover/button:[transform:translateX(calc(var(--marquee-shift)*-1))] motion-reduce:transition-none"
        style={
          {
            "--marquee-shift": `${shiftRem}rem`,
            transitionDuration: `${shiftRem / MARQUEE_SPEED_REM_PER_SECOND}s`,
          } as CSSProperties
        }
      >
        {children}
      </span>
    </span>
  );
}
