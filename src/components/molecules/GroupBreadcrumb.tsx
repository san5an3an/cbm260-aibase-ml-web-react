import type { SvgIconComponent } from "@mui/icons-material";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";

interface GroupBreadcrumbProps {
  icon: SvgIconComponent;
  title: string;
}

// 현재 Menu Group 이름 표시
export function GroupBreadcrumb({ icon: Icon, title }: GroupBreadcrumbProps) {
  return (
    <span data-slot="group-breadcrumb" className="flex items-center gap-1.5 text-sm text-foreground">
      <Icon className="size-[1.125rem] text-muted-foreground" />
      {title}
      <KeyboardArrowRightRoundedIcon className="size-[1.125rem] text-muted-foreground" />
    </span>
  );
}
