import type { DeviceFailureAlert, DeviceFailureAlertId } from "@/domain/deviceFailure";
import {
  acknowledgeMockDeviceFailureAlert,
  subscribeMockDeviceFailureAlerts,
} from "@/services/mock/deviceFailuresData";

// 장치 고장 알림(한 건 또는 여러 건)을 받을 때마다 onAlerts 호출, 수신 방식(주기 조회 polling, SSE, WebSocket)은 이 함수 안에서 선택하며 반환된 함수로 구독 해제
export function subscribeDeviceFailureAlerts(
  onAlerts: (alerts: readonly DeviceFailureAlert[]) => void,
): () => void {
  return subscribeMockDeviceFailureAlerts(onAlerts);
}

// 장치 고장 알림을 확인했다고 Server에 전달, 성공해야 화면이 해당 알림을 닫고 다음 알림을 표시
export async function acknowledgeDeviceFailureAlert(id: DeviceFailureAlertId): Promise<void> {
  return acknowledgeMockDeviceFailureAlert(id);
}
