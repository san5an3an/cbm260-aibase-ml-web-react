"use client";

import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface CheckboxControlProps {
  // 보이는 Label과 연결하는 id
  id?: string;
  label: string;
  checked: boolean;
  // 일부만 선택된 상태 표시
  indeterminate?: boolean;
  // 선택할 수 없는 항목 표시
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  // 감싸는 Row가 옅기를 대신 정할 때 Checkbox 자체의 옅기를 덮어쓰는 class
  className?: string;
}

// Label이 보이지 않는 Checkbox 하나 표시
export function CheckboxControl({
  id,
  label,
  checked,
  indeterminate = false,
  disabled = false,
  onCheckedChange,
  className,
}: CheckboxControlProps) {
  return (
    <span data-slot="checkbox-control" className="relative flex size-4">
      <Checkbox
        id={id}
        aria-label={label}
        checked={checked}
        indeterminate={indeterminate}
        disabled={disabled}
        onCheckedChange={(nextChecked) => onCheckedChange(nextChecked)}
        className={cn(
          "rounded-[0.25rem] border-border-strong bg-card timing-micro data-indeterminate:border-primary data-indeterminate:bg-primary dark:bg-card dark:data-indeterminate:bg-primary data-indeterminate:[&_svg]:hidden",
          className,
        )}
      />
      {indeterminate ? (
        <RemoveRoundedIcon
          aria-hidden
          data-slot="checkbox-control-partial"
          className="pointer-events-none absolute inset-0 m-auto size-3.5 text-primary-foreground"
        />
      ) : null}
    </span>
  );
}
