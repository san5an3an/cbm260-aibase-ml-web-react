import type {
  AnomalyCellCount,
  AnomalyDetail,
  AnomalyDetailQuery,
  AnomalyDetectionOptions,
  AnomalyEvent,
  AnomalyHeatmap,
  AnomalyHeatmapQuery,
  AnomalyRawDetail,
  AnomalyRawRow,
  AnomalySignal,
} from "@/domain/anomalyDetection";
import { countPeriodDays, shiftIsoDay, summarizeDeviceCounts } from "@/domain/anomalyDetection";
import { DEVICES } from "@/services/mock/catalogData";
import { isoDateBeforeToday } from "@/services/mock/dates";
import { markScreenEntry, respondInstantly, respondLater, respondNow } from "@/services/mock/latency";

const FORMATIONS = ["401", "402", "403", "404", "405"] as const;
const SPAN_DAY_COUNTS = [7, 14, 30] as const;
const MAX_DAY_COUNT = 30;

// 장치별 최근 14일의 이상 판정 횟수, 마지막 값이 오늘, null은 추론 결과 없음
const RECENT_COUNTS: Record<string, readonly AnomalyCellCount[]> = {
  AXLE_BEARING: [0, 6, 4, 5, 4, 4, 5, 5, 0, 3, 5, 5, 5, 4],
  DCU: [4, 0, 3, 4, 4, 2, 2, null, 2, 3, 4, 0, 3, null],
  CMSB: [1, 4, 0, null, 3, 3, 2, 0, null, 2, 3, 4, 0, null],
};
// 편성을 선택하면 횟수에 곱하는 비율, 12일 전 차축 베어링은 따로 정한 횟수 사용
const FORMATION_FACTORS: Record<string, number> = { "401": 0.4, "402": 0.3, "403": 0.45 };
const OTHER_FORMATION_FACTOR = 0.3;
const FIXED_AXLE_COUNTS: Record<string, number> = { "401": 5 };
// 처음 선택할 Cell의 장치, 차축 베어링이며 날짜는 오늘로부터 12일 전
const DEFAULT_CELL_DEVICE = "AXLE_BEARING";
const DEFAULT_CELL_DAYS_AGO = 12;

const deviceName = (code: string) => DEVICES.find((device) => device.code === code)?.name ?? code;

// 오늘로부터 며칠 전인지 계산
function daysAgo(isoDate: string): number {
  return countPeriodDays(isoDate, isoDateBeforeToday(0)) - 1;
}

// 문자열을 0 이상 9973 미만의 수로 변환
function hash(text: string): number {
  let value = 7;
  for (const character of text) value = (value * 31 + character.charCodeAt(0)) % 9973;
  return value;
}

function cellCount(deviceCode: string, isoDate: string, formation: string | null): AnomalyCellCount {
  const back = daysAgo(isoDate);
  const counts = RECENT_COUNTS[deviceCode];
  if (counts === undefined || back < 0 || back >= counts.length) return null;
  const count = counts[counts.length - 1 - back];
  if (count === null || formation === null) return count;
  const factor = FORMATION_FACTORS[formation] ?? OTHER_FORMATION_FACTOR;
  if (deviceCode === DEFAULT_CELL_DEVICE && back === DEFAULT_CELL_DAYS_AGO) {
    return FIXED_AXLE_COUNTS[formation] ?? Math.round(count * factor);
  }
  return Math.round(count * factor);
}

export function buildAnomalyDetectionOptions(): AnomalyDetectionOptions {
  const today = isoDateBeforeToday(0);
  return {
    formations: [...FORMATIONS],
    spanDayCounts: [...SPAN_DAY_COUNTS],
    maxDayCount: MAX_DAY_COUNT,
    defaultPeriod: { from: shiftIsoDay(today, -(MAX_DAY_COUNT - 1)), to: today },
    selectablePeriod: { from: null, to: today },
  };
}

