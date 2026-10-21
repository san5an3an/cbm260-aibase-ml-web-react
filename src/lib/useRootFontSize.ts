import { useSyncExternalStore } from "react";

const DEFAULT_ROOT_FONT_SIZE = 16;

function subscribe(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  // Font 크기를 직접 바꾸는 경우도 감지
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
  return () => {
    window.removeEventListener("resize", onChange);
    observer.disconnect();
  };
}

function readRootFontSize(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize);
}

// 기준 Font 크기(px) 구독, rem 값을 px 숫자로 바꿀 때 사용
export function useRootFontSize(): number {
  return useSyncExternalStore(subscribe, readRootFontSize, () => DEFAULT_ROOT_FONT_SIZE);
}
