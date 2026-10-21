import { countTrainingJobs, isActiveTrainingJobStatus } from "@/domain/training";
import type {
  TrainingCurvePoint,
  TrainingFilterOptions,
  TrainingJob,
  TrainingJobDetail,
  TrainingJobId,
  TrainingResult,
  TrainingResultDetail,
  TrainingResultExportQuery,
  TrainingResultId,
  TrainingResultPage,
  TrainingResultQuery,
  TrainingResultSort,
  TrainingScheduleInput,
  TrainingScheduleOptions,
  TrainingSummary,
  TrainingThresholdPoint,
} from "@/domain/training";
import { formatIsoDate, formatIsoDateTime, formatLocalIsoDateTime } from "@/lib/formatTime";
import { ANALYSIS_MODELS } from "@/services/mock/catalogData";
import { buildCsvFile } from "@/services/mock/csvFile";
import { shiftIsoDate } from "@/services/mock/dates";
import {
  markScreenEntry,
  respondLater,
  respondNow,
  runActionLater,
} from "@/services/mock/latency";

// 학습 Job의 기초 데이터, 날짜는 Mock 기준일 기준
const TRAINING_JOB_SEEDS: readonly TrainingJob[] = [
  { id: "trn-1000", deviceCode: "DRIVING_GEAR", modelCode: "IF", formation: "401", createdAt: "2026-09-23T09:05:00", isRetry: false, status: "running", stage: "train", progressPercent: 68, stepProgress: { unit: "epoch", done: 7, total: 10 } },
  { id: "trn-1001", deviceCode: "ECU", modelCode: "SVM", formation: "402", createdAt: "2026-09-23T10:12:00", isRetry: false, status: "running", stage: "preprocess", progressPercent: 35, stepProgress: { unit: "part", done: 3, total: 8 } },
  { id: "trn-1002", deviceCode: "DCU", modelCode: "VAE", formation: "403", createdAt: "2026-09-23T11:19:00", isRetry: false, status: "succeeded", completedAt: "2026-09-23T11:48:00" },
  { id: "trn-1003", deviceCode: "TCMS", modelCode: "PCA", formation: "404", createdAt: "2026-09-23T12:26:00", isRetry: false, status: "succeeded", completedAt: "2026-09-23T12:51:00" },
  { id: "trn-1004", deviceCode: "UNVR", modelCode: "IF", formation: "405", createdAt: "2026-09-23T13:33:00", isRetry: false, status: "queued", scheduledStartAt: "2026-09-23T13:40:00" },
  { id: "trn-1005", deviceCode: "MICOM_COOLER", modelCode: "SVM", formation: "406", createdAt: "2026-09-23T14:40:00", isRetry: false, status: "failed", stage: "featureVector", failureReason: "대상 기간 데이터 없음" },
];

// 학습 결과의 기초 데이터 [학습 일시(기준일 기준), Model, 장치, Segment, 임계치]
const TRAINING_RESULT_SEEDS: readonly (readonly [string, string, string, string, number])[] = [
  ["2026-09-23T09:12:00", "IF", "AXLE_BEARING", "default", 0.5277],
  ["2026-09-22T10:12:07", "SVM", "AXLE_BEARING", "default", -1.2758],
  ["2026-09-22T09:13:07", "IF", "DRIVING_GEAR", "default", 0.514],
  ["2026-09-22T09:12:07", "IF", "AXLE_BEARING", "unit_a", 0.4914],
  ["2026-09-22T09:12:07", "IF", "AXLE_BEARING", "unit_a", 0.4914],
  ["2026-09-21T11:14:14", "VAE", "TRACTION_MOTOR", "default", 0.0433],
];

