"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface SegmentedOption<Value extends string> {
  value: Value;
  label: string;
}

// 선택지 하나의 좌우 Padding, md 12, lg 16
export type SegmentedItemPadding = "md" | "lg";

const itemPaddingClassNames: Record<SegmentedItemPadding, string> = {
  md: "px-3",
  lg: "px-4",
};

interface SegmentedProps<Value extends string> {
  // Group의 이름으로 쓸 Label의 id
  labelledBy: string;
  // 선택한 선택지, 아직 선택하지 않았으면 null
  value: Value | null;
  options: readonly SegmentedOption<Value>[];
  onValueChange: (value: Value) => void;
  // 선택지를 같은 Width로 나눠 Row를 가득 채움
  stretch?: boolean;
  itemPadding?: SegmentedItemPadding;
  // 오류를 표시하는 Group, Border 1 위치를 항상 두고 invalid일 때만 빨간 Border로 칠함
  outlined?: boolean;
  invalid?: boolean;
}

// 여럿 중 하나를 선택하는 Button Group 표시
export function Segmented<Value extends string>({
  labelledBy,
  value,
  options,
  onValueChange,
  stretch = false,
  itemPadding = "md",
  outlined = false,
  invalid = false,
}: SegmentedProps<Value>) {
  return (
    <ToggleGroup
      data-slot="segmented"
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      value={value === null ? [] : [value]}
      onValueChange={(nextValues) => {
        // 선택한 항목을 다시 Click해서 선택이 비워지는 동작은 무시
        const nextValue = nextValues[0] as Value | undefined;
        if (nextValue !== undefined) onValueChange(nextValue);
      }}
      spacing={0.5}
      className={cn(
        "h-8 rounded-md bg-muted p-0.5",
        stretch ? "grid w-full auto-cols-[minmax(0,1fr)] grid-flow-col" : "w-max",
        outlined && "h-[2.125rem] border border-transparent",
        outlined && invalid && "border-destructive",
      )}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className={cn(
            "h-7 min-w-0 rounded-sm text-sm font-normal text-muted-foreground timing-micro hover:bg-transparent hover:text-foreground aria-pressed:bg-card aria-pressed:font-semibold aria-pressed:text-foreground aria-pressed:shadow-[0_0.0625rem_0.125rem_rgba(11,31,46,0.12)]",
            stretch ? "px-0" : itemPaddingClassNames[itemPadding],
          )}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
