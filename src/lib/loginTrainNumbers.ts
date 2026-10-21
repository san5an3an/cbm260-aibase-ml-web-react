import { useCallback, useSyncExternalStore } from "react";

// 무작위로 뽑을 번호의 범위와 자릿수
export interface NumberRange {
  min: number;
  max: number;
  digits: number;
}

// Login 화면 열차 표시의 두 번호 범위, 위쪽 열차 번호와 열차 몸체 안 편성 번호
export interface LoginTrainRanges {
  trainNumber: NumberRange;
  formation: NumberRange;
}

export interface LoginTrainNumbers {
  trainNumber: string;
  formation: string;
}

// Test가 window에 미리 넣어 두는 번호 고정용 Test hook, 값을 넣은 항목은 무작위 대신 그 값 사용
interface LoginTrainHost {
  cbmMockLoginTrain?: Partial<LoginTrainNumbers>;
}

// 범위 안 정수 하나를 고르게 뽑아 자릿수에 맞춘 문자열로 반환
function pickInRange(range: NumberRange, random: () => number): string {
  const value = range.min + Math.floor(random() * (range.max - range.min + 1));
  return String(Math.min(value, range.max)).padStart(range.digits, "0");
}

// 열차 번호와 편성 번호를 각 범위 안에서 무작위로 뽑아 반환
export function pickLoginTrainNumbers(ranges: LoginTrainRanges, random: () => number = Math.random): LoginTrainNumbers {
  return {
    trainNumber: pickInRange(ranges.trainNumber, random),
    formation: pickInRange(ranges.formation, random),
  };
}

// 현재 화면에 표시된 번호, 화면이 Mount될 때 뽑고 화면을 떠나면 비움
let currentNumbers: LoginTrainNumbers | null = null;

function getSnapshot(): LoginTrainNumbers | null {
  return currentNumbers;
}

function getServerSnapshot(): null {
  return null;
}

// Login 화면에 Mount될 때마다 새로 뽑은 번호 구독, Server Rendering과 hydration 중에는 null이라 번호 없이 그려 불일치와 깜빡임이 없음
export function useLoginTrainNumbers(ranges: LoginTrainRanges): LoginTrainNumbers | null {
  const subscribe = useCallback(
    (notify: () => void) => {
      const fixed = (globalThis as LoginTrainHost).cbmMockLoginTrain;
      currentNumbers = { ...pickLoginTrainNumbers(ranges), ...fixed };
      notify();
      return () => {
        currentNumbers = null;
      };
    },
    [ranges],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