// 목록에 다 싣지 않은 결과를 포함한 학습 결과 전체 수와 Page 수
const RESULT_TOTAL_COUNT = 81;
const RESULT_PAGE_COUNT = 10;
// CSV 헤더 문자열, 결과 Table의 Column 이름과 같은 순서와 같은 문구(임계치 관리 Column은 제외)
const RESULT_CSV_HEADER: readonly string[] = [
  "모델 학습 일시",
  "모델 명",
  "장치",
  "세그먼트",
  "임계치",
];
// CSV의 임계치 소수 자릿수, Table과 같음
const CSV_THRESHOLD_DIGITS = 4;

// 처음 조회 기간(기준일 기준)과 한 Page의 Row 수 선택지, 선택할 수 있는 날짜는 제한 없음
const DEFAULT_PERIOD = { from: "2026-09-17", to: "2026-09-23" } as const;
const PAGE_SIZES: readonly number[] = [20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

// KPI의 학습 이력 전체 수, 학습에 쓰는 Model, 가장 최근 학습, 실패를 집계하는 일수
const HISTORY_COUNT = 81;
const SUMMARY_MODEL_CODES: readonly string[] = ["IF", "SVM", "VAE", "PCA"];
const LATEST_TRAINING = { trainedAt: "2026-09-23T09:12:00", deviceCode: "AXLE_BEARING" } as const;
const FAILURE_WINDOW_DAYS = 7;

// 학습 예약 Modal을 열 때의 기본값과 선택지(기준일 기준), 기간은 기준일 7일 전부터 1일 전까지
const SCHEDULE_DEFAULT_PERIOD = { from: "2026-09-16", to: "2026-09-22" } as const;
const SCHEDULE_DEFAULT_START_TIME = "00:00:00";
const SCHEDULE_DEFAULT_END_TIME = "23:59:59";
const SCHEDULE_MODEL_CODES: readonly string[] = ["IF", "SVM", "VAE", "PCA"];
const SCHEDULE_FIRST_FORMATION = 401;
const SCHEDULE_FORMATION_COUNT = 26;
const SCHEDULE_DEFAULT_DEVICE_CODES: readonly string[] = ["ATC", "DRIVING_GEAR"];
const SCHEDULE_UNAVAILABLE_DEVICE_CODES: readonly string[] = ["FRU", "IDBC"];
// 데이터를 자르는 window 하나의 길이(초)
const WINDOW_SECONDS = 60;

// 학습 Job별 Request 조건과 시작, 종료 시각, 시작 전이거나 끝나지 않았으면 null
interface TrainingJobRecord {
  requestedPeriod: { from: string; to: string };
  requestedStartTime: string;
  requestedEndTime: string;
  windowSeconds: number;
  startedAt: string | null;
  endedAt: string | null;
  failureMessage: string | null;
}

// 초기 Job들의 Request 조건, 학습 기간, 시각, window 길이는 모두 같음
const SEED_REQUEST = {
  requestedPeriod: SCHEDULE_DEFAULT_PERIOD,
  requestedStartTime: SCHEDULE_DEFAULT_START_TIME,
  requestedEndTime: SCHEDULE_DEFAULT_END_TIME,
  windowSeconds: WINDOW_SECONDS,
} as const;

// 초기 Job들의 시작, 종료 시각(기준일 기준)과 실패 내용
const TRAINING_JOB_RECORD_SEEDS: Readonly<Record<TrainingJobId, TrainingJobRecord>> = {
  "trn-1000": { ...SEED_REQUEST, startedAt: "2026-09-23T09:05:00", endedAt: null, failureMessage: null },
  "trn-1001": { ...SEED_REQUEST, startedAt: "2026-09-23T10:12:00", endedAt: null, failureMessage: null },
  "trn-1002": { ...SEED_REQUEST, startedAt: "2026-09-23T11:19:00", endedAt: "2026-09-23T11:48:00", failureMessage: null },
  "trn-1003": { ...SEED_REQUEST, startedAt: "2026-09-23T12:26:00", endedAt: "2026-09-23T12:51:00", failureMessage: null },
  "trn-1004": { ...SEED_REQUEST, startedAt: null, endedAt: null, failureMessage: null },
  "trn-1005": {
    ...SEED_REQUEST,
    startedAt: "2026-09-23T14:40:02",
    endedAt: "2026-09-23T14:41:17",
    failureMessage: "대상 기간(2026-09-16 ~ 2026-09-22)에 MICOM_COOLER 센서 데이터가 없습니다. 기간을 바꾸거나 수집 상태를 확인한 뒤 다시 시도하세요.",
  },
};

// 학습 결과 상세의 학습 방식, 버전별 임계치를 만드는 비율, 학습 곡선의 반복 수
const RESULT_TRAINING_METHOD = "reservoir";
const THRESHOLD_HISTORY_FACTORS: readonly number[] = [0.93, 0.99, 1.04, 0.99, 0.93, 1];
const THRESHOLD_HISTORY_DAYS_AGO: readonly number[] = [35, 28, 21, 14, 7, 0];
const LEARNING_CURVE_LAST_INDEX = 40;
// 가장 최근 학습 결과의 window 수와 특징 수, 나머지 결과는 장치와 일시로 만든 수
const LATEST_RESULT_WINDOW_COUNT = 346;
const LATEST_RESULT_FEATURE_COUNT = 86;

// 재시도로 만든 Job의 초기 진행률(%)
const RETRY_START_PERCENT = 2;
// 새 Job 번호의 시작값
const JOB_NUMBER_BASE = 1000;
// 새 예약 Job의 시작 예정을 만든 시각에서 미루는 분, 초기 예약 Job의 만든 시각과 시작 예정 간격과 같음
const SCHEDULED_START_DELAY_MINUTES = 7;
// 1분의 밀리초
const MINUTE_MS = 60_000;

// "YYYY-MM-DDTHH:mm:ss"를 오늘 기준 시각으로 변환
function shiftIsoDateTime(isoDateTime: string): string {
  return `${shiftIsoDate(formatIsoDate(isoDateTime))}${isoDateTime.slice(10)}`;
}

function shiftJob(job: TrainingJob): TrainingJob {
  const shifted = { ...job, createdAt: shiftIsoDateTime(job.createdAt) };
  switch (shifted.status) {
    case "queued":
      return { ...shifted, scheduledStartAt: shiftIsoDateTime(shifted.scheduledStartAt) };
    case "succeeded":
      return { ...shifted, completedAt: shiftIsoDateTime(shifted.completedAt) };
    case "running":
    case "failed":
      return shifted;
  }
}

// 문장 속 "YYYY-MM-DD" 전부를, 옮긴 날짜가 다시 옮겨지지 않도록 한 번에 오늘 기준 날짜로 변환
function shiftIsoDatesInText(text: string): string {
  return text.replace(/\d{4}-\d{2}-\d{2}/g, (isoDate) => shiftIsoDate(isoDate));
}

// "YYYY-MM-DDTHH:mm:ss" 또는 null을 오늘 기준 시각으로 변환
function shiftOptionalIsoDateTime(isoDateTime: string | null): string | null {
  return isoDateTime === null ? null : shiftIsoDateTime(isoDateTime);
}

// 메모리의 학습 Job 목록, 실행 함수가 바꾸고 조회 함수가 읽음
let jobStore: TrainingJob[] | null = null;

function readJobs(): TrainingJob[] {
  jobStore ??= TRAINING_JOB_SEEDS.map(shiftJob);
  return jobStore;
}

// 메모리의 학습 Job별 Request 조건과 시작, 종료 시각
let jobRecordStore: Map<TrainingJobId, TrainingJobRecord> | null = null;

function readJobRecords(): Map<TrainingJobId, TrainingJobRecord> {
  jobRecordStore ??= new Map(
    Object.entries(TRAINING_JOB_RECORD_SEEDS).map(([id, record]) => [
      id,
      {
        ...record,
        requestedPeriod: {
          from: shiftIsoDate(record.requestedPeriod.from),
          to: shiftIsoDate(record.requestedPeriod.to),
        },
        startedAt: shiftOptionalIsoDateTime(record.startedAt),
        endedAt: shiftOptionalIsoDateTime(record.endedAt),
        failureMessage:
          record.failureMessage === null ? null : shiftIsoDatesInText(record.failureMessage),
      },
    ]),
  );
  return jobRecordStore;
}

// 학습 결과 목록, 처음 읽을 때 날짜를 오늘 기준으로 옮겨 보관
let resultStore: TrainingResult[] | null = null;

// 문자열로 0 이상 modulo 미만의 고정된 수 계산, Mock의 값이 결과마다 다르게 보이도록 사용
function hashText(text: string, modulo: number): number {
  let hash = 7;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return hash % modulo;
}

function readResults(): TrainingResult[] {
  resultStore ??= TRAINING_RESULT_SEEDS.map(
    ([trainedAt, modelCode, deviceCode, segment, threshold], index) => ({
      id: String(index + 1),
      trainedAt: shiftIsoDateTime(trainedAt),
      modelCode,
      deviceCode,
      segment,
      threshold,
    }),
  );
  return resultStore;
}

// Model 코드의 이름 반환, Sort는 이름 순이고 이름이 없는 코드는 코드로 비교
function modelName(modelCode: string): string {
  return ANALYSIS_MODELS.find((model) => model.code === modelCode)?.name ?? modelCode;
}

const sortValues: Record<TrainingResultSort["key"], (result: TrainingResult) => string | number> = {
  trainedAt: (result) => result.trainedAt,
  model: (result) => modelName(result.modelCode),
  device: (result) => result.deviceCode,
  threshold: (result) => result.threshold,
};

export function buildTrainingFilterOptions(): TrainingFilterOptions {
  return {
    defaultPeriod: { from: shiftIsoDate(DEFAULT_PERIOD.from), to: shiftIsoDate(DEFAULT_PERIOD.to) },
    selectablePeriod: { from: null, to: null },
    pageSizes: [...PAGE_SIZES],
    defaultPageSize: DEFAULT_PAGE_SIZE,
  };
}

export function buildTrainingSummary(): TrainingSummary {
  return {
    ...countTrainingJobs(readJobs()),
    historyCount: HISTORY_COUNT,
    modelCodes: [...SUMMARY_MODEL_CODES],
    latestTraining: {
      trainedAt: shiftIsoDateTime(LATEST_TRAINING.trainedAt),
      deviceCode: LATEST_TRAINING.deviceCode,
    },
    failureWindowDays: FAILURE_WINDOW_DAYS,
  };
}

export function buildTrainingJobs(): TrainingJob[] {
  return readJobs().map((job) => ({ ...job }));
}

// 조건에 맞는 학습 결과를 Sort해 반환, Page 번호와 Page 크기에 상관없이 맞는 Row 전부
function findTrainingResults(query: TrainingResultExportQuery): TrainingResult[] {
  const { from, to } = query.period;
  const valueOf = sortValues[query.sort.key];
  const sign = query.sort.direction === "asc" ? 1 : -1;
  return readResults().filter((result) => {
    const trainedOn = formatIsoDate(result.trainedAt);
    return (
      (query.modelCode === null || result.modelCode === query.modelCode) &&
      (query.deviceCode === null || result.deviceCode === query.deviceCode) &&
      (from === null || trainedOn >= from) &&
      (to === null || trainedOn <= to)
    );
  }).sort((left, right) => {
    const leftValue = valueOf(left);
    const rightValue = valueOf(right);
    if (leftValue === rightValue) return 0;
    return (leftValue > rightValue ? 1 : -1) * sign;
  });
}

// 학습 결과 한 Page 반환, Mock은 Page 번호와 Page 크기에 상관없이 조건에 맞는 Row 전부를 싣고 전체 수와 Page 수는 고정 값
export function buildTrainingResults(query: TrainingResultQuery): TrainingResultPage {
  const rows = findTrainingResults(query);
  return { rows, totalCount: RESULT_TOTAL_COUNT, pageCount: RESULT_PAGE_COUNT };
}

// 학습 결과 1건을 Table에 표시되는 형태의 Cell로 변환
function toResultCsvCells(result: TrainingResult): string[] {
  return [
    formatIsoDateTime(result.trainedAt),
    modelName(result.modelCode),
    result.deviceCode,
    result.segment,
    result.threshold.toFixed(CSV_THRESHOLD_DIGITS),
  ];
}

// 조건에 맞는 학습 결과 전부를 Sort해 Table에 표시되는 형태의 CSV 파일로 반환
export function buildTrainingResultsCsv(query: TrainingResultExportQuery): Blob {
  return buildCsvFile(RESULT_CSV_HEADER, findTrainingResults(query).map(toResultCsvCells));
}

export function buildTrainingScheduleOptions(): TrainingScheduleOptions {
  return {
    defaultPeriod: {
      from: shiftIsoDate(SCHEDULE_DEFAULT_PERIOD.from),
      to: shiftIsoDate(SCHEDULE_DEFAULT_PERIOD.to),
    },
    selectablePeriod: { from: null, to: null },
    defaultStartTime: SCHEDULE_DEFAULT_START_TIME,
    defaultEndTime: SCHEDULE_DEFAULT_END_TIME,
    modelCodes: [...SCHEDULE_MODEL_CODES],
    defaultModelCode: null,
    formations: Array.from({ length: SCHEDULE_FORMATION_COUNT }, (_, index) =>
      String(SCHEDULE_FIRST_FORMATION + index),
    ),
    defaultFormation: null,
    defaultDeviceCodes: [...SCHEDULE_DEFAULT_DEVICE_CODES],
    unavailableDeviceCodes: [...SCHEDULE_UNAVAILABLE_DEVICE_CODES],
  };
}

// 학습 Job 1건의 Request 조건과 시작, 종료 시각 반환, 없는 Job이면 실패
export function buildTrainingJobDetail(jobId: TrainingJobId): TrainingJobDetail {
  const record = readJobRecords().get(jobId);
  if (record === undefined) throw new Error(`학습 작업 없음: ${jobId}`);
  return {
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    requestedPeriod: { ...record.requestedPeriod },
    requestedStartTime: record.requestedStartTime,
    requestedEndTime: record.requestedEndTime,
    windowSeconds: record.windowSeconds,
    failureMessage: record.failureMessage,
  };
}

// "YYYY-MM-DD"에서 일수만큼 이전 날짜 반환
function isoDateDaysBefore(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return formatIsoDate(formatLocalIsoDateTime(new Date(year, month - 1, day - days)));
}

// 학습 반복별 학습 점수와 검증 점수, 0에서 오른쪽으로 갈수록 내려가는 두 곡선(검증은 끝에서 다시 상승)
function buildLearningCurve(): TrainingCurvePoint[] {
  return Array.from({ length: LEARNING_CURVE_LAST_INDEX + 1 }, (_, index) => {
    const trainDrop = 100 - (Math.exp(-index / 7) * 91 + 9);
    const validationRise = index > 26 ? (index - 26) * 0.25 : 0;
    const validationDrop = 100 - (Math.exp(-index / 9) * 80 + 20) - validationRise;
    return {
      epoch: index + 1,
      train: 1 - Number(trainDrop.toFixed(2)) / 100,
      validation: 1 - Number(validationDrop.toFixed(2)) / 100,
    };
  });
}

// 학습 결과 1건의 학습 지표, 버전별 임계치, 학습 곡선 반환, 없는 결과면 실패
export function buildTrainingResultDetail(resultId: TrainingResultId): TrainingResultDetail {
  const index = readResults().findIndex((result) => result.id === resultId);
  if (index < 0) throw new Error(`학습 결과 없음: ${resultId}`);
  const result = readResults()[index];
  const [seedTrainedAt, , deviceCode, , threshold] = TRAINING_RESULT_SEEDS[index];
  const seedText = seedTrainedAt.replace("T", " ");
  const isLatest = seedTrainedAt === LATEST_TRAINING.trainedAt;
  const trainedOn = formatIsoDate(result.trainedAt);
  const thresholdHistory: TrainingThresholdPoint[] = THRESHOLD_HISTORY_FACTORS.map(
    (factor, step) => ({
      trainedOn: isoDateDaysBefore(trainedOn, THRESHOLD_HISTORY_DAYS_AGO[step]),
      threshold:
        step === THRESHOLD_HISTORY_FACTORS.length - 1
          ? threshold
          : threshold * (threshold < 0 ? 2 - factor : factor) +
            (hashText(`${deviceCode}${step}`, 7) - 3) * Math.abs(threshold) * 0.003,
    }),
  );
  return {
    formation: null,
    modelVersion: result.trainedAt.replace(/[-:]/g, ""),
    windowSeconds: WINDOW_SECONDS,
    windowCount: isLatest ? LATEST_RESULT_WINDOW_COUNT : 180 + hashText(`${seedText}${deviceCode}`, 300),
    featureCount: isLatest ? LATEST_RESULT_FEATURE_COUNT : 40 + hashText(deviceCode, 60),
    trainingMethod: RESULT_TRAINING_METHOD,
    thresholdHistory,
    learningCurve: buildLearningCurve(),
  };
}

// 취소로 삭제한 Job 수, 삭제한 Job의 번호를 새 Job에 다시 쓰지 않으려고 집계함
let canceledJobCount = 0;

// 다음에 만들 Job 번호 계산, 현재 Job 수와 취소로 삭제한 Job 수에 시작값을 더함
function nextJobId(jobs: readonly TrainingJob[]): TrainingJobId {
  return `trn-${JOB_NUMBER_BASE + jobs.length + canceledJobCount}`;
}

// 선택한 장치마다 예약 Job을 만들어 목록 맨 앞에 추가하고 만든 Job 번호 반환, 시작 예정은 만든 시각 이후로 정함
export function scheduleTrainingInStore(input: TrainingScheduleInput): TrainingJobId[] {
  const jobs = readJobs();
  const records = readJobRecords();
  const firstId = nextJobId(jobs);
  const now = new Date();
  const createdAt = formatLocalIsoDateTime(now);
  const scheduledStartAt = formatLocalIsoDateTime(
    new Date(now.getTime() + SCHEDULED_START_DELAY_MINUTES * MINUTE_MS),
  );
  const startTime = input.startTime ?? SCHEDULE_DEFAULT_START_TIME;
  const scheduled: TrainingJob[] = input.deviceCodes.map((deviceCode, index) => ({
    id: index === 0 ? firstId : `${firstId}-${index}`,
    deviceCode,
    modelCode: input.modelCode,
    formation: input.formation,
    createdAt,
    isRetry: false,
    status: "queued",
    scheduledStartAt,
  }));
  for (const job of scheduled) {
    records.set(job.id, {
      requestedPeriod: { ...input.period },
      requestedStartTime: startTime,
      requestedEndTime: input.endTime ?? SCHEDULE_DEFAULT_END_TIME,
      windowSeconds: WINDOW_SECONDS,
      startedAt: null,
      endedAt: null,
      failureMessage: null,
    });
  }
  jobStore = [...scheduled, ...jobs];
  return scheduled.map((job) => job.id);
}

// 실패한 Job과 같은 조건의 새 Job을 전처리 단계부터 진행 중으로 목록 맨 앞에 추가하고 번호 반환, 실패한 Job은 유지하고 실패가 아닌 Job이면 오류 발생
export function retryTrainingJobInStore(jobId: TrainingJobId): TrainingJobId {
  const jobs = readJobs();
  const records = readJobRecords();
  const failedJob = jobs.find((job) => job.id === jobId);
  const record = records.get(jobId);
  if (failedJob === undefined || failedJob.status !== "failed" || record === undefined) {
    throw new Error(`재시도할 수 없는 학습 작업: ${jobId}`);
  }
  const now = formatLocalIsoDateTime(new Date());
  const retried: TrainingJob = {
    id: nextJobId(jobs),
    deviceCode: failedJob.deviceCode,
    modelCode: failedJob.modelCode,
    formation: failedJob.formation,
    createdAt: now,
    isRetry: true,
    status: "running",
    stage: "preprocess",
    progressPercent: RETRY_START_PERCENT,
    stepProgress: null,
  };
  records.set(retried.id, { ...record, startedAt: now, endedAt: null, failureMessage: null });
  jobStore = [retried, ...jobs];
  return retried.id;
}

// 완료 전(예약, 진행 중) Job을 목록과 Request 조건에서 삭제, 취소 기록은 남기지 않고 없거나 완료된 Job이면 오류 발생. Test가 지연하거나 실패시킬 수 있음
export function cancelTrainingJobInStore(jobId: TrainingJobId): Promise<void> {
  return runActionLater("cancelTrainingJob", jobId, () => {
    const jobs = readJobs();
    const target = jobs.find((job) => job.id === jobId);
    if (target === undefined || !isActiveTrainingJobStatus(target.status)) {
      throw new Error(`취소할 수 없는 학습 작업: ${jobId}`);
    }
    jobStore = jobs.filter((job) => job.id !== jobId);
    readJobRecords().delete(jobId);
    canceledJobCount += 1;
  });
}

// 화면 진입 시 호출하는 조회 중 첫 진입에서 지연 시간을 적용할 조회 이름, 처음 값 조회가 호출하면 각 조회에 한 번씩 적용
const ENTRY_QUERY_NAMES = ["trainingSummary", "trainingJobs", "trainingResults"] as const;

// 처음 값 조회 응답, 화면 진입으로 표시하고 즉시 응답
export function respondTrainingFilterOptions(signal?: AbortSignal): Promise<TrainingFilterOptions> {
  markScreenEntry(ENTRY_QUERY_NAMES);
  return respondNow(signal, buildTrainingFilterOptions);
}

// 요약 응답, 첫 진입과 검색 시 지연 시간 적용
export function respondTrainingSummary(signal?: AbortSignal): Promise<TrainingSummary> {
  return respondLater("trainingSummary", signal, buildTrainingSummary);
}

// 학습 Job 목록 응답, 첫 진입과 검색 시 지연 시간 적용
export function respondTrainingJobs(signal?: AbortSignal): Promise<TrainingJob[]> {
  return respondLater("trainingJobs", signal, buildTrainingJobs);
}

// 학습 결과 한 Page 응답, 첫 진입과 검색 시 지연 시간 적용
export function respondTrainingResults(
  query: TrainingResultQuery,
  signal?: AbortSignal,
): Promise<TrainingResultPage> {
  return respondLater("trainingResults", signal, () => buildTrainingResults(query));
}

// 학습 예약 Modal의 선택지 응답, 즉시 응답
export function respondTrainingScheduleOptions(signal?: AbortSignal): Promise<TrainingScheduleOptions> {
  return respondNow(signal, buildTrainingScheduleOptions);
}

// 학습 Job 상세 응답, 즉시 응답
export function respondTrainingJobDetail(
  jobId: TrainingJobId,
  signal?: AbortSignal,
): Promise<TrainingJobDetail> {
  return respondNow(signal, () => buildTrainingJobDetail(jobId));
}

// 학습 결과 상세 응답, 즉시 응답
export function respondTrainingResultDetail(
  resultId: TrainingResultId,
  signal?: AbortSignal,
): Promise<TrainingResultDetail> {
  return respondNow(signal, () => buildTrainingResultDetail(resultId));
}
