import {
  acknowledgeAlarm,
  applyAlarmProcess,
  assignAlarm,
  countOpenAlarms,
  sumAlarmSeverityCounts,
} from "@/domain/alarms";
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
  AlarmSeverityKey,
  AlarmSort,
  AlarmSourceKey,
  AlarmStatusCounts,
  AlarmStatusKey,
  AlarmSummary,
  AlarmTrend,
  AlarmWorklist,
  AlarmWorklistQuery,
  DailyAlarmCount,
} from "@/domain/alarms";
import { classifyAnomalyRate } from "@/domain/anomaly";
import { alarmSeverityKeys } from "@/domain/labels/alarmSeverity";
import { alarmStatusKeys } from "@/domain/labels/alarmStatus";
import { formatLocalIsoDateTime } from "@/lib/formatTime";
import { ANOMALY_LEVEL_THRESHOLDS } from "@/services/mock/anomalyRules";
import { isoDateBeforeToday, shiftIsoDate } from "@/services/mock/dates";
import { markScreenEntry, respondLater, respondNow, runActionLater } from "@/services/mock/latency";

// Alarm 한 건의 원본 데이터, 날짜는 Mock 생성 기준일 기준
interface AlarmSeed {
  id: AlarmId;
  date: string;
  time: string;
  deviceCode: string;
  modelCode: string;
  formation: string;
  car: number;
  severity: AlarmSeverityKey;
  anomalyRatePercent: number;
  status: AlarmStatusKey;
  assignee: string | null;
  // 확인 및 해소 시각을 [날짜, 시각]으로 표기
  acknowledged: readonly [string, string] | null;
  resolved: readonly [string, string] | null;
  // 자동 생성 Alarm의 [이상 window 수, 가장 긴 구간(분)]
  anomalyWindow: readonly [number, number] | null;
}

const ALARM_SEEDS: readonly AlarmSeed[] = [
  { id: "1", date: "2026-09-23", time: "08:05:00", deviceCode: "CMSB", modelCode: "IF", formation: "401", car: 1, severity: "MID", anomalyRatePercent: 8, status: "NEW", assignee: null, acknowledged: null, resolved: null, anomalyWindow: [12, 6.2] },
  { id: "2", date: "2026-09-22", time: "09:06:07", deviceCode: "ECU", modelCode: "SVM", formation: "402", car: 2, severity: "LOW", anomalyRatePercent: 13, status: "ACK", assignee: "이현장", acknowledged: ["2026-09-22", "09:40:12"], resolved: null, anomalyWindow: null },
  { id: "3", date: "2026-09-21", time: "10:07:14", deviceCode: "MICOM_COOLER", modelCode: "VAE", formation: "403", car: 3, severity: "CRIT", anomalyRatePercent: 18, status: "IN_PROGRESS", assignee: "박기술", acknowledged: ["2026-09-22", "09:40:12"], resolved: null, anomalyWindow: [8, 4.5] },
  { id: "4", date: "2026-09-20", time: "11:08:21", deviceCode: "MICOM_AIRPURIFIER", modelCode: "PCA", formation: "404", car: 4, severity: "HIGH", anomalyRatePercent: 23, status: "RESOLVED", assignee: "김정비", acknowledged: ["2026-09-20", "13:02:44"], resolved: ["2026-09-20", "18:00:00"], anomalyWindow: null },
  { id: "5", date: "2026-09-19", time: "12:09:28", deviceCode: "DCU", modelCode: "IF", formation: "405", car: 5, severity: "MID", anomalyRatePercent: 28, status: "FALSE_POSITIVE", assignee: "이현장", acknowledged: ["2026-09-19", "14:20:05"], resolved: ["2026-09-21", "18:00:00"], anomalyWindow: [15, 7.0] },
  { id: "6", date: "2026-09-18", time: "13:10:35", deviceCode: "VVVF", modelCode: "SVM", formation: "406", car: 6, severity: "LOW", anomalyRatePercent: 8, status: "NEW", assignee: null, acknowledged: null, resolved: null, anomalyWindow: null },
  { id: "7", date: "2026-09-17", time: "14:11:42", deviceCode: "SIV", modelCode: "VAE", formation: "407", car: 7, severity: "CRIT", anomalyRatePercent: 13, status: "ACK", assignee: "김정비", acknowledged: ["2026-09-17", "15:01:19"], resolved: null, anomalyWindow: [6, 3.0] },
  { id: "8", date: "2026-09-16", time: "15:12:49", deviceCode: "TCMS", modelCode: "PCA", formation: "408", car: 8, severity: "HIGH", anomalyRatePercent: 18, status: "IN_PROGRESS", assignee: "이현장", acknowledged: ["2026-09-16", "16:00:31"], resolved: null, anomalyWindow: null },
  { id: "9", date: "2026-09-16", time: "15:12:49", deviceCode: "TCMS", modelCode: "PCA", formation: "408", car: 8, severity: "HIGH", anomalyRatePercent: 18, status: "IN_PROGRESS", assignee: "이현장", acknowledged: ["2026-09-16", "16:00:31"], resolved: null, anomalyWindow: [9, 5.5] },
  { id: "10", date: "2026-09-15", time: "16:13:56", deviceCode: "PAC", modelCode: "IF", formation: "409", car: 1, severity: "MID", anomalyRatePercent: 23, status: "RESOLVED", assignee: "박기술", acknowledged: ["2026-09-15", "17:10:02"], resolved: ["2026-09-20", "18:00:00"], anomalyWindow: null },
];

