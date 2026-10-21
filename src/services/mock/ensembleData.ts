import { classifyAnomalyRate } from "@/domain/anomaly";
import {
  classifySegmentAgreement,
  type EnsembleAnomalySegment,
  type EnsembleConsensusRule,
  type EnsembleJob,
  type EnsembleJobDetail,
  type EnsembleJobId,
  type EnsembleRunInput,
  type EnsembleRunOptions,
  type EnsembleVerdict,
  type EnsembleWindowRange,
} from "@/domain/ensemble";
import { isActiveInferenceJobStatus } from "@/domain/inference";
import { formatIsoDate, formatLocalIsoDateTime } from "@/lib/formatTime";
import { ANOMALY_LEVEL_THRESHOLDS } from "@/services/mock/anomalyRules";
import { buildCsvFile } from "@/services/mock/csvFile";
import { shiftIsoDate } from "@/services/mock/dates";
import {
  markScreenEntry,
  respondInstantly,
  respondLater,
  respondNow,
  runActionLater,
} from "@/services/mock/latency";

// Ensemble이 함께 실행하는 Model, Card 제목 순서와 판정 Table 순서
const ENSEMBLE_MODEL_CODES: readonly string[] = ["SVM", "IF", "VAE"];
const VERDICT_MODEL_CODES: readonly string[] = ["IF", "SVM", "VAE"];
// Model별 임계값, 판정 Table에 표시하는 값
const MODEL_THRESHOLDS: Readonly<Record<string, number>> = { IF: 0.52, SVM: -1.25, VAE: 0.043 };
// Ensemble 실행이 넘기는 Model 코드
const ENSEMBLE_RUN_MODEL_CODE = "ENS";
// 전체 window 수, Segment, window 길이(초)
const WINDOW_COUNT = 180;
const SEGMENT = "default";
const WINDOW_SECONDS = 60;
// Alarm 등록 시 채울 Model과 심각도의 기본값
const ALARM_DEFAULTS = { modelCode: "VAE", severity: "HIGH" } as const;

// 성공 Job의 판정 기초 데이터, [IF, SVM, VAE] 순서의 이상 window 수, ANY와 ALL 수, 따로 정한 ANY와 ALL 비율(없으면 수로 계산)
interface VerdictSeed {
  modelCounts: readonly [number, number, number];
  anyCount: number;
  allCount: number;
  anyPercent?: number;
  allPercent?: number;
}

type JobSeed = EnsembleJob & { verdict?: VerdictSeed; failureMessage?: string };

