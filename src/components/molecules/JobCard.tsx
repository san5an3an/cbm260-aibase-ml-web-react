import type { ReactNode } from "react";
import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
import { StatePill, type StatePillTone } from "@/components/atoms/StatePill";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

// 설명 Text 색상, muted는 일반 설명, danger는 실패 설명
export type JobCardMetaTone = "muted" | "danger";

const metaToneClassNames: Record<JobCardMetaTone, string> = {
  muted: "text-muted-foreground",
  danger: "text-destructive",
};

interface JobCardProps {
  title: string;
  statusLabel: string;
  statusTone: StatePillTone;
  // 진행 중일 때 돌아가는 표시 옆에 보일 진행률 Text, 진행 중이 아니면 null
  progressText: string | null;
  // 돌아가는 표시의 이름, 화면 읽기 도구에는 숨기지만 기본 Component의 영문 기본 이름을 덮어씀
  progressLabel: string;
  meta: ReactNode;
  metaTone: JobCardMetaTone;
  // 마지막으로 연 Card인지 여부, Border를 굵게 칠하고 화면 읽기 도구에는 현재 항목(aria-current)으로 표시
  isSelected: boolean;
  // List를 다시 받거나 Request를 보내는 동안처럼 Click할 수 없는 상태 표시
  disabled: boolean;
  onOpen: () => void;
  // 설명 아래에 덧붙일 Row
  children?: ReactNode;
  className?: string;
}

// Job 1건의 제목, 상태, 진행률, 설명을 Click할 수 있는 Card로 표시
export function JobCard({
  title,
  statusLabel,
  statusTone,
  progressText,
  progressLabel,
  meta,
  metaTone,
  isSelected,
  disabled,
  onOpen,
  children,
  className,
}: JobCardProps) {
  return (
    <Button
      data-slot="job-card"
      aria-current={isSelected ? "true" : undefined}
      variant="ghost"
      disabled={disabled}
      // 비활성화된 동안에도 방금 Click한 Card가 Focus를 잃지 않도록 유지
      focusableWhenDisabled
      onClick={onOpen}
      className={cn(
        "h-auto min-w-0 cursor-pointer flex-col items-stretch justify-start gap-1.5 rounded-[0.625rem] bg-card text-left font-normal whitespace-normal text-foreground transition-[background-color,border-color,box-shadow,opacity] timing-micro hover:bg-card hover:text-foreground hover:shadow-[0_0.125rem_0.5rem_rgba(11,31,46,0.1)]",
        disabledLookClassName,
        "dark:hover:bg-card",
        // 선택한 Card는 Border가 굵어진 만큼 Padding을 줄여 크기를 그대로 유지, Border 굵기와 Padding은 전환 없이 바로 바꿈
        isSelected
          ? "border-[0.125rem] border-brand-line4 px-[0.9375rem] py-[0.8125rem]"
          : "border-border px-4 py-3.5",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span data-slot="job-card-title" className="truncate text-sm font-bold">
          {title}
        </span>
        <span className="flex-1" />
        <span className="flex flex-none">
          <StatePill size="md" tone={statusTone} label={statusLabel} />
        </span>
        {progressText === null ? null : (
          <>
            <Spinner
              aria-label={progressLabel}
              // 진행 상태는 상태 표시와 진행률 Text가 Card 이름으로 전달하므로 원형 표시는 화면 읽기 도구에 숨김
              aria-hidden
              className="size-3.5 flex-none animate-[spin_1.2s_linear_infinite] text-brand-line4 motion-reduce:animate-none"
            />
            <span
              data-slot="job-card-progress"
              className="flex-none text-sm font-bold text-brand-line4-text tabular-nums"
            >
              {progressText}
            </span>
          </>
        )}
      </span>
      <span
        data-slot="job-card-meta"
        className={cn("truncate text-xs leading-4 tabular-nums", metaToneClassNames[metaTone])}
      >
        {meta}
      </span>
      {children}
    </Button>
  );
}