// Comment가 있는 Alarm id와 Comment에 들어가는 날짜, 날짜는 기준일 기준
const COMMENTED_ALARM_ID: AlarmId = "3";
const COMMENT_DATE = "2026-09-24";

// 목록에 없는 Alarm의 상태별 수, 요약 수치에 더함
const STATUS_COUNTS_OUTSIDE_LIST: AlarmStatusCounts = {
  NEW: 3,
  ACK: 3,
  IN_PROGRESS: 1,
  RESOLVED: 2,
  FALSE_POSITIVE: 3,
};

const WORKLIST_PAGE_SIZE = 20;
const WORKLIST_PAGE_COUNT = 10;

// 최근 10일의 심각도별 Alarm 수 [LOW, MID, HIGH, CRIT], 마지막 값이 오늘
const DAILY_SEVERITY_COUNTS: readonly (readonly [number, number, number, number])[] = [
  [1, 0, 1, 0],
  [0, 1, 0, 1],
  [1, 0, 1, 0],
  [0, 1, 0, 1],
  [1, 0, 1, 0],
  [0, 1, 0, 1],
  [1, 0, 1, 0],
  [0, 1, 0, 1],
  [2, 0, 1, 0],
  [0, 2, 0, 1],
];
const TREND_TOTAL_COUNT = 22;
const SOURCE_TALLIES: readonly (readonly [AlarmSourceKey, number])[] = [
  ["auto", 11],
  ["manual", 11],
];
const MODEL_TALLIES: readonly (readonly [string, number])[] = [
  ["IF", 6],
  ["SVM", 6],
  ["VAE", 5],
  ["PCA", 5],
];

// 호차별 Alarm 순위 [편성, 호차, 최고 심각도]
const CAR_RANKING: readonly (readonly [string, number, AlarmSeverityKey])[] = [
  ["403", 3, "CRIT"],
  ["404", 4, "HIGH"],
  ["407", 7, "CRIT"],
  ["408", 8, "HIGH"],
  ["411", 3, "CRIT"],
  ["412", 4, "HIGH"],
  ["415", 7, "CRIT"],
  ["416", 8, "HIGH"],
  ["419", 3, "CRIT"],
  ["420", 4, "HIGH"],
];
// 순위의 Alarm 날짜가 반복되는 주기(일)
const CAR_RANKING_DATE_CYCLE = 4;

