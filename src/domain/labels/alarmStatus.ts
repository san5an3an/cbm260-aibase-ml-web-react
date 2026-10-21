import type { AlarmStatusKey } from "@/domain/alarms";

interface AlarmStatusLabel {
  label: string;
  // 상태를 코드 이름으로 표시하는 위치의 표기
  codeLabel: string;
}

// Alarm 상태의 화면 표기 정의, 처리 흐름 순서로 나열하고 흐름 밖의 최종 상태인 오탐은 맨 뒤에 배치
export const alarmStatusLabels: Record<AlarmStatusKey, AlarmStatusLabel> = {
  NEW: { label: "신규", codeLabel: "NEW" },
  ACK: { label: "확인", codeLabel: "ACK" },
  IN_PROGRESS: { label: "조치중", codeLabel: "IN_PROGRESS" },
  RESOLVED: { label: "해소", codeLabel: "RESOLVED" },
  FALSE_POSITIVE: { label: "오탐", codeLabel: "FALSE_POSITIVE" },
};

// 상태의 순서 목록, 화면 표기에 나열한 순서를 그대로 사용
export const alarmStatusKeys: readonly AlarmStatusKey[] = Object.keys(
  alarmStatusLabels,
) as AlarmStatusKey[];
