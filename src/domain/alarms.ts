import type { AnomalyLevelKey } from "@/domain/anomaly";

export type AlarmSeverityKey = "LOW" | "MID" | "HIGH" | "CRIT";
export type AlarmStatusKey = "NEW" | "ACK" | "IN_PROGRESS" | "RESOLVED" | "FALSE_POSITIVE";
// 추론 후 Alarm 규칙이 만든 Alarm은 auto, 사람이 등록한 Alarm은 manual
export type AlarmSourceKey = "auto" | "manual";
export type AlarmId = string;
export type AlarmRuleId = string;

// Alarm을 만든 이상 window 모음 요약
export interface AlarmAnomalyWindow {
  count: number;
  longestMinutes: number;
}

// Alarm 1건, 비율은 % 단위 숫자, 시각은 "YYYY-MM-DDTHH:mm:ss" 형식
export interface Alarm {
  id: AlarmId;
  occurredAt: string;
  deviceCode: string;
  modelCode: string;
  formation: string;
  car: number;
  severity: AlarmSeverityKey;
  anomalyRatePercent: number;
  anomalyRateLevel: AnomalyLevelKey;
  status: AlarmStatusKey;
  source: AlarmSourceKey;
  // 이상 window 정보가 없는 Alarm은 null
  anomalyWindow: AlarmAnomalyWindow | null;
  // 담당자가 없으면 null
  assignee: string | null;
  // 확인 또는 해소 전이면 null
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  comment: string;
}

export type AlarmSortKey = "occurredAt" | "severity" | "anomalyRate";
export type AlarmSortDirection = "asc" | "desc";

export interface AlarmSort {
  key: AlarmSortKey;
  direction: AlarmSortDirection;
}

// 상태, 심각도, 장치가 null이면 전체
export interface AlarmFilter {
  status: AlarmStatusKey | null;
  severity: AlarmSeverityKey | null;
  deviceCode: string | null;
}

export interface AlarmWorklistQuery extends AlarmFilter {
  sort: AlarmSort;
  // 1부터 시작하는 Page 번호
  page: number;
}

export interface AlarmWorklist {
  // 조건과 정렬을 적용한 해당 Page의 Row
  rows: readonly Alarm[];
  // 한 Page에 담는 Row 수
  pageSize: number;
  pageCount: number;
}

// 워크List에서 고를 수 있는 상태와 심각도, 나열한 순서가 선택지 순서
export interface AlarmFilterOptions {
  statuses: readonly AlarmStatusKey[];
  severities: readonly AlarmSeverityKey[];
}

export type AlarmStatusCounts = Record<AlarmStatusKey, number>;
export type AlarmSeverityCounts = Record<AlarmSeverityKey, number>;

// 상태별 Alarm 수 요약
export interface AlarmSummary {
  // 아직 닫히지 않은 Alarm 수
  openCount: number;
  countsByStatus: AlarmStatusCounts;
}

// 하루 동안 발생한 Alarm의 심각도별 수, 날짜는 "YYYY-MM-DD" 형식
export interface DailyAlarmCount {
  date: string;
  countsBySeverity: AlarmSeverityCounts;
}

export interface AlarmSeverityTally {
  severity: AlarmSeverityKey;
  count: number;
}

export interface AlarmSourceTally {
  source: AlarmSourceKey;
  count: number;
}

export interface AlarmModelTally {
  modelCode: string;
  count: number;
}

// 날짜별 Alarm 수와 해당 기간의 집계, 집계는 나열한 순서대로 표시
export interface AlarmTrend {
  // 집계에 포함된 Alarm 수
  totalCount: number;
  // 오래된 날짜부터 나열
  days: readonly DailyAlarmCount[];
  severityTallies: readonly AlarmSeverityTally[];
  sourceTallies: readonly AlarmSourceTally[];
  modelTallies: readonly AlarmModelTally[];
}

// 호차별 Alarm 순위의 Row 1개, Row마다 편성과 호차의 짝이 다름
export interface AlarmCarRankingRow {
  formation: string;
  car: number;
  alarmCount: number;
  countsBySeverity: AlarmSeverityCounts;
  topSeverity: AlarmSeverityKey;
  // 이 호차의 Alarm이 발생한 데이터 날짜 "YYYY-MM-DD" 형식
  alarmDate: string;
}

