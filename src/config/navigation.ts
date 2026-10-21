import type { SvgIconComponent } from "@mui/icons-material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import { safeNextPath } from "@/lib/safeNextPath";

export interface NavigationScreen {
  key: string;
  title: string;
  path: string;
}

export interface NavigationGroup {
  key: string;
  title: string;
  icon: SvgIconComponent;
  screens: readonly NavigationScreen[];
}

export interface NavigationMatch {
  group: NavigationGroup;
  screen: NavigationScreen;
}

// Menu Group과 화면 목록 정의, 화면 key를 Type으로 읽도록 값 그대로 보관
const navigationGroupList = [
  {
    key: "dashboard",
    title: "CBM 대시보드",
    icon: GridViewRoundedIcon,
    screens: [
      { key: "fleet", title: "플릿 개요", path: "/dashboard/fleet" },
      { key: "timeline", title: "이상 타임라인", path: "/dashboard/timeline" },
      { key: "alarms", title: "알람/이벤트", path: "/dashboard/alarms" },
      { key: "measures", title: "조치 관리", path: "/dashboard/measures" },
    ],
  },
  {
    key: "info",
    title: "CBM 정보",
    icon: LayersRoundedIcon,
    screens: [
      { key: "training", title: "재학습 설정", path: "/info/training" },
      { key: "inference", title: "추론", path: "/info/inference" },
      { key: "anomaly", title: "이상 감지 내역", path: "/info/anomaly" },
    ],
  },
  {
    key: "model",
    title: "CBM 모델",
    icon: AutoAwesomeRoundedIcon,
    screens: [
      { key: "config", title: "모델 커스텀", path: "/model/config" },
      { key: "ensemble", title: "모델 비교", path: "/model/ensemble" },
      { key: "threshold", title: "임계 튜닝", path: "/model/threshold" },
      { key: "diagnostics", title: "모델 진단", path: "/model/diagnostics" },
    ],
  },
] as const satisfies readonly NavigationGroup[];

// Menu 목록에 있는 화면의 key만 받도록 한정
export type ScreenKey = (typeof navigationGroupList)[number]["screens"][number]["key"];

// Menu를 그리는 Component에 넘길 Menu Group 목록 지정
export const navigationGroups: readonly NavigationGroup[] = navigationGroupList;

// 처음 진입했을 때 표시할 화면 경로 지정
export const defaultScreenPath = navigationGroups[0].screens[0].path;

// 공통 Layout 밖의 Login 화면 경로 지정
export const loginPath = "/login";

// Login 후 돌아갈 경로(경로와 조회 조건)를 붙인 Login 화면 경로 반환
export function loginScreenPath(nextPath: string): string {
  return `${loginPath}?next=${encodeURIComponent(nextPath)}`;
}

// Login 후 이동할 경로 반환, next가 같은 사이트 경로면 그 경로, 아니거나 Login 화면이면 첫 화면
export function pathAfterLogin(next: string | null, origin: string): string {
  const path = safeNextPath(next, origin, defaultScreenPath);
  return new URL(path, origin).pathname === loginPath ? defaultScreenPath : path;
}

// 화면 key에 해당하는 경로 반환
export function screenPath(key: ScreenKey): string {
  for (const group of navigationGroups) {
    const screen = group.screens.find((candidate) => candidate.key === key);
    if (screen) {
      return screen.path;
    }
  }
  throw new Error(`메뉴 목록에 없는 화면: ${key}`);
}

// 경로에 해당하는 Group과 화면 검색
export function findNavigationByPath(pathname: string): NavigationMatch | null {
  for (const group of navigationGroups) {
    const screen = group.screens.find((candidate) => candidate.path === pathname);
    if (screen) {
      return { group, screen };
    }
  }
  return null;
}
