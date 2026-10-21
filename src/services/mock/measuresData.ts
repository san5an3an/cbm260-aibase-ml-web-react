import {
  applyMeasureAction,
  classifyUnactionedCount,
  compareWindowCounts,
  compareWindowRates,
  markMeasureActioned,
  summarizeMeasures,
} from "@/domain/measures";
import type {
  Measure,
  MeasureActionInput,
  MeasureActionOptions,
  MeasureEffectComparison,
  MeasureEffectOptions,
  MeasureEffectQuery,
  MeasureEffectRow,
  MeasureEffectSortKey,
  MeasureExportQuery,
  MeasureFilterOptions,
  MeasureId,
  MeasureSummary,
  MeasureWorklist,
  MeasureWorklistQuery,
  SensorFrequencyRow,
  YesNoCode,
} from "@/domain/measures";
import { measureActionCodes, measureActionLabels } from "@/domain/labels/measureAction";
import { measureEffectSortKeys } from "@/domain/labels/measureEffectSort";
import { measureInspectionCodes, measureInspectionLabels } from "@/domain/labels/measureInspection";
import {
  formatIsoDate,
  formatIsoHourMinute,
  formatIsoMonthDay,
  formatLocalIsoDateTime,
} from "@/lib/formatTime";
import { buildCsvFile } from "@/services/mock/csvFile";
import { shiftIsoDate } from "@/services/mock/dates";
import { markScreenEntry, respondLater, respondNow } from "@/services/mock/latency";

// 조치 대상 1건의 기초 데이터, 날짜는 Mock 기준일 기준
interface MeasureSeed {
  id: MeasureId;
  date: string;
  time: string;
  deviceCode: string;
  sensorName: string;
  actualValue: number;
  expectedValue: number;
  errorValue: number;
  formation: string;
  car: number;
  actionYn: YesNoCode;
  inspectionYn: YesNoCode;
}

const MEASURE_SEEDS: readonly MeasureSeed[] = [
  { id: "1", date: "2026-09-23", time: "09:12:07", deviceCode: "DRIVING_GEAR", sensorName: "압축기 토출압력", actualValue: 0.6, expectedValue: 0.2, errorValue: 0.4, formation: "401", car: 1, actionYn: "Y", inspectionYn: "Y" },
  { id: "2", date: "2026-09-22", time: "10:13:07", deviceCode: "TRACTION_MOTOR", sensorName: "압축기 흡입압력", actualValue: 0.65, expectedValue: 0.23, errorValue: 0.42, formation: "402", car: 2, actionYn: "N", inspectionYn: "N" },
  { id: "3", date: "2026-09-21", time: "11:14:07", deviceCode: "CMSB", sensorName: "베어링 진동 RMS", actualValue: 0.7, expectedValue: 0.26, errorValue: 0.44, formation: "403", car: 3, actionYn: "N", inspectionYn: "N" },
  { id: "4", date: "2026-09-20", time: "12:15:07", deviceCode: "ECU", sensorName: "베어링 온도", actualValue: 0.75, expectedValue: 0.29, errorValue: 0.46, formation: "404", car: 4, actionYn: "Y", inspectionYn: "N" },
  { id: "5", date: "2026-09-19", time: "13:16:07", deviceCode: "MICOM_COOLER", sensorName: "모터 권선온도", actualValue: 0.8, expectedValue: 0.32, errorValue: 0.48, formation: "405", car: 5, actionYn: "N", inspectionYn: "N" },
  { id: "6", date: "2026-09-18", time: "14:17:07", deviceCode: "MICOM_AIRPURIFIER", sensorName: "모터 전류 불균형", actualValue: 0.85, expectedValue: 0.2, errorValue: 0.65, formation: "406", car: 6, actionYn: "N", inspectionYn: "Y" },
  { id: "7", date: "2026-09-17", time: "15:18:07", deviceCode: "DCU", sensorName: "냉각수 유량", actualValue: 0.9, expectedValue: 0.23, errorValue: 0.67, formation: "407", car: 7, actionYn: "Y", inspectionYn: "N" },
  { id: "8", date: "2026-09-17", time: "15:18:07", deviceCode: "DCU", sensorName: "냉각수 유량", actualValue: 0.9, expectedValue: 0.23, errorValue: 0.67, formation: "407", car: 7, actionYn: "Y", inspectionYn: "N" },
  { id: "9", date: "2026-09-16", time: "16:19:07", deviceCode: "VVVF", sensorName: "오일 온도", actualValue: 0.6, expectedValue: 0.26, errorValue: 0.34, formation: "408", car: 8, actionYn: "N", inspectionYn: "N" },
];