const ALARM_RULE_SEEDS: readonly AlarmRule[] = [
  { id: "1", deviceCode: null, modelCode: null, isEnabled: true, consecutiveMinutes: 3, anomalyWindowCount: 5, mergeGapSeconds: 120, midMinMinutes: 10, highMinMinutes: 30, description: "기본 규칙(전체 장치·전체 모델)" },
  { id: "2", deviceCode: null, modelCode: "SVM", isEnabled: true, consecutiveMinutes: 5, anomalyWindowCount: 8, mergeGapSeconds: 120, midMinMinutes: 10, highMinMinutes: 30, description: "" },
  { id: "3", deviceCode: "AXLE_BEARING", modelCode: null, isEnabled: true, consecutiveMinutes: 2, anomalyWindowCount: 4, mergeGapSeconds: 120, midMinMinutes: 5, highMinMinutes: 20, description: "" },
  { id: "4", deviceCode: "AXLE_BEARING", modelCode: "IF", isEnabled: true, consecutiveMinutes: 1, anomalyWindowCount: 3, mergeGapSeconds: 120, midMinMinutes: 5, highMinMinutes: 15, description: "차축 베어링 민감 규칙" },
  { id: "5", deviceCode: "AXLE_BEARING", modelCode: "VAE", isEnabled: true, consecutiveMinutes: 1, anomalyWindowCount: 3, mergeGapSeconds: 120, midMinMinutes: 5, highMinMinutes: 15, description: "" },
  { id: "6", deviceCode: "CMSB", modelCode: null, isEnabled: true, consecutiveMinutes: 2, anomalyWindowCount: 4, mergeGapSeconds: 180, midMinMinutes: 5, highMinMinutes: 20, description: "" },
  { id: "7", deviceCode: "CMSB", modelCode: "PCA", isEnabled: false, consecutiveMinutes: 3, anomalyWindowCount: 5, mergeGapSeconds: 120, midMinMinutes: 10, highMinMinutes: 30, description: "" },
  { id: "8", deviceCode: "DCU", modelCode: "IF", isEnabled: false, consecutiveMinutes: 3, anomalyWindowCount: 5, mergeGapSeconds: 120, midMinMinutes: 10, highMinMinutes: 30, description: "시험 중 — 꺼 둠" },
  { id: "9", deviceCode: "ECU", modelCode: "VAE", isEnabled: true, consecutiveMinutes: 4, anomalyWindowCount: 6, mergeGapSeconds: 120, midMinMinutes: 10, highMinMinutes: 40, description: "" },
];

const ALARM_ASSIGNEES = ["박기술", "이현장", "김정비"] as const;

// Alarm 등록에서 입력할 수 있는 편성, 호차, 이상비율의 범위와 초기값
const FORMATION_RANGE = { min: 401, max: 426 } as const;
const CAR_RANGE = { min: 1, max: 10 } as const;
const ANOMALY_RATE_RANGE = { min: 0, max: 100 } as const;
const ALARM_CREATE_DEFAULTS = {
  deviceCode: "ATC",
  modelCode: "IF",
  segment: "default",
  severity: "MID",
} as const;

function shiftedDateTime([date, time]: readonly [string, string]): string {
  return `${shiftIsoDate(date)}T${time}`;
}

function buildAlarm(seed: AlarmSeed): Alarm {
  return {
    id: seed.id,
    occurredAt: shiftedDateTime([seed.date, seed.time]),
    deviceCode: seed.deviceCode,
    modelCode: seed.modelCode,
    formation: seed.formation,
    car: seed.car,
    severity: seed.severity,
    anomalyRatePercent: seed.anomalyRatePercent,
    anomalyRateLevel: classifyAnomalyRate(seed.anomalyRatePercent, ANOMALY_LEVEL_THRESHOLDS),
    status: seed.status,
    source: seed.anomalyWindow ? "auto" : "manual",
    anomalyWindow: seed.anomalyWindow
      ? { count: seed.anomalyWindow[0], longestMinutes: seed.anomalyWindow[1] }
      : null,
    assignee: seed.assignee,
    acknowledgedAt: seed.acknowledged ? shiftedDateTime(seed.acknowledged) : null,
    resolvedAt: seed.resolved ? shiftedDateTime(seed.resolved) : null,
    comment:
      seed.id === COMMENTED_ALARM_ID
        ? `냉매 압력 센서 점검 예정. ${shiftIsoDate(COMMENT_DATE).slice(5)} 입고 시 교체 여부 판단.`
        : "",
  };
}

// 메모리 안의 Alarm과 규칙 목록, 실행 함수가 바꾸고 조회 함수가 읽음
let alarmStore: Alarm[] | null = null;
let alarmRuleStore: AlarmRule[] | null = null;
let createdAlarmCount = 0;
let createdRuleCount = 0;

function readAlarms(): Alarm[] {
  alarmStore ??= ALARM_SEEDS.map(buildAlarm);
  return alarmStore;
}

function readAlarmRules(): AlarmRule[] {
  alarmRuleStore ??= ALARM_RULE_SEEDS.map((rule) => ({ ...rule }));
  return alarmRuleStore;
}

function currentDateTime(): string {
  return formatLocalIsoDateTime(new Date());
}

const sortValues: Record<AlarmSort["key"], (alarm: Alarm) => string | number> = {
  occurredAt: (alarm) => alarm.occurredAt,
  severity: (alarm) => alarmSeverityKeys.indexOf(alarm.severity),
  anomalyRate: (alarm) => alarm.anomalyRatePercent,
};

export function buildAlarmFilterOptions(): AlarmFilterOptions {
  return { statuses: [...alarmStatusKeys], severities: [...alarmSeverityKeys] };
}

