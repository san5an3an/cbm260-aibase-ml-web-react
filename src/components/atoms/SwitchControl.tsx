"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Track 44 × 24, 꺼짐 muted-strong, 켜짐 primary, 기본 Component의 크기, Border, 꺼짐 배경을 덮어씀
const TRACK_CLASS_NAME =
  "h-6 w-11 border-0 timing-move data-[size=default]:h-6 data-[size=default]:w-11 data-unchecked:bg-muted-strong dark:data-unchecked:bg-muted-strong";

// Thumb 20, on-primary, 그림자, 세로 가운데 배치, 양 끝에서 2 안쪽, reduced motion에서는 전환 없이 이동
const THUMB_CLASS_NAME =
  "[&_[data-slot=switch-thumb]]:size-5! [&_[data-slot=switch-thumb]]:bg-primary-foreground! [&_[data-slot=switch-thumb]]:shadow-[0_0.0625rem_0.125rem_rgba(0,0,0,0.25)] [&_[data-slot=switch-thumb]]:timing-move [&_[data-slot=switch-thumb][data-unchecked]]:translate-x-0.5! [&_[data-slot=switch-thumb][data-checked]]:translate-x-[1.375rem]! motion-reduce:[&_[data-slot=switch-thumb]]:transition-none";

// Label 굵기 정의, medium 500, semibold 600
export type SwitchControlLabelWeight = "medium" | "semibold";

const labelWeightClassNames: Record<SwitchControlLabelWeight, string> = {
  medium: "font-medium",
  semibold: "font-semibold",
};

interface SwitchControlProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  labelWeight?: SwitchControlLabelWeight;
}

// 오른쪽에 Label이 붙은 Switch 표시, Label을 Click해도 상태 변경
export function SwitchControl({
  label,
  checked,
  onCheckedChange,
  labelWeight = "semibold",
}: SwitchControlProps) {
  return (
    <label
      data-slot="switch-control"
      className={cn(
        "flex w-max cursor-pointer items-center gap-2 text-sm text-foreground",
        labelWeightClassNames[labelWeight],
      )}
    >
      <Switch
        checked={checked}
        onCheckedChange={(nextChecked) => onCheckedChange(nextChecked)}
        className={cn(TRACK_CLASS_NAME, THUMB_CLASS_NAME)}
      />
      {label}
    </label>
  );
}
