export type AnomalyLevelKey = "danger" | "warning" | "caution" | "normal";

// 이상비율 등급을 나누는 기준값(%)
export interface AnomalyLevelThresholds {
  dangerMinPercent: number;
  warningMinPercent: number;
}

// 이상비율(%)과 기준값으로 등급 판정
export function classifyAnomalyRate(
  percent: number,
  thresholds: AnomalyLevelThresholds,
): AnomalyLevelKey {
  if (percent >= thresholds.dangerMinPercent) return "danger";
  if (percent >= thresholds.warningMinPercent) return "warning";
  if (percent > 0) return "caution";
  return "normal";
}

// 이상 window 수와 전체 window 수로 등급 판정, 비율로 나누지 않고 기준값에 전체 수를 곱해 비교, 전체가 0이면 정상
export function classifyAnomalyWindows(
  anomalyWindowCount: number,
  windowCount: number,
  thresholds: AnomalyLevelThresholds,
): AnomalyLevelKey {
  if (windowCount === 0) return "normal";
  const scaledCount = anomalyWindowCount * 100;
  if (scaledCount >= thresholds.dangerMinPercent * windowCount) return "danger";
  if (scaledCount >= thresholds.warningMinPercent * windowCount) return "warning";
  if (anomalyWindowCount > 0) return "caution";
  return "normal";
}
