import type {
  Alarm,
  AlarmAssignInput,
  AlarmCarRankingRow,
  AlarmCreateInput,
  AlarmCreateOptions,
  AlarmFilterOptions,
  AlarmId,
  AlarmProcessInput,
  AlarmRule,
  AlarmRuleId,
  AlarmRuleInput,
  AlarmSummary,
  AlarmTrend,
  AlarmWorklist,
  AlarmWorklistQuery,
} from "@/domain/alarms";
import {
  acknowledgeAlarmsInStore,
  addAlarm,
  assignAlarmsInStore,
  processAlarmInStore,
  removeAlarmRule,
  respondAlarmAssignees,
  respondAlarmCarRanking,
  respondAlarmCreateOptions,
  respondAlarmFilterOptions,
  respondAlarmRules,
  respondAlarmSummary,
  respondAlarmTrend,
  respondAlarmWorklist,
  respondDeleteAlarm,
  saveAlarmRuleInStore,
} from "@/services/mock/alarmsData";
import type { QueryOptions } from "@/services/queryOptions";

// 워크List에서 선택할 수 있는 상태와 심각도 조회
export async function fetchAlarmFilterOptions(
  options: QueryOptions = {},
): Promise<AlarmFilterOptions> {
  return respondAlarmFilterOptions(options.signal);
}

// 조건, 정렬, Page 번호에 해당하는 Alarm 목록 조회
export async function fetchAlarmWorklist(
  query: AlarmWorklistQuery,
  options: QueryOptions = {},
): Promise<AlarmWorklist> {
  return respondAlarmWorklist(query, options.signal);
}

// 상태별 Alarm 수 요약 조회
export async function fetchAlarmSummary(options: QueryOptions = {}): Promise<AlarmSummary> {
  return respondAlarmSummary(options.signal);
}

// 날짜별 Alarm 수와 심각도, 출처, Model별 집계 조회
export async function fetchAlarmTrend(options: QueryOptions = {}): Promise<AlarmTrend> {
  return respondAlarmTrend(options.signal);
}

// Alarm이 많은 호차의 순위 조회
export async function fetchAlarmCarRanking(
  options: QueryOptions = {},
): Promise<readonly AlarmCarRankingRow[]> {
  return respondAlarmCarRanking(options.signal);
}

// Alarm 등록에서 선택할 수 있는 심각도, 편성과 호차의 범위, 초기값 조회
export async function fetchAlarmCreateOptions(
  options: QueryOptions = {},
): Promise<AlarmCreateOptions> {
  return respondAlarmCreateOptions(options.signal);
}

// Alarm을 신규 상태로 등록하고 등록된 Alarm 반환
export async function createAlarm(input: AlarmCreateInput): Promise<Alarm> {
  return addAlarm(input);
}

// 신규 Alarm을 확인 상태로 변경, 신규가 아닌 Alarm은 그대로 유지
export async function acknowledgeAlarms(alarmIds: readonly AlarmId[]): Promise<void> {
  acknowledgeAlarmsInStore(alarmIds);
}

// Alarm 한 건의 상태, 담당자, Comment 저장
export async function processAlarm(alarmId: AlarmId, input: AlarmProcessInput): Promise<void> {
  processAlarmInStore(alarmId, input);
}

// 여러 Alarm에 담당자 지정, 신규 Alarm은 확인 상태로 함께 변경
export async function assignAlarms(
  alarmIds: readonly AlarmId[],
  input: AlarmAssignInput,
): Promise<void> {
  assignAlarmsInStore(alarmIds, input);
}

// Alarm 한 건 삭제
export async function deleteAlarm(alarmId: AlarmId): Promise<void> {
  return respondDeleteAlarm(alarmId);
}

// Alarm을 자동으로 생성하는 규칙 목록 조회
export async function fetchAlarmRules(options: QueryOptions = {}): Promise<readonly AlarmRule[]> {
  return respondAlarmRules(options.signal);
}

// Alarm 규칙 저장, ruleId는 장치와 Model의 쌍이 같은 기존 규칙의 id(없으면 null), 저장된 규칙 반환
export async function saveAlarmRule(
  ruleId: AlarmRuleId | null,
  input: AlarmRuleInput,
): Promise<AlarmRule> {
  // Mock은 장치와 Model의 쌍으로 규칙을 찾아 덮어쓰므로 ruleId를 사용하지 않음
  return saveAlarmRuleInStore(input);
}

// Alarm 규칙 한 건 삭제
export async function deleteAlarmRule(ruleId: AlarmRuleId): Promise<void> {
  removeAlarmRule(ruleId);
}

// 담당자로 지정할 수 있는 정비사 목록 조회
export async function fetchAlarmAssignees(
  options: QueryOptions = {},
): Promise<readonly string[]> {
  return respondAlarmAssignees(options.signal);
}
