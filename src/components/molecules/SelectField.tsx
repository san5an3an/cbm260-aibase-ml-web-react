"use client";

import { popupReducedMotionClassName } from "@/components/atoms/popupReducedMotionClassName";
import { selectLikeTriggerClassName } from "@/components/atoms/selectLikeTriggerClassName";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SelectFieldOption<Value extends string | number> {
  value: Value;
  label: string;
}

interface SelectFieldProps<Value extends string | number> {
  // 보이는 Label과 연결하는 id
  id?: string;
  label: string;
  // 아직 선택하지 않았으면 null
  value: Value | null;
  options: readonly SelectFieldOption<Value>[];
  onValueChange: (value: Value) => void;
  // 선택하지 않았을 때 표시할 안내 문구
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// List에서 하나를 선택하는 Select 표시
export function SelectField<Value extends string | number>({
  id,
  label,
  value,
  options,
  onValueChange,
  placeholder,
  disabled = false,
  className,
}: SelectFieldProps<Value>) {
  return (
    <Select
      id={id}
      items={[...options]}
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onValueChange(nextValue as Value);
      }}
    >
      <SelectTrigger
        aria-label={label}
        className={cn(
          selectLikeTriggerClassName,
          "text-foreground disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 data-popup-open:border-brand-line4 data-popup-open:shadow-[0_0_0_0.0625rem_var(--brand-line4),0_0_0_0.25rem_var(--brand-line4-subtle)] dark:disabled:bg-muted [&>svg]:size-[1.125rem]",
          // 선택한 값이 빈 문자열("전체")이어도 안내 문구의 Color가 아니라 선택한 값의 Color로 표시
          value !== null && !disabled && "data-placeholder:text-foreground",
          className,
        )}
      >
        <SelectValue className="min-w-0" placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className={cn(
          "min-w-35 rounded-md border border-border shadow-[0_0.5rem_1.5rem_rgba(11,31,46,0.14)] ring-0",
          popupReducedMotionClassName,
        )}
      >
        <SelectGroup className="flex flex-col gap-[0.0625rem]">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="min-h-8 cursor-pointer rounded-[0.25rem] py-0 pr-2 pl-[1.875rem] font-normal focus:bg-muted focus:text-foreground aria-selected:bg-brand-line4-subtle aria-selected:font-semibold aria-selected:focus:bg-brand-line4-subtle *:[span]:last:right-auto *:[span]:last:left-2 **:[svg]:text-primary!"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
