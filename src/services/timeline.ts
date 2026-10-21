import type {
  AnomalyTimeline,
  AnomalyTimelineOptions,
  AnomalyTimelineQuery,
} from "@/domain/timeline";
import {
  respondAnomalyTimeline,
  respondAnomalyTimelineOptions,
} from "@/services/mock/timelineData";
import type { QueryOptions } from "@/services/queryOptions";

// 이상 타임라인에서 선택할 수 있는 기간과 초기 값 조회
export async function fetchAnomalyTimelineOptions(
  options: QueryOptions = {},
): Promise<AnomalyTimelineOptions> {
  return respondAnomalyTimelineOptions(options.signal);
}

// 장치, Model, 기간에 해당하는 일별 이상 추이 조회
export async function fetchAnomalyTimeline(
  query: AnomalyTimelineQuery,
  options: QueryOptions = {},
): Promise<AnomalyTimeline> {
  return respondAnomalyTimeline(query, options.signal);
}
