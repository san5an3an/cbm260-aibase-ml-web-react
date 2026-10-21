import type { AlarmSourceKey } from "@/domain/alarms";

// Alarm이 생성된 경로의 화면 표기 정의
export const alarmSourceLabels: Record<AlarmSourceKey, string> = {
  auto: "자동",
  manual: "수동",
};
