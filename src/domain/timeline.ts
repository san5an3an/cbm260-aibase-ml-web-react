import type { AnomalyLevelKey, AnomalyLevelThresholds } from "@/domain/anomaly";

// 하루 단위 이상 추이, 비율은 % 단위의 숫자
export interface DailyAnomalyPoint {
  // "YYYY-MM-DD"
  date: string;
  level: AnomalyLevelKey;
  averageRatePercent: number;
  maxRatePercent: number;
  inferenceCount: number;
  anomalyWindowCount: number;
}

export interface AnomalyTimeline {
  // 조회에 사용한 기간(일)
  days: number;
  levelThresholds: AnomalyLevelThresholds;
  // 오래된 날짜부터 나열
  points: readonly DailyAnomalyPoint[];
  // 처음 선택해 표시할 날짜, 없으면 가장 최근 날짜 선택
  defaultSelectedDate: string | null;
}

// 장치와 Model이 null이면 전체 조회
export interface AnomalyTimelineQuery {
  deviceCode: string | null;
  modelCode: string | null;
  days: number;
}

// 이상 Timeline에서 선택할 수 있는 기간(일)과 초기값
export interface AnomalyTimelineOptions {
  dayCounts: readonly number[];
  defaultDayCount: number;
}
