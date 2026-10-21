import type { SvgIconComponent } from "@mui/icons-material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import Image from "next/image";
import { RailButton } from "@/components/atoms/RailButton";
import { RailLink } from "@/components/atoms/RailLink";

export interface LeftRailGroup {
  key: string;
  label: string;
  href: string;
  icon: SvgIconComponent;
}

interface LeftRailProps {
  logoSrc: string;
  logoAlt: string;
  menuLabel: string;
  // Menu Button이 여닫는 영역의 id와 현재 열려 있는지 여부
  menuControlsId: string;
  isMenuOpen: boolean;
  onMenuClick: () => void;
  powerLabel: string;
  groups: readonly LeftRailGroup[];
  activeGroupKey: string;
  onPowerClick?: () => void;
}

// Logo, Menu Group, 종료 Button이 있는 왼쪽 Rail 표시
export function LeftRail({
  logoSrc,
  logoAlt,
  menuLabel,
  menuControlsId,
  isMenuOpen,
  onMenuClick,
  powerLabel,
  groups,
  activeGroupKey,
  onPowerClick,
}: LeftRailProps) {
  return (
    <aside data-slot="left-rail" className="flex w-18 flex-none flex-col items-center gap-4 border-r border-rail-border bg-rail-bg pt-[1.8125rem] pb-5">
      <Image
        src={logoSrc}
        alt={logoAlt}
        width={32}
        height={32}
        className="-mt-1 mb-[0.8125rem] block size-8"
      />
      <RailButton
        icon={MenuRoundedIcon}
        label={menuLabel}
        aria-expanded={isMenuOpen}
        aria-controls={menuControlsId}
        onClick={onMenuClick}
        className={isMenuOpen ? "bg-rail-hover" : undefined}
      />
      {groups.map((group) => (
        <RailLink
          key={group.key}
          href={group.href}
          icon={group.icon}
          label={group.label}
          isActive={group.key === activeGroupKey}
        />
      ))}
      <span className="flex-1" />
      <RailButton
        icon={PowerSettingsNewRoundedIcon}
        label={powerLabel}
        tone="power"
        onClick={onPowerClick}
      />
    </aside>
  );
}
