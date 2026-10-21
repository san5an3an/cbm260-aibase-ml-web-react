import type {
  MeasureActionInput,
  MeasureActionOptions,
  MeasureAssignInput,
  MeasureEffectComparison,
  MeasureEffectOptions,
  MeasureEffectQuery,
  MeasureExportQuery,
  MeasureFilterOptions,
  MeasureId,
  MeasureSummary,
  MeasureWorklist,
  MeasureWorklistQuery,
  SensorFrequencyRow,
} from "@/domain/measures";
import {
  buildMeasureCsv,
  completeMeasuresInStore,
  respondMeasureActionOptions,
  respondMeasureAssignees,
  respondMeasureEffectComparison,
  respondMeasureEffectOptions,
  respondMeasureFilterOptions,
  respondMeasureSummary,
  respondMeasureWorklist,
  respondSensorFrequencyRanking,
  saveMeasureActionInStore,
} from "@/services/mock/measuresData";
import type { QueryOptions } from "@/services/queryOptions";

// 조건 Row에서 선택할 수 있는 조치 여부와 검수 여부, 초기 조회 기간, 선택할 수 있는 날짜 범위 조회
export async function fetchMeasureFilterOptions(
  options: QueryOptions = {},
): Promise<MeasureFilterOptions> {
  return respondMeasureFilterOptions(options.signal);
}

// 조건, 기간, Page 번호에 해당하는 조치 대상 목록 조회
export async function fetchMeasureWorklist(
  query: MeasureWorklistQuery,
  options: QueryOptions = {},
): Promise<MeasureWorklist> {
  return respondMeasureWorklist(query, options.signal);
}

// 조치 대상의 상태별 수 요약 조회
export async function fetchMeasureSummary(options: QueryOptions = {}): Promise<MeasureSummary> {
  return respondMeasureSummary(options.signal);
}

// 이상으로 자주 지목된 센서의 순위 조회
export async function fetchSensorFrequencyRanking(
  options: QueryOptions = {},
): Promise<readonly SensorFrequencyRow[]> {
  return respondSensorFrequencyRanking(options.signal);
}

// 조치 Modal에서 선택할 수 있는 조치 여부와 검수 여부, 조치일의 초기값, 선택할 수 있는 날짜 범위 조회
export async function fetchMeasureActionOptions(
  options: QueryOptions = {},
): Promise<MeasureActionOptions> {
  return respondMeasureActionOptions(options.signal);
}

// 조치 건의 담당자로 선택할 수 있는 정비사 조회
export async function fetchMeasureAssignees(
  options: QueryOptions = {},
): Promise<readonly string[]> {
  return respondMeasureAssignees(options.signal);
}

// 조치 효과 비교에서 선택할 수 있는 장치, Model, 편성, 호차, 일수, 정렬과 초기 조건 조회
export async function fetchMeasureEffectOptions(
  options: QueryOptions = {},
): Promise<MeasureEffectOptions> {
  return respondMeasureEffectOptions(options.signal);
}

// 기준일 앞뒤의 이상 비율을 위치마다 비교한 결과 조회
export async function fetchMeasureEffectComparison(
  query: MeasureEffectQuery,
  options: QueryOptions = {},
): Promise<MeasureEffectComparison> {
  return respondMeasureEffectComparison(query, options.signal);
}

// 조치 한 건의 조치 여부, 검수 여부, 조치일, 조치 내용 저장
export async function saveMeasureAction(
  measureId: MeasureId,
  input: MeasureActionInput,
): Promise<void> {
  saveMeasureActionInStore(measureId, input);
}

// 여러 건의 조치 여부를 Y로 변경, 검수 여부와 조치 내용은 그대로 유지
export async function completeMeasures(measureIds: readonly MeasureId[]): Promise<void> {
  completeMeasuresInStore(measureIds);
}

// 여러 조치 건에 담당자 지정
export async function assignMeasures(
  measureIds: readonly MeasureId[],
  input: MeasureAssignInput,
): Promise<void> {
  // 조치 건에는 담당자 Input이 없어 Mock은 인자를 받기만 하고 종료
  void input;
  void measureIds;
}

// 현재 조건에 맞는 조치 대상 전부의 CSV 파일 내용 반환, Server가 파일 이름을 주면 그 이름을 붙인 File로 반환
export async function exportMeasureCsv(query: MeasureExportQuery): Promise<Blob> {
  return buildMeasureCsv(query);
}