// Alarm 등록에 필요한 입력, 등록되는 Alarm의 상태는 NEW
export interface AlarmCreateInput {
  deviceCode: string;
  modelCode: string;
  segment: string;
  formation: string;
  car: number;
  severity: AlarmSeverityKey;
  anomalyRatePercent: number;
  occurredAt: string;
  assignee: string | null;
  comment: string;
}

// Alarm 처리에서 바꾸는 값
export interface AlarmProcessInput {
  status: AlarmStatusKey;
  assignee: string | null;
  comment: string;
}

// 여러 Alarm에 함께 지정하는 담당자와 Comment, Comment가 비어 있으면 기존 Comment 유지
export interface AlarmAssignInput {
  assignee: string;
  // 앞뒤 공백을 뺀 Comment, 남는 Text가 없으면 null
  comment: string | null;
}

// 추론이 끝난 뒤 Alarm을 자동으로 만드는 조건, 장치와 Model이 null이면 전체에 적용
export interface AlarmRule {
  id: AlarmRuleId;
  deviceCode: string | null;
  modelCode: string | null;
  isEnabled: boolean;
  // 발생 조건, 0이면 그 조건을 사용하지 않음
  consecutiveMinutes: number;
  anomalyWindowCount: number;
  // 떨어진 이상 window를 한 구간으로 이어 붙이는 간격(초)
  mergeGapSeconds: number;
  // 가장 긴 연속 구간이 이 분 이상이면 그 심각도로 판정
  midMinMinutes: number;
  highMinMinutes: number;
  description: string;
}

// 규칙 저장에 필요한 입력, 장치와 Model 조합이 같은 규칙이 있으면 그 규칙을 덮어씀
export type AlarmRuleInput = Omit<AlarmRule, "id">;

// 닫히지 않은 상태(신규, 확인, 조치중)인지 판정, 상태마다 결과를 적어 빠뜨리면 Type 오류 발생
export function isOpenAlarmStatus(status: AlarmStatusKey): boolean {
  switch (status) {
    case "NEW":
    case "ACK":
    case "IN_PROGRESS":
      return true;
    case "RESOLVED":
    case "FALSE_POSITIVE":
      return false;
  }
}

// 해당 상태로 저장하면 확인 시각이 기록되는지(신규가 아닌 모든 상태) 판정, 상태마다 결과를 적어 빠뜨리면 Type 오류 발생
export function recordsAcknowledgedAt(status: AlarmStatusKey): boolean {
  switch (status) {
    case "NEW":
      return false;
    case "ACK":
    case "IN_PROGRESS":
    case "RESOLVED":
    case "FALSE_POSITIVE":
      return true;
  }
}

// 닫힌 상태(해소, 오탐)인지 판정, 상태마다 결과를 적어 빠뜨리면 Type 오류 발생
export function isClosedAlarmStatus(status: AlarmStatusKey): boolean {
  switch (status) {
    case "NEW":
    case "ACK":
    case "IN_PROGRESS":
      return false;
    case "RESOLVED":
    case "FALSE_POSITIVE":
      return true;
  }
}

// 상태별 수에서 닫히지 않은 Alarm 수 계산
export function countOpenAlarms(countsByStatus: AlarmStatusCounts): number {
  return (Object.keys(countsByStatus) as AlarmStatusKey[])
    .filter(isOpenAlarmStatus)
    .reduce((total, status) => total + countsByStatus[status], 0);
}

// 날짜별 수를 심각도별로 합산
export function sumAlarmSeverityCounts(days: readonly DailyAlarmCount[]): AlarmSeverityCounts {
  const totals: AlarmSeverityCounts = { LOW: 0, MID: 0, HIGH: 0, CRIT: 0 };
  for (const day of days) {
    for (const severity of Object.keys(totals) as AlarmSeverityKey[]) {
      totals[severity] += day.countsBySeverity[severity];
    }
  }
  return totals;
}