// Ensemble Job의 기초 데이터, 날짜는 Mock 기준일 기준, 표시 순서대로 정렬한 Job 5건
const ENSEMBLE_JOB_SEEDS: readonly JobSeed[] = [
  { id: "ens-2005", deviceCode: "PISC", modelCodes: ENSEMBLE_MODEL_CODES, formation: "415", createdAt: "2026-09-23T18:36:00", requestedPeriod: { from: "2026-09-22", to: "2026-09-23" }, isRetry: false, status: "succeeded", endedAt: "2026-09-23T18:40:00", verdict: { modelCounts: [30, 34, 38], anyCount: 38, allCount: 29, anyPercent: 21, allPercent: 16 } },
  { id: "ens-2004", deviceCode: "TCMS", modelCodes: ENSEMBLE_MODEL_CODES, formation: "412", createdAt: "2026-09-23T17:31:00", requestedPeriod: { from: "2026-09-22", to: "2026-09-23" }, isRetry: false, status: "failed", endedAt: "2026-09-23T17:31:00", failureReason: "저장된 모델이 없습니다: device=TCMS", failureMessage: "앙상블 추론 실패 — 저장된 모델이 없습니다: device=TCMS. 세 모델(SVM · IF · VAE) 학습본이 모두 있어야 실행됩니다. 재학습 설정에서 TCMS 학습을 먼저 예약하세요." },
  { id: "ens-2003", deviceCode: "MICOM_COOLER", modelCodes: ENSEMBLE_MODEL_CODES, formation: "409", createdAt: "2026-09-22T16:20:00", requestedPeriod: { from: "2026-09-21", to: "2026-09-22" }, isRetry: false, status: "succeeded", endedAt: "2026-09-22T16:24:00", verdict: { modelCounts: [22, 26, 31], anyCount: 33, allCount: 18 } },
  { id: "ens-2002", deviceCode: "DCU", modelCodes: ENSEMBLE_MODEL_CODES, formation: "405", createdAt: "2026-09-22T11:02:00", requestedPeriod: { from: "2026-09-21", to: "2026-09-22" }, isRetry: false, status: "failed", endedAt: "2026-09-22T11:02:00", failureReason: "입력 데이터가 비어 있습니다: device=DCU · 요청 기간 2026-09-21 ~ 2026-09-22 수집 0건", failureMessage: "앙상블 추론 실패 — 입력 데이터가 비어 있습니다: device=DCU. 요청 기간(2026-09-21 ~ 2026-09-22)에 DCU 수집 값이 없습니다. 기간을 바꿔 다시 실행하세요." },
  { id: "ens-2001", deviceCode: "SIV", modelCodes: ENSEMBLE_MODEL_CODES, formation: "407", createdAt: "2026-09-21T09:40:00", requestedPeriod: { from: "2026-09-20", to: "2026-09-21" }, isRetry: false, status: "succeeded", endedAt: "2026-09-21T09:43:00", verdict: { modelCounts: [0, 2, 3], anyCount: 4, allCount: 0 } },
];

// 판정 Row별 이상 구간 [시작, 끝](양 끝 포함), 모든 성공 Job이 같이 쓰는 값
const ANOMALY_RANGE_SEEDS: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  IF: [[20, 28], [61, 68], [110, 116], [150, 155]],
  SVM: [[20, 30], [61, 70], [110, 116], [150, 155]],
  VAE: [[20, 30], [61, 71], [110, 119], [150, 155]],
  any: [[20, 30], [61, 71], [110, 119], [150, 155]],
  all: [[20, 27], [61, 68], [110, 116], [150, 155]],
};
// 이상 구간 [시작, 끝, Model별로 잡은 수(표시 순서)], 7개 Row
const SEGMENT_SEEDS: readonly (readonly [number, number, readonly (readonly [string, number])[]])[] = [
  [20, 27, [["IF", 8], ["SVM", 8], ["VAE", 8]]],
  [28, 30, [["VAE", 3], ["SVM", 3], ["IF", 1]]],
  [61, 68, [["IF", 8], ["SVM", 8], ["VAE", 8]]],
  [69, 71, [["VAE", 3], ["SVM", 2]]],
  [110, 116, [["IF", 7], ["SVM", 7], ["VAE", 7]]],
  [117, 119, [["VAE", 3]]],
  [150, 155, [["IF", 6], ["SVM", 6], ["VAE", 6]]],
];

// 실행 Modal을 열 때의 기본값과 선택지(기준일 기준)
const RUN_DEFAULT_PERIOD = { from: "2026-09-22", to: "2026-09-23" } as const;
const RUN_FIRST_FORMATION = 401;
const RUN_FORMATION_COUNT = 26;
const RUN_UNAVAILABLE_DEVICE_CODES: readonly string[] = ["FRU", "IDBC"];
// 새 Job 번호의 시작값 지정, 초기 Job 5건 다음 번호가 ens-2006이 되도록 설정
const JOB_NUMBER_BASE = 2001;
// CSV 헤더 문자열과 비율, 임계값 자릿수, 판정 Table과 같음
const CSV_HEADER: readonly string[] = ["판정", "이상 window", "전체 window", "이상 비율", "임계값"];
const CSV_RATE_DIGITS = 1;
const CSV_THRESHOLD_DIGITS = 4;
const CSV_NO_THRESHOLD = "-";

