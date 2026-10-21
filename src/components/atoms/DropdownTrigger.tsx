import type { ComponentProps } from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { selectLikeTriggerClassName } from "@/components/atoms/selectLikeTriggerClassName";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DropdownTriggerProps extends Omit<ComponentProps<typeof Button>, "children"> {
  // Button에 표시할 선택 값이나 안내 문구
  text: string;
  // 선택한 값이 없어 안내 문구를 표시 중인지 여부
  isEmpty: boolean;
}

// Select와 같은 모양으로 선택 값과 아래 화살표를 표시하는 Dropdown 열기 Button 표시
export function DropdownTrigger({ text, isEmpty, className, ...props }: DropdownTriggerProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        selectLikeTriggerClassName,
        "justify-start font-normal hover:bg-card aria-expanded:bg-card dark:border-border",
        isEmpty
          ? "text-muted-foreground hover:text-muted-foreground aria-expanded:text-muted-foreground"
          : "text-foreground",
        className,
      )}
      {...props}
    >
      <span data-slot="dropdown-trigger-text" className="flex-1 text-left">
        {text}
      </span>
      <KeyboardArrowDownRoundedIcon aria-hidden className="size-[1.125rem] text-muted-foreground" />
    </Button>
  );
}
