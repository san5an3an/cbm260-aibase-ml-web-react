import type { ModelConfigScope } from "@/domain/modelConfig";
import type {
  ThresholdDistribution,
  ThresholdPreview,
  ThresholdPreviewQuery,
  ThresholdTuningDefaults,
} from "@/domain/thresholdTuning";
import {
  respondThresholdDistribution,
  respondThresholdPreview,
  respondThresholdTuningDefaults,
} from "@/services/mock/thresholdTuningData";
import type { QueryOptions } from "@/services/queryOptions";

// 임계 튜닝을 처음 열 때 불러올 장치, Model, Segment와 초기 임계 백분위 조회
export async function fetchThresholdTuningDefaults(
  options: QueryOptions = {},
): Promise<ThresholdTuningDefaults> {
  return respondThresholdTuningDefaults(options.signal);
}

// 장치, Model, Segment의 학습과 운영 점수 분포 및 저장 임계 조회
export async function fetchThresholdDistribution(
  scope: ModelConfigScope,
  options: QueryOptions = {},
): Promise<ThresholdDistribution> {
  return respondThresholdDistribution(scope, options.signal);
}

// 임계 백분위의 미리보기 임계값과 그 임계 기준 운영 이상 조회
export async function fetchThresholdPreview(
  query: ThresholdPreviewQuery,
  options: QueryOptions = {},
): Promise<ThresholdPreview> {
  return respondThresholdPreview(query, options.signal);
}