// "YYYY-MM-DDTHH:mm:ss"를 오늘 기준 시각으로 변환
function shiftIsoDateTime(isoDateTime: string): string {
  return `${shiftIsoDate(formatIsoDate(isoDateTime))}${isoDateTime.slice(10)}`;
}

// 메모리의 Job 목록, 실행 함수가 바꾸고 조회 함수가 읽음
let jobStore: JobSeed[] | null = null;
// 취소로 삭제한 Job 수, 삭제한 번호를 새 Job에 다시 쓰지 않으려고 집계함
let canceledJobCount = 0;

// Test가 window에 미리 넣는 Test hook 정의, emptyJobs가 true면 Job 목록을 빈 채로 시작
interface MockEnsembleHost {
  cbmMockEnsemble?: { emptyJobs?: boolean };
}

function readJobs(): JobSeed[] {
  if ((globalThis as MockEnsembleHost).cbmMockEnsemble?.emptyJobs === true) jobStore ??= [];
  jobStore ??= ENSEMBLE_JOB_SEEDS.map((job) => {
    const shifted = {
      ...job,
      createdAt: shiftIsoDateTime(job.createdAt),
      requestedPeriod: {
        from: shiftIsoDate(job.requestedPeriod.from),
        to: shiftIsoDate(job.requestedPeriod.to),
      },
    };
    return "endedAt" in shifted ? { ...shifted, endedAt: shiftIsoDateTime(shifted.endedAt) } : shifted;
  });
  return jobStore;
}

// Job 기초 데이터에서 목록에 표시할 값만 반환
function toJob(seed: JobSeed): EnsembleJob {
  const { verdict: _verdict, failureMessage: _failureMessage, ...job } = seed;
  void _verdict;
  void _failureMessage;
  return job;
}

// 구간 기초 데이터를 구간 값으로 변환, 이상 수가 0이면 빈 목록
function toRanges(key: string, count: number): EnsembleWindowRange[] {
  if (count === 0) return [];
  return ANOMALY_RANGE_SEEDS[key].map(([startWindow, endWindow]) => ({ startWindow, endWindow }));
}

// 이상 window 수로 비율(%)과 등급 계산, 비율을 따로 정했으면 그 값 사용
function rateOf(count: number, percent?: number) {
  const anomalyRatePercent = percent ?? (count / WINDOW_COUNT) * 100;
  return {
    anomalyRatePercent,
    anomalyRateLevel: classifyAnomalyRate(anomalyRatePercent, ANOMALY_LEVEL_THRESHOLDS),
  };
}

// 판정 기초 데이터에서 Model, 다수결, 이상 구간 판정 생성
function buildVerdict(seed: VerdictSeed): EnsembleVerdict {
  const models = VERDICT_MODEL_CODES.map((modelCode, index) => {
    const count = seed.modelCounts[index];
    return {
      modelCode,
      threshold: MODEL_THRESHOLDS[modelCode],
      anomalyWindowCount: count,
      ...rateOf(count),
      anomalyRanges: toRanges(modelCode, count),
    };
  });
  const consensusSeeds: readonly (readonly [EnsembleConsensusRule, number, number | undefined])[] = [
    ["any", seed.anyCount, seed.anyPercent],
    ["all", seed.allCount, seed.allPercent],
  ];
  const consensus = consensusSeeds.map(([rule, count, percent]) => ({
    rule,
    anomalyWindowCount: count,
    ...rateOf(count, percent),
    anomalyRanges: toRanges(rule, count),
  }));
  const segments: EnsembleAnomalySegment[] = SEGMENT_SEEDS.map(([startWindow, endWindow, hits]) => {
    const range = { startWindow, endWindow };
    const modelHits = hits.map(([modelCode, anomalyWindowCount]) => ({ modelCode, anomalyWindowCount }));
    return {
      range,
      agreement: classifySegmentAgreement(range, modelHits, VERDICT_MODEL_CODES.length),
      modelHits,
    };
  });
  return { windowCount: WINDOW_COUNT, models, consensus, segments };
}

