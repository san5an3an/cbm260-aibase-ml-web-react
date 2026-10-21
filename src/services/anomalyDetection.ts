import type {
  AnomalyDetail,
  AnomalyDetailQuery,
  AnomalyDetectionOptions,
  AnomalyHeatmap,
  AnomalyHeatmapQuery,
  AnomalyRawDetail,
} from "@/domain/anomalyDetection";
import {
  respondAnomalyDetail,
  respondAnomalyDetectionOptions,
  respondAnomalyHeatmap,
  respondAnomalyRawDetail,
} from "@/services/mock/anomalyDetectionData";
import type { QueryOptions } from "@/services/queryOptions";

// 이상 감지 내역에서 선택할 수 있는 편성과 기간, 초기 기간 조회
export async function fetchAnomalyDetectionOptions(
  options: QueryOptions = {},
): Promise<AnomalyDetectionOptions> {
  return respondAnomalyDetectionOptions(options.signal);
}

// 편성과 기간에 해당하는 장치별, 날짜별 이상 판정 횟수 조회
export async function fetchAnomalyHeatmap(
  query: AnomalyHeatmapQuery,
  options: QueryOptions = {},
): Promise<AnomalyHeatmap> {
  return respondAnomalyHeatmap(query, options.signal);
}

// 선택한 장치와 날짜(편성)의 이상 판정 목록과 구간별 집계값 조회
export async function fetchAnomalyDetail(
  query: AnomalyDetailQuery,
  options: QueryOptions = {},
): Promise<AnomalyDetail> {
  return respondAnomalyDetail(query, options.signal);
}

// 이상 판정 한 건의 연관 값 Chart와 원본 Table 조회
export async function fetchAnomalyRawDetail(
  eventId: string,
  options: QueryOptions = {},
): Promise<AnomalyRawDetail> {
  return respondAnomalyRawDetail(eventId, options.signal);
}
