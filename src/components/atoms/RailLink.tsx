import type { SvgIconComponent } from "@mui/icons-material";
import Link from "next/link";
import { railIdleClassName, railItemClassName } from "@/components/atoms/railItemClassName";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RailLinkProps {
  href: string;
  icon: SvgIconComponent;
  label: string;
  isActive: boolean;
}

// 왼쪽 레일의 Menu Group Link 표시
export function RailLink({ href, icon: Icon, label, isActive }: RailLinkProps) {
  return (
    <Link
      data-slot="rail-link"
      href={href}
      title={label}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        railItemClassName,
        isActive
          ? "bg-rail-active text-primary-foreground hover:bg-rail-active hover:text-primary-foreground dark:hover:bg-rail-active"
          : railIdleClassName,
      )}
    >
      <Icon className="size-6" />
    </Link>
  );
}