// Job 1건의 상세 생성, 없는 Job이면 오류 발생
export function buildEnsembleJobDetail(jobId: EnsembleJobId): EnsembleJobDetail {
  const seed = readJobs().find((job) => job.id === jobId);
  if (seed === undefined) throw new Error(`앙상블 작업이 없습니다: ${jobId}`);
  const base = {
    id: seed.id,
    deviceCode: seed.deviceCode,
    modelCodes: seed.modelCodes,
    formation: seed.formation,
    createdAt: seed.createdAt,
    requestedPeriod: seed.requestedPeriod,
    segment: SEGMENT,
    windowSeconds: WINDOW_SECONDS,
  };
  switch (seed.status) {
    case "queued":
    case "running":
      return { ...base, status: seed.status };
    case "succeeded":
      return {
        ...base,
        status: "succeeded",
        endedAt: seed.endedAt,
        verdict: buildVerdict(seed.verdict ?? { modelCounts: [0, 0, 0], anyCount: 0, allCount: 0 }),
        alarmDefaults: { ...ALARM_DEFAULTS },
      };
    case "failed":
      return {
        ...base,
        status: "failed",
        endedAt: seed.endedAt,
        failureMessage: seed.failureMessage ?? seed.failureReason,
      };
  }
}

export function buildEnsembleRunOptions(): EnsembleRunOptions {
  return {
    defaultPeriod: { from: shiftIsoDate(RUN_DEFAULT_PERIOD.from), to: shiftIsoDate(RUN_DEFAULT_PERIOD.to) },
    selectablePeriod: { from: null, to: null },
    defaultStartTime: "00:00:00",
    defaultEndTime: "23:59:59",
    modelCodes: [ENSEMBLE_RUN_MODEL_CODE],
    defaultModelCode: ENSEMBLE_RUN_MODEL_CODE,
    formations: Array.from({ length: RUN_FORMATION_COUNT }, (_, index) => String(RUN_FIRST_FORMATION + index)),
    defaultFormation: null,
    defaultDeviceCodes: [],
    unavailableDeviceCodes: [...RUN_UNAVAILABLE_DEVICE_CODES],
    ensembleModelCodes: [...ENSEMBLE_MODEL_CODES],
  };
}

// 다음 Job 번호 반환, 현재 Job 수와 취소로 삭제한 Job 수에서 계산
function nextJobId(): EnsembleJobId {
  return `ens-${JOB_NUMBER_BASE + readJobs().length + canceledJobCount}`;
}

// 선택한 장치마다 요청됨 Job을 맨 앞에 추가하고 만든 번호 반환, 두 번째 장치부터 번호 뒤에 -1, -2를 붙임. Test가 지연하거나 실패시킬 수 있음
export function runEnsembleInStore(input: EnsembleRunInput): Promise<EnsembleJobId[]> {
  return runActionLater("runEnsemble", input.deviceCodes.join(","), () => {
    const firstId = nextJobId();
    const createdAt = formatLocalIsoDateTime(new Date());
    const created: JobSeed[] = input.deviceCodes.map((deviceCode, index) => ({
      id: index === 0 ? firstId : `${firstId}-${index}`,
      deviceCode,
      modelCodes: ENSEMBLE_MODEL_CODES,
      formation: input.formation,
      createdAt,
      requestedPeriod: { from: input.period.from, to: input.period.to },
      isRetry: false,
      status: "queued",
    }));
    jobStore = [...created, ...readJobs()];
    return created.map((job) => job.id);
  });
}

