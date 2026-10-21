import type {
  ModelDiagnostics,
  ModelDiagnosticsOptions,
  ModelDiagnosticsQuery,
  ModelVersion,
  ModelVersionQuery,
} from "@/domain/diagnostics";
import {
  respondModelDiagnostics,
  respondModelDiagnosticsOptions,
  respondModelVersions,
} from "@/services/mock/diagnosticsData";
import type { QueryOptions } from "@/services/queryOptions";

// Model 진단에서 처음 선택할 장치와 Model 조회
export async function fetchModelDiagnosticsOptions(
  options: QueryOptions = {},
): Promise<ModelDiagnosticsOptions> {
  return respondModelDiagnosticsOptions(options.signal);
}

// 장치와 Model의 학습된 Model 버전 목록 조회, 최신 버전부터
export async function fetchModelVersions(
  query: ModelVersionQuery,
  options: QueryOptions = {},
): Promise<readonly ModelVersion[]> {
  return respondModelVersions(query, options.signal);
}

// 학습된 Model 하나의 학습 곡선, 점수 분포, 근본원인 리포트 조회
export async function fetchModelDiagnostics(
  query: ModelDiagnosticsQuery,
  options: QueryOptions = {},
): Promise<ModelDiagnostics> {
  return respondModelDiagnostics(query, options.signal);
}
