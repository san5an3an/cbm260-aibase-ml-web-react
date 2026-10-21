"use client";

import { Progress, ProgressValue } from "@/components/ui/progress";

interface ProgressBarProps {
  // 화면 읽기 도구가 읽을 Bar의 이름
  label: string;
  // 진행률(%), 0 ~ 100
  percent: number;
  // 진행률 뒤에 덧붙일 설명, 없으면 빈 문자열
  meta: string;
}

// 진행률을 Gradient Bar, 굵은 %, 설명으로 한 Row에 표시
export function ProgressBar({ label, percent, meta }: ProgressBarProps) {
  return (
    <Progress
      data-slot="progress-bar"
      value={percent}
      aria-label={label}
      className="flex-nowrap items-center gap-3 *:data-[slot=progress-track]:order-first *:data-[slot=progress-track]:h-2 *:data-[slot=progress-track]:flex-1 *:data-[slot=progress-track]:rounded-[0.25rem] *:data-[slot=progress-track]:bg-brand-line4-subtle **:data-[slot=progress-indicator]:rounded-[0.25rem] **:data-[slot=progress-indicator]:bg-(image:--gradient-brand-line4) **:data-[slot=progress-indicator]:duration-(--motion-duration-moderate) **:data-[slot=progress-indicator]:ease-(--motion-ease-out) motion-reduce:**:data-[slot=progress-indicator]:transition-none"
    >
      <ProgressValue className="ml-0 text-sm leading-4 font-bold text-brand-line4-text">
        {() => `${percent}%`}
      </ProgressValue>
      <span data-slot="progress-bar-meta" className="text-sm leading-4 text-muted-foreground">
        {meta}
      </span>
    </Progress>
  );
}
