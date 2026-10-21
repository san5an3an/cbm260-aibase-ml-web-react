"use client";

import { useId } from "react";
import { CheckboxControl } from "@/components/atoms/CheckboxControl";
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

// plain은 Checkbox와 Label만, row는 Row 전체가 Click 영역이고 선택하면 배경이 칠해지는 List의 한 Row
export type CheckboxItemAppearance = "plain" | "row";

interface CheckboxItemBaseProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

// plain은 부가 설명, 도움말, 비활성화를 그리지 않으므로 받지 않음
type CheckboxItemProps = CheckboxItemBaseProps &
  (
    | {
        appearance?: Extract<CheckboxItemAppearance, "plain">;
        hint?: never;
        title?: never;
        disabled?: never;
      }
    | {
        appearance: Extract<CheckboxItemAppearance, "row">;
        // Label 뒤에 작게 붙는 부가 설명
        hint?: string;
        // Hover했을 때 표시할 도움말
        title?: string;
        // 선택할 수 없는 항목, Row를 옅게 표시
        disabled?: boolean;
      }
  );

// Checkbox와 Label을 한 Row로 표시
export function CheckboxItem(props: CheckboxItemProps) {
  const { label, checked, onCheckedChange } = props;
  const id = useId();

  if (props.appearance === "row") {
    const { hint, title, disabled = false } = props;
    return (
      <Field
        data-slot="checkbox-item"
        data-checked={checked}
        orientation="horizontal"
        title={title}
        className={cn(
          "relative isolate my-0.5 h-9 gap-2.5 rounded-sm px-2.5 text-sm",
          checked ? "bg-brand-line4-subtle" : "bg-transparent",
          disabled && "cursor-not-allowed opacity-45",
        )}
      >
        <CheckboxControl
          id={id}
          label={label}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          className="group-has-disabled/field:opacity-100"
        />
        <FieldLabel
          htmlFor={id}
          className={cn(
            "gap-2.5 text-sm leading-5 text-foreground after:absolute after:inset-0 after:-z-10",
            checked ? "font-semibold" : "font-normal",
            disabled ? "cursor-not-allowed" : "cursor-pointer",
          )}
        >
          {label}
          {hint ? (
            <span data-slot="checkbox-item-hint" className="text-xs text-muted-foreground">
              {hint}
            </span>
          ) : null}
        </FieldLabel>
      </Field>
    );
  }

  return (
    <Field data-slot="checkbox-item" orientation="horizontal" className="w-auto gap-2 px-1">
      <CheckboxControl id={id} label={label} checked={checked} onCheckedChange={onCheckedChange} />
      <FieldLabel htmlFor={id} className="cursor-pointer text-sm leading-5 font-normal">
        {label}
      </FieldLabel>
    </Field>
  );
}