// 처리 내용을 Alarm에 반영, 확인 및 해소 시각은 처음 해당 상태가 될 때만 기록
export function applyAlarmProcess(alarm: Alarm, input: AlarmProcessInput, now: string): Alarm {
  return {
    ...alarm,
    status: input.status,
    assignee: input.assignee,
    comment: input.comment,
    acknowledgedAt: alarm.acknowledgedAt ?? (recordsAcknowledgedAt(input.status) ? now : null),
    resolvedAt: isClosedAlarmStatus(input.status) ? (alarm.resolvedAt ?? now) : null,
  };
}

// 신규 Alarm을 확인 상태로 변경, 신규가 아니면 그대로 반환
export function acknowledgeAlarm(alarm: Alarm, now: string): Alarm {
  if (alarm.status !== "NEW") return alarm;
  return { ...alarm, status: "ACK", acknowledgedAt: now };
}

// 담당자를 지정, 신규 Alarm은 확인 상태로 함께 변경
export function assignAlarm(alarm: Alarm, input: AlarmAssignInput, now: string): Alarm {
  return {
    ...acknowledgeAlarm(alarm, now),
    assignee: input.assignee,
    comment: input.comment || alarm.comment,
  };
}

// 숫자 하나가 들어갈 수 있는 범위, 양 끝 값 포함
export interface NumberRange {
  min: number;
  max: number;
}

// Alarm 등록에서 선택할 수 있는 값, 입력 범위, 처음 채워 둘 값
export interface AlarmCreateOptions {
  severities: readonly AlarmSeverityKey[];
  // 편성 번호의 범위
  formationRange: NumberRange;
  // 한 편성 안의 호차 범위
  carRange: NumberRange;
  // 이상비율(%)의 범위
  anomalyRateRange: NumberRange;
  defaults: {
    deviceCode: string;
    modelCode: string;
    segment: string;
    severity: AlarmSeverityKey;
  };
}

// Alarm 등록 Form에 입력 중인 값, 숫자와 시각도 입력한 Text 그대로 보관
export interface AlarmCreateDraft {
  deviceCode: string;
  modelCode: string;
  segment: string;
  formation: string;
  car: string;
  severity: AlarmSeverityKey;
  anomalyRatePercent: string;
  // "YYYY-MM-DD HH:mm:ss" 형식으로 입력
  occurredAt: string;
  assignee: string;
  comment: string;
}

// Alarm 등록에서 입력값을 확인하는 Input
export type AlarmCreateCheckedField = "formation" | "anomalyRatePercent" | "occurredAt";

// 처음 값을 채운 빈 Alarm 등록 Form 반환
export function createAlarmDraft(options: AlarmCreateOptions): AlarmCreateDraft {
  return {
    deviceCode: options.defaults.deviceCode,
    modelCode: options.defaults.modelCode,
    segment: options.defaults.segment,
    formation: "",
    car: "",
    severity: options.defaults.severity,
    anomalyRatePercent: "",
    occurredAt: "",
    assignee: "",
    comment: "",
  };
}

// 편성 번호가 범위 안의 숫자이고 자릿수가 맞는지 판정
function isValidFormation(formation: string, range: NumberRange): boolean {
  if (!/^\d+$/.test(formation) || formation.length !== String(range.max).length) return false;
  const value = Number(formation);
  return value >= range.min && value <= range.max;
}

// Alarm 등록 Form에서 고쳐야 등록할 수 있는 Input 반환, 비어 있으면 등록 가능
export function findInvalidAlarmCreateFields(
  draft: AlarmCreateDraft,
  options: AlarmCreateOptions,
): AlarmCreateCheckedField[] {
  const invalidFields: AlarmCreateCheckedField[] = [];
  if (!isValidFormation(draft.formation, options.formationRange)) invalidFields.push("formation");
  const rate = draft.anomalyRatePercent === "" ? Number.NaN : Number(draft.anomalyRatePercent);
  if (!(rate >= options.anomalyRateRange.min && rate <= options.anomalyRateRange.max)) {
    invalidFields.push("anomalyRatePercent");
  }
  if (draft.occurredAt.trim() === "") invalidFields.push("occurredAt");
  return invalidFields;
}

