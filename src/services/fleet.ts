import type {
  AnomalyHistory,
  AnomalyHistoryFilterOptions,
  AnomalyHistoryQuery,
  FleetOverview,
} from "@/domain/fleet";
import {
  respondAnomalyHistory,
  respondAnomalyHistoryFilterOptions,
  respondFleetOverview,
} from "@/services/mock/fleetData";
import type { QueryOptions } from "@/services/queryOptions";

// Fleet 개요의 요약 수치, 등급 기준, 위험 장치 랭킹, Model 커버리지 조회
export async function fetchFleetOverview(options: QueryOptions = {}): Promise<FleetOverview> {
  return respondFleetOverview(options.signal);
}

// 이상 감지 내역에서 선택할 수 있는 장치와 기간 조회
export async function fetchAnomalyHistoryFilterOptions(
  options: QueryOptions = {},
): Promise<AnomalyHistoryFilterOptions> {
  return respondAnomalyHistoryFilterOptions(options.signal);
}

// 장치와 기간에 해당하는 이상 감지 내역 조회
export async function fetchAnomalyHistory(
  query: AnomalyHistoryQuery,
  options: QueryOptions = {},
): Promise<AnomalyHistory> {
  return respondAnomalyHistory(query, options.signal);
}
