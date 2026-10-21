"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { eyebrowClassName } from "@/components/atoms/eyebrowClassName";
import { LINE_TRAIN_BODY_CENTER, LineTrainMarker } from "@/components/atoms/LineTrainMarker";
import { OperatorLogo } from "@/components/atoms/OperatorLogo";
import { motionDuration, motionEase, motionTransition } from "@/lib/motion";
import { cn } from "@/lib/utils";

// 노선 표시의 역 개수, 선 위에 같은 간격으로 배치
const STATION_COUNT = 5;

// 선이 그어지는 Animation, 처음 열고 0.15초 뒤 0.3초 동안 왼쪽에서 그어짐
const LINE_DRAW_TRANSITION = { ...motionTransition.enter, delay: 0.15 };

// 열차가 역 하나를 이동하는 시간과 역마다 정차하는 시간(초)
const TRAIN_HOP_SECONDS = motionDuration.slow;
const TRAIN_DWELL_SECONDS = 0.15;

// 열차 운행 계산, 선이 다 그어진 뒤 첫 역에서 출발해 역마다 ease-in-out으로 한 역씩 이동하고 잠깐 정차하기를 반복하다 마지막 역에서 멈춤. 위치는 마지막 역 기준으로 첫 역까지 선 길이의 비율
function buildTrainRun() {
  const hops = STATION_COUNT - 1;
  const total = hops * TRAIN_HOP_SECONDS + (hops - 1) * TRAIN_DWELL_SECONDS;
  const offset = (station: number) => `${((station - hops) / hops) * 100}%`;
  const x = [offset(0)];
  const times = [0];
  const ease: (typeof motionEase.inOut | "linear")[] = [];
  let elapsed = 0;
  for (let station = 1; station <= hops; station += 1) {
    elapsed += TRAIN_HOP_SECONDS;
    x.push(offset(station));
    times.push(elapsed / total);
    ease.push(motionEase.inOut);
    if (station < hops) {
      elapsed += TRAIN_DWELL_SECONDS;
      x.push(offset(station));
      times.push(elapsed / total);
      ease.push("linear");
    }
  }
  return {
    x,
    transition: { duration: total, delay: LINE_DRAW_TRANSITION.delay + LINE_DRAW_TRANSITION.duration, times, ease },
  };
}

const TRAIN_RUN = buildTrainRun();

interface LoginBrandPanelProps {
  operatorName: string;
  eyebrow: string;
  systemName: string;
  trainNumber: string;
  formation: string;
}

// Login 카드 왼쪽에 기관 Logo, 이름, 시스템 이름과 4호선 Color의 노선 표시, 그 위를 달리는 열차 표시
export function LoginBrandPanel({ operatorName, eyebrow, systemName, trainNumber, formation }: LoginBrandPanelProps) {
  return (
    <div
      data-slot="login-brand"
      className="relative isolate flex flex-col overflow-hidden border-r border-border bg-rail-bg p-12 dark:bg-surface-low"
    >
      {/* 4호선 새 전동차 사진, 패널 위쪽에 Width를 맞춰 열차 전체가 보이게 하고 아래쪽은 패널 Color로 사라지는 장식 */}
      <div
        data-slot="login-brand-photo"
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 aspect-[1000/669] [mask-image:linear-gradient(to_bottom,black_0%,black_22%,rgb(0_0_0/0.85)_40%,rgb(0_0_0/0.55)_60%,rgb(0_0_0/0.25)_80%,transparent_100%)]"
      >
        <Image src="/login-train.webp" alt="" fill sizes="26rem" priority className="object-cover brightness-115" />
      </div>
      <span className="flex-1" />
      <OperatorLogo data-slot="login-logo" label={operatorName} className="mb-6 h-8 self-start" />
      <p data-slot="login-eyebrow" className={cn(eyebrowClassName, "leading-4")}>
        {eyebrow}
      </p>
      <h1
        data-slot="login-system-name"
        className="mt-3 text-[1.75rem] leading-9 font-bold text-balance break-keep"
      >
        {systemName}
      </h1>
      {/* 4호선 노선도처럼 하늘색 선과 역 표시, 처음 열 때 선이 왼쪽에서 한 번 그어짐. 움직임 줄이기 설정에서는 MotionConfig가 바로 끝 모양으로 둠 */}
      <div data-slot="login-line" aria-hidden className="relative mt-10 flex h-3 items-center justify-between">
        <motion.span
          data-slot="login-line-track"
          className="absolute inset-x-1.5 top-1 h-1 origin-left rounded-full bg-brand-line4"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={LINE_DRAW_TRANSITION}
        />
        {Array.from({ length: STATION_COUNT }, (_, index) => (
          <span
            key={index}
            data-slot="login-line-station"
            className="relative size-3 rounded-full border-[0.1875rem] border-brand-line4 bg-rail-bg dark:bg-surface-low"
          />
        ))}
        {/* 열차 표시, 몸체(바퀴 포함)의 가로와 세로 가운데를 역 원의 가운데에 맞춰 선이 몸체를 지나고 원은 몸체 뒤로 가려짐. 역 위치는 Layer Width의 0, 25, 50, 75, 100%. 움직임 줄이기 설정에서는 transform을 꺼서 마지막 역에 둠 */}
        <motion.div
          data-slot="login-train-run"
          className="absolute inset-x-1.5 bottom-[-0.34375rem] motion-reduce:transform-none!"
          initial={{ x: TRAIN_RUN.x[0] }}
          animate={{ x: TRAIN_RUN.x }}
          transition={TRAIN_RUN.transition}
        >
          <LineTrainMarker
            data-slot="login-train"
            trainNumber={trainNumber}
            formation={formation}
            style={{ marginLeft: `calc(100% - ${LINE_TRAIN_BODY_CENTER})` }}
          />
        </motion.div>
      </div>
    </div>
  );
}