// Alarm 등록 Form의 Text를 등록에 넘길 값으로 변환, 호차가 숫자가 아니면 첫 호차로 등록
export function toAlarmCreateInput(
  draft: AlarmCreateDraft,
  options: AlarmCreateOptions,
): AlarmCreateInput {
  return {
    deviceCode: draft.deviceCode,
    modelCode: draft.modelCode,
    segment: draft.segment,
    formation: draft.formation,
    car: Number(draft.car) || options.carRange.min,
    severity: draft.severity,
    anomalyRatePercent: Number(draft.anomalyRatePercent),
    // 날짜와 시각 사이의 공백을 조회 값의 구분 문자로 교체
    occurredAt: draft.occurredAt.trim().replace(/\s+/, "T"),
    assignee: draft.assignee.trim() || null,
    comment: draft.comment,
  };
}

// 규칙이 적용되는 범위의 종류, 장치와 Model을 둘 다 정했거나 장치만, Model만 정했거나 전체
export type AlarmRuleScopeKind = "pair" | "device" | "model" | "global";

// 규칙이 정한 장치와 Model로 범위의 종류 판정
export function alarmRuleScopeKind(
  scope: Pick<AlarmRule, "deviceCode" | "modelCode">,
): AlarmRuleScopeKind {
  if (scope.deviceCode !== null && scope.modelCode !== null) return "pair";
  if (scope.deviceCode !== null) return "device";
  if (scope.modelCode !== null) return "model";
  return "global";
}

// 장치와 Model의 범위가 정확히 같은 규칙 반환, 없으면 null
export function findAlarmRule(
  rules: readonly AlarmRule[],
  deviceCode: string | null,
  modelCode: string | null,
): AlarmRule | null {
  return (
    rules.find((rule) => rule.deviceCode === deviceCode && rule.modelCode === modelCode) ?? null
  );
}

// 해당 장치와 Model에 실제로 적용되는 규칙 반환, 장치+Model, 장치, Model, 전체 순으로 더 구체적인 규칙 우선
export function resolveAlarmRule(
  rules: readonly AlarmRule[],
  deviceCode: string | null,
  modelCode: string | null,
): AlarmRule | null {
  const candidates = rules.filter(
    (rule) =>
      (rule.deviceCode === deviceCode || rule.deviceCode === null) &&
      (rule.modelCode === modelCode || rule.modelCode === null),
  );
  const specificity = (rule: AlarmRule) =>
    (rule.deviceCode !== null ? 2 : 0) + (rule.modelCode !== null ? 1 : 0);
  return (
    candidates.reduce<AlarmRule | null>(
      (best, rule) => (best === null || specificity(rule) > specificity(best) ? rule : best),
      null,
    )
  );
}

// 규칙 Table의 Cell 하나, 해당 장치와 Model에 적용되는 규칙과 그 규칙이 정해진 범위
export interface AlarmRuleMatrixCell {
  modelCode: string;
  // 적용되는 규칙이 하나도 없으면 null
  rule: AlarmRule | null;
  scopeKind: AlarmRuleScopeKind | null;
}

export interface AlarmRuleMatrixRow {
  deviceCode: string;
  // 이 장치에만 따로 정한 규칙(Model은 전체)이 있는지 여부
  hasDeviceRule: boolean;
  cells: readonly AlarmRuleMatrixCell[];
}

// 장치 × Model 규칙 Table, 전체 규칙과 Model만 정한 규칙의 유무 포함
export interface AlarmRuleMatrix {
  globalRule: AlarmRule | null;
  models: readonly { modelCode: string; hasModelRule: boolean }[];
  rows: readonly AlarmRuleMatrixRow[];
}

// 규칙 목록에서 장치 × Model마다 적용되는 규칙을 찾아 Table로 구성
export function buildAlarmRuleMatrix(
  rules: readonly AlarmRule[],
  deviceCodes: readonly string[],
  modelCodes: readonly string[],
): AlarmRuleMatrix {
  return {
    globalRule: findAlarmRule(rules, null, null),
    models: modelCodes.map((modelCode) => ({
      modelCode,
      hasModelRule: findAlarmRule(rules, null, modelCode) !== null,
    })),
    rows: deviceCodes.map((deviceCode) => ({
      deviceCode,
      hasDeviceRule: findAlarmRule(rules, deviceCode, null) !== null,
      cells: modelCodes.map((modelCode) => {
        const rule = resolveAlarmRule(rules, deviceCode, modelCode);
        return { modelCode, rule, scopeKind: rule ? alarmRuleScopeKind(rule) : null };
      }),
    })),
  };
}

