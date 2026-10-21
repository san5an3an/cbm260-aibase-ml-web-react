import type {
  TrainingFilterOptions,
  TrainingJob,
  TrainingJobDetail,
  TrainingJobId,
  TrainingResultDetail,
  TrainingResultExportQuery,
  TrainingResultId,
  TrainingResultPage,
  TrainingResultQuery,
  TrainingScheduleInput,
  TrainingScheduleOptions,
  TrainingSummary,
} from "@/domain/training";
import {
  buildTrainingResultsCsv,
  cancelTrainingJobInStore,
  respondTrainingFilterOptions,
  respondTrainingJobDetail,
  respondTrainingJobs,
  respondTrainingResultDetail,
  respondTrainingResults,
  respondTrainingScheduleOptions,
  respondTrainingSummary,
  retryTrainingJobInStore,
  scheduleTrainingInStore,
} from "@/services/mock/trainingData";
import type { QueryOptions } from "@/services/queryOptions";

// 처음 조회 기간, 선택할 수 있는 날짜 범위, 결과 Table 한 Page의 Row 수 선택지와 초기 값 조회
export async function fetchTrainingFilterOptions(
  options: QueryOptions = {},
): Promise<TrainingFilterOptions> {
  return respondTrainingFilterOptions(options.signal);
}

// 학습 이력, 진행 중, 최근 학습, 실패의 요약 조회
export async function fetchTrainingSummary(options: QueryOptions = {}): Promise<TrainingSummary> {
  return respondTrainingSummary(options.signal);
}

// 예약, 진행 중, 최근에 끝난 학습 Job 조회
export async function fetchTrainingJobs(
  options: QueryOptions = {},
): Promise<readonly TrainingJob[]> {
  return respondTrainingJobs(options.signal);
}

// 조건, 기간, Sort, Page 번호, Page 크기에 해당하는 학습 결과 조회
export async function fetchTrainingResults(
  query: TrainingResultQuery,
  options: QueryOptions = {},
): Promise<TrainingResultPage> {
  return respondTrainingResults(query, options.signal);
}

// 학습 예약 Modal의 선택지와 열 때 채울 값 조회
export async function fetchTrainingScheduleOptions(
  options: QueryOptions = {},
): Promise<TrainingScheduleOptions> {
  return respondTrainingScheduleOptions(options.signal);
}

// 학습 Job 1건의 Request 조건, 시작과 종료 시각, 실패 내용 조회
export async function fetchTrainingJobDetail(
  jobId: TrainingJobId,
  options: QueryOptions = {},
): Promise<TrainingJobDetail> {
  return respondTrainingJobDetail(jobId, options.signal);
}

// 학습 결과 1건의 학습 지표, 버전별 임계치, 학습 곡선 조회
export async function fetchTrainingResultDetail(
  resultId: TrainingResultId,
  options: QueryOptions = {},
): Promise<TrainingResultDetail> {
  return respondTrainingResultDetail(resultId, options.signal);
}

// 현재 조건과 Sort에 맞는 학습 결과 전부의 CSV 파일 내용 반환, Server가 파일 이름을 주면 그 이름을 붙인 File로 반환
export async function exportTrainingResultsCsv(
  query: TrainingResultExportQuery,
): Promise<Blob> {
  return buildTrainingResultsCsv(query);
}

// 선택한 장치마다 학습 Job 예약, 장치가 여럿이면 전부 예약됐을 때만 성공 처리하고 만든 Job 번호를 장치 순서대로 반환. 시작 예정은 Server가 정함
export async function scheduleTraining(
  input: TrainingScheduleInput,
): Promise<readonly TrainingJobId[]> {
  return scheduleTrainingInStore(input);
}

// 실패한 학습 Job과 같은 조건으로 새 Job을 만들고 번호 반환, 재시도한 실패 Job을 목록에 남길지는 Server가 정함
export async function retryTrainingJob(jobId: TrainingJobId): Promise<TrainingJobId> {
  return retryTrainingJobInStore(jobId);
}

// 완료 전(예약, 진행 중) 학습 Job 취소, 취소한 Job은 목록에서 사라지고 취소 기록은 남기지 않음. 완료됐거나 없는 Job이면 오류 발생
export async function cancelTrainingJob(jobId: TrainingJobId): Promise<void> {
  return cancelTrainingJobInStore(jobId);
}