export function buildAnomalyHeatmap(query: AnomalyHeatmapQuery): AnomalyHeatmap {
  const dayCount = Math.max(0, countPeriodDays(query.from, query.to));
  const dates = Array.from({ length: dayCount }, (_, index) => shiftIsoDay(query.from, index));
  const rows = Object.keys(RECENT_COUNTS)
    .map((deviceCode) => ({
      deviceCode,
      deviceName: deviceName(deviceCode),
      counts: dates.map((date) => cellCount(deviceCode, date, query.formation)),
    }))
    .sort(
      (a, b) =>
        summarizeDeviceCounts(b.counts).total - summarizeDeviceCounts(a.counts).total ||
        a.deviceName.localeCompare(b.deviceName),
    );
  const defaultDate = isoDateBeforeToday(DEFAULT_CELL_DAYS_AGO);
  return {
    dates,
    rows,
    noResultDevices: DEVICES.filter((device) => RECENT_COUNTS[device.code] === undefined).map(
      (device) => ({ deviceCode: device.code, deviceName: device.name }),
    ),
    countBands: { cautionMax: 2, warningMax: 5 },
    defaultCell: dates.includes(defaultDate) ? { deviceCode: DEFAULT_CELL_DEVICE, date: defaultDate } : null,
  };
}

// 이상 판정의 기초 데이터, 시작 시각, 편성, 호차, 축 번호
const BASE_EVENTS: readonly (readonly [string, string, number, number])[] = [
  ["05:04:15", "401", 4, 1], ["05:31:01", "402", 6, 2], ["05:33:34", "403", 9, 1],
  ["09:30:50", "403", 8, 2], ["10:01:47", "403", 7, 1], ["12:21:16", "403", 1, 3],
  ["12:35:02", "402", 2, 3], ["13:32:02", "402", 8, 1], ["13:54:29", "403", 0, 4],
  ["14:18:29", "401", 7, 4], ["15:02:11", "401", 3, 2], ["16:40:05", "403", 5, 1],
  ["17:12:48", "401", 2, 2], ["18:30:19", "401", 6, 4],
];
const FIXED_AXLE_EVENTS: Record<string, readonly (readonly [string, string, number, number])[]> = {
  "401": [
    ["05:04:15", "401", 4, 1], ["05:47:22", "401", 4, 2], ["14:18:29", "401", 7, 4],
    ["15:02:11", "401", 7, 4], ["16:40:05", "401", 7, 3],
  ],
};
// 장치별 원인 장치와 대표 원인 이름
const CAUSES: Record<string, readonly [string, string]> = {
  AXLE_BEARING: ["차축 베어링", "차축 베어링 온도"],
  DCU: ["출입문장치", "도어 모터 전류"],
  CMSB: ["주공기 압축기", "압축기 토출압력"],
};
const REFERENCE_CAUSE = ["열차 종합 제어 장치", "열차 속도"] as const;
const WINDOW_SECONDS = 30;
const CAR_COUNT = 10;