// 목록에 없는 조치 대상 수, 요약 수치에 더함
const SUMMARY_OUTSIDE_LIST: MeasureSummary = {
  totalCount: 15,
  unactionedCount: 11,
  actionedCount: 4,
  uninspectedCount: 12,
};

const WORKLIST_PAGE_COUNT = 10;

// CSV 헤더 문자열, 워크List Table의 Column 이름과 같은 순서와 같은 문구(선택과 처리 Column은 제외)
const WORKLIST_CSV_HEADER: readonly string[] = [
  "발생시각",
  "장치 / 센서",
  "진단",
  "편성 / 호차",
  "조치",
  "조치일",
  "검수",
];
// CSV의 진단 값 소수 자릿수와 값이 없는 Cell의 문자, Table과 같음
const CSV_VALUE_DIGITS = 2;
const CSV_EMPTY_VALUE = "-";

// 처음 조회 기간(기준일 기준)과 선택할 수 있는 날짜 범위, 범위는 제한 없음
const DEFAULT_PERIOD = { from: "2026-09-16", to: "2026-09-23" } as const;

// 센서 빈발 이상 랭킹 [센서, 장치, 발생 횟수, 미조치, 최근 발생일(기준일 기준), 최근 발생 시각]
const SENSOR_FREQUENCY: readonly (readonly [string, string, number, number, string, string])[] = [
  ["압축기 토출압력", "AXLE_BEARING", 40, 16, "2026-09-23", "10:00:00"],
  ["압축기 흡입압력", "DRIVING_GEAR", 39, 15, "2026-09-22", "10:00:00"],
  ["베어링 진동 RMS", "TRACTION_MOTOR", 38, 13, "2026-09-21", "10:00:00"],
  ["베어링 온도", "CMSB", 34, 11, "2026-09-20", "10:00:00"],
  ["모터 권선온도", "ECU", 33, 9, "2026-09-19", "10:00:00"],
  ["모터 전류 불균형", "MICOM_COOLER", 32, 8, "2026-09-18", "10:00:00"],
  ["냉각수 유량", "MICOM_AIRPURIFIER", 28, 5, "2026-09-17", "10:00:00"],
  ["오일 온도", "DCU", 27, 4, "2026-09-16", "10:00:00"],
  ["축전지 셀전압", "VVVF", 26, 2, "2026-09-23", "10:00:00"],
  ["축전지 내부저항", "SIV", 22, 0, "2026-09-22", "10:00:00"],
];
// 미조치 건수를 강조하는 기준
const UNACTIONED_HIGH_MIN_COUNT = 10;

// 조치 Modal의 조치와 검수 여부 선택지, 아니오를 앞에 나열
const ACTION_MODAL_STATES: readonly YesNoCode[] = ["N", "Y"];
// 조치일이 없는 건을 열 때 채울 날짜(기준일)
const DEFAULT_ACTION_DATE = "2026-09-23";

// 담당자로 선택할 수 있는 정비사
const MEASURE_ASSIGNEES: readonly string[] = ["박기술", "이현장", "김정비"];

