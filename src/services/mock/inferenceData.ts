import { classifyAnomalyWindows } from "@/domain/anomaly";
import { isActiveInferenceJobStatus } from "@/domain/inference";
import type {
  InferenceAnomalyWindow,
  InferenceCarHeatmap,
  InferenceFilterOptions,
  InferenceJob,
  InferenceJobDetail,
  InferenceJobId,
  InferenceJobList,
  InferenceResult,
  InferenceResultExportQuery,
  InferenceResultPage,
  InferenceResultQuery,
  InferenceRunInput,
  InferenceRunOptions,
} from "@/domain/inference";
import {
  formatIsoDate,
  formatIsoHourMinute,
  formatLocalIsoDateTime,
} from "@/lib/formatTime";
import { ANOMALY_LEVEL_THRESHOLDS } from "@/services/mock/anomalyRules";
import { ANALYSIS_MODELS, DEVICES } from "@/services/mock/catalogData";
import { buildCsvFile } from "@/services/mock/csvFile";
import { shiftIsoDate } from "@/services/mock/dates";
import {
  markScreenEntry,
  respondLater,
  respondNow,
  runActionLater,
} from "@/services/mock/latency";

// 추론 Job의 기초 데이터, 날짜는 Mock 기준일 기준, 표시 순서대로 정렬
const INFERENCE_JOB_SEEDS: readonly InferenceJob[] = [
  { id: "inf-2000", deviceCode: "TRACTION_MOTOR", modelCode: "SVM", formation: "410", createdAt: "2026-09-23T13:11:00", isRetry: false, status: "succeeded", anomalyRatePercent: 3 },
  { id: "inf-2003", deviceCode: "ECU", modelCode: "VAE", formation: "411", createdAt: "2026-09-23T14:16:00", isRetry: false, status: "succeeded", anomalyRatePercent: 7 },
  { id: "inf-2002", deviceCode: "MICOM_AIRPURIFIER", modelCode: "PCA", formation: "412", createdAt: "2026-09-23T15:21:00", isRetry: false, status: "running", progressPercent: 55, segmentProgress: { done: 1, total: 2 } },
  { id: "inf-2004", deviceCode: "VVVF", modelCode: "IF", formation: "413", createdAt: "2026-09-23T16:26:00", isRetry: false, status: "succeeded", anomalyRatePercent: 15 },
  { id: "inf-2006", deviceCode: "MICOM_COOLER", modelCode: "VAE", formation: "409", createdAt: "2026-09-23T17:02:00", isRetry: false, status: "failed", failureReason: "센서 데이터 62% 누락" },
  { id: "inf-2005", deviceCode: "ESW", modelCode: "IF", formation: null, createdAt: "2026-09-22T18:40:00", isRetry: false, status: "failed", failureReason: "저장된 모델이 없습니다: device=ESW" },
];

// 추론 결과의 기초 데이터 [추론 일시(기준일 기준), Model, 장치, Segment, 전체 window, 이상 window, 임계치, 생성한 Job]
const INFERENCE_RESULT_SEEDS: readonly (readonly [string, string, string, string, number, number, number, string])[] = [
  ["2026-09-23T12:38:00", "VAE", "BMS", "default", 240, 22, 0.043, "inf-1999"],
  ["2026-09-23T12:32:00", "IF", "PISC", "default", 210, 0, 0.52, "inf-1998"],
  ["2026-09-23T12:26:00", "VAE", "MICOM_AIRPURIFIER", "default", 180, 61, 0.043, "inf-1997"],
  ["2026-09-23T12:20:00", "IF", "AXLE_BEARING", "default", 150, 0, 0.52, "inf-1996"],
  ["2026-09-22T13:39:00", "IF", "FRU", "default", 270, 16, 0.52, "inf-1995"],
  ["2026-09-22T13:33:00", "VAE", "UNVR", "default", 240, 17, 0.043, "inf-1994"],
  ["2026-09-22T13:27:00", "IF", "DCU", "default", 210, 32, 0.52, "inf-1993"],
  ["2026-09-22T13:21:00", "VAE", "DRIVING_GEAR", "default", 180, 20, 0.043, "inf-1992"],
  ["2026-09-22T13:21:00", "VAE", "DRIVING_GEAR", "default", 180, 20, 0.043, "inf-1991"],
];