function toSeconds(time: string): number {
  const [h, m, s] = time.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function toTime(seconds: number): string {
  const value = (seconds + 86_400) % 86_400;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(value / 3600))}:${pad(Math.floor(value / 60) % 60)}:${pad(value % 60)}`;
}

const EVENT_ID_SEPARATOR = "~";

export function buildAnomalyDetail(query: AnomalyDetailQuery): AnomalyDetail {
  const { deviceCode, date, formation } = query;
  const seed = hash(deviceCode + date);
  const cell = cellCount(deviceCode, date, formation) ?? 0;
  const allCount = deviceCode === DEFAULT_CELL_DEVICE && cell === 6 ? 14 : Math.max(0, cell * 2 + (seed % 3));
  const fixed = formation === null ? undefined : FIXED_AXLE_EVENTS[formation];
  const sources =
    formation === null
      ? BASE_EVENTS.slice(0, allCount)
      : deviceCode === DEFAULT_CELL_DEVICE && daysAgo(date) === DEFAULT_CELL_DAYS_AGO && fixed && cell === fixed.length
        ? fixed
        : BASE_EVENTS.slice(0, cell).map(
            ([time, , car, axle], index) => [time, formation, (car + seed + index * 3) % CAR_COUNT, axle] as const,
          );
  const [causeDevice, causeName] = CAUSES[deviceCode] ?? [deviceName(deviceCode), "-"];
  const events: AnomalyEvent[] = sources.map(([time, pv, car, axle], index) => {
    const isReferenceValue = deviceCode === "DCU" && index % 4 === 3;
    return {
      id: [deviceCode, date, pv, car, time].join(EVENT_ID_SEPARATOR),
      startTime: time,
      endTime: toTime(toSeconds(time) + WINDOW_SECONDS),
      formation: pv,
      car: String(car),
      location:
        deviceCode === DEFAULT_CELL_DEVICE ? `${axle}축` : deviceCode === "DCU" ? `${axle}번 도어` : `${axle}번`,
      causeDeviceName: isReferenceValue ? REFERENCE_CAUSE[0] : causeDevice,
      isReferenceValue,
      causeName: isReferenceValue ? REFERENCE_CAUSE[1] : causeName,
    };
  });
  const breakdown =
    formation === null
      ? ["401", "402", "403"]
          .map((key) => ({ key, count: events.filter((event) => event.formation === key).length }))
          .filter((item) => item.count > 0)
      : Array.from({ length: CAR_COUNT }, (_, car) => ({
          key: String(car),
          count: events.filter((event) => event.car === String(car)).length,
        }));
  return {
    deviceName: deviceName(deviceCode),
    date,
    formation,
    anomalyCount: formation === null ? allCount : events.length,
    breakdownUnit: formation === null ? "formation" : "car",
    breakdown,
    events,
  };
}

// Chart 값 정의, Key, 이름, 장치, 다른 장치 여부, 원인 순위, 축 아래 값, 위 값, 급등 여부, 짝 축 이름
const SIGNALS: readonly (readonly [string, string, string, boolean, 1 | 2 | 3 | null, number, number, boolean, string | null])[] = [
  ["temp", "차축 베어링 온도", "차축 베어링", false, 1, 36.2, 48.6, true, "짝 축 베어링 온도"],
  ["rms", "차축 진동 RMS", "차축 베어링", false, 2, 2.0, 2.7, false, null],
  ["spd", "열차 속도", "열차 종합 제어 장치", true, 3, 58.6, 65.3, false, null],
  ["outer", "차축 베어링 외륜 온도", "차축 베어링", false, null, 35.8, 44.1, false, null],
  ["z", "차축 가속도 Z", "차축 베어링", false, null, 0.087, 0.412, false, null],
  ["x", "차축 가속도 X", "차축 베어링", false, null, 0.071, 0.355, false, null],
  ["y", "차축 가속도 Y", "차축 베어링", false, null, 0.064, 0.338, false, null],
  ["inner", "차축 베어링 내륜 온도", "차축 베어링", false, null, 37.4, 46.9, false, null],
];
const RANGE_MINUTE_OPTIONS = [2, 10, 30] as const;
const DEFAULT_RANGE_MINUTES = 10;
const SAMPLE_STEP_SECONDS = 15;

// 0 ~ 1 사이의 파형 값 계산, bump가 true면 중앙보다 조금 앞에서 급등
function wave(seed: number, ratio: number, bump: boolean): number {
  let value = 0.5 + 0.14 * Math.sin(ratio * 23 + seed) + 0.09 * Math.sin(ratio * 61 + seed * 2.3) + 0.05 * Math.sin(ratio * 140 + seed * 0.7);
  if (bump) value += 0.28 * Math.exp(-Math.pow((ratio - 0.48) / 0.02, 2));
  return Math.max(0.02, Math.min(0.98, value));
}

function buildSamples(seed: number, bump: boolean, low: number, high: number, offset: number) {
  const span = Math.max(...RANGE_MINUTE_OPTIONS) * 60;
  const count = (span * 2) / SAMPLE_STEP_SECONDS + 1;
  return Array.from({ length: count }, (_, index) => {
    const offsetSeconds = -span + index * SAMPLE_STEP_SECONDS;
    const ratio = index / (count - 1);
    const value = low + (wave(seed, ratio, bump) - offset) * (high - low);
    return { offsetSeconds, value: Number(value.toFixed(4)) };
  });
}

export function buildAnomalyRawDetail(eventId: string): AnomalyRawDetail {
  const [deviceCode, date, formation, car, startTime] = eventId.split(EVENT_ID_SEPARATOR);
  if (startTime === undefined) throw new Error(`없는 이상 번호: ${eventId}`);
  const start = toSeconds(startTime);
  const signals: AnomalySignal[] = SIGNALS.map(([key, name, device, isOtherDevice, causeRank, low, high, bump, pairName], index) => {
    const seed = index * 1.7 + 1;
    return {
      key,
      name,
      deviceName: device,
      isOtherDevice,
      causeRank,
      axisMin: low,
      axisMax: high,
      samples: buildSamples(seed, bump, low, high, 0),
      pairSamples: pairName === null ? null : buildSamples(seed + 0.4, false, low, high, 0.04),
      pairName,
    };
  });
  const causeValues = [60.8, 62.4, 64.2, 63.5, 61.9, 61.1];
  const rawRows: AnomalyRawRow[] = Array.from({ length: 10 }, (_, index) => {
    const seconds = start - 12 + index * 6;
    const inWindow = seconds >= start && seconds <= start + WINDOW_SECONDS;
    return {
      inWindow,
      values: [
        toTime(seconds),
        inWindow ? causeValues[(seconds - start) / 6] : 41.3 + index * 0.35,
        formation,
        car,
        "1",
        0.21 + index * 0.01,
        38.2 + index * 0.3,
        0.012 + index * 0.001,
        62 + (index % 12),
        40.8 + index * 0.2,
      ],
    };
  });
  return {
    eventId,
    deviceName: deviceName(deviceCode),
    formation,
    car,
    position: `${formation[2] === "1" ? "4014" : `40${formation.slice(1)}${car}`}-H-1-True`,
    date,
    startTime,
    endTime: toTime(start + WINDOW_SECONDS),
    causeOrigin: "장치 자체",
    rangeMinuteOptions: [...RANGE_MINUTE_OPTIONS],
    defaultRangeMinutes: DEFAULT_RANGE_MINUTES,
    signals,
    rawTotalCount: 196,
    rawColumns: [
      { key: "ts", label: "발생 시각", sourceName: "ts", kind: "time", decimals: null },
      { key: "axle_brg_temp", label: "차축 베어링 온도", sourceName: "axle_brg_temp", kind: "cause", decimals: 1 },
      { key: "pv_unqno", label: "편성", sourceName: "pv_unqno", kind: "value", decimals: null },
      { key: "car_no", label: "호차", sourceName: "car_no", kind: "value", decimals: null },
      { key: "axle_no", label: "축", sourceName: "axle_no", kind: "value", decimals: null },
      { key: "axle_vib_rms", label: "차축 진동 RMS", sourceName: "axle_vib_rms", kind: "value", decimals: 3 },
      { key: "outer_race_temp", label: "외륜 온도", sourceName: "outer_race_temp", kind: "value", decimals: 1 },
      { key: "acc_z", label: "가속도 Z", sourceName: "acc_z", kind: "value", decimals: 3 },
      { key: "tcms_train_spd", label: "TCMS · 열차 속도", sourceName: "tcms_train_spd", kind: "reference", decimals: 0 },
      { key: "pair_axle_brg_temp", label: "짝 축 베어링 온도", sourceName: "pair_axle_brg_temp", kind: "reference", decimals: 1 },
    ],
    rawRows,
  };
}

// 화면 진입 시 호출하는 조회 중 첫 진입에서 지연 시간을 적용할 조회 이름
const ENTRY_QUERY_NAMES = ["anomalyHeatmap", "anomalyDetail"] as const;

// 선택지 응답, 화면 진입으로 표시하고 즉시 응답
export function respondAnomalyDetectionOptions(signal?: AbortSignal): Promise<AnomalyDetectionOptions> {
  markScreenEntry(ENTRY_QUERY_NAMES);
  return respondNow(signal, buildAnomalyDetectionOptions);
}

// 장치별 이상 현황 응답, 첫 진입과 조건 변경 시 지연 시간 적용
export function respondAnomalyHeatmap(query: AnomalyHeatmapQuery, signal?: AbortSignal): Promise<AnomalyHeatmap> {
  return respondLater("anomalyHeatmap", signal, () => buildAnomalyHeatmap(query));
}

// 장치와 날짜 상세 응답, 첫 진입과 Cell 선택 시 지연 시간 적용
export function respondAnomalyDetail(query: AnomalyDetailQuery, signal?: AbortSignal): Promise<AnomalyDetail> {
  return respondLater("anomalyDetail", signal, () => buildAnomalyDetail(query));
}

// 이상 1건의 원본 응답, 즉시 응답하며 Test가 window 설정으로 지연하거나 실패시킬 수 있음
export function respondAnomalyRawDetail(eventId: string, signal?: AbortSignal): Promise<AnomalyRawDetail> {
  return respondInstantly("anomalyRawDetail", signal, () => buildAnomalyRawDetail(eventId));
}
