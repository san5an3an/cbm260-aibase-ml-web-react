import { useEffect, useEffectEvent, useLayoutEffect } from "react";
import { readLoginAccount } from "@/lib/loginAccount";

// 현재 문서를 숨기고 해당 경로를 새로 불러옴, 새 문서가 열릴 때까지 현재 화면이 보이지 않게 함
function leaveTo(path: string): void {
  document.documentElement.style.visibility = "hidden";
  window.location.replace(path);
}

// Login 표시(Cookie)가 현재 화면과 맞지 않으면 이동할 경로를 새로 불러옴, 화면 Mount, checkKey(경로 등) 변경, Browser가 보관한 화면을 다시 보일 때(bfcache)에 확인해 proxy를 거치지 않는 이동을 차단
export function useLoginAccountGuard(needsLogin: boolean, leavePath: () => string, checkKey: string): void {
  const check = useEffectEvent(() => {
    const isLoggedIn = readLoginAccount(document.cookie) !== null;
    if (isLoggedIn !== needsLogin) leaveTo(leavePath());
  });

  // 그리기 전에 확인해 맞지 않는 화면이 한 번도 보이지 않게 함
  useLayoutEffect(() => {
    check();
  }, [checkKey]);

  useEffect(() => {
    const checkRestored = (event: PageTransitionEvent) => {
      if (event.persisted) check();
    };
    window.addEventListener("pageshow", checkRestored);
    return () => window.removeEventListener("pageshow", checkRestored);
  }, []);
}
