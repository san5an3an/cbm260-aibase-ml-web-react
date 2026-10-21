import type { DeviceFailureAlert, DeviceFailureAlertId } from "@/domain/deviceFailure";
import { shiftIsoDate } from "@/services/mock/dates";

// Test와 스크린샷이 window에서 쓰는 Test hook, Mock은 알림을 자동으로 보내지 않고 이 hook으로만 보냄
interface MockDeviceFailureHook {
  // 알림 목록 전송, 인자를 주지 않으면 샘플 1건, 빠진 필드는 샘플 값, 번호가 없으면 새 번호
  emit: (alerts?: readonly Partial<DeviceFailureAlert>[]) => void;
  // 확인 Request를 받은 번호, 받은 순서대로 기록하며 실패로 응답한 Request 포함
  requestedIds: DeviceFailureAlertId[];
  // 확인에 성공한 번호, 받은 순서대로 기록
  acknowledgedIds: DeviceFailureAlertId[];
  // true면 확인 Request를 실패로 응답
  failAcknowledge: boolean;
  // 확인 응답 지연 시간(ms)
  acknowledgeDelayMs: number;
}

// Test가 미리 넣거나 Mock이 채우는 Test hook을 담는 전역 객체 정의
interface MockDeviceFailureHost {
  cbmMockDeviceFailures?: Partial<MockDeviceFailureHook>;
}

const listeners = new Set<(alerts: readonly DeviceFailureAlert[]) => void>();
// 확인되지 않은 알림, 실제 Server처럼 새로 알림 수신을 시작한 화면에도 다시 보냄
const unacknowledged = new Map<DeviceFailureAlertId, DeviceFailureAlert>();
let nextNumber = 1;

// 샘플 알림 반환, 고장 일시는 Mock 기준일을 오늘로 이동
function sampleAlert(id: DeviceFailureAlertId): DeviceFailureAlert {
  return {
    id,
    deviceCode: "TRACTION_MOTOR",
    failedAt: `${shiftIsoDate("2026-09-23")}T13:12:47`,
    reason:
      "센서 통신 두절 — 모터 권선온도 센서가 30초 이상 응답하지 않아 진행 중이던 재학습이 중단되었습니다.",
  };
}

// 알림 목록을 수신 중인 화면 전부에 전송
function emitAlerts(parts: readonly Partial<DeviceFailureAlert>[] = [{}]): void {
  const alerts = parts.map((part) => ({
    ...sampleAlert(part.id ?? `mock-failure-${nextNumber++}`),
    ...part,
  }));
  alerts.forEach((alert) => unacknowledged.set(alert.id, alert));
  listeners.forEach((listener) => listener(alerts));
}

// window의 Test hook 반환, 없거나 Test가 미리 넣은 값에 빠진 필드가 있으면 기본값으로 채움
function mockHook(): MockDeviceFailureHook {
  const host = globalThis as MockDeviceFailureHost;
  const hook = (host.cbmMockDeviceFailures ??= {});
  hook.emit = emitAlerts;
  hook.requestedIds ??= [];
  hook.acknowledgedIds ??= [];
  hook.failAcknowledge ??= false;
  hook.acknowledgeDelayMs ??= 0;
  return hook as MockDeviceFailureHook;
}

// 알림 수신 시작, 확인되지 않은 알림이 있으면 주기 조회의 첫 응답처럼 즉시 다시 보냄
export function subscribeMockDeviceFailureAlerts(
  listener: (alerts: readonly DeviceFailureAlert[]) => void,
): () => void {
  mockHook();
  listeners.add(listener);
  if (unacknowledged.size > 0) {
    const pending = [...unacknowledged.values()];
    queueMicrotask(() => {
      if (listeners.has(listener)) listener(pending);
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

// 확인 Request를 기록하고 Test hook 설정대로 지연한 뒤 성공이나 실패로 응답
export function acknowledgeMockDeviceFailureAlert(id: DeviceFailureAlertId): Promise<void> {
  const hook = mockHook();
  hook.requestedIds.push(id);
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (hook.failAcknowledge) {
        reject(new Error(`더미 확인 실패: ${id}`));
        return;
      }
      unacknowledged.delete(id);
      hook.acknowledgedIds.push(id);
      resolve();
    }, hook.acknowledgeDelayMs);
  });
}
