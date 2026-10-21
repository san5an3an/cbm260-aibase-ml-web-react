import type { AlarmRule } from "@/domain/alarms";
import type { Device } from "@/domain/device";
import { alarmSeverityLabels } from "@/domain/labels/alarmSeverity";

type AlarmRuleScope = Pick<AlarmRule, "deviceCode" | "modelCode">;

// 규칙이 적용되는 범위를 화면에 표시할 이름으로 변환, 장치는 이름으로, 지정하지 않은 범위는 "전체"로 표시
export function alarmRuleScopeText(scope: AlarmRuleScope, devices: readonly Device[]): string {
  if (scope.deviceCode === null && scope.modelCode === null) return "전체 (기본)";
  const deviceText =
    scope.deviceCode === null
      ? "전체 장치"
      : (devices.find((device) => device.code === scope.deviceCode)?.name ?? scope.deviceCode);
  return `${deviceText} · ${scope.modelCode ?? "전체 모델"}`;
}

// Alarm이 생기는 조건(연속 지속 분, 이상 window 수)을 한 줄로 표시
export function alarmRuleConditionText(rule: AlarmRule): string {
  return `${rule.consecutiveMinutes}분 / ${rule.anomalyWindowCount}개`;
}

// 심각도를 가르는 기준(HIGH, MID의 분)을 한 줄로 표시
export function alarmRuleSeverityText(rule: AlarmRule): string {
  const { HIGH, MID } = alarmSeverityLabels;
  return `${HIGH.shortLabel} ${rule.highMinMinutes} · ${MID.shortLabel} ${rule.midMinMinutes}`;
}