// 조건에 맞는 Alarm을 정렬해 반환, Page 번호와 무관하게 맞는 Row 전부
export function buildAlarmWorklist(query: AlarmWorklistQuery): AlarmWorklist {
  const valueOf = sortValues[query.sort.key];
  const sign = query.sort.direction === "asc" ? 1 : -1;
  const rows = readAlarms()
    .filter(
      (alarm) =>
        (query.status === null || alarm.status === query.status) &&
        (query.severity === null || alarm.severity === query.severity) &&
        (query.deviceCode === null || alarm.deviceCode === query.deviceCode),
    )
    .sort((left, right) => {
      const leftValue = valueOf(left);
      const rightValue = valueOf(right);
      if (leftValue === rightValue) return 0;
      return (leftValue > rightValue ? 1 : -1) * sign;
    });
  return { rows, pageSize: WORKLIST_PAGE_SIZE, pageCount: WORKLIST_PAGE_COUNT };
}

export function buildAlarmSummary(): AlarmSummary {
  const countsByStatus = { ...STATUS_COUNTS_OUTSIDE_LIST };
  for (const alarm of readAlarms()) {
    countsByStatus[alarm.status] += 1;
  }
  return { openCount: countOpenAlarms(countsByStatus), countsByStatus };
}

export function buildAlarmTrend(): AlarmTrend {
  const lastIndex = DAILY_SEVERITY_COUNTS.length - 1;
  const days: DailyAlarmCount[] = DAILY_SEVERITY_COUNTS.map(([low, mid, high, crit], index) => ({
    date: isoDateBeforeToday(lastIndex - index),
    countsBySeverity: { LOW: low, MID: mid, HIGH: high, CRIT: crit },
  }));
  const severityTotals = sumAlarmSeverityCounts(days);
  return {
    totalCount: TREND_TOTAL_COUNT,
    days,
    // 수가 많은 심각도부터 나열
    severityTallies: alarmSeverityKeys
      .map((severity) => ({ severity, count: severityTotals[severity] }))
      .sort((left, right) => right.count - left.count),
    sourceTallies: SOURCE_TALLIES.map(([source, count]) => ({ source, count })),
    modelTallies: MODEL_TALLIES.map(([modelCode, count]) => ({ modelCode, count })),
  };
}

export function buildAlarmCarRanking(): AlarmCarRankingRow[] {
  return CAR_RANKING.map(([formation, car, topSeverity], index) => ({
    formation,
    car,
    alarmCount: 1,
    countsBySeverity: { LOW: 0, MID: 0, HIGH: 1, CRIT: 0 },
    topSeverity,
    alarmDate: isoDateBeforeToday(index % CAR_RANKING_DATE_CYCLE),
  }));
}

// 등록한 Alarm을 목록 맨 앞에 추가
export function addAlarm(input: AlarmCreateInput): Alarm {
  createdAlarmCount += 1;
  const alarm: Alarm = {
    id: `created-${createdAlarmCount}`,
    occurredAt: input.occurredAt,
    deviceCode: input.deviceCode,
    modelCode: input.modelCode,
    formation: input.formation,
    car: input.car,
    severity: input.severity,
    anomalyRatePercent: input.anomalyRatePercent,
    anomalyRateLevel: classifyAnomalyRate(input.anomalyRatePercent, ANOMALY_LEVEL_THRESHOLDS),
    status: "NEW",
    source: "manual",
    anomalyWindow: null,
    assignee: input.assignee,
    acknowledgedAt: null,
    resolvedAt: null,
    comment: input.comment,
  };
  alarmStore = [alarm, ...readAlarms()];
  return alarm;
}

export function acknowledgeAlarmsInStore(alarmIds: readonly AlarmId[]): void {
  const now = currentDateTime();
  alarmStore = readAlarms().map((alarm) =>
    alarmIds.includes(alarm.id) ? acknowledgeAlarm(alarm, now) : alarm,
  );
}

export function processAlarmInStore(alarmId: AlarmId, input: AlarmProcessInput): void {
  const now = currentDateTime();
  alarmStore = readAlarms().map((alarm) =>
    alarm.id === alarmId ? applyAlarmProcess(alarm, input, now) : alarm,
  );
}

export function assignAlarmsInStore(alarmIds: readonly AlarmId[], input: AlarmAssignInput): void {
  const now = currentDateTime();
  alarmStore = readAlarms().map((alarm) =>
    alarmIds.includes(alarm.id) ? assignAlarm(alarm, input, now) : alarm,
  );
}

