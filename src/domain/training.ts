import {
  createJobRequestDraft,
  findJobRequestProblem,
  hasJobRequestFieldChanged,
  jobRequestProblemField,
  toJobRequestInput,
  type JobRequestDraft,
  type JobRequestInput,
  type JobRequestOptions,
  type JobRequestProblem,
  type JobRequestProblemField,
} from "@/domain/jobRequest";
import type { DateRange } from "@/domain/period";
import { trainingStageKeys } from "@/domain/labels/trainingStage";

export type TrainingJobId = string;
export type TrainingResultId = string;

// 학습 Job의 상태, queued 예약, running 진행 중, succeeded 성공, failed 실패
export type TrainingJobStatus = "queued" | "running" | "succeeded" | "failed";
// 학습 단계, 전처리, 특징벡터, 학습, 저장
export type TrainingStageKey = "preprocess" | "featureVector" | "train" | "save";
// 현재 단계의 진행을 세는 단위, epoch는 학습 반복, part는 나눠 처리하는 데이터 조각
export type TrainingProgressUnit = "epoch" | "part";

// 현재 단계에서 완료한 수와 전체 수
export interface TrainingStepProgress {
  unit: TrainingProgressUnit;
  done: number;
  total: number;
}

// 학습 Job의 상태별로 함께 가지는 값, 시각은 "YYYY-MM-DDTHH:mm:ss"
export type TrainingJobState =
  | { status: "queued"; scheduledStartAt: string }
  | {
      status: "running";
      stage: TrainingStageKey;
      // Job 전체의 진행률(%)
      progressPercent: number;
      // 현재 단계의 진행, 단계가 진행을 세지 않으면 null
      stepProgress: TrainingStepProgress | null;
    }
  | { status: "succeeded"; completedAt: string }
  | { status: "failed"; stage: TrainingStageKey; failureReason: string };

// 학습 Job 한 건, 시각은 "YYYY-MM-DDTHH:mm:ss"
export type TrainingJob = {
  id: TrainingJobId;
  deviceCode: string;
  modelCode: string;
  // 학습할 편성, 전체 편성이면 null
  formation: string | null;
  createdAt: string;
  // 실패한 Job을 재시도해 같은 조건으로 새로 만든 Job인지 여부
  isRetry: boolean;
} & TrainingJobState;

// 학습 결과 한 건, 장치, Segment, Model, 버전마다 한 Row
export interface TrainingResult {
  id: TrainingResultId;
  trainedAt: string;
  modelCode: string;
  deviceCode: string;
  segment: string;
  threshold: number;
}

export type TrainingResultSortKey = "trainedAt" | "model" | "device" | "threshold";
export type TrainingResultSortDirection = "asc" | "desc";

export interface TrainingResultSort {
  key: TrainingResultSortKey;
  direction: TrainingResultSortDirection;
}

// Model과 장치가 null이면 전체 조회
export interface TrainingResultFilter {
  modelCode: string | null;
  deviceCode: string | null;
}

// 학습 결과 조회 조건, 기간은 학습 일시의 날짜 기준이고 끝이 null이면 그쪽 끝은 제한 없음
export interface TrainingResultQuery extends TrainingResultFilter {
  period: DateRange;
  sort: TrainingResultSort;
  // 1부터 시작하는 Page 번호와 한 Page의 Row 수
  page: number;
  pageSize: number;
}

export interface TrainingResultPage {
  // 조건과 정렬을 적용한 해당 Page의 Row 목록
  rows: readonly TrainingResult[];
  // 조건에 맞는 결과 전체 수
  totalCount: number;
  pageCount: number;
}

// CSV로 내려받을 학습 결과의 조건, 현재 화면에 적용된 조건 및 정렬과 같음
export type TrainingResultExportQuery = Omit<TrainingResultQuery, "page" | "pageSize">;

// 조건 Row와 결과 Table에서 선택할 수 있는 값과 초기값 정의, 나열한 순서가 선택지의 순서
export interface TrainingFilterOptions {
  // 초기 조회 기간, 초기화 Button을 누르면 이 기간으로 복원
  defaultPeriod: DateRange;
  // 선택할 수 있는 날짜 범위, 끝이 null이면 그쪽 끝은 제한 없음
  selectablePeriod: DateRange;
  // 결과 Table 한 Page의 Row 수 선택지와 초기값
  pageSizes: readonly number[];
  defaultPageSize: number;
}

// 가장 최근에 끝난 학습
export interface LatestTraining {
  trainedAt: string;
  deviceCode: string;
}

// 가장 최근에 실패한 학습 Job
export interface LatestTrainingFailure {
  deviceCode: string;
  modelCode: string;
  failureReason: string;
}

// 학습 Job 목록에서 집계하는 수, 예약, 진행 중, 실패
export interface TrainingJobCounts {
  // 예약과 진행 중을 합친 수
  activeJobCount: number;
  queuedJobCount: number;
  // 진행 중인 Job을 현재 단계별로 집계한 수
  runningJobCountsByStage: Record<TrainingStageKey, number>;
  failedJobCount: number;
  // 실패한 Job이 없으면 null
  latestFailure: LatestTrainingFailure | null;
}

// 재학습 설정의 KPI 요약, 검색 조건과 무관한 전체 기준
export interface TrainingSummary extends TrainingJobCounts {
  // 학습 이력 전체 수, 장치, Segment, Model, 버전마다 한 건
  historyCount: number;
  // 학습에 사용하는 Model 코드 목록, 나열한 순서대로 표시
  modelCodes: readonly string[];
  // 학습 이력이 없으면 null
  latestTraining: LatestTraining | null;
  // 실패 수를 집계하는 최근 일수
  failureWindowDays: number;
}

