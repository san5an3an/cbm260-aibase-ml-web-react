import type { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
}

// 조회 조건을 한 Row로 늘어놓는 배경 표시
export function FilterBar({ children, ...props }: FilterBarProps & { "data-slot"?: string }) {
  return (
    <div
      data-slot="filter-bar"
      className="flex flex-none items-center gap-2.5 rounded-[1rem] border border-border bg-surface-low p-4"
      {...props}
    >
      {children}
    </div>
  );
}