// 조치 효과 비교의 선택지와 초기 조건, 날짜는 기준일 기준
const EFFECT_DEVICE_CODES: readonly string[] = ["AXLE_BEARING", "CMSB", "DCU"];
const EFFECT_MODEL_CODES: readonly string[] = ["IF", "SVM", "VAE", "PCA"];
const EFFECT_FORMATIONS: readonly string[] = ["401", "402", "403", "404", "405"];
const EFFECT_CARS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const EFFECT_DAY_COUNTS: readonly number[] = [3, 5, 7, 14];
const EFFECT_DEFAULT_CONDITIONS = {
  deviceCode: "AXLE_BEARING",
  modelCode: "VAE",
  formation: null,
  car: null,
  baseDate: "2026-09-17",
  dayCount: 5,
} as const;
const EFFECT_DEFAULT_SORT: MeasureEffectSortKey = "change";

// 위치별 [편성, 호차, 위치, 조치 전 이상 window 수, 조치 후 이상 window 수], 앞뒤 5일 기준
const EFFECT_LOCATIONS: readonly (readonly [string, number, string, number, number])[] = [
  ["401", 0, "4010-H-1-False", 284, 62],
  ["402", 4, "4024-T-2-True", 270, 52],
  ["402", 3, "4023-H-1-False", 236, 68],
  ["403", 7, "4037-T-2-True", 162, 138],
  ["401", 1, "4011-T-2-True", 46, 96],
  ["403", 6, "4036-H-1-False", 120, 30],
];
// 위 window 수가 가리키는 일수, 선택한 일수에 비례해 늘리거나 줄여 사용
const EFFECT_SOURCE_DAY_COUNT = 5;
// 위치 하나의 5일치 전체 window 수
const EFFECT_WINDOWS_PER_LOCATION = 2000;
// 편성을 선택하지 않았을 때의 조치 전후 이상 window 수(5일 기준)
const EFFECT_FLEET_ANOMALIES = { before: 248, after: 64 };
// 비교할 수 있는 위치의 전체 수
const EFFECT_LOCATION_COUNT = 12;
// 변화를 좋아짐과 나빠짐으로 가르는 기준(%)과 비율 Bar가 가득 차는 비율(%)
const EFFECT_CHANGE_THRESHOLD_PERCENT = 30;
const EFFECT_RATE_SCALE_MAX_PERCENT = 15;
// 변화가 큰 순서 Sort에서 새로 생겼거나 변하지 않은 위치에 쓰는 변화율(%)
const EFFECT_UNRATED_CHANGE_PERCENT = 999;

function buildMeasure(seed: MeasureSeed): Measure {
  const occurredAt = `${shiftIsoDate(seed.date)}T${seed.time}`;
  return {
    id: seed.id,
    occurredAt,
    deviceCode: seed.deviceCode,
    sensorName: seed.sensorName,
    actualValue: seed.actualValue,
    expectedValue: seed.expectedValue,
    errorValue: seed.errorValue,
    formation: seed.formation,
    car: seed.car,
    actionYn: seed.actionYn,
    inspectionYn: seed.inspectionYn,
    // 조치일을 따로 적지 않은 완료 건은 발생일을 조치일로 사용
    actionDate: seed.actionYn === "Y" ? formatIsoDate(occurredAt) : null,
    actionNote: null,
  };
}

// 메모리의 조치 대상 목록, 실행 함수가 바꾸고 조회 함수가 읽음
let measureStore: Measure[] | null = null;

function readMeasures(): Measure[] {
  measureStore ??= MEASURE_SEEDS.map(buildMeasure);
  return measureStore;
}

export function buildMeasureFilterOptions(): MeasureFilterOptions {
  return {
    actionStates: [...measureActionCodes],
    inspectionStates: [...measureInspectionCodes],
    defaultPeriod: { from: shiftIsoDate(DEFAULT_PERIOD.from), to: shiftIsoDate(DEFAULT_PERIOD.to) },
    selectablePeriod: { from: null, to: null },
  };
}

