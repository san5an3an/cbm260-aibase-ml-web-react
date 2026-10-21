"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { showToast } from "@/components/molecules/Toast";
import { LeftRail } from "@/components/organisms/LeftRail";
import { LogoutConfirmDialog } from "@/components/organisms/LogoutConfirmDialog";
import { NavigationSidebar } from "@/components/organisms/NavigationSidebar";
import { PageBar } from "@/components/organisms/PageBar";
import { SessionExpiredDialog } from "@/components/organisms/SessionExpiredDialog";
import { SessionExpiryWarningDialog } from "@/components/organisms/SessionExpiryWarningDialog";
import { shellToastTexts } from "@/components/organisms/shellToastTexts";
import { TopBar } from "@/components/organisms/TopBar";
import { DeviceFailureAlertLayer } from "@/components/pages/monitoring-shell/DeviceFailureAlertLayer";
import { PageBarActionsContext } from "@/components/pages/monitoring-shell/PageBarActions";
import { useSessionCountdown } from "@/components/pages/monitoring-shell/useSessionCountdown";
import { MonitoringShellTemplate } from "@/components/templates/MonitoringShellTemplate";
import {
  defaultScreenPath,
  findNavigationByPath,
  loginScreenPath,
  navigationGroups,
} from "@/config/navigation";
import { systemConfig } from "@/config/system";
import { formatClock, formatCountdown } from "@/lib/formatTime";
import { clearLoginAccount } from "@/lib/loginAccount";
import { useCurrentSecond } from "@/lib/useCurrentSecond";
import { useIsClient } from "@/lib/useIsClient";
import { useLoginAccountGuard } from "@/lib/useLoginAccountGuard";
import { useRequestGuard } from "@/lib/useRequestGuard";
import { logout } from "@/services/auth";

const SESSION_WARNING_SECONDS = 60;

// Session Dialog 종류, warning은 1분 전 경고, expired는 만료
type SessionDialog = "warning" | "expired" | null;

// 보던 경로(경로와 조회 조건)를 next로 붙인 Login 화면 경로
function loginPathForCurrentScreen(): string {
  return loginScreenPath(`${window.location.pathname}${window.location.search}`);
}

interface MonitoringShellProps {
  children: ReactNode;
}