// 목록에 다 싣지 않은 결과를 포함한 추론 결과 전체 수와 Page 수
const RESULT_TOTAL_COUNT = 31;
const RESULT_PAGE_COUNT = 10;
// Job 목록이 담는 최근 일수
const RECENT_DAYS = 7;
// CSV 헤더 문자열, 결과 Table의 Column 이름과 같은 순서와 같은 문구
const RESULT_CSV_HEADER: readonly string[] = [
  "추론 일시",
  "모델 명",
  "장치 명",
  "세그먼트",
  "이상 window",
  "이상 비율",
  "임계치",
];
// CSV의 이상 비율과 임계치 소수 자릿수, Table과 같음
const CSV_RATE_DIGITS = 1;
const CSV_THRESHOLD_DIGITS = 4;
// 전체 window가 0이라 비율이 없을 때 Cell에 표시할 문자, Table과 같음
const CSV_NO_RATE = "-";

// 처음 조회 기간(기준일 기준), 선택할 수 있는 날짜는 제한 없음
const DEFAULT_PERIOD = { from: "2026-09-17", to: "2026-09-23" } as const;

// 추론 실행 Modal을 열 때의 기본값과 선택지(기준일 기준), 기간은 기준일 1일 전부터 기준일까지
const RUN_DEFAULT_PERIOD = { from: "2026-09-22", to: "2026-09-23" } as const;
const RUN_DEFAULT_START_TIME = "00:00:00";
const RUN_DEFAULT_END_TIME = "23:59:59";
const RUN_MODEL_CODES: readonly string[] = ["IF", "SVM", "VAE", "PCA"];
const RUN_FIRST_FORMATION = 401;
const RUN_FORMATION_COUNT = 26;
const RUN_UNAVAILABLE_DEVICE_CODES: readonly string[] = ["FRU", "IDBC"];

// 추론 상세의 Request 조건(기준일 기준), 실행으로 만든 Job이 아니면 이 값 사용
const DETAIL_PERIOD = { from: "2026-09-22", to: "2026-09-23" } as const;
const DETAIL_START_TIME = "00:00:00";
const DETAIL_END_TIME = "06:00:00";
// 실행 시 시각을 비워 두면 하루 전체로 처리
const FULL_DAY_START_TIME = "00:00:00";
const FULL_DAY_END_TIME = "23:59:59";
const DETAIL_WINDOW_SECONDS = 60;
const DETAIL_SEGMENTS: readonly string[] = ["default", "unit_a"];
// 추론에 쓴 학습 버전, 운영 단계이며 기준일 3일 전에 만든 버전
const DETAIL_MODEL_VERSION_DATE = "2026-09-20";
const DETAIL_MODEL_VERSION_TIME = "T111321";
// 성공한 Job의 소요 시간과 실패한 Job이 멈추기까지의 시간(분)
const SUCCEEDED_DURATION_MINUTES = 19;
const FAILED_DURATION_MINUTES = 1;
// Job Card에서 연 상세의 default Segment 결과, 결과 Row 없이 열 때 쓰는 세 번째 결과 Row의 값
const CARD_DEFAULT_SEGMENT = { windowCount: 180, anomalyWindowCount: 61, threshold: 0.043 } as const;
// 두 번째 Segment, 전체 window 120, 이상은 default의 0.23배, 임계치 0.0415
const SECOND_SEGMENT = { segment: "unit_a", windowCount: 120, anomalyRatio: 0.23, threshold: 0.0415 } as const;
// 결과 Row의 Job이 추론한 편성
const RESULT_JOB_FORMATION = "412";
// 자동 Alarm 기준, 이상 window 30개마다 1개, 이상이 있으면 최소 1개
const WINDOWS_PER_ALARM = 30;
// 이상 시간대 [시작, 끝, Segment, 편성, 호차, 점수](기준일 기준)
const ANOMALY_WINDOW_SEEDS: readonly (readonly [string, string, string, string, number, number])[] = [
  ["2026-09-22T14:04:00", "2026-09-22T14:05:00", "default", "401", 1, 0.6],
  ["2026-09-22T15:12:00", "2026-09-22T15:13:00", "default", "402", 2, 0.67],
  ["2026-09-22T16:21:00", "2026-09-22T16:22:00", "default", "403", 3, 0.74],
  ["2026-09-22T17:30:00", "2026-09-22T17:31:00", "unit_a", "404", 4, 0.81],
  ["2026-09-22T18:39:00", "2026-09-22T18:40:00", "default", "405", 5, 0.88],
  ["2026-09-22T19:48:00", "2026-09-22T19:49:00", "unit_a", "403", 6, 0.905],
];
// 편성 × 호차 Heatmap 범위, 편성 401 ~ 421, 호차 0 ~ 9, 이상 window가 1개인 Cell(목록에 없는 편성은 4호차)
const HEATMAP_FIRST_FORMATION = 401;
const HEATMAP_FORMATION_COUNT = 21;
const HEATMAP_CAR_COUNT = 10;
const HEATMAP_HOT_CARS: Readonly<Record<string, readonly number[]>> = {
  "401": [0, 9],
  "402": [1],
  "403": [2, 5],
  "404": [3],
};
const HEATMAP_DEFAULT_HOT_CARS: readonly number[] = [4];

