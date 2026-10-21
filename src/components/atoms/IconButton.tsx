import type { ReactNode } from "react";
import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IconButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  // Request 전송이나 List 재조회 중처럼 Click할 수 없는 상태 표시
  disabled?: boolean;
}

// Icon 하나로 된 사각형 Button 표시
export function IconButton({ label, icon, onClick, disabled = false }: IconButtonProps) {
  return (
    <Button
      data-slot="icon-button"
      variant="outline"
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled}
      // 비활성화된 동안에도 방금 Click한 Button이 Focus를 잃지 않도록 유지
      focusableWhenDisabled
      onClick={onClick}
      className={cn(
        "size-8 rounded-sm border-border bg-card text-foreground timing-micro",
        disabledLookClassName,
        "dark:border-border dark:bg-card",
      )}
    >
      {icon}
    </Button>
  );
}
