import type { ModelConfigScope } from "@/domain/modelConfig";
import type {
  ThresholdDistribution,
  ThresholdPreview,
  ThresholdPreviewQuery,
  ThresholdTuningDefaults,
} from "@/domain/thresholdTuning";
import { estimateThresholdFromBins } from "@/domain/thresholdTuning";
import { shiftIsoDate } from "@/services/mock/dates";
import { respondLater } from "@/services/mock/latency";

// 처음 불러올 범위와 백분위 정의
const DEFAULTS: ThresholdTuningDefaults = {
  scope: { deviceCode: "AXLE_BEARING", modelCode: "IF", segment: "default" },
  percentile: 99.9,
};

// 분포의 구간 수, 학습 점수를 셈할 촘촘한 구간 수, 운영 window 수 정의
const BIN_COUNT = 64;
const FINE_BIN_COUNT = 2000;
const OPERATING_WINDOW_COUNT = 201600;
const OVERFLOW_OPERATING_COUNT = 38;
const MODEL_VERSION = "20260920T111321";
const OPERATING_DATES = ["2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22"];
// 기준 범위 Key와 그 범위의 백분위별 임계값 Table 정의
const BASE_KEY = "AXLE_BEARING|IF|default";
const BASE_PERCENTILE_TABLE: readonly (readonly [number, number])[] = [
  [90, 0.62],
  [95, 0.69],
  [98, 0.75],
  [99, 0.775],
  [99.5, 0.8],
  [99.9, 0.8333],
  [100, 1],
];
const BASE_SAVED_THRESHOLD = 0.8;
// 저장 임계를 정할 백분위와 저장 임계 기준 운영 이상 비율(%) 정의
const SAVED_PERCENTILE = 99.5;
const SAVED_OPERATING_RATE = 0.42;

// 범위별로 같은 모양을 내는 분포 계수 계산
function shapeOf(scope: ModelConfigScope) {
  const key = `${scope.deviceCode}|${scope.modelCode}|${scope.segment}`;
  const isBase = key === BASE_KEY;
  let hash = 2166136261;
  for (const char of key) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const random = (k: number) => {
    let x = (hash + k * 374761393) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 3266489909) >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  };
  const mu = isBase ? 0.44 : 0.3 + random(1) * 0.22;
  const sigma = isBase ? 0.115 : 0.07 + random(2) * 0.07;
  const tailCenter = isBase ? 0.7 : Math.min(0.82, mu + 0.18 + random(3) * 0.12);
  const tailWidth = isBase ? 0.07 : 0.04 + random(4) * 0.05;
  const tailAmp = isBase ? 13 : 5 + random(5) * 16;
  const floor = isBase ? 1.4 : 0.6 + random(6) * 1.6;
  const total = isBase ? 14516 : 8000 + Math.round(random(7) * 9000);
  const density = (x: number) =>
    Math.exp(-Math.pow((x - mu) / sigma, 2)) * 100 +
    (x > tailCenter - 0.12 && x < tailCenter + 0.12
      ? tailAmp * Math.exp(-Math.pow((x - tailCenter) / tailWidth, 2))
      : 0) +
    (x > tailCenter + 0.1 ? floor * (isBase ? 1 : Math.exp(-(x - tailCenter - 0.1) / 0.04)) : 0) +
    (isBase ? 0.4 : 0.4 * Math.exp(-Math.max(0, x - tailCenter) / 0.05));
  const operatingDensity = (x: number) =>
    Math.exp(-Math.pow((x - mu - 0.045) / (sigma * 1.12), 2)) * 100 +
    (x > tailCenter - 0.12 && x < tailCenter + 0.12
      ? tailAmp * 0.9 * Math.exp(-Math.pow((x - tailCenter) / tailWidth, 2))
      : 0) +
    0.3;
  return { isBase, total, density, operatingDensity };
}