// 조건에 맞는 조치 대상을 목록 순서대로 반환, Page 번호와 상관없이 맞는 Row 전부
function findMeasures(query: MeasureExportQuery): Measure[] {
  const { from, to } = query.period;
  return readMeasures().filter((measure) => {
    const occurredOn = formatIsoDate(measure.occurredAt);
    return (
      (query.deviceCode === null || measure.deviceCode === query.deviceCode) &&
      (query.actionYn === null || measure.actionYn === query.actionYn) &&
      (query.inspectionYn === null || measure.inspectionYn === query.inspectionYn) &&
      (from === null || occurredOn >= from) &&
      (to === null || occurredOn <= to)
    );
  });
}

// 워크List 한 Page 반환, Mock은 Page 번호와 상관없이 조건에 맞는 Row 전부를 싣고 Page 수는 고정 값
export function buildMeasureWorklist(query: MeasureWorklistQuery): MeasureWorklist {
  const rows = findMeasures(query).map((measure) => ({ ...measure }));
  return { rows, pageCount: WORKLIST_PAGE_COUNT };
}

// 조치 대상 1건을 Table에 표시되는 형태의 Cell로 변환, Table에서 두 Row인 Cell은 한 Cell에 이어서 씀
function toWorklistCsvCells(measure: Measure): string[] {
  const actual = measure.actualValue.toFixed(CSV_VALUE_DIGITS);
  const expected = measure.expectedValue.toFixed(CSV_VALUE_DIGITS);
  return [
    `${formatIsoMonthDay(measure.occurredAt)} ${formatIsoHourMinute(measure.occurredAt)}`,
    `${measure.deviceCode} / ${measure.sensorName}`,
    `실제≈${actual} / 기대≈${expected} · 오차 ${measure.errorValue.toFixed(CSV_VALUE_DIGITS)}`,
    `${measure.formation} · ${measure.car}호차`,
    measureActionLabels[measure.actionYn].label,
    measure.actionDate === null ? CSV_EMPTY_VALUE : formatIsoMonthDay(measure.actionDate),
    measureInspectionLabels[measure.inspectionYn].label,
  ];
}

// 조건에 맞는 조치 대상 전부를 Table에 표시되는 형태의 CSV 파일로 반환
export function buildMeasureCsv(query: MeasureExportQuery): Blob {
  return buildCsvFile(WORKLIST_CSV_HEADER, findMeasures(query).map(toWorklistCsvCells));
}

export function buildMeasureSummary(): MeasureSummary {
  const listed = summarizeMeasures(readMeasures());
  return {
    totalCount: SUMMARY_OUTSIDE_LIST.totalCount + listed.totalCount,
    unactionedCount: SUMMARY_OUTSIDE_LIST.unactionedCount + listed.unactionedCount,
    actionedCount: SUMMARY_OUTSIDE_LIST.actionedCount + listed.actionedCount,
    uninspectedCount: SUMMARY_OUTSIDE_LIST.uninspectedCount + listed.uninspectedCount,
  };
}

export function buildSensorFrequencyRanking(): SensorFrequencyRow[] {
  return SENSOR_FREQUENCY.map(([sensorName, deviceCode, occurrenceCount, unactionedCount, date, time]) => ({
    sensorName,
    deviceCode,
    occurrenceCount,
    unactionedCount,
    unactionedLevel: classifyUnactionedCount(unactionedCount, UNACTIONED_HIGH_MIN_COUNT),
    lastOccurredAt: `${shiftIsoDate(date)}T${time}`,
  }));
}

export function saveMeasureActionInStore(measureId: MeasureId, input: MeasureActionInput): void {
  measureStore = readMeasures().map((measure) =>
    measure.id === measureId ? applyMeasureAction(measure, input) : measure,
  );
}

