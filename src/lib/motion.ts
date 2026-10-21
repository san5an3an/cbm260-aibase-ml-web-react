import type { Transition } from "motion/react";

type CubicBezier = [number, number, number, number];

// 움직임 시간(초) 정의, globals.css의 --motion-duration-*와 같은 값 유지
export const motionDuration = {
  fast: 0.1,
  base: 0.2,
  moderate: 0.3,
  slow: 0.5,
} as const;

const easeOut: CubicBezier = [0, 0, 0.2, 1];
const easeIn: CubicBezier = [0.4, 0, 1, 1];
const easeInOut: CubicBezier = [0.4, 0, 0.2, 1];

// 움직임 감속 곡선 정의, globals.css의 --motion-ease-*와 같은 값 유지
export const motionEase = {
  out: easeOut,
  in: easeIn,
  inOut: easeInOut,
} as const;

// 자주 쓰는 전환 조합 정의
export const motionTransition = {
  micro: { duration: motionDuration.fast, ease: easeOut },
  default: { duration: motionDuration.base, ease: easeOut },
  enter: { duration: motionDuration.moderate, ease: easeOut },
  exit: { duration: motionDuration.base, ease: easeIn },
  move: { duration: motionDuration.base, ease: easeInOut },
} satisfies Record<string, Transition>;
