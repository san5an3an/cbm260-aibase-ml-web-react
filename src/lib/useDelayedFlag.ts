import { useEffect, useState } from "react";

// 같은 key가 delayMs를 넘게 이어지면 true 반환, key가 null이면 false, key가 바뀌면 false부터 다시 계산
export function useDelayedFlag(key: number | null, delayMs: number): boolean {
  const [reachedKey, setReachedKey] = useState<number | null>(null);

  useEffect(() => {
    if (key === null) return;
    const timer = setTimeout(() => setReachedKey(key), delayMs);
    return () => clearTimeout(timer);
  }, [key, delayMs]);

  return key !== null && reachedKey === key;
}
