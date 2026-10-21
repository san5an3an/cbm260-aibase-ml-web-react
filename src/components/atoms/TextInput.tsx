"use client";

import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

// 단위나 앞 Icon이 붙는 Input의 바깥 Component, Border, 배경, Focus, 오류 표시 담당
const inputGroupClassName =
  "h-8 rounded-sm border-border bg-card dark:bg-card has-[[data-slot=input-group-control]:focus-visible]:border-brand-line4 has-[[data-slot=input-group-control]:focus-visible]:shadow-[0_0_0_0.0625rem_var(--brand-line4),0_0_0_0.25rem_var(--brand-line4-subtle)] has-[[data-slot=input-group-control]:focus-visible]:ring-0 has-[[data-slot][aria-invalid=true]]:border-[0.125rem] has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-0 has-[[data-slot][aria-invalid=true]]:has-[[data-slot=input-group-control]:focus-visible]:border has-[[data-slot][aria-invalid=true]]:has-[[data-slot=input-group-control]:focus-visible]:border-brand-line4";

interface TextInputBaseProps {
  id?: string;
  // 보이는 Label이 없는 Input에서 화면 읽기 도구가 읽을 이름
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  required?: boolean;
  inputMode?: ComponentProps<"input">["inputMode"];
  // Input에서 Focus가 나갈 때 호출
  onBlur?: () => void;
  className?: string;
}

// 단위와 앞 Icon은 함께 그리지 않으므로 하나만 받음
type TextInputProps = TextInputBaseProps &
  (
    | {
        // Input의 오른쪽 끝에 붙는 단위 Text
        unit: string;
        leadingIcon?: never;
      }
    | {
        unit?: undefined;
        // Input의 왼쪽 앞에 붙는 Icon
        leadingIcon?: ReactNode;
      }
  );

// 한 Row Text Input 표시, 단위가 있으면 Input 안 오른쪽 끝에 함께 표시
export function TextInput({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  unit,
  leadingIcon,
  invalid = false,
  required = false,
  inputMode,
  onBlur,
  className,
}: TextInputProps) {
  const inputProps = {
    id,
    "aria-label": label,
    value,
    placeholder,
    inputMode,
    "aria-invalid": invalid || undefined,
    "aria-required": required || undefined,
    autoComplete: "off",
    onChange: (event: { target: { value: string } }) => onValueChange(event.target.value),
    onBlur,
  };

  if (unit !== undefined) {
    return (
      <InputGroup
        data-slot="text-input"
        className={cn(
          inputGroupClassName,
          "has-[>[data-align=inline-end]]:[&>input]:pr-2",
          className,
        )}
      >
        <InputGroupInput
          {...inputProps}
          className="h-full py-0 pl-3 text-sm text-foreground placeholder:text-[darkgray] md:text-sm"
        />
        <InputGroupAddon align="inline-end" className="py-0 pr-[0.6875rem] font-normal">
          <InputGroupText data-slot="text-input-unit">{unit}</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    );
  }

  if (leadingIcon !== undefined) {
    return (
      <InputGroup
        data-slot="text-input"
        className={cn(
          inputGroupClassName,
          "has-[>[data-align=inline-start]]:[&>input]:pl-2",
          className,
        )}
      >
        <InputGroupInput
          {...inputProps}
          className="h-full py-0 pr-3 text-sm text-foreground placeholder:text-[darkgray] md:text-sm"
        />
        <InputGroupAddon
          align="inline-start"
          className="py-0 pl-2.5 text-muted-foreground [&>svg]:size-4"
        >
          {leadingIcon}
        </InputGroupAddon>
      </InputGroup>
    );
  }

  return (
    <Input
      {...inputProps}
      data-slot="text-input"
      className={cn(
        "h-8 rounded-sm border-border bg-card px-3 py-0 text-sm text-foreground placeholder:text-[darkgray] focus-visible:border-brand-line4 focus-visible:shadow-[0_0_0_0.0625rem_var(--brand-line4),0_0_0_0.25rem_var(--brand-line4-subtle)] focus-visible:ring-0 aria-invalid:border-[0.125rem] aria-invalid:border-destructive aria-invalid:ring-0 aria-invalid:focus-visible:border aria-invalid:focus-visible:border-brand-line4 md:text-sm dark:bg-card dark:aria-invalid:border-destructive",
        className,
      )}
    />
  );
}
