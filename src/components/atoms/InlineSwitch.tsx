"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Track 40 × 24, 꺼짐 muted-strong, 켜짐 primary, 기본 Component의 크기, Border, 꺼짐 배경을 덮어씀
const TRACK_CLASS_NAME =
  "h-6 w-10 border-0 timing-move data-[size=default]:h-6 data-[size=default]:w-10 data-unchecked:bg-muted-strong dark:data-unchecked:bg-muted-strong";

// Thumb 20, on-primary, 그림자, 양 끝에서 2 안쪽, reduced motion에서는 전환 없이 이동
const THUMB_CLASS_NAME =
  "[&_[data-slot=switch-thumb]]:size-5! [&_[data-slot=switch-thumb]]:bg-primary-foreground! [&_[data-slot=switch-thumb]]:shadow-[0_0.0625rem_0.125rem_rgba(0,0,0,0.25)] [&_[data-slot=switch-thumb]]:timing-move [&_[data-slot=switch-thumb][data-unchecked]]:translate-x-0.5! [&_[data-slot=switch-thumb][data-checked]]:translate-x-[1.125rem]! motion-reduce:[&_[data-slot=switch-thumb]]:transition-none";

// Label Text 색상 정의, success는 켜짐, muted는 꺼짐
export type InlineSwitchLabelTone = "success" | "muted";

const labelToneClassNames: Record<InlineSwitchLabelTone, string> = {
  success: "text-on-success-subtle",
  muted: "text-muted-foreground",
};

interface InlineSwitchProps {
  label: string;
  labelTone: InlineSwitchLabelTone;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  // Hover했을 때 표시할 안내 문구
  title?: string;
  // Click할 수 없게 옅게 표시, Focus는 그대로 받음
  isDisabled?: boolean;
}

// Table Cell 안에 놓는 작은 Switch와 작은 Label 표시, Label을 Click해도 상태 변경
export function InlineSwitch({
  label,
  labelTone,
  checked,
  onCheckedChange,
  title,
  isDisabled = false,
}: InlineSwitchProps) {
  return (
    <label
      data-slot="inline-switch"
      title={title}
      aria-disabled={isDisabled || undefined}
      className="flex w-24 cursor-pointer items-center gap-2 aria-disabled:cursor-default aria-disabled:opacity-50"
    >
      <Switch
        checked={checked}
        readOnly={isDisabled}
        aria-disabled={isDisabled || undefined}
        onCheckedChange={(nextChecked) => onCheckedChange(nextChecked)}
        className={cn(TRACK_CLASS_NAME, THUMB_CLASS_NAME)}
      />
      <span className={cn("text-xs font-semibold", labelToneClassNames[labelTone])}>{label}</span>
    </label>
  );
}