// 학습 예약 Modal에서 전달하는 값, 선택한 장치마다 Job 하나이며 작업 요청 Modal의 공통 형식
export type TrainingScheduleInput = JobRequestInput;

// 아직 끝나지 않은 상태(예약, 진행 중)인지 판정, 상태마다 결과를 적어 빠뜨리면 Type 오류 발생
export function isActiveTrainingJobStatus(status: TrainingJobStatus): boolean {
  switch (status) {
    case "queued":
    case "running":
      return true;
    case "succeeded":
    case "failed":
      return false;
  }
}

// 학습 Job 목록에서 예약, 진행 중, 실패 수와 가장 최근의 실패 계산
export function countTrainingJobs(jobs: readonly TrainingJob[]): TrainingJobCounts {
  const runningJobCountsByStage = Object.fromEntries(
    trainingStageKeys.map((stage) => [stage, 0]),
  ) as Record<TrainingStageKey, number>;
  let queuedJobCount = 0;
  let failedJobCount = 0;
  let latestFailedJob: Extract<TrainingJob, { status: "failed" }> | null = null;
  for (const job of jobs) {
    if (job.status === "queued") queuedJobCount += 1;
    if (job.status === "running") runningJobCountsByStage[job.stage] += 1;
    if (job.status === "failed") {
      failedJobCount += 1;
      if (latestFailedJob === null || job.createdAt > latestFailedJob.createdAt) {
        latestFailedJob = job;
      }
    }
  }
  return {
    activeJobCount: jobs.filter((job) => isActiveTrainingJobStatus(job.status)).length,
    queuedJobCount,
    runningJobCountsByStage,
    failedJobCount,
    latestFailure:
      latestFailedJob === null
        ? null
        : {
            deviceCode: latestFailedJob.deviceCode,
            modelCode: latestFailedJob.modelCode,
            failureReason: latestFailedJob.failureReason,
          },
  };
}

// 학습 예약 Modal에서 선택할 수 있는 값과 열 때 채울 값, 작업 요청 Modal의 공통 형식
export type TrainingScheduleOptions = JobRequestOptions;

// 학습 예약 Modal에 입력 중인 값, 시각은 입력한 문자열 그대로 보관
export type TrainingScheduleDraft = JobRequestDraft;

// 학습 예약을 보낼 수 없는 사유, Model 없음, 기간 없음, 기간 역전, 장치 없음
export type TrainingScheduleProblem = JobRequestProblem;

// 사유를 표시할 입력 항목, Model, 기간, 장치
export type TrainingScheduleField = JobRequestProblemField;

// 열 때의 값을 채운 학습 예약 폼 반환, 처음 장치 중 선택할 수 없는 장치는 제외
export const createTrainingScheduleDraft = createJobRequestDraft;

// 학습 예약을 보낼 수 없는 첫 사유 반환, Model, 기간, 장치 순서로 검사하고 없으면 null
export const findTrainingScheduleProblem = findJobRequestProblem;

// 사유를 표시할 입력 항목 반환
export const trainingScheduleProblemField = jobRequestProblemField;

// 사유를 표시한 항목의 값이 바뀌었는지 판정
export const hasTrainingScheduleFieldChanged = hasJobRequestFieldChanged;

// 학습 예약 폼을 예약에 전달할 값으로 변환, 보낼 수 없는 폼이면 null
export const toTrainingScheduleInput = toJobRequestInput;

// 학습 Job 한 건의 요청 조건과 진행 기록, 시각은 "YYYY-MM-DDTHH:mm:ss"
export interface TrainingJobDetail {
  // 학습을 시작한 시각, 아직 시작하지 않았으면 null
  startedAt: string | null;
  // 학습이 끝나거나 멈춘 시각, 진행 중이거나 시작 전이면 null
  endedAt: string | null;
  // 학습할 데이터의 날짜 범위 "YYYY-MM-DD"
  requestedPeriod: { from: string; to: string };
  requestedStartTime: string;
  requestedEndTime: string;
  // 데이터를 자르는 window 하나의 길이(초)
  windowSeconds: number;
  // 실패한 Job의 상세 실패 내용, 실패가 아니면 null
  failureMessage: string | null;
}

// 학습한 Model 버전 하나의 임계값, 날짜는 "YYYY-MM-DD"
export interface TrainingThresholdPoint {
  trainedOn: string;
  threshold: number;
}

// 학습 반복(epoch) 하나의 학습 점수와 검증 점수, 0 ~ 1
export interface TrainingCurvePoint {
  epoch: number;
  train: number;
  validation: number;
}

// 학습 결과 한 건의 학습 지표와 버전별 임계값, 학습 곡선
export interface TrainingResultDetail {
  // 학습한 편성, 전체 편성이면 null
  formation: string | null;
  modelVersion: string;
  windowSeconds: number;
  windowCount: number;
  featureCount: number;
  // 학습 데이터를 선택한 방식
  trainingMethod: string;
  // 같은 장치, Model, Segment의 버전별 임계값, 오래된 것부터 나열하며 마지막이 이 결과
  thresholdHistory: readonly TrainingThresholdPoint[];
  // 학습 반복별 점수, 반복 순서대로 나열
  learningCurve: readonly TrainingCurvePoint[];
}
