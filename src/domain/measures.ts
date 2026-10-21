import type { DateRange } from "@/domain/period";
import { formatIsoDate } from "@/lib/formatTime";

// 예, 아니오 두 값으로 받는 여부 정의, 조치 여부와 검수 여부에 사용
export type YesNoCode = "Y" | "N";
export type MeasureId = string;
// 미조치 건수가 기준 이상이면 high
export type UnactionedLevelKey = "high" | "normal";

// 이상으로 판정된 센서의 조치 대상 한 건, 시각은 "YYYY-MM-DDTHH:mm:ss", 날짜는 "YYYY-MM-DD"
export interface Measure {
  id: MeasureId;
  occurredAt: string;
  deviceCode: string;
  sensorName: string;
  // 센서의 실제 값, Model이 기대한 값, 둘의 오차
  actualValue: number;
  expectedValue: number;
  errorValue: number;
  formation: string;
  car: number;
  actionYn: YesNoCode;
  inspectionYn: YesNoCode;
  // 실제로 조치한 날짜, 조치 여부가 N이면 null
  actionDate: string | null;
  // 조치 내용, 적지 않았으면 null
  actionNote: string | null;
}

// 장치, 조치 여부, 검수 여부가 null이면 전체 조회
export interface MeasureFilter {
  deviceCode: string | null;
  actionYn: YesNoCode | null;
  inspectionYn: YesNoCode | null;
}

// 워크List 조회 조건, 기간은 발생일 기준이고 끝이 null이면 그쪽 끝은 제한 없음
export interface MeasureWorklistQuery extends MeasureFilter {
  period: DateRange;
  // 1부터 시작하는 Page 번호
  page: number;
}

export interface MeasureWorklist {
  // 조건을 적용한 해당 Page의 Row 목록
  rows: readonly Measure[];
  pageCount: number;
}

// CSV로 내려받을 목록의 조건, 현재 화면에 적용된 조건과 같음
export type MeasureExportQuery = Omit<MeasureWorklistQuery, "page">;

// 조건 Row에서 선택할 수 있는 값과 초기값 정의, 나열한 순서가 선택지의 순서
export interface MeasureFilterOptions {
  actionStates: readonly YesNoCode[];
  inspectionStates: readonly YesNoCode[];
  // 초기 조회 기간, 초기화 Button을 누르면 이 기간으로 복원
  defaultPeriod: DateRange;
  // 선택할 수 있는 날짜 범위, 끝이 null이면 그쪽 끝은 제한 없음
  selectablePeriod: DateRange;
}

// 조치 대상 수 요약, 검색 조건과 무관한 전체 기준
export interface MeasureSummary {
  totalCount: number;
  unactionedCount: number;
  actionedCount: number;
  uninspectedCount: number;
}

// 센서 빈발 이상 랭킹의 한 Row, Row마다 센서와 장치의 조합이 다름
export interface SensorFrequencyRow {
  sensorName: string;
  deviceCode: string;
  occurrenceCount: number;
  unactionedCount: number;
  unactionedLevel: UnactionedLevelKey;
  lastOccurredAt: string;
}

// 조치 한 건을 저장할 때 전달하는 값, 조치 여부가 N이면 조치일은 null
export interface MeasureActionInput {
  actionYn: YesNoCode;
  inspectionYn: YesNoCode;
  actionDate: string | null;
  // 앞뒤 공백을 제거한 조치 내용, 남는 문자가 없으면 null
  actionNote: string | null;
}

// 조치 Modal에서 편집 중인 값, 조치일은 조치 여부와 상관없이 항상 하나를 선택한 상태
export interface MeasureActionDraft {
  actionYn: YesNoCode;
  inspectionYn: YesNoCode;
  actionDate: string;
  actionNote: string;
}

// 조치 Modal에서 선택할 수 있는 값과 초기값 정의, 나열한 순서가 선택지의 순서
export interface MeasureActionOptions {
  actionStates: readonly YesNoCode[];
  inspectionStates: readonly YesNoCode[];
  // 조치일이 없는 미조치 건을 열 때 채울 날짜, 조치일이 없는 완료 건은 발생일로 채움
  defaultActionDate: string;
  // 조치일로 선택할 수 있는 날짜 범위, 끝이 null이면 그쪽 끝은 제한 없음
  selectableActionDates: DateRange;
}

// 여러 건에 담당자를 지정할 때 전달하는 값
export interface MeasureAssignInput {
  assignee: string;
  // 앞뒤 공백을 제거한 Comment, 남는 문자가 없으면 null
  comment: string | null;
}

// 조치 효과 비교에서 위치를 나열하는 순서 정의, change는 변화 정도가 큰 순
export type MeasureEffectSortKey = "change" | "before" | "after" | "formation";