// 공통 Layout에 Menu, 홈 경로, 시계, Theme, Session 연결
export function MonitoringShell({ children }: MonitoringShellProps) {
  const pathname = usePathname();
  const isClient = useIsClient();
  const { resolvedTheme, setTheme } = useTheme();
  const currentSecond = useCurrentSecond();
  const session = useSessionCountdown();
  // 경고 Dialog를 닫은 만료 시각, 연장해 만료 시각이 바뀌기 전까지 다시 띄우지 않음
  const [dismissedExpiresAtSecond, setDismissedExpiresAtSecond] = useState<number | null>(null);
  const [isExtendingSession, setIsExtendingSession] = useState(false);
  const [isDeviceFailureOpen, setIsDeviceFailureOpen] = useState(false);
  // 현재 띄운 Session Dialog, 장치 고장 Dialog가 떠 있는 동안은 바꾸지 않음
  const [shownSessionDialog, setShownSessionDialog] = useState<SessionDialog>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  // 종료가 끝나 Login 화면을 불러오는 동안 종료 확인 Dialog의 Button과 취소 비활성화
  const [isLeavingForLogin, setIsLeavingForLogin] = useState(false);
  // 종료 Request 중에는 종료 확인 Dialog의 Button, 취소, Esc 비활성화, 실패하면 알림 표시
  const { isRequesting: isLoggingOut, request } = useRequestGuard((failureText) =>
    showToast(failureText, "error"),
  );
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuId = useId();
  // Login 표시 없이 화면이 보이게 되면(다른 Tab에서 종료한 뒤 미리 받아 둔 화면으로 이동, 종료 뒤 뒤로가기의 bfcache 등 proxy를 거치지 않은 이동) Login 화면으로 이동
  useLoginAccountGuard(true, loginPathForCurrentScreen, pathname);

  const match = findNavigationByPath(pathname);
  const group = match?.group ?? navigationGroups[0];
  const screen = match?.screen ?? group.screens[0];
  const isDark = isClient && resolvedTheme === "dark";
  const isSessionExpiringSoon =
    session.remainingSeconds !== null && session.remainingSeconds <= SESSION_WARNING_SECONDS;
  const isSessionExpired = session.remainingSeconds === 0;
  // 0초가 되면 1분 전 경고 대신 만료 Dialog 표시
  const wantedSessionDialog: SessionDialog =
    isSessionExpired
      ? "expired"
      : isSessionExpiringSoon && session.expiresAtSecond !== dismissedExpiresAtSecond
        ? "warning"
        : null;
  // 장치 고장 Dialog가 떠 있는 동안 Session Dialog를 열거나 닫으면 위의 고장 Dialog에서 Focus를 가져가므로 고장 Dialog를 확인한 뒤에 바꿈
  if (!isDeviceFailureOpen && shownSessionDialog !== wantedSessionDialog) {
    setShownSessionDialog(wantedSessionDialog);
  }

  // Session이 만료되면 Login 표시 삭제, 만료 Dialog를 띄운 채 새Logo침해도 Login 화면으로 이동
  useEffect(() => {
    if (isSessionExpired) clearLoginAccount();
  }, [isSessionExpired]);

  // Session 연장, 성공하면 연장 후 남은 시간을 알림. 실패 처리가 정해지지 않아 실패하면 알림 없이 그대로 둠(경고 Dialog도 유지)
  const extendAndNotify = async () => {
    try {
      const seconds = await session.extend();
      showToast(shellToastTexts.sessionExtended(formatCountdown(seconds)), "success");
    } catch {
      // 실패 알림 없음
    }
  };

  // 경고 Dialog에서 Session 연장, Request 중에는 확인 Button 비활성화하고 끝나면 해제
  const extendFromWarning = async () => {
    setIsExtendingSession(true);
    try {
      await extendAndNotify();
    } finally {
      setIsExtendingSession(false);
    }
  };

  // 만료 Dialog의 다시 Login, 보던 경로를 넘기고 Login 화면을 새로 불러와 저장하지 않은 Input과 화면 상태를 남기지 않음
  const goToLogin = () => {
    window.location.replace(loginPathForCurrentScreen());
  };

  // 종료 확인 Dialog의 모니터링 종료, Logout이 성공하면 Login 표시를 지우고 만료 Dialog의 다시 Login과 같이 Login 화면을 새로 불러옴. 실패하면 Dialog와 표시를 그대로 둠
  const logoutAndGoToLogin = async () => {
    const isDone = await request(() => logout(), shellToastTexts.logoutFailed);
    if (!isDone) return;
    clearLoginAccount();
    setIsLeavingForLogin(true);
    goToLogin();
  };

  return (
    <PageBarActionsContext value={actionsSlot}>
      <MonitoringShellTemplate
        contentKey={pathname}
        rail={
          <LeftRail
            logoSrc="/seoulMetro_logo.svg"
            logoAlt={systemConfig.operatorName}
            menuLabel="메뉴"
            menuControlsId={menuId}
            isMenuOpen={isMenuOpen}
            onMenuClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            powerLabel="모니터링 종료"
            onPowerClick={() => setIsLogoutConfirmOpen(true)}
            groups={navigationGroups.map((item) => ({
              key: item.key,
              label: item.title,
              href: item.screens[0].path,
              icon: item.icon,
            }))}
            activeGroupKey={group.key}
          />
        }
        sidebar={
          <NavigationSidebar
            id={menuId}
            title="전체 메뉴"
            groups={navigationGroups.map((item) => ({
              key: item.key,
              label: item.title,
              icon: item.icon,
              screens: item.screens.map((candidate) => ({
                key: candidate.key,
                label: candidate.title,
                href: candidate.path,
                isActive: candidate.path === screen.path,
              })),
            }))}
            isOpen={isMenuOpen}
            onOpenChange={setIsMenuOpen}
          />
        }
        isSidebarOpen={isMenuOpen}
        topBar={
          <TopBar
            homeHref={defaultScreenPath}
            homeLabel="홈"
            groupTitle={group.title}
            systemName={systemConfig.name}
            clockText={currentSecond === null ? "" : formatClock(new Date(currentSecond * 1000))}
            liveLabel="실시간 모니터링"
            themeLabel="다크 모드"
            isDark={isDark}
            onToggleTheme={() => setTheme(isDark ? "light" : "dark")}
          />
        }
        pageBar={
          <PageBar
            groupIcon={group.icon}
            groupTitle={group.title}
            tabs={group.screens.map((item) => ({
              key: item.key,
              label: item.title,
              href: item.path,
            }))}
            activeTabKey={screen.key}
            tabsLabel={`${group.title} 화면`}
            sessionLabel="세션 만료까지"
            sessionRemainingText={
              session.remainingSeconds === null
                ? "--:--"
                : formatCountdown(session.remainingSeconds)
            }
            isSessionExpiringSoon={isSessionExpiringSoon}
            sessionExtendLabel="연장"
            onExtendSession={() => void extendAndNotify()}
            actionsSlotRef={setActionsSlot}
          />
        }
      >
        {children}
      </MonitoringShellTemplate>
      <LogoutConfirmDialog
        open={isLogoutConfirmOpen}
        isConfirming={isLoggingOut || isLeavingForLogin}
        onConfirm={() => void logoutAndGoToLogin()}
        onCancel={() => {
          if (!isLoggingOut && !isLeavingForLogin) setIsLogoutConfirmOpen(false);
        }}
      />
      <SessionExpiryWarningDialog
        open={shownSessionDialog === "warning"}
        isConfirming={isExtendingSession}
        onConfirm={() => void extendFromWarning()}
        onCancel={() => setDismissedExpiresAtSecond(session.expiresAtSecond)}
      />
      <SessionExpiredDialog open={shownSessionDialog === "expired"} onConfirm={goToLogin} />
      {/* Session Dialog와 동시에 열려도 고장 Dialog가 가장 나중에 붙어 맨 앞에서 Focus를 갖도록 마지막에 배치 */}
      <DeviceFailureAlertLayer onOpenChange={setIsDeviceFailureOpen} />
    </PageBarActionsContext>
  );
}
