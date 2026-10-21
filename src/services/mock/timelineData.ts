import { classifyAnomalyRate } from "@/domain/anomaly";
import type {
  AnomalyTimeline,
  AnomalyTimelineOptions,
  AnomalyTimelineQuery,
  DailyAnomalyPoint,
} from "@/domain/timeline";
import { ANOMALY_LEVEL_THRESHOLDS } from "@/services/mock/anomalyRules";
import { isoDateBeforeToday } from "@/services/mock/dates";
import { markScreenEntry, respondLater, respondNow } from "@/services/mock/latency";

// 최근 30일의 평균 이상비율(%), 마지막 값이 오늘
const DAILY_AVERAGE_RATES = [
  3.5, 2.0, 6.5, 2.0, 3.5, 4.0, 24.1, 5.5, 6.1, 5.0, 4.5, 5.0, 6.6, 23.0, 4.1, 4.0, 13.6, 4.6, 3.2,
  2.2, 21.3, 3.8, 3.6, 6.8, 11.5, 2.69, 3.15, 22.16, 6.06, 6.67,
];

// 최근 5일의 추론 건수, 이상 window 수, 최대 이상비율, Key는 오늘로부터 며칠 전인지
const RECENT_DAY_STATS: Record<number, readonly [number, number, number]> = {
  0: [11, 1, 11.82],
  1: [15, 1, 18.96],
  2: [33, 8, 32.54],
  3: [25, 0, 13.26],
  4: [21, 1, 13.21],
};

const DAY_COUNTS = [7, 14, 30] as const;
const DEFAULT_DAY_COUNT = 30;
// 처음 선택해 표시할 날짜, 오늘로부터 며칠 전인지
const DEFAULT_SELECTED_DAYS_AGO = 2;

// 문자열을 0 이상 limit 미만의 수로 변환
function hash(text: string, limit: number): number {
  let value = 7;
  for (const character of text) {
    value = (value * 31 + character.charCodeAt(0)) % 9973;
  }
  return value % limit;
}

export function buildAnomalyTimelineOptions(): AnomalyTimelineOptions {
  return { dayCounts: [...DAY_COUNTS], defaultDayCount: DEFAULT_DAY_COUNT };
}

export function buildAnomalyTimeline(query: AnomalyTimelineQuery): AnomalyTimeline {
  const total = DAILY_AVERAGE_RATES.length;
  const days = Math.min(query.days, total);
  const deviceCode = query.deviceCode ?? "";
  const modelCode = query.modelCode ?? "";
  // 장치나 Model을 선택하면 값이 조금 달라지도록 조정
  const shift = deviceCode || modelCode ? (hash(deviceCode + modelCode, 7) - 3) * 0.35 : 0;

  const points: DailyAnomalyPoint[] = [];
  for (let index = total - days; index < total; index += 1) {
    const daysAgo = total - 1 - index;
    const date = isoDateBeforeToday(daysAgo);
    const adjusted = DAILY_AVERAGE_RATES[index] * (1 + shift * (index % 3 === 0 ? 0.2 : -0.12));
    const averageRatePercent = Math.max(0.4, Number(adjusted.toFixed(2)));
    const fixed = shift === 0 ? RECENT_DAY_STATS[daysAgo] : undefined;
    const inferenceCount = fixed ? fixed[0] : 12 + hash(date + deviceCode, 26);
    points.push({
      date,
      level: classifyAnomalyRate(averageRatePercent, ANOMALY_LEVEL_THRESHOLDS),
      averageRatePercent,
      maxRatePercent: fixed ? fixed[2] : Math.min(60, averageRatePercent * 1.5 + 6 + hash(date, 6)),
      inferenceCount,
      anomalyWindowCount: fixed
        ? fixed[1]
        : Math.round(((inferenceCount * averageRatePercent) / 100) * 0.9),
    });
  }

  return {
    days,
    levelThresholds: ANOMALY_LEVEL_THRESHOLDS,
    points,
    defaultSelectedDate: isoDateBeforeToday(DEFAULT_SELECTED_DAYS_AGO),
  };
}

// 화면 진입 시 호출하는 조회 중 첫 진입에서 지연 시간을 적용할 조회 이름, 기간 선택지 조회가 호출하면 다음 한 번 적용
const ENTRY_QUERY_NAMES = ["anomalyTimeline"] as const;

// 기간 선택지 응답, 화면 진입으로 표시하고 즉시 응답
export function respondAnomalyTimelineOptions(signal?: AbortSignal): Promise<AnomalyTimelineOptions> {
  markScreenEntry(ENTRY_QUERY_NAMES);
  return respondNow(signal, buildAnomalyTimelineOptions);
}

// 일별 이상 추이 응답, 첫 진입, 조회, 초기화 시 지연 시간 적용
export function respondAnomalyTimeline(
  query: AnomalyTimelineQuery,
  signal?: AbortSignal,
): Promise<AnomalyTimeline> {
  return respondLater("anomalyTimeline", signal, () => buildAnomalyTimeline(query));
}
