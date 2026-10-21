import type { ComponentProps } from "react";
import { LoaderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// 화면 전체를 덮는 Loading 표시에만 쓰는 예외, MUI Icon 규칙 대신 shadcn Spinner 문서 Customization의 lucide LoaderIcon 사용
export function LoaderSpinner({ className, ...props }: ComponentProps<"svg">) {
  return (
    <LoaderIcon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}
