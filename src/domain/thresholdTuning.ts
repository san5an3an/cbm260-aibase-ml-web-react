import type { ModelConfigScope } from "@/domain/modelConfig";

// 임계 튜닝 화면을 처음 열 때 불러올 장치, Model, Segment와 초기 임계 백분위 정의
export interface ThresholdTuningDefaults {
  scope: ModelConfigScope;
  percentile: number;
}

// 점수 분포 구간 하나 정의, 구간의 점수 범위(시작 포함, 끝 미포함)와 해당 구간에 속한 학습 window 수, 운영 window 수 보관
export interface ThresholdScoreBin {
  start: number;
  end: number;
  trainingCount: number;
  operatingCount: number;
}

// 한 장치, Model, Segment의 학습 점수 분포와 운영 점수 분포 정의, 날짜는 "YYYY-MM-DD"로 보관
export interface ThresholdDistribution extends ModelConfigScope {
  modelVersion: string;
  // 분포를 만든 학습 특징벡터 window 수 보관
  trainingWindowCount: number;
  // 현재 Model 버전으로 추론이 저장한 운영 window 수 보관
  operatingWindowCount: number;
  // 운영 점수를 저장한 날짜 목록 보관
  operatingDates: readonly string[];
  // 학습 점수 범위를 넘어 마지막 구간에 합산한 운영 점수 수 보관
  overflowOperatingCount: number;
  bins: readonly ThresholdScoreBin[];
  // 현재 학습된 Model에 저장돼 사용 중인 임계값 보관
  savedThreshold: number;
  // 저장된 임계값 기준 운영 이상 비율(%) 보관
  savedOperatingAnomalyRatePercent: number;
}

// 임계 백분위 미리보기 조회 조건 정의
export interface ThresholdPreviewQuery extends ModelConfigScope {
  percentile: number;
}

// 임계 백분위로 계산한 미리보기 임계값과 그 임계값 기준 운영 이상 정의
export interface ThresholdPreview {
  percentile: number;
  threshold: number;
  // 미리보기 임계값 기준 운영 이상 비율(%) 보관
  operatingAnomalyRatePercent: number;
  // 미리보기 임계값을 초과한 운영 window 수 보관
  operatingAnomalyWindowCount: number;
}

// 점수가 분포의 가로축에서 놓이는 위치(0 ~ 1) 계산, 범위 밖은 양 끝으로 보정
export function scorePosition(bins: readonly ThresholdScoreBin[], score: number): number {
  const first = bins[0];
  const last = bins[bins.length - 1];
  if (first === undefined || last === undefined || last.end <= first.start) return 0;
  return Math.min(1, Math.max(0, (score - first.start) / (last.end - first.start)));
}

// 학습 점수 분포에서 백분위에 해당하는 점수를 추정, 구간 안은 고르게 퍼졌다고 보고 선형으로 나누며 Slider를 끄는 동안 미리보기 선의 위치에 사용
export function estimateThresholdFromBins(bins: readonly ThresholdScoreBin[], percentile: number): number {
  const total = bins.reduce((sum, bin) => sum + bin.trainingCount, 0);
  const last = bins[bins.length - 1];
  if (total === 0 || last === undefined) return 0;
  const target = (total * percentile) / 100;
  let reached = 0;
  for (const bin of bins) {
    if (bin.trainingCount > 0 && reached + bin.trainingCount >= target) {
      return bin.start + ((target - reached) / bin.trainingCount) * (bin.end - bin.start);
    }
    reached += bin.trainingCount;
  }
  return last.end;
}

// 구간의 가운데 점수가 임계값 이상인지 판정
export function isBinOverThreshold(bin: ThresholdScoreBin, threshold: number): boolean {
  return (bin.start + bin.end) / 2 >= threshold;
}

// 학습 데이터 중 임계를 넘는 비율(%) 계산, 정의상 100에서 백분위를 뺀 값
export function trainingExceedPercent(percentile: number): number {
  return 100 - percentile;
}

// 임계 백분위를 범위 안의 소수 첫째 자리로 보정
export function clampPercentile(value: number, range: { min: number; max: number }): number {
  return Math.max(range.min, Math.min(range.max, Math.round(value * 10) / 10));
}
