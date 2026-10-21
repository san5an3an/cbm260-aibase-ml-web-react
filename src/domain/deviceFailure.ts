// 장치 고장 알림의 번호, 확인을 Server에 보낼 때 사용
export type DeviceFailureAlertId = string;

// Server가 이름과 값을 함께 보내는 추가 Row, 화면 목록의 Row 다음에 받은 순서대로 표시
export interface DeviceFailureAlertDetail {
  label: string;
  value: string;
}

// 재학습이나 추론 Job 중 감지된 장치 고장 알림 1건, 값만 담고 Label은 화면이 붙임
export interface DeviceFailureAlert {
  id: DeviceFailureAlertId;
  // 고장 난 장치의 코드
  deviceCode: string;
  // 고장 일시 "YYYY-MM-DDTHH:mm:ss" 형식, 현지 시각
  failedAt: string;
  // Server가 작성한 고장 사유, 여러 줄일 수 있음
  reason: string;
  // Server가 이름까지 정해 보내는 Row, 없으면 화면 목록의 Row만 표시
  details?: readonly DeviceFailureAlertDetail[];
}
