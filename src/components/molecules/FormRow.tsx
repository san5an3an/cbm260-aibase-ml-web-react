"use client";

import type { ReactNode } from "react";
import { FieldMessage } from "@/components/atoms/FieldMessage";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

// Label 영역의 Width 정의, md는 좁은 영역과 사이 간격, mdLoose는 좁은 영역과 넓은 사이 간격, lg는 넓은 영역
export type FormRowLabelWidth = "md" | "mdLoose" | "lg";

const labelWidthClassNames: Record<FormRowLabelWidth, string> = {
  md: "grid-cols-[6.875rem_minmax(0,1fr)] gap-1",
  mdLoose: "grid-cols-[6.875rem_minmax(0,1fr)] gap-4",
  lg: "grid-cols-[8.5rem_minmax(0,1fr)] gap-0",
};

// Label과 Input의 정렬 방법 정의, start는 Label 40을 4 올려 Input 32와 가운데 맞춤, center는 한 Row Input만 있는 Row에 사용, top은 Label 40을 Row 위에 맞춤
export type FormRowAlign = "start" | "center" | "top";

const labelAlignClassNames: Record<FormRowAlign, string> = {
  start: "-mt-1 h-10",
  center: "",
  top: "h-10",
};

interface FormRowProps {
  label: string;
  // Label이 가리키는 Input의 id
  htmlFor?: string;
  // Input이 여럿일 때 Group의 이름으로 쓸 Label의 id
  labelId?: string;
  required?: boolean;
  labelWidth?: FormRowLabelWidth;
  align?: FormRowAlign;
  // Input 아래에 표시할 오류 문구
  error?: string | null;
  // 오류가 없을 때 Input 아래에 표시할 안내 문구 전달
  hint?: string;
  children: ReactNode;
}

// 왼쪽의 Label과 오른쪽의 Input, 오류 문구를 한 Row로 표시
export function FormRow({
  label,
  htmlFor,
  labelId,
  required = false,
  labelWidth = "lg",
  align = "start",
  error,
  hint,
  children,
}: FormRowProps) {
  return (
    <Field
      data-slot="form-row"
      orientation="horizontal"
      className={cn(
        "grid",
        labelWidthClassNames[labelWidth],
        align === "center"
          ? "items-center has-[>[data-slot=field-content]]:items-center"
          : "items-start",
      )}
    >
      <FieldLabel
        id={labelId}
        htmlFor={htmlFor}
        className={cn(
          "items-center gap-0 text-sm leading-5 font-bold",
          labelAlignClassNames[align],
        )}
      >
        {label}
        {required ? (
          <span aria-hidden className="pl-0.5 text-destructive">
            *
          </span>
        ) : null}
      </FieldLabel>
      <FieldContent className="min-w-0 gap-0">
        {children}
        {error ? (
          <FieldMessage message={error} />
        ) : hint ? (
          <FieldMessage tone="help" message={hint} />
        ) : null}
      </FieldContent>
    </Field>
  );
}
