import type { AlarmRuleEditMode } from "@/components/organisms/AlarmRuleEditModal";
import {
  createAlarmRuleDraft,
  findAlarmRule,
  resolveAlarmRule,
  toAlarmRuleDraft,
} from "@/domain/alarms";
import type { AlarmRule, AlarmRuleDraft, AlarmRuleId } from "@/domain/alarms";

// 알람/이벤트 화면에서 바로 뜨는 Modal과 확인 Dialog의 종류
export type AlarmModalType = "create" | "rules" | "process" | "assign" | "delete";

// Alarm 규칙 Modal 위에 겹쳐 뜨는 규칙 추가, 수정 Modal의 상태
export interface AlarmRuleEditorState {
  mode: AlarmRuleEditMode;
  // Modal을 열 때 선택한 규칙의 id, 새 규칙이면 null이고 삭제는 이 규칙을 지움
  ruleId: AlarmRuleId | null;
  // 현재 적용 중인 값을 미리 채운 Input의 범위, 채우지 않았으면 null
  prefilledScope: Pick<AlarmRule, "deviceCode" | "modelCode"> | null;
  draft: AlarmRuleDraft;
  // 저장을 Click해 Input 값을 확인한 적이 있는지 여부
  hasTried: boolean;
}

// 규칙 추가, 수정 Modal을 여는 상태 계산, 해당 범위에 규칙이 있으면 수정, 없으면 추가로 열기
export function createAlarmRuleEditorState(
  rules: readonly AlarmRule[],
  scope: Pick<AlarmRule, "deviceCode" | "modelCode">,
  newRuleIsEnabled: boolean,
): AlarmRuleEditorState {
  const existing = findAlarmRule(rules, scope.deviceCode, scope.modelCode);
  if (existing) {
    const isGlobal = scope.deviceCode === null && scope.modelCode === null;
    return {
      mode: isGlobal ? "global" : "edit",
      ruleId: existing.id,
      prefilledScope: null,
      draft: toAlarmRuleDraft(existing),
      hasTried: false,
    };
  }
  // 적용되는 규칙이 하나도 없으면 숫자 Input을 비운 추가로 열기
  const applied = resolveAlarmRule(rules, scope.deviceCode, scope.modelCode);
  const isPairScope = scope.deviceCode !== null && scope.modelCode !== null;
  return {
    mode: "add",
    ruleId: null,
    // 적용 중인 값을 채웠고 장치와 Model을 둘 다 정한 Input에서 열었을 때만 채워 둔 값의 안내 표시
    prefilledScope: applied !== null && isPairScope ? scope : null,
    draft: createAlarmRuleDraft(scope, newRuleIsEnabled, applied),
    hasTried: false,
  };
}