// 조치 효과 비교의 조건, 편성과 호차가 null이면 전체
export interface MeasureEffectConditions {
  deviceCode: string;
  modelCode: string;
  formation: string | null;
  car: number | null;
  // 기준일, 이 날짜는 이전과 이후 구간 모두에 포함하지 않음
  baseDate: string;
  // 기준일 앞뒤로 각각 조회할 일수
  dayCount: number;
}

export interface MeasureEffectQuery extends MeasureEffectConditions {
  sort: MeasureEffectSortKey;
}

// 조치 효과 비교에서 선택할 수 있는 값과 초기값 정의, 나열한 순서가 선택지의 순서
export interface MeasureEffectOptions {
  deviceCodes: readonly string[];
  modelCodes: readonly string[];
  formations: readonly string[];
  cars: readonly number[];
  dayCounts: readonly number[];
  sortKeys: readonly MeasureEffectSortKey[];
  defaultConditions: MeasureEffectConditions;
  defaultSort: MeasureEffectSortKey;
  // 기준일로 선택할 수 있는 날짜 범위, 끝이 null이면 그쪽 끝은 제한 없음
  selectableBaseDates: DateRange;
}

// 기간 하나의 이상 window 수와 전체 window 수
export interface WindowCount {
  anomalyCount: number;
  windowCount: number;
}

// 조치 효과 비교의 한 Row, 편성, 호차, 베어링 위치마다 하나
export interface MeasureEffectRow {
  formation: string;
  car: number;
  locationCode: string;
  before: WindowCount;
  after: WindowCount;
}

// 조치 효과 비교 결과, 기간은 양 끝을 포함한 "YYYY-MM-DD"
export interface MeasureEffectComparison {
  beforePeriod: { from: string; to: string };
  afterPeriod: { from: string; to: string };
  // 조건 전체의 이전과 이후 window 수
  before: WindowCount;
  after: WindowCount;
  // 조건에 맞는 위치 목록, 조회 조건의 정렬 순서를 따름
  rows: readonly MeasureEffectRow[];
  // 비교할 수 있는 위치의 전체 수
  locationCount: number;
  // 이상 비율이 이 % 이상 줄면 개선, 늘면 악화로 판정하는 기준
  changeThresholdPercent: number;
  // 비율 Bar가 가득 차는 이상 비율(%)
  rateScaleMaxPercent: number;
}

// improved는 기준 이상 감소, worsened는 기준 이상 증가, steady는 그 사이
export type MeasureEffectLevel = "improved" | "worsened" | "steady";

// 이전과 이후 이상 비율의 변화 정의, appeared는 이전에 없던 이상이 이후에 생긴 경우, noData는 window가 없는 기간이 있어 비교할 수 없는 경우
export type MeasureEffectChange =
  | { kind: "appeared" }
  | { kind: "noData" }
  | { kind: "rate"; percent: number; level: MeasureEffectLevel };

// 조치 전후 비교를 Row에서 열 때 미리 채울 조건, 기준일은 해당 Row의 조치일
export interface MeasureComparePreset {
  formation: string;
  car: number;
  baseDate: string;
}

// 조치 대상 목록의 상태별 수 계산
export function summarizeMeasures(measures: readonly Measure[]): MeasureSummary {
  const actionedCount = measures.filter((measure) => measure.actionYn === "Y").length;
  return {
    totalCount: measures.length,
    unactionedCount: measures.length - actionedCount,
    actionedCount,
    uninspectedCount: measures.filter((measure) => measure.inspectionYn === "N").length,
  };
}

// 미조치 건수와 기준값으로 강조 여부 판정
export function classifyUnactionedCount(count: number, highMinCount: number): UnactionedLevelKey {
  return count >= highMinCount ? "high" : "normal";
}

// 기간 하나의 window 수에 이상 비율(%)을 붙인 값
export interface RatedWindowCount extends WindowCount {
  ratePercent: number;
}

// 조치 효과 비교의 한 Row에 비율과 변화 판정을 붙인 값
export interface RatedMeasureEffectRow {
  formation: string;
  car: number;
  locationCode: string;
  before: RatedWindowCount;
  after: RatedWindowCount;
  change: MeasureEffectChange;
}

// 조치 효과 비교 결과에 비율과 변화 판정을 붙인 값
export interface RatedMeasureEffectComparison {
  beforePeriod: { from: string; to: string };
  afterPeriod: { from: string; to: string };
  before: RatedWindowCount;
  after: RatedWindowCount;
  change: MeasureEffectChange;
  rows: readonly RatedMeasureEffectRow[];
  locationCount: number;
  changeThresholdPercent: number;
  rateScaleMaxPercent: number;
}

