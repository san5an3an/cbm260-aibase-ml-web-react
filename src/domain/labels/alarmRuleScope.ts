import type { AlarmRuleScopeKind } from "@/domain/alarms";

interface AlarmRuleScopeLabel {
  // 규칙 Table의 Cell에 표시할 이름
  label: string;
  // 범례에 표시할 이름
  legendLabel: string;
}

// 규칙 범위의 화면 표기 정의, 더 구체적인 범위부터 나열한 순서를 범례에 그대로 사용
export const alarmRuleScopeLabels: Record<AlarmRuleScopeKind, AlarmRuleScopeLabel> = {
  pair: { label: "전용", legendLabel: "이 칸 전용 규칙" },
  device: { label: "장치 규칙", legendLabel: "장치 규칙" },
  model: { label: "모델 규칙", legendLabel: "모델 규칙" },
  global: { label: "전체 규칙", legendLabel: "전체 규칙" },
};

// 규칙 범위의 순서 목록, 화면 표기에 나열한 순서를 그대로 사용
export const alarmRuleScopeKinds: readonly AlarmRuleScopeKind[] = Object.keys(
  alarmRuleScopeLabels,
) as AlarmRuleScopeKind[];
