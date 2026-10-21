"use client";

import { Textarea } from "@/components/ui/textarea";

interface TextAreaInputProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  // 한 번에 보이는 Row 수, 넘치면 Input 안에서 Scroll
  rows: number;
}

// 여러 Row Text Input 표시
export function TextAreaInput({ id, value, onValueChange, placeholder, rows }: TextAreaInputProps) {
  return (
    <Textarea
      id={id}
      data-slot="text-area-input"
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(event) => onValueChange(event.target.value)}
      className="field-sizing-fixed min-h-0 resize-none rounded-sm border-border bg-card px-3.5 py-2.5 text-sm leading-5 text-foreground placeholder:text-[darkgray] focus-visible:border-brand-line4 focus-visible:shadow-[0_0_0_0.0625rem_var(--brand-line4),0_0_0_0.25rem_var(--brand-line4-subtle)] focus-visible:ring-0 md:text-sm dark:bg-card"
    />
  );
}
