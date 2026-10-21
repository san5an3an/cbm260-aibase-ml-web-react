import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => {};
}

// Browser에서 Rendering 중인지 확인
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
