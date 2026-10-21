import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let currentSecond: number | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function readSecond(): number {
  return Math.floor(Date.now() / 1000);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    currentSecond = readSecond();
    timer = setInterval(() => {
      currentSecond = readSecond();
      listeners.forEach((notify) => notify());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot(): number {
  if (currentSecond === null) {
    currentSecond = readSecond();
  }
  return currentSecond;
}

function getServerSnapshot(): null {
  return null;
}

// 1초마다 바뀌는 현재 시각(초) 구독, Server에서는 null 반환
export function useCurrentSecond(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
