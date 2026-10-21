// 이상 비율의 소수 자릿수
const RATE_FRACTION_DIGITS = 1;
// 임계값의 소수 자릿수
const THRESHOLD_FRACTION_DIGITS = 4;
// 전체 window가 0이라 비율을 계산할 수 없을 때 표시할 문구
const NO_RATE = "-";

// 이상 window 비율(%) 계산, 전체 window가 0이면 계산할 수 없어 null
export function anomalyPercent(anomalyWindowCount: number, windowCount: number): number | null {
  if (windowCount === 0) return null;
  return (anomalyWindowCount / windowCount) * 100;
}

// 이상 window 비율을 "N.N%" 형식으로 변환, 계산할 수 없으면 "-"
export function formatAnomalyPercent(percent: number | null): string {
  return percent === null ? NO_RATE : `${percent.toFixed(RATE_FRACTION_DIGITS)}%`;
}

// 임계값을 소수 4자리 문자열로 변환, 결과 Table과 상세의 Segment Table이 함께 사용
export function formatThreshold(threshold: number): string {
  return threshold.toFixed(THRESHOLD_FRACTION_DIGITS);
}