// 실패 Job의 실패 내용, Job마다 정한 문구(날짜는 기준일 기준)
const SEED_FAILURE_MESSAGES: Readonly<Record<InferenceJobId, () => string>> = {
  "inf-2006": () =>
    `추론 실패 — 편성 409의 ${shiftIsoDate("2026-09-22")} ~ ${shiftIsoDate("2026-09-23").slice(5)} 구간 센서 데이터 중 62%가 비어 있어 window를 만들 수 없습니다. 기간을 바꾸거나 수집 상태를 확인한 뒤 다시 시도하세요.`,
  "inf-2005": () =>
    "추론 실패 — 저장된 모델이 없습니다: device=ESW. 재학습 설정에서 ESW · IF 학습을 먼저 예약하세요.",
};

// 재시도로 만든 Job의 초기 진행률(%)
const RETRY_START_PERCENT = 3;
// 새 Job 번호의 시작값 지정, 초기 Job 6건 다음 번호가 inf-2043이 되도록 설정
const JOB_NUMBER_BASE = 2037;

// "YYYY-MM-DDTHH:mm:ss"를 오늘 기준 시각으로 변환
function shiftIsoDateTime(isoDateTime: string): string {
  return `${shiftIsoDate(formatIsoDate(isoDateTime))}${isoDateTime.slice(10)}`;
}

// 메모리의 추론 Job 목록, 실행 함수가 바꾸고 조회 함수가 읽음
let jobStore: InferenceJob[] | null = null;

// 실행과 재시도로 만든 Job의 Request 조건, 초기 Job은 Mock 상세 값 사용
interface RequestedRange {
  period: { from: string; to: string };
  startTime: string;
  endTime: string;
}
const requestStore = new Map<InferenceJobId, RequestedRange>();

function readJobs(): InferenceJob[] {
  jobStore ??= INFERENCE_JOB_SEEDS.map((job) => ({ ...job, createdAt: shiftIsoDateTime(job.createdAt) }));
  return jobStore;
}

// 추론 결과 목록, 처음 읽을 때 날짜를 오늘 기준으로 옮겨 보관
let resultStore: InferenceResult[] | null = null;