// 선택한 건을 조치완료로 변경, 조치일이 없던 건은 발생일을 조치일로 사용
export function completeMeasuresInStore(measureIds: readonly MeasureId[]): void {
  measureStore = readMeasures().map((measure) =>
    measureIds.includes(measure.id)
      ? markMeasureActioned(measure, formatIsoDate(measure.occurredAt))
      : measure,
  );
}

export function buildMeasureActionOptions(): MeasureActionOptions {
  return {
    actionStates: [...ACTION_MODAL_STATES],
    inspectionStates: [...ACTION_MODAL_STATES],
    defaultActionDate: shiftIsoDate(DEFAULT_ACTION_DATE),
    selectableActionDates: { from: null, to: null },
  };
}

export function buildMeasureAssignees(): string[] {
  return [...MEASURE_ASSIGNEES];
}

export function buildMeasureEffectOptions(): MeasureEffectOptions {
  return {
    deviceCodes: [...EFFECT_DEVICE_CODES],
    modelCodes: [...EFFECT_MODEL_CODES],
    formations: [...EFFECT_FORMATIONS],
    cars: [...EFFECT_CARS],
    dayCounts: [...EFFECT_DAY_COUNTS],
    sortKeys: [...measureEffectSortKeys],
    defaultConditions: {
      ...EFFECT_DEFAULT_CONDITIONS,
      baseDate: shiftIsoDate(EFFECT_DEFAULT_CONDITIONS.baseDate),
    },
    defaultSort: EFFECT_DEFAULT_SORT,
    selectableBaseDates: { from: null, to: null },
  };
}

// "YYYY-MM-DD"에서 며칠 이동한 날짜 반환
function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return formatIsoDate(formatLocalIsoDateTime(new Date(year, month - 1, day + days)));
}

// Sort에 쓰는 변화율 계산, 새로 생겼거나 변하지 않은 위치는 가장 큰 값, 비교할 자료가 없는 위치는 0으로 계산
function changeWeight(row: MeasureEffectRow): number {
  const change = compareWindowCounts(row.before, row.after, EFFECT_CHANGE_THRESHOLD_PERCENT);
  const anomalyCount = row.before.anomalyCount + row.after.anomalyCount;
  switch (change.kind) {
    case "appeared":
      return EFFECT_UNRATED_CHANGE_PERCENT * anomalyCount;
    case "noData":
      return 0;
    case "rate":
      return Math.abs(change.percent || EFFECT_UNRATED_CHANGE_PERCENT) * anomalyCount;
  }
}

// Sort 기준별 두 위치의 순서 계산, 조치 전후 비율 순은 이상 비율이 높은 위치를 앞에 둠
const EFFECT_SORTERS: Record<MeasureEffectSortKey, (a: MeasureEffectRow, b: MeasureEffectRow) => number> = {
  change: (a, b) => changeWeight(b) - changeWeight(a),
  before: (a, b) => compareWindowRates(b.before, a.before),
  after: (a, b) => compareWindowRates(b.after, a.after),
  formation: (a, b) => Number(a.formation) * 10 + a.car - (Number(b.formation) * 10 + b.car),
};

