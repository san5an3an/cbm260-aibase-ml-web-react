import type { ComponentProps } from "react";
import type { SvgIconComponent } from "@mui/icons-material";
import { railIdleClassName, railItemClassName } from "@/components/atoms/railItemClassName";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RailButtonProps
  extends Omit<ComponentProps<typeof Button>, "children" | "variant" | "size"> {
  icon: SvgIconComponent;
  label: string;
  tone?: "default" | "power";
}

// 왼쪽 레일의 Icon Button 표시
export function RailButton({
  icon: Icon,
  label,
  tone = "default",
  className,
  ...props
}: RailButtonProps) {
  return (
    <Button
      data-slot="rail-button"
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      className={cn(
        railItemClassName,
        tone === "power"
          ? "bg-rail-power text-danger-fg hover:bg-rail-power/90 hover:text-danger-fg dark:hover:bg-rail-power/90"
          : railIdleClassName,
        className,
      )}
      {...props}
    >
      <Icon className="size-6" />
    </Button>
  );
}