function readResults(): InferenceResult[] {
  resultStore ??= INFERENCE_RESULT_SEEDS.map(
    ([inferredAt, modelCode, deviceCode, segment, windowCount, anomalyWindowCount, threshold, jobId], index) => ({
      id: String(index + 1),
      jobId,
      inferredAt: shiftIsoDateTime(inferredAt),
      modelCode,
      deviceCode,
      segment,
      windowCount,
      anomalyWindowCount,
      anomalyRateLevel: classifyAnomalyWindows(
        anomalyWindowCount,
        windowCount,
        ANOMALY_LEVEL_THRESHOLDS,
      ),
      threshold,
    }),
  );
  return resultStore;
}

export function buildInferenceFilterOptions(): InferenceFilterOptions {
  return {
    defaultPeriod: { from: shiftIsoDate(DEFAULT_PERIOD.from), to: shiftIsoDate(DEFAULT_PERIOD.to) },
    selectablePeriod: { from: null, to: null },
    levelThresholds: { ...ANOMALY_LEVEL_THRESHOLDS },
  };
}

export function buildInferenceJobs(): InferenceJobList {
  return { jobs: readJobs().map((job) => ({ ...job })), recentDays: RECENT_DAYS };
}

// 조건에 맞는 추론 결과를 받은 순서대로 반환, Page 번호와 상관없이 맞는 Row 전부
function findInferenceResults(query: InferenceResultExportQuery): InferenceResult[] {
  const { from, to } = query.period;
  return readResults().filter((result) => {
    const inferredOn = formatIsoDate(result.inferredAt);
    return (
      (query.modelCode === null || result.modelCode === query.modelCode) &&
      (query.deviceCode === null || result.deviceCode === query.deviceCode) &&
      (from === null || inferredOn >= from) &&
      (to === null || inferredOn <= to)
    );
  });
}

// 추론 결과 한 Page 반환, Mock은 Page 번호와 상관없이 조건에 맞는 Row 전부를 싣고 전체 수와 Page 수는 고정 값
export function buildInferenceResults(query: InferenceResultQuery): InferenceResultPage {
  return { rows: findInferenceResults(query), totalCount: RESULT_TOTAL_COUNT, pageCount: RESULT_PAGE_COUNT };
}

// Model 코드와 장치 코드의 이름 반환, 이름이 없는 코드는 코드 그대로
function modelName(modelCode: string): string {
  return ANALYSIS_MODELS.find((model) => model.code === modelCode)?.name ?? modelCode;
}

function deviceName(deviceCode: string): string {
  return DEVICES.find((device) => device.code === deviceCode)?.name ?? deviceCode;
}

// 추론 결과 1건을 Table에 표시되는 형태의 Cell로 변환
function toResultCsvCells(result: InferenceResult): string[] {
  const { anomalyWindowCount, windowCount } = result;
  return [
    `${formatIsoDate(result.inferredAt)} ${formatIsoHourMinute(result.inferredAt)}`,
    modelName(result.modelCode),
    deviceName(result.deviceCode),
    result.segment,
    `${anomalyWindowCount} / ${windowCount}`,
    windowCount === 0
      ? CSV_NO_RATE
      : `${((anomalyWindowCount / windowCount) * 100).toFixed(CSV_RATE_DIGITS)}%`,
    result.threshold.toFixed(CSV_THRESHOLD_DIGITS),
  ];
}

// 조건에 맞는 추론 결과 전부를 Table에 표시되는 형태의 CSV 파일로 반환
export function buildInferenceResultsCsv(query: InferenceResultExportQuery): Blob {
  return buildCsvFile(RESULT_CSV_HEADER, findInferenceResults(query).map(toResultCsvCells));
}

