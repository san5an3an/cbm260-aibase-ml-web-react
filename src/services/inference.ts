import type {
  InferenceFilterOptions,
  InferenceJobDetail,
  InferenceJobId,
  InferenceJobList,
  InferenceResultExportQuery,
  InferenceResultPage,
  InferenceResultQuery,
  InferenceRunInput,
  InferenceRunOptions,
} from "@/domain/inference";
import {
  buildInferenceResultsCsv,
  cancelInferenceJobInStore,
  respondInferenceFilterOptions,
  respondInferenceJobDetail,
  respondInferenceJobs,
  respondInferenceResults,
  respondInferenceRunOptions,
  retryInferenceJobInStore,
  runInferenceInStore,
} from "@/services/mock/inferenceData";
import type { QueryOptions } from "@/services/queryOptions";

// 초기 조회 기간, 선택할 수 있는 날짜 범위, 이상 비율 Color의 기준값 조회
export async function fetchInferenceFilterOptions(
  options: QueryOptions = {},
): Promise<InferenceFilterOptions> {
  return respondInferenceFilterOptions(options.signal);
}

// 최근 추론 Job 조회, 성공, 진행 중, 요청됨, 실패 전부를 표시할 순서대로
export async function fetchInferenceJobs(options: QueryOptions = {}): Promise<InferenceJobList> {
  return respondInferenceJobs(options.signal);
}

// 조건, 기간, Page 번호에 해당하는 추론 결과 조회
export async function fetchInferenceResults(
  query: InferenceResultQuery,
  options: QueryOptions = {},
): Promise<InferenceResultPage> {
  return respondInferenceResults(query, options.signal);
}

// 현재 조건과 기간에 맞는 추론 결과 전부의 CSV 파일 내용 반환, Server가 파일 이름을 주면 그 이름을 붙인 File로 반환
export async function exportInferenceResultsCsv(query: InferenceResultExportQuery): Promise<Blob> {
  return buildInferenceResultsCsv(query);
}

// 추론 실행 Modal의 선택지와 열 때 채울 값 조회
export async function fetchInferenceRunOptions(
  options: QueryOptions = {},
): Promise<InferenceRunOptions> {
  return respondInferenceRunOptions(options.signal);
}

// 선택한 장치마다 추론 Job 요청, 장치가 여럿이면 전부 요청됐을 때만 성공으로 종료하고 생성한 Job 번호를 장치 순서대로 반환
export async function runInference(input: InferenceRunInput): Promise<readonly InferenceJobId[]> {
  return runInferenceInStore(input);
}

// 실패한 추론 Job과 같은 조건으로 새 Job을 생성하고 생성한 Job 번호 반환, 재시도한 실패 Job을 목록에 남길지는 Server가 결정
export async function retryInferenceJob(jobId: InferenceJobId): Promise<InferenceJobId> {
  return retryInferenceJobInStore(jobId);
}

// 끝나기 전(요청됨, 추론 중) 추론 Job 취소, 취소한 Job은 목록에서 사라지고 취소 기록은 남기지 않음. 끝났거나 없는 Job이면 오류로 종료
export async function cancelInferenceJob(jobId: InferenceJobId): Promise<void> {
  return cancelInferenceJobInStore(jobId);
}

// 추론 Job 한 건의 요청 조건과 결과 조회, Job Card의 Job과 결과 Row의 jobId로 호출하며 받지 못하면 사유를 문장으로 담아 거부
export async function fetchInferenceJobDetail(
  jobId: InferenceJobId,
  options: QueryOptions = {},
): Promise<InferenceJobDetail> {
  return respondInferenceJobDetail(jobId, options.signal);
}