// 백분위의 학습 점수 임계값 계산
function thresholdOf(scope: ModelConfigScope, percentile: number): number {
  const { isBase, density } = shapeOf(scope);
  if (isBase) {
    for (let i = 1; i < BASE_PERCENTILE_TABLE.length; i += 1) {
      const [a, va] = BASE_PERCENTILE_TABLE[i - 1];
      const [b, vb] = BASE_PERCENTILE_TABLE[i];
      if (percentile <= b) return va + ((vb - va) * (percentile - a)) / (b - a);
    }
    return 1;
  }
  const cumulative: number[] = [];
  let sum = 0;
  for (let i = 0; i < FINE_BIN_COUNT; i += 1) {
    sum += density((i + 0.5) / FINE_BIN_COUNT);
    cumulative.push(sum);
  }
  const target = (sum * percentile) / 100;
  const index = cumulative.findIndex((value) => value >= target);
  return index < 0 ? 1 : (index + 1) / FINE_BIN_COUNT;
}

function savedThresholdOf(scope: ModelConfigScope): number {
  return shapeOf(scope).isBase ? BASE_SAVED_THRESHOLD : thresholdOf(scope, SAVED_PERCENTILE);
}

// 구간별 값을 전체 수에 맞춘 개수로 나눔
function spread(values: readonly number[], total: number): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  return values.map((value) => Math.round((value / sum) * total));
}

export function buildThresholdDistribution(scope: ModelConfigScope): ThresholdDistribution {
  const { total, density, operatingDensity } = shapeOf(scope);
  const centers = Array.from({ length: BIN_COUNT }, (_, i) => (i + 0.5) / BIN_COUNT);
  const training = spread(centers.map(density), total);
  const operating = spread(centers.map(operatingDensity), OPERATING_WINDOW_COUNT);
  return {
    ...scope,
    modelVersion: MODEL_VERSION,
    trainingWindowCount: total,
    operatingWindowCount: OPERATING_WINDOW_COUNT,
    operatingDates: OPERATING_DATES.map(shiftIsoDate),
    overflowOperatingCount: OVERFLOW_OPERATING_COUNT,
    bins: centers.map((_, i) => ({
      start: i / BIN_COUNT,
      end: (i + 1) / BIN_COUNT,
      trainingCount: training[i],
      operatingCount: operating[i],
    })),
    savedThreshold: savedThresholdOf(scope),
    savedOperatingAnomalyRatePercent: SAVED_OPERATING_RATE,
  };
}

export function buildThresholdPreview(query: ThresholdPreviewQuery): ThresholdPreview {
  const { isBase } = shapeOf(query);
  // 분포로 내보내는 학습 구간과 같은 구간으로 계산, Slider를 끄는 동안 화면이 어림한 위치와 놓은 뒤의 위치가 같게 함
  const bins = buildThresholdDistribution(query).bins;
  const threshold = Math.round(estimateThresholdFromBins(bins, query.percentile) * 10000) / 10000;
  const rate =
    threshold === savedThresholdOf(query)
      ? SAVED_OPERATING_RATE
      : Math.max(0.05, ((0.61 * (100 - query.percentile)) / 0.1) * (isBase ? 1 : 0.8));
  return {
    percentile: query.percentile,
    threshold,
    operatingAnomalyRatePercent: rate,
    operatingAnomalyWindowCount: Math.round((rate / 100) * OPERATING_WINDOW_COUNT),
  };
}

// 처음 범위 응답, 진입 시 지연 시간 적용
export function respondThresholdTuningDefaults(signal?: AbortSignal): Promise<ThresholdTuningDefaults> {
  return respondLater("thresholdTuningDefaults", signal, () => ({
    scope: { ...DEFAULTS.scope },
    percentile: DEFAULTS.percentile,
  }));
}

// 점수 분포 응답, 진입과 불러오기 시 지연 시간 적용
export function respondThresholdDistribution(
  scope: ModelConfigScope,
  signal?: AbortSignal,
): Promise<ThresholdDistribution> {
  return respondLater("thresholdDistribution", signal, () => buildThresholdDistribution(scope));
}

// 미리보기 응답, 진입과 다시 계산 시 지연 시간 적용
export function respondThresholdPreview(
  query: ThresholdPreviewQuery,
  signal?: AbortSignal,
): Promise<ThresholdPreview> {
  return respondLater("thresholdPreview", signal, () => buildThresholdPreview(query));
}