export function buildInferenceRunOptions(): InferenceRunOptions {
  return {
    defaultPeriod: { from: shiftIsoDate(RUN_DEFAULT_PERIOD.from), to: shiftIsoDate(RUN_DEFAULT_PERIOD.to) },
    selectablePeriod: { from: null, to: null },
    defaultStartTime: RUN_DEFAULT_START_TIME,
    defaultEndTime: RUN_DEFAULT_END_TIME,
    modelCodes: [...RUN_MODEL_CODES],
    defaultModelCode: null,
    formations: Array.from({ length: RUN_FORMATION_COUNT }, (_, index) =>
      String(RUN_FIRST_FORMATION + index),
    ),
    defaultFormation: null,
    defaultDeviceCodes: [],
    unavailableDeviceCodes: [...RUN_UNAVAILABLE_DEVICE_CODES],
  };
}

// 취소로 삭제한 Job 수, 삭제한 Job의 번호를 새 Job에 다시 쓰지 않으려고 집계함
let canceledJobCount = 0;

// 다음 Job 번호 반환, 현재 Job 수와 취소로 삭제한 Job 수에서 계산
function nextJobId(): InferenceJobId {
  return `inf-${JOB_NUMBER_BASE + readJobs().length + canceledJobCount}`;
}

// 선택한 장치마다 요청됨 Job을 목록 맨 앞에 장치 순서대로 추가하고 만든 번호 반환, 두 번째 장치부터 번호 뒤에 -1, -2를 붙임
export function runInferenceInStore(input: InferenceRunInput): InferenceJobId[] {
  const firstId = nextJobId();
  const createdAt = formatLocalIsoDateTime(new Date());
  const created: InferenceJob[] = input.deviceCodes.map((deviceCode, index) => ({
    id: index === 0 ? firstId : `${firstId}-${index}`,
    deviceCode,
    modelCode: input.modelCode,
    formation: input.formation,
    createdAt,
    isRetry: false,
    status: "queued",
  }));
  jobStore = [...created, ...readJobs()];
  const requested: RequestedRange = {
    period: { from: input.period.from, to: input.period.to },
    startTime: input.startTime ?? FULL_DAY_START_TIME,
    endTime: input.endTime ?? FULL_DAY_END_TIME,
  };
  created.forEach((job) => requestStore.set(job.id, requested));
  return created.map((job) => job.id);
}

// 실패한 Job과 같은 장치, Model, 편성, Request 조건의 추론 중 Job을 맨 앞에 추가하고 새 번호 반환, 실패한 Job은 그대로 유지
export function retryInferenceJobInStore(jobId: InferenceJobId): InferenceJobId {
  const failed = readJobs().find((job) => job.id === jobId);
  if (failed === undefined || failed.status !== "failed") {
    throw new Error(`재시도할 수 있는 실패 작업이 아닙니다: ${jobId}`);
  }
  const retried: InferenceJob = {
    id: nextJobId(),
    deviceCode: failed.deviceCode,
    modelCode: failed.modelCode,
    formation: failed.formation,
    createdAt: formatLocalIsoDateTime(new Date()),
    isRetry: true,
    status: "running",
    progressPercent: RETRY_START_PERCENT,
    segmentProgress: null,
  };
  jobStore = [retried, ...readJobs()];
  requestStore.set(retried.id, requestedRangeOf(failed.id));
  return retried.id;
}

// 완료 전(요청됨, 추론 중) Job을 목록과 Request 조건에서 삭제, 취소 기록은 남기지 않고 없거나 완료된 Job이면 오류 발생. Test가 지연하거나 실패시킬 수 있음
export function cancelInferenceJobInStore(jobId: InferenceJobId): Promise<void> {
  return runActionLater("cancelInferenceJob", jobId, () => {
    const jobs = readJobs();
    const target = jobs.find((job) => job.id === jobId);
    if (target === undefined || !isActiveInferenceJobStatus(target.status)) {
      throw new Error(`취소할 수 없는 추론 작업: ${jobId}`);
    }
    jobStore = jobs.filter((job) => job.id !== jobId);
    requestStore.delete(jobId);
    canceledJobCount += 1;
  });
}

