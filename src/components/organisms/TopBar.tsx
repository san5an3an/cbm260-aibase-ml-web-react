import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import Link from "next/link";
import { ThemeToggleButton } from "@/components/atoms/ThemeToggleButton";
import { ClockChip } from "@/components/molecules/ClockChip";
import { LiveStatusChip } from "@/components/molecules/LiveStatusChip";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TopBarProps {
  // 홈 Button이 이동할 주소와 Button의 Label
  homeHref: string;
  homeLabel: string;
  groupTitle: string;
  systemName: string;
  clockText: string;
  liveLabel: string;
  themeLabel: string;
  isDark: boolean;
  onToggleTheme: () => void;
}

// 홈 Button, Group 이름, 시스템 이름, 시계, Theme 전환이 있는 상단 Bar 표시
export function TopBar({
  homeHref,
  homeLabel,
  groupTitle,
  systemName,
  clockText,
  liveLabel,
  themeLabel,
  isDark,
  onToggleTheme,
}: TopBarProps) {
  return (
    <header data-slot="top-bar" className="flex h-[3.625rem] flex-none items-center gap-4 border-b border-rail-border bg-rail-bg px-5">
      <Link
        data-slot="top-bar-home"
        href={homeHref}
        title={homeLabel}
        aria-label={homeLabel}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-[1.875rem] rounded-md bg-rail-active text-primary-foreground transition-colors timing-micro hover:bg-rail-active/90 hover:text-primary-foreground hover:no-underline dark:hover:bg-rail-active/90",
        )}
      >
        <HomeRoundedIcon className="size-5" />
      </Link>
      <span data-slot="top-bar-title" className="text-[1.375rem] leading-7 font-bold">{groupTitle}</span>
      <span data-slot="top-bar-divider" className="h-[1.375rem] w-[0.0625rem] bg-border-strong opacity-60" />
      <span data-slot="top-bar-system-name" className="text-base font-medium text-muted-foreground">{systemName}</span>
      <span className="flex-1" />
      <ClockChip text={clockText} />
      <ThemeToggleButton isDark={isDark} label={themeLabel} onToggle={onToggleTheme} />
      <LiveStatusChip label={liveLabel} />
    </header>
  );
}