// 기준일 앞뒤 같은 일수의 이상 비율을 위치별로 계산, 장치와 Model은 결과를 바꾸지 않음
export function buildMeasureEffectComparison(query: MeasureEffectQuery): MeasureEffectComparison {
  const scale = query.dayCount / EFFECT_SOURCE_DAY_COUNT;
  const windowCount = Math.round(EFFECT_WINDOWS_PER_LOCATION * scale);
  const rows: MeasureEffectRow[] = EFFECT_LOCATIONS.filter(
    ([formation, car]) =>
      (query.formation === null || formation === query.formation) &&
      (query.car === null || car === query.car),
  ).map(([formation, car, locationCode, before, after]) => ({
    formation,
    car,
    locationCode,
    before: { anomalyCount: Math.round(before * scale), windowCount },
    after: { anomalyCount: Math.round(after * scale), windowCount },
  }));
  rows.sort(EFFECT_SORTERS[query.sort]);
  const isFleet = query.formation === null;
  const sum = (pick: (row: MeasureEffectRow) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);
  const totalWindows = isFleet ? windowCount : windowCount * Math.max(1, rows.length);
  return {
    beforePeriod: {
      from: addDays(query.baseDate, -query.dayCount),
      to: addDays(query.baseDate, -1),
    },
    afterPeriod: { from: addDays(query.baseDate, 1), to: addDays(query.baseDate, query.dayCount) },
    before: {
      anomalyCount: isFleet
        ? Math.round(EFFECT_FLEET_ANOMALIES.before * scale)
        : sum((row) => row.before.anomalyCount),
      windowCount: totalWindows,
    },
    after: {
      anomalyCount: isFleet
        ? Math.round(EFFECT_FLEET_ANOMALIES.after * scale)
        : sum((row) => row.after.anomalyCount),
      windowCount: totalWindows,
    },
    rows,
    locationCount: EFFECT_LOCATION_COUNT,
    changeThresholdPercent: EFFECT_CHANGE_THRESHOLD_PERCENT,
    rateScaleMaxPercent: EFFECT_RATE_SCALE_MAX_PERCENT,
  };
}

// 화면 진입 시 호출하는 조회 중 첫 진입에서 지연 시간을 적용할 조회 이름, 처음 값 조회가 호출하면 각 조회에 한 번씩 적용
const ENTRY_QUERY_NAMES = ["measureWorklist", "measureSummary", "measureSensorRanking"] as const;

// Filter 조건 Row의 처음 값 조회 응답, 화면 진입으로 표시하고 즉시 응답
export function respondMeasureFilterOptions(signal?: AbortSignal): Promise<MeasureFilterOptions> {
  markScreenEntry(ENTRY_QUERY_NAMES);
  return respondNow(signal, buildMeasureFilterOptions);
}

// 워크List 한 Page 응답, 첫 진입과 검색 시 지연 시간 적용
export function respondMeasureWorklist(
  query: MeasureWorklistQuery,
  signal?: AbortSignal,
): Promise<MeasureWorklist> {
  return respondLater("measureWorklist", signal, () => buildMeasureWorklist(query));
}

// 상태별 수 요약 응답, 첫 진입과 검색 시 지연 시간 적용
export function respondMeasureSummary(signal?: AbortSignal): Promise<MeasureSummary> {
  return respondLater("measureSummary", signal, buildMeasureSummary);
}

// 센서 빈발 이상 랭킹 응답, 첫 진입과 검색 시 지연 시간 적용
export function respondSensorFrequencyRanking(signal?: AbortSignal): Promise<SensorFrequencyRow[]> {
  return respondLater("measureSensorRanking", signal, buildSensorFrequencyRanking);
}

// 조치 Modal의 선택지 응답, 즉시 응답
export function respondMeasureActionOptions(signal?: AbortSignal): Promise<MeasureActionOptions> {
  return respondNow(signal, buildMeasureActionOptions);
}

// 담당자 선택지 응답, 즉시 응답
export function respondMeasureAssignees(signal?: AbortSignal): Promise<string[]> {
  return respondNow(signal, buildMeasureAssignees);
}

// 조치 효과 비교의 선택지 응답, 즉시 응답
export function respondMeasureEffectOptions(signal?: AbortSignal): Promise<MeasureEffectOptions> {
  return respondNow(signal, buildMeasureEffectOptions);
}

// 조치 효과 비교 결과 응답, Modal 안의 조회라 즉시 응답
export function respondMeasureEffectComparison(
  query: MeasureEffectQuery,
  signal?: AbortSignal,
): Promise<MeasureEffectComparison> {
  return respondNow(signal, () => buildMeasureEffectComparison(query));
}