// 실패한 Job과 같은 조건의 추론 중 Job을 맨 앞에 추가하고 새 번호 반환, 실패한 Job은 유지. Test가 지연하거나 실패시킬 수 있음
export function retryEnsembleJobInStore(jobId: EnsembleJobId): Promise<EnsembleJobId> {
  return runActionLater("retryEnsembleJob", jobId, () => {
    const failed = readJobs().find((job) => job.id === jobId);
    if (failed === undefined || failed.status !== "failed") {
      throw new Error(`재시도할 수 있는 실패 작업이 아닙니다: ${jobId}`);
    }
    const retried: JobSeed = {
      id: nextJobId(),
      deviceCode: failed.deviceCode,
      modelCodes: failed.modelCodes,
      formation: failed.formation,
      createdAt: formatLocalIsoDateTime(new Date()),
      requestedPeriod: failed.requestedPeriod,
      isRetry: true,
      status: "running",
    };
    jobStore = [retried, ...readJobs()];
    return retried.id;
  });
}

// 완료 전 Job을 목록에서 삭제, 기록은 남기지 않고 없거나 완료된 Job이면 오류 발생. Test가 지연하거나 실패시킬 수 있음
export function cancelEnsembleJobInStore(jobId: EnsembleJobId): Promise<void> {
  return runActionLater("cancelEnsembleJob", jobId, () => {
    const jobs = readJobs();
    const target = jobs.find((job) => job.id === jobId);
    if (target === undefined || !isActiveInferenceJobStatus(target.status)) {
      throw new Error(`취소할 수 없는 앙상블 작업: ${jobId}`);
    }
    jobStore = jobs.filter((job) => job.id !== jobId);
    canceledJobCount += 1;
  });
}

// 성공한 Job의 Model과 다수결 판정을 CSV 파일 내용으로 반환, 성공이 아니면 오류 발생. Test가 지연하거나 실패시킬 수 있음
export function buildEnsembleVerdictCsv(jobId: EnsembleJobId): Promise<Blob> {
  return runActionLater("exportEnsembleJobCsv", jobId, () => {
    const detail = buildEnsembleJobDetail(jobId);
    if (detail.status !== "succeeded") throw new Error(`판정이 없는 앙상블 작업: ${jobId}`);
    const { windowCount, models, consensus } = detail.verdict;
    const rate = (percent: number) => `${percent.toFixed(CSV_RATE_DIGITS)}%`;
    const rows = [
      ...models.map((model) => [model.modelCode, String(model.anomalyWindowCount), String(windowCount), rate(model.anomalyRatePercent), model.threshold.toFixed(CSV_THRESHOLD_DIGITS)]),
      ...consensus.map((item) => [item.rule.toUpperCase(), String(item.anomalyWindowCount), String(windowCount), rate(item.anomalyRatePercent), CSV_NO_THRESHOLD]),
    ];
    return buildCsvFile(CSV_HEADER, rows);
  });
}

// 화면 진입 시 호출하는 조회 중 첫 진입에서 지연 시간을 적용할 조회 이름
const ENTRY_QUERY_NAMES = ["ensembleJobs"] as const;

// 실행 Modal 선택지 응답, 화면 진입으로 표시하고 즉시 응답
export function respondEnsembleRunOptions(signal?: AbortSignal): Promise<EnsembleRunOptions> {
  markScreenEntry(ENTRY_QUERY_NAMES);
  return respondNow(signal, buildEnsembleRunOptions);
}

// Job 목록 응답, 첫 진입과 재조회 시 지연 시간 적용
export function respondEnsembleJobs(signal?: AbortSignal): Promise<readonly EnsembleJob[]> {
  return respondLater("ensembleJobs", signal, () => readJobs().map(toJob));
}

// 상세 응답, 즉시 응답하며 Test가 지연하거나 실패시킬 수 있음
export function respondEnsembleJobDetail(
  jobId: EnsembleJobId,
  signal?: AbortSignal,
): Promise<EnsembleJobDetail> {
  return respondInstantly("ensembleJobDetail", signal, () => buildEnsembleJobDetail(jobId));
}
