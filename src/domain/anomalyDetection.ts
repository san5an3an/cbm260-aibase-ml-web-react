import type { DateRange } from "@/domain/period";

// 이상 감지 내역에서 선택할 수 있는 편성, 기간과 처음 값
export interface AnomalyDetectionOptions {
  // 편성 번호, 목록 순서가 선택지 순서
  formations: readonly string[];
  // 기간 Button별 일수(최근 N일)
  spanDayCounts: readonly number[];
  // 한 번에 볼 수 있는 가장 긴 일수, 더 길게 고르면 화면이 이 일수로 줄임
  maxDayCount: number;
  // 처음 기간, 양 끝 모두 날짜
  defaultPeriod: { from: string; to: string };
  // 선택할 수 있는 날짜 범위
  selectablePeriod: DateRange;
}

// 장치별 이상 현황 조회 조건, 편성을 고르지 않으면 null(전체)
export interface AnomalyHeatmapQuery {
  formation: string | null;
  from: string;
  to: string;
}

// Cell 하나의 이상 판정 횟수, 해당 날짜에 추론 결과가 없으면 null
export type AnomalyCellCount = number | null;

// Cell 색을 나누는 횟수 기준, 1부터 cautionMax까지 주의, warningMax까지 경고, 그 위는 위험
export interface AnomalyCountBands {
  cautionMax: number;
  warningMax: number;
}

// Cell의 색 단계
export type AnomalyCountTone = "none" | "zero" | "caution" | "warning" | "danger";

// 장치 Row 1개, counts는 dates와 같은 순서와 길이
export interface AnomalyDeviceRow {
  deviceCode: string;
  deviceName: string;
  counts: readonly AnomalyCellCount[];
}

// 장치와 날짜로 선택한 Cell
export interface AnomalyCellKey {
  deviceCode: string;
  date: string;
}

// 장치별 이상 현황, rows는 추론 결과가 있는 장치(목록 순서가 화면 순서), 결과가 없는 장치는 따로 보관
export interface AnomalyHeatmap {
  dates: readonly string[];
  rows: readonly AnomalyDeviceRow[];
  noResultDevices: readonly { deviceCode: string; deviceName: string }[];
  countBands: AnomalyCountBands;
  // 처음 선택할 Cell, 없으면 null
  defaultCell: AnomalyCellKey | null;
}

// 장치와 날짜 상세 조회 조건
export interface AnomalyDetailQuery extends AnomalyCellKey {
  formation: string | null;
}

// 상세를 나누어 세는 단위, 편성을 고르지 않으면 편성별, 고르면 호차별
export type AnomalyBreakdownUnit = "formation" | "car";

// 이상 판정 1건
export interface AnomalyEvent {
  id: string;
  // 이상 window의 시작과 끝 시각 "HH:mm:ss" 형식
  startTime: string;
  endTime: string;
  formation: string;
  car: string;
  // 호차 안의 위치 이름(축, 도어 번호 등)
  location: string;
  causeDeviceName: string;
  // 이 장치 Model에 함께 넣은 다른 장치의 값인지 여부, 그 장치를 추론한 결과가 아님
  isReferenceValue: boolean;
  causeName: string;
}

// 장치와 날짜 상세
export interface AnomalyDetail {
  deviceName: string;
  date: string;
  formation: string | null;
  anomalyCount: number;
  breakdownUnit: AnomalyBreakdownUnit;
  // 나누어 센 값, key는 편성 번호나 호차 번호, 목록 순서가 화면 순서
  breakdown: readonly { key: string; count: number }[];
  events: readonly AnomalyEvent[];
}

// 신호 하나가 window 안에서 차지하는 원인 순위, 1이 대표 원인, 순위 밖이면 null
export type AnomalyCauseRank = 1 | 2 | 3 | null;

// 이상 상세 Chart의 값 1개, samples는 발생 시각에서 몇 초 떨어졌는지와 값의 짝(시각 순)
export interface AnomalySignal {
  key: string;
  name: string;
  // 그 값을 낸 장치 이름, 이 장치 Model 밖의 장치면 isOtherDevice로 구분
  deviceName: string;
  isOtherDevice: boolean;
  causeRank: AnomalyCauseRank;
  axisMin: number;
  axisMax: number;
  samples: readonly { offsetSeconds: number; value: number }[];
  // 짝 축 값, 없으면 null
  pairSamples: readonly { offsetSeconds: number; value: number }[] | null;
  pairName: string | null;
}

// 원본 Table의 Column 종류, time은 발생 시각, cause는 대표 원인, reference는 함께 본 다른 장치 값
export type AnomalyRawColumnKind = "time" | "cause" | "value" | "reference";

export interface AnomalyRawColumn {
  key: string;
  label: string;
  // 원천 Column 이름
  sourceName: string;
  kind: AnomalyRawColumnKind;
  // 숫자를 표시할 소수 자릿수, 문자 값이면 null
  decimals: number | null;
}

// 원본 Table의 Row 1개, values는 columns와 같은 순서(첫 Column은 시각 "HH:mm:ss")
export interface AnomalyRawRow {
  inWindow: boolean;
  values: readonly (string | number)[];
}

// 이상 1건의 원본, Chart와 Table
export interface AnomalyRawDetail {
  eventId: string;
  // 이 이상을 낸 장치 Model의 장치 이름
  deviceName: string;
  formation: string;
  car: string;
  position: string;
  date: string;
  startTime: string;
  endTime: string;
  // 원인 구분(장치 자체 등)
  causeOrigin: string;
  rangeMinuteOptions: readonly number[];
  defaultRangeMinutes: number;
  signals: readonly AnomalySignal[];
  rawTotalCount: number;
  rawColumns: readonly AnomalyRawColumn[];
  rawRows: readonly AnomalyRawRow[];
}

// 장치 Row 1개의 이상 횟수 합과 이상이 있던 날 수 계산
export function summarizeDeviceCounts(counts: readonly AnomalyCellCount[]): { total: number; days: number } {
  return counts.reduce<{ total: number; days: number }>(
    (sum, count) => (count !== null && count > 0 ? { total: sum.total + count, days: sum.days + 1 } : sum),
    { total: 0, days: 0 },
  );
}

// 두 날짜 사이의 일수(양 끝 포함) 계산
export function countPeriodDays(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000) + 1;
}

// 날짜에서 일수만큼 옮긴 "YYYY-MM-DD" 계산
export function shiftIsoDay(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const moved = new Date(Date.UTC(y, m - 1, d + days));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}-${pad(moved.getUTCDate())}`;
}
