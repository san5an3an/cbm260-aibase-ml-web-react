import type {
  EnsembleJob,
  EnsembleJobDetail,
  EnsembleJobId,
  EnsembleRunInput,
  EnsembleRunOptions,
} from "@/domain/ensemble";
import {
  buildEnsembleVerdictCsv,
  cancelEnsembleJobInStore,
  respondEnsembleJobDetail,
  respondEnsembleJobs,
  respondEnsembleRunOptions,
  retryEnsembleJobInStore,
  runEnsembleInStore,
} from "@/services/mock/ensembleData";
import type { QueryOptions } from "@/services/queryOptions";

// Ensemble 실행 Modal의 선택지와 열 때 채울 값 조회
export async function fetchEnsembleRunOptions(
  options: QueryOptions = {},
): Promise<EnsembleRunOptions> {
  return respondEnsembleRunOptions(options.signal);
}

// 최근 Ensemble Job 조회, 요청됨, 추론 중, 성공, 실패 전부를 표시할 순서대로
export async function fetchEnsembleJobs(options: QueryOptions = {}): Promise<readonly EnsembleJob[]> {
  return respondEnsembleJobs(options.signal);
}

// Ensemble Job 한 건의 요청 조건과 판정 조회, 받지 못하면 사유를 문장으로 담아 거부
export async function fetchEnsembleJobDetail(
  jobId: EnsembleJobId,
  options: QueryOptions = {},
): Promise<EnsembleJobDetail> {
  return respondEnsembleJobDetail(jobId, options.signal);
}

// 선택한 장치마다 Ensemble Job 요청, 전부 요청됐을 때만 성공으로 종료하고 생성한 Job 번호를 장치 순서대로 반환
export async function runEnsemble(input: EnsembleRunInput): Promise<readonly EnsembleJobId[]> {
  return runEnsembleInStore(input);
}

// 실패한 Ensemble Job과 같은 조건으로 새 Job을 생성하고 생성한 Job 번호 반환, 실패한 Job을 목록에 남길지는 Server가 결정
export async function retryEnsembleJob(jobId: EnsembleJobId): Promise<EnsembleJobId> {
  return retryEnsembleJobInStore(jobId);
}

// 끝나기 전(요청됨, 추론 중) Ensemble Job 취소, 취소한 Job은 목록에서 사라지고 기록은 남기지 않음. 끝났거나 없는 Job이면 오류로 종료
export async function cancelEnsembleJob(jobId: EnsembleJobId): Promise<void> {
  return cancelEnsembleJobInStore(jobId);
}

// 성공한 Ensemble Job의 Model별 판정과 다수결 판정을 CSV 파일 내용으로 반환, Server가 파일 이름을 주면 그 이름을 붙인 File로 반환
export async function exportEnsembleJobCsv(jobId: EnsembleJobId): Promise<Blob> {
  return buildEnsembleVerdictCsv(jobId);
}
