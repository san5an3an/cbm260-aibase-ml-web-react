import type { SvgIconComponent } from "@mui/icons-material";
import { GroupBreadcrumb } from "@/components/molecules/GroupBreadcrumb";
import { ScreenTabs, type ScreenTab } from "@/components/molecules/ScreenTabs";
import { SessionChip } from "@/components/molecules/SessionChip";

interface PageBarProps {
  groupIcon: SvgIconComponent;
  groupTitle: string;
  tabs: readonly ScreenTab[];
  activeTabKey: string;
  tabsLabel: string;
  sessionLabel: string;
  sessionRemainingText: string;
  isSessionExpiringSoon: boolean;
  sessionExtendLabel: string;
  onExtendSession: () => void;
  actionsSlotRef: (element: HTMLDivElement | null) => void;
}

// Group 이름, Page Tab, 화면별 Button 영역, Session Badge가 있는 Page Bar 표시
export function PageBar({
  groupIcon,
  groupTitle,
  tabs,
  activeTabKey,
  tabsLabel,
  sessionLabel,
  sessionRemainingText,
  isSessionExpiringSoon,
  sessionExtendLabel,
  onExtendSession,
  actionsSlotRef,
}: PageBarProps) {
  return (
    <div data-slot="page-bar" className="mx-3.5 mt-3.5 flex h-8 flex-none items-center gap-3">
      <GroupBreadcrumb icon={groupIcon} title={groupTitle} />
      <ScreenTabs tabs={tabs} activeKey={activeTabKey} label={tabsLabel} />
      <span className="flex-1" />
      <div ref={actionsSlotRef} className="contents" />
      <SessionChip
        label={sessionLabel}
        remainingText={sessionRemainingText}
        isExpiringSoon={isSessionExpiringSoon}
        extendLabel={sessionExtendLabel}
        onExtend={onExtendSession}
      />
    </div>
  );
}
