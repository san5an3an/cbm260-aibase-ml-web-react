import { useState } from "react";
import { useDelayedFlag } from "@/lib/useDelayedFlag";
import { WAIT_FEEDBACK_DELAY_MS } from "@/lib/waitFeedback";

// 현재 기다리는 중인지 여부와 기다림이 시작된 순번
interface WaitTurn {
  isWaiting: boolean;
  turn: number;
}

// 기다림이 WAIT_FEEDBACK_DELAY_MS를 넘게 이어지면 true 반환, 기다림이 끝났다가 다시 시작하면 처음부터 다시 계산
export function useWaitFeedback(isWaiting: boolean): boolean {
  const [waitTurn, setWaitTurn] = useState<WaitTurn>({ isWaiting, turn: 0 });
  // 기다림이 새로 시작되면 순번을 올려 이전 기다림에서 계산한 시간을 이어 쓰지 않음
  if (waitTurn.isWaiting !== isWaiting) {
    setWaitTurn({ isWaiting, turn: isWaiting ? waitTurn.turn + 1 : waitTurn.turn });
  }
  return useDelayedFlag(
    isWaiting && waitTurn.isWaiting ? waitTurn.turn : null,
    WAIT_FEEDBACK_DELAY_MS,
  );
}