// Job의 Request 조건 반환, 실행으로 만든 Job이 아니면 Mock 상세 값
function requestedRangeOf(jobId: InferenceJobId): RequestedRange {
  return (
    requestStore.get(jobId) ?? {
      period: { from: shiftIsoDate(DETAIL_PERIOD.from), to: shiftIsoDate(DETAIL_PERIOD.to) },
      startTime: DETAIL_START_TIME,
      endTime: DETAIL_END_TIME,
    }
  );
}

// "YYYY-MM-DDTHH:mm:ss"에 분을 더한 시각 반환
function addMinutes(isoDateTime: string, minutes: number): string {
  const [date, time] = isoDateTime.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second] = time.split(":").map(Number);
  return formatLocalIsoDateTime(new Date(year, month - 1, day, hour, minute + minutes, second));
}

// Job과 결과 Row의 상세에 공통으로 들어가는 Request 조건 계산
function requestedDetail(
  id: InferenceJobId,
  deviceCode: string,
  modelCode: string,
  formation: string | null,
  createdAt: string,
) {
  const requested = requestedRangeOf(id);
  return {
    id,
    deviceCode,
    modelCode,
    formation,
    createdAt,
    requestedPeriod: { ...requested.period },
    requestedStartTime: requested.startTime,
    requestedEndTime: requested.endTime,
    windowSeconds: DETAIL_WINDOW_SECONDS,
    segments: [...DETAIL_SEGMENTS],
    trainedModel: {
      stage: "production" as const,
      version: `${shiftIsoDate(DETAIL_MODEL_VERSION_DATE).replaceAll("-", "")}${DETAIL_MODEL_VERSION_TIME}`,
    },
  };
}

// 편성 × 호차별 이상 window 수 반환
function buildCarHeatmap(): InferenceCarHeatmap {
  const formations = Array.from({ length: HEATMAP_FORMATION_COUNT }, (_, index) =>
    String(HEATMAP_FIRST_FORMATION + index),
  );
  const cars = Array.from({ length: HEATMAP_CAR_COUNT }, (_, index) => index);
  return {
    formations,
    cars,
    counts: formations.map((formation) => {
      const hotCars = HEATMAP_HOT_CARS[formation] ?? HEATMAP_DEFAULT_HOT_CARS;
      return cars.map((car) => (hotCars.includes(car) ? 1 : 0));
    }),
  };
}

// 아직 시작하지 않은 Job의 빈 편성 × 호차 정의
const EMPTY_HEATMAP: InferenceCarHeatmap = { formations: [], cars: [], counts: [] };

// 실패가 아닌 Job의 현재까지 결과 계산, default Segment 결과에서 두 번째 Segment와 Alarm 수를 정함
function resultState(
  status: "queued" | "running" | "succeeded",
  createdAt: string,
  base: { windowCount: number; anomalyWindowCount: number; threshold: number },
) {
  if (status === "queued") {
    return {
      status,
      endedAt: null,
      autoAlarmCount: 0,
      segmentResults: [],
      anomalyWindows: [],
      carHeatmap: EMPTY_HEATMAP,
    };
  }
  const secondAnomalyCount = Math.round(base.anomalyWindowCount * SECOND_SEGMENT.anomalyRatio);
  const segmentResults = [
    { segment: DETAIL_SEGMENTS[0], ...base },
    {
      segment: SECOND_SEGMENT.segment,
      windowCount: SECOND_SEGMENT.windowCount,
      anomalyWindowCount: secondAnomalyCount,
      threshold: SECOND_SEGMENT.threshold,
    },
  ].map((result) => ({
    ...result,
    anomalyRateLevel: classifyAnomalyWindows(
      result.anomalyWindowCount,
      result.windowCount,
      ANOMALY_LEVEL_THRESHOLDS,
    ),
  }));
  const anomalyWindows: InferenceAnomalyWindow[] = ANOMALY_WINDOW_SEEDS.map(
    ([startAt, endAt, segment, formation, car, score]) => ({
      startAt: shiftIsoDateTime(startAt),
      endAt: shiftIsoDateTime(endAt),
      segment,
      formation,
      car,
      score,
    }),
  );
  return {
    status,
    endedAt: status === "succeeded" ? addMinutes(createdAt, SUCCEEDED_DURATION_MINUTES) : null,
    autoAlarmCount:
      base.anomalyWindowCount > 0
        ? Math.max(1, Math.round(base.anomalyWindowCount / WINDOWS_PER_ALARM))
        : 0,
    segmentResults,
    anomalyWindows,
    carHeatmap: buildCarHeatmap(),
  };
}

