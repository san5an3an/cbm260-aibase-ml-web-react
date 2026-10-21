import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KeyValueRowProps {
  label: string;
  value: ReactNode;
  // 이름과 값을 한 Row로 두고 넘치는 값은 말줄임으로 표시, 값이 길어질 수 있는 위치에 사용
  singleLine?: boolean;
}

// 왼쪽의 이름과 오른쪽 끝의 굵은 값을 점선 밑줄과 함께 한 Row로 표시
export function KeyValueRow({ label, value, singleLine = false }: KeyValueRowProps) {
  return (
    <div
      data-slot="key-value-row"
      className={cn(
        "flex h-[2.375rem] flex-none items-center border-b border-dashed border-border text-sm leading-5",
        singleLine && "gap-3",
      )}
    >
      <span
        data-slot="key-value-row-label"
        className={cn("text-muted-foreground", singleLine && "whitespace-nowrap")}
      >
        {label}
      </span>
      <span className="flex-1" />
      <span
        data-slot="key-value-row-value"
        className={cn("font-bold tabular-nums", singleLine && "truncate")}
      >
        {value}
      </span>
    </div>
  );
}