export function removeAlarm(alarmId: AlarmId): void {
  alarmStore = readAlarms().filter((alarm) => alarm.id !== alarmId);
}

// Alarm 한 건 삭제 응답, 받은 요청을 기록하고 바로 삭제. Test는 이름으로 지연시키거나 실패시킴
export function respondDeleteAlarm(alarmId: AlarmId): Promise<void> {
  return runActionLater("deleteAlarm", alarmId, () => removeAlarm(alarmId));
}

export function listAlarmRules(): AlarmRule[] {
  return readAlarmRules().map((rule) => ({ ...rule }));
}

// 장치와 Model의 쌍이 같은 규칙이 있으면 덮어쓰고 없으면 추가
export function saveAlarmRuleInStore(input: AlarmRuleInput): AlarmRule {
  const rules = readAlarmRules();
  const existing = rules.find(
    (rule) => rule.deviceCode === input.deviceCode && rule.modelCode === input.modelCode,
  );
  if (existing) {
    const updated: AlarmRule = { ...existing, ...input };
    alarmRuleStore = rules.map((rule) => (rule === existing ? updated : rule));
    return updated;
  }
  createdRuleCount += 1;
  const created: AlarmRule = { id: `created-${createdRuleCount}`, ...input };
  alarmRuleStore = [...rules, created];
  return created;
}

export function removeAlarmRule(ruleId: AlarmRuleId): void {
  alarmRuleStore = readAlarmRules().filter((rule) => rule.id !== ruleId);
}

export function listAlarmAssignees(): string[] {
  return [...ALARM_ASSIGNEES];
}

export function buildAlarmCreateOptions(): AlarmCreateOptions {
  return {
    severities: [...alarmSeverityKeys],
    formationRange: { ...FORMATION_RANGE },
    carRange: { ...CAR_RANGE },
    anomalyRateRange: { ...ANOMALY_RATE_RANGE },
    defaults: { ...ALARM_CREATE_DEFAULTS },
  };
}

// 화면 진입 시 조회 중 처음 진입할 때 시간만큼 지연시킬 조회 이름 목록, 초기값 조회가 호출하면 이후 한 번씩 지연
const ENTRY_QUERY_NAMES = ["alarmWorklist", "alarmSummary", "alarmTrend", "alarmCarRanking"] as const;

// 상태와 심각도 선택지 응답, 화면에 진입한 것으로 표시하고 바로 응답
export function respondAlarmFilterOptions(signal?: AbortSignal): Promise<AlarmFilterOptions> {
  markScreenEntry(ENTRY_QUERY_NAMES);
  return respondNow(signal, buildAlarmFilterOptions);
}

// Alarm 목록 응답, 처음 진입할 때와 검색할 때 시간만큼 지연
export function respondAlarmWorklist(
  query: AlarmWorklistQuery,
  signal?: AbortSignal,
): Promise<AlarmWorklist> {
  return respondLater("alarmWorklist", signal, () => buildAlarmWorklist(query));
}

// 상태별 Alarm 수 응답, 처음 진입할 때와 검색할 때 시간만큼 지연
export function respondAlarmSummary(signal?: AbortSignal): Promise<AlarmSummary> {
  return respondLater("alarmSummary", signal, buildAlarmSummary);
}

// 날짜별 Alarm 수 응답, 처음 진입할 때와 검색할 때 시간만큼 지연
export function respondAlarmTrend(signal?: AbortSignal): Promise<AlarmTrend> {
  return respondLater("alarmTrend", signal, buildAlarmTrend);
}

// 호차별 Alarm 순위 응답, 처음 진입할 때와 검색할 때 시간만큼 지연
export function respondAlarmCarRanking(signal?: AbortSignal): Promise<AlarmCarRankingRow[]> {
  return respondLater("alarmCarRanking", signal, buildAlarmCarRanking);
}

// Alarm 등록 선택지 응답, 바로 응답
export function respondAlarmCreateOptions(signal?: AbortSignal): Promise<AlarmCreateOptions> {
  return respondNow(signal, buildAlarmCreateOptions);
}

// Alarm 규칙 목록 응답, 바로 응답
export function respondAlarmRules(signal?: AbortSignal): Promise<AlarmRule[]> {
  return respondNow(signal, listAlarmRules);
}

// 담당자 목록 응답, 바로 응답
export function respondAlarmAssignees(signal?: AbortSignal): Promise<string[]> {
  return respondNow(signal, listAlarmAssignees);
}