// 조치 Modal을 열 때의 값 계산, 조치일이 없으면 완료 건은 발생일, 미조치 건은 전달받은 날짜로 채움
export function createMeasureActionDraft(
  measure: Measure,
  fallbackActionDate: string,
): MeasureActionDraft {
  return {
    actionYn: measure.actionYn,
    inspectionYn: measure.inspectionYn,
    actionDate:
      measure.actionDate ??
      (measure.actionYn === "Y" ? formatIsoDate(measure.occurredAt) : fallbackActionDate),
    actionNote: measure.actionNote ?? "",
  };
}

// 조치 Modal의 값을 저장할 값으로 변환, 조치 여부가 N이면 조치일을 제외하고 조치 내용은 앞뒤 공백을 제거
export function toMeasureActionInput(draft: MeasureActionDraft): MeasureActionInput {
  return {
    actionYn: draft.actionYn,
    inspectionYn: draft.inspectionYn,
    actionDate: draft.actionYn === "Y" ? draft.actionDate : null,
    actionNote: draft.actionNote.trim() || null,
  };
}

// 기간 하나의 이상 비율(%) 계산, window가 없으면 0
export function windowRatePercent(count: WindowCount): number {
  return count.windowCount === 0 ? 0 : (count.anomalyCount / count.windowCount) * 100;
}

// 이전과 이후 이상 비율의 변화와 기준에 따른 판정 계산, window가 없는 기간이 있으면 자료 없음, 이전이 0이고 이후가 있으면 새로 생김으로 판정
export function compareWindowCounts(
  before: WindowCount,
  after: WindowCount,
  thresholdPercent: number,
): MeasureEffectChange {
  if (before.windowCount === 0 || after.windowCount === 0) return { kind: "noData" };
  const beforeRate = windowRatePercent(before);
  const afterRate = windowRatePercent(after);
  if (beforeRate === 0 && afterRate > 0) return { kind: "appeared" };
  // 나눗셈 없이 window 수를 교차 곱해 비율 비교, window 수가 같으면 이상 수끼리 비교한 값과 같음
  const beforeScaled = before.anomalyCount * after.windowCount;
  const afterScaled = after.anomalyCount * before.windowCount;
  const percent = beforeRate === 0 ? 0 : ((afterScaled - beforeScaled) / beforeScaled) * 100;
  const level =
    percent <= -thresholdPercent ? "improved" : percent >= thresholdPercent ? "worsened" : "steady";
  return { kind: "rate", percent, level };
}

// 두 기간의 이상 비율 대소 계산, 앞이 크면 양수이고 둘 다 window가 있으면 나눗셈 없이 window 수를 교차 곱해 비교
export function compareWindowRates(first: WindowCount, second: WindowCount): number {
  if (first.windowCount === 0 || second.windowCount === 0) {
    return windowRatePercent(first) - windowRatePercent(second);
  }
  return first.anomalyCount * second.windowCount - second.anomalyCount * first.windowCount;
}

function rateWindowCount(count: WindowCount): RatedWindowCount {
  return { ...count, ratePercent: windowRatePercent(count) };
}

// 조치 효과 비교 결과의 이전과 이후 비율 및 변화 판정 계산, Row의 순서는 받은 그대로 유지
export function rateMeasureEffectComparison(
  comparison: MeasureEffectComparison,
): RatedMeasureEffectComparison {
  const threshold = comparison.changeThresholdPercent;
  return {
    beforePeriod: comparison.beforePeriod,
    afterPeriod: comparison.afterPeriod,
    before: rateWindowCount(comparison.before),
    after: rateWindowCount(comparison.after),
    change: compareWindowCounts(comparison.before, comparison.after, threshold),
    rows: comparison.rows.map((row) => ({
      formation: row.formation,
      car: row.car,
      locationCode: row.locationCode,
      before: rateWindowCount(row.before),
      after: rateWindowCount(row.after),
      change: compareWindowCounts(row.before, row.after, threshold),
    })),
    locationCount: comparison.locationCount,
    changeThresholdPercent: threshold,
    rateScaleMaxPercent: comparison.rateScaleMaxPercent,
  };
}

// 조치 한 건에 저장 값 반영, 조치 여부가 N이면 조치일을 삭제
export function applyMeasureAction(measure: Measure, input: MeasureActionInput): Measure {
  return {
    ...measure,
    actionYn: input.actionYn,
    inspectionYn: input.inspectionYn,
    actionDate: input.actionYn === "Y" ? input.actionDate : null,
    actionNote: input.actionNote,
  };
}

// 조치 여부를 Y로 변경, 조치일이 없으면 전달받은 날짜로 채우고 검수 여부와 조치 내용은 그대로 유지
export function markMeasureActioned(measure: Measure, fallbackActionDate: string): Measure {
  return { ...measure, actionYn: "Y", actionDate: measure.actionDate ?? fallbackActionDate };
}