// Job Card의 Job 상세 반환
function jobDetail(job: InferenceJob): InferenceJobDetail {
  const requested = requestedDetail(job.id, job.deviceCode, job.modelCode, job.formation, job.createdAt);
  switch (job.status) {
    case "failed":
      return {
        ...requested,
        status: job.status,
        endedAt: addMinutes(job.createdAt, FAILED_DURATION_MINUTES),
        failureMessage: SEED_FAILURE_MESSAGES[job.id]?.() ?? `추론 실패 — ${job.failureReason}`,
      };
    case "queued":
    case "running":
    case "succeeded":
      return { ...requested, ...resultState(job.status, job.createdAt, CARD_DEFAULT_SEGMENT) };
  }
}

// 결과 Row를 만든 Job의 상세 반환, 해당 Row의 장치, Model, default Segment 결과로 채움
function resultJobDetail(result: InferenceResult): InferenceJobDetail {
  return {
    ...requestedDetail(
      result.jobId,
      result.deviceCode,
      result.modelCode,
      RESULT_JOB_FORMATION,
      result.inferredAt,
    ),
    ...resultState("succeeded", result.inferredAt, {
      windowCount: result.windowCount,
      anomalyWindowCount: result.anomalyWindowCount,
      threshold: result.threshold,
    }),
  };
}

// 추론 Job 1건의 상세 반환, Job Card의 Job이나 결과 Row를 만든 Job, 없으면 오류 발생
export function buildInferenceJobDetail(jobId: InferenceJobId): InferenceJobDetail {
  const job = readJobs().find((item) => item.id === jobId);
  if (job !== undefined) return jobDetail(job);
  const result = readResults().find((item) => item.jobId === jobId);
  if (result !== undefined) return resultJobDetail(result);
  throw new Error(`추론 작업이 없습니다: ${jobId}`);
}

// 화면 진입 시 호출하는 조회 중 첫 진입에서 지연 시간을 적용할 조회 이름, 처음 값 조회가 호출하면 각 조회에 한 번씩 적용
const ENTRY_QUERY_NAMES = ["inferenceJobs", "inferenceResults"] as const;

// 처음 값 조회 응답, 화면 진입으로 표시하고 즉시 응답
export function respondInferenceFilterOptions(signal?: AbortSignal): Promise<InferenceFilterOptions> {
  markScreenEntry(ENTRY_QUERY_NAMES);
  return respondNow(signal, buildInferenceFilterOptions);
}

// Job 목록 응답, 첫 진입과 검색 시 지연 시간 적용
export function respondInferenceJobs(signal?: AbortSignal): Promise<InferenceJobList> {
  return respondLater("inferenceJobs", signal, buildInferenceJobs);
}

// 결과 한 Page 응답, 첫 진입과 검색 시 지연 시간 적용
export function respondInferenceResults(
  query: InferenceResultQuery,
  signal?: AbortSignal,
): Promise<InferenceResultPage> {
  return respondLater("inferenceResults", signal, () => buildInferenceResults(query));
}

// 추론 실행 Modal의 선택지 응답, 즉시 응답
export function respondInferenceRunOptions(signal?: AbortSignal): Promise<InferenceRunOptions> {
  return respondNow(signal, buildInferenceRunOptions);
}

// 추론 상세 응답, 즉시 응답
export function respondInferenceJobDetail(
  jobId: InferenceJobId,
  signal?: AbortSignal,
): Promise<InferenceJobDetail> {
  return respondNow(signal, () => buildInferenceJobDetail(jobId));
}
