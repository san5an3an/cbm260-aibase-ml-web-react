import { useEffect, useReducer, useState } from "react";
import type { DeviceFailureAlert, DeviceFailureAlertId } from "@/domain/deviceFailure";
import {
  acknowledgeDeviceFailureAlert,
  subscribeDeviceFailureAlerts,
} from "@/services/deviceFailures";

export interface AlertQueueState {
  // 받은 순서대로 쌓인 아직 확인하지 않은 알림
  queue: readonly DeviceFailureAlert[];
  // 확인을 마친 번호, 주기 조회가 같은 알림을 다시 보내도 다시 띄우지 않음
  acknowledgedIds: ReadonlySet<DeviceFailureAlertId>;
}

export type AlertQueueAction =
  | { type: "received"; alerts: readonly DeviceFailureAlert[] }
  | { type: "acknowledged"; id: DeviceFailureAlertId };

export const EMPTY_ALERT_QUEUE: AlertQueueState = { queue: [], acknowledgedIds: new Set() };

// 받은 알림은 대기열 끝에 추가하고 확인한 알림은 대기열에서 제거, 이미 대기열에 있거나 확인을 마친 번호는 버림. 순서 규칙은 이 함수 한 곳에서 변경
export function reduceAlertQueue(state: AlertQueueState, action: AlertQueueAction): AlertQueueState {
  if (action.type === "acknowledged") {
    return {
      queue: state.queue.filter((alert) => alert.id !== action.id),
      acknowledgedIds: new Set(state.acknowledgedIds).add(action.id),
    };
  }
  const knownIds = new Set(state.queue.map((alert) => alert.id));
  const added = action.alerts.filter((alert) => {
    if (knownIds.has(alert.id) || state.acknowledgedIds.has(alert.id)) return false;
    knownIds.add(alert.id);
    return true;
  });
  return added.length === 0 ? state : { ...state, queue: [...state.queue, ...added] };
}

interface DeviceFailureAlerts {
  // 확인하지 않은 알림 전부, 받은 순서
  alerts: readonly DeviceFailureAlert[];
  // 현재 Dialog에 표시할 알림, 대기열의 맨 앞이며 없으면 null
  current: DeviceFailureAlert | null;
  // 확인 Request를 기다리는 알림의 번호, 없으면 null
  acknowledgingId: DeviceFailureAlertId | null;
  // 알림의 확인을 Server에 전송하고 성공하면 대기열에서 제거, 실패하면 그대로 두고 다시 누를 수 있게 함
  acknowledge: (id: DeviceFailureAlertId) => void;
}

// 장치 고장 알림을 받는 동안 받은 순서대로 대기열에 쌓고 한 건씩 확인 전송, 확인 실패는 호출한 Component가 넘긴 함수로 알림
export function useDeviceFailureAlerts(onAcknowledgeFailure: () => void): DeviceFailureAlerts {
  const [state, dispatch] = useReducer(reduceAlertQueue, EMPTY_ALERT_QUEUE);
  const [acknowledgingId, setAcknowledgingId] = useState<DeviceFailureAlertId | null>(null);

  useEffect(
    () => subscribeDeviceFailureAlerts((alerts) => dispatch({ type: "received", alerts })),
    [],
  );

  const acknowledge = (id: DeviceFailureAlertId) => {
    if (acknowledgingId !== null) return;
    setAcknowledgingId(id);
    acknowledgeDeviceFailureAlert(id).then(
      () => {
        dispatch({ type: "acknowledged", id });
        setAcknowledgingId(null);
      },
      // 알림을 그대로 두고 Button을 다시 누를 수 있게 한 뒤 실패를 알림
      () => {
        setAcknowledgingId(null);
        onAcknowledgeFailure();
      },
    );
  };

  return {
    alerts: state.queue,
    current: state.queue[0] ?? null,
    acknowledgingId,
    acknowledge,
  };
}
