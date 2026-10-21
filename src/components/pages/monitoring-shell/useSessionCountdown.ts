import { useCallback, useEffect, useState } from "react";
import { useCurrentSecond } from "@/lib/useCurrentSecond";
import { extendSession, fetchSessionRemainingSeconds } from "@/services/session";

interface SessionCountdown {
  remainingSeconds: number | null;
  // 현재 Session 만료 시각(초), 연장하면 바뀌므로 경고를 닫은 만료 시각을 기억하는 Key로 사용
  expiresAtSecond: number | null;
  // Session을 연장하고 연장 후 남은 시간(초) 반환
  extend: () => Promise<number>;
}

function readSecond(): number {
  return Math.floor(Date.now() / 1000);
}

// Session 만료까지 남은 시간을 1초마다 계산
export function useSessionCountdown(): SessionCountdown {
  const currentSecond = useCurrentSecond();
  const [expiresAtSecond, setExpiresAtSecond] = useState<number | null>(null);

  useEffect(() => {
    let isCancelled = false;
    fetchSessionRemainingSeconds().then((seconds) => {
      if (!isCancelled) {
        setExpiresAtSecond(readSecond() + seconds);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  const extend = useCallback(async () => {
    const seconds = await extendSession();
    setExpiresAtSecond(readSecond() + seconds);
    return seconds;
  }, []);

  const remainingSeconds =
    currentSecond === null || expiresAtSecond === null
      ? null
      : Math.max(0, expiresAtSecond - currentSecond);

  return { remainingSeconds, expiresAtSecond, extend };
}