// 규칙 Form에서 숫자를 입력하는 Input
export type AlarmRuleNumberField =
  | "consecutiveMinutes"
  | "anomalyWindowCount"
  | "mergeGapSeconds"
  | "midMinMinutes"
  | "highMinMinutes";

// 규칙 Form에 입력 중인 값, 숫자는 입력한 Text 그대로 보관
export type AlarmRuleDraft = Pick<AlarmRule, "deviceCode" | "modelCode" | "isEnabled" | "description"> &
  Record<AlarmRuleNumberField, string>;

const alarmRuleNumberFields: readonly AlarmRuleNumberField[] = [
  "consecutiveMinutes",
  "anomalyWindowCount",
  "mergeGapSeconds",
  "midMinMinutes",
  "highMinMinutes",
];

// 규칙의 값을 Form에 입력 중인 값으로 변환
export function toAlarmRuleDraft(rule: AlarmRule): AlarmRuleDraft {
  return {
    deviceCode: rule.deviceCode,
    modelCode: rule.modelCode,
    isEnabled: rule.isEnabled,
    description: rule.description,
    consecutiveMinutes: String(rule.consecutiveMinutes),
    anomalyWindowCount: String(rule.anomalyWindowCount),
    mergeGapSeconds: String(rule.mergeGapSeconds),
    midMinMinutes: String(rule.midMinMinutes),
    highMinMinutes: String(rule.highMinMinutes),
  };
}

// 해당 범위의 새 규칙 Form 반환, 숫자 Input은 채워 둘 규칙의 값으로 채우고 그 규칙이 없으면 빈 값으로 시작
export function createAlarmRuleDraft(
  scope: Pick<AlarmRule, "deviceCode" | "modelCode">,
  isEnabled: boolean,
  prefillRule: AlarmRule | null,
): AlarmRuleDraft {
  const numberText = (field: AlarmRuleNumberField) =>
    prefillRule ? String(prefillRule[field]) : "";
  return {
    deviceCode: scope.deviceCode,
    modelCode: scope.modelCode,
    isEnabled,
    // 설명은 채워 둘 규칙에서 가져오지 않고 빈 값으로 시작
    description: "",
    consecutiveMinutes: numberText("consecutiveMinutes"),
    anomalyWindowCount: numberText("anomalyWindowCount"),
    mergeGapSeconds: numberText("mergeGapSeconds"),
    midMinMinutes: numberText("midMinMinutes"),
    highMinMinutes: numberText("highMinMinutes"),
  };
}

// 규칙 Form의 숫자 Input 중 비어 있거나 0 이상의 숫자가 아닌 Input 반환
export function checkAlarmRuleDraft(draft: AlarmRuleDraft): {
  emptyFields: AlarmRuleNumberField[];
  negativeFields: AlarmRuleNumberField[];
} {
  const emptyFields = alarmRuleNumberFields.filter((field) => draft[field].trim() === "");
  const negativeFields = alarmRuleNumberFields.filter(
    (field) => draft[field].trim() !== "" && !(Number(draft[field]) >= 0),
  );
  return { emptyFields, negativeFields };
}

// 규칙 Form의 Text를 저장에 넘길 값으로 변환
export function toAlarmRuleInput(draft: AlarmRuleDraft): AlarmRuleInput {
  return {
    deviceCode: draft.deviceCode,
    modelCode: draft.modelCode,
    isEnabled: draft.isEnabled,
    consecutiveMinutes: Number(draft.consecutiveMinutes),
    anomalyWindowCount: Number(draft.anomalyWindowCount),
    mergeGapSeconds: Number(draft.mergeGapSeconds),
    midMinMinutes: Number(draft.midMinMinutes),
    highMinMinutes: Number(draft.highMinMinutes),
    description: draft.description,
  };
}
