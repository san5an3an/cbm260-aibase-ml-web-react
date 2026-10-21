import type {
  DiagnosticVisualizationKind,
  LearningCurvePoint,
  ModelDiagnostics,
  ModelDiagnosticsOptions,
  ModelDiagnosticsQuery,
  ModelVersion,
  ModelVersionQuery,
  RootCauseReport,
  ScoreDistributionBin,
} from "@/domain/diagnostics";
import { shiftIsoDate } from "@/services/mock/dates";
import { markScreenEntry, respondLater, respondNow } from "@/services/mock/latency";

// 화면 진입 시 한 번 호출하며 지연 시간을 적용하는 조회 이름
const ENTRY_QUERY_NAMES = ["modelVersions", "modelDiagnostics"] as const;

const OPTIONS: ModelDiagnosticsOptions = { defaultDeviceCode: "DRIVING_GEAR", defaultModelCode: "VAE" };

// 학습 반복 수, 점수 분포의 구간 수, 가로축 끝, 임계값, 분포에 속한 window 수
const EPOCH_COUNT = 40;
const BIN_COUNT = 56;
const RANGE_END = 0.06;
const THRESHOLD = 0.0433;
const TOTAL_WINDOWS = 8640;

// Model별 진단 시각화 종류, 근본원인 리포트는 VAE 학습 버전에서만 생성
const VISUALIZATION_BY_MODEL: Record<string, DiagnosticVisualizationKind> = {
  VAE: "latentReconstruction",
  IF: "treeDepth",
  SVM: "decisionBoundary",
  PCA: "reconstruction",
};
const ROOT_CAUSE_MODEL = "VAE";

// 기준일의 날짜와 시각으로 버전 이름 "YYYYMMDDTHHmmss" 생성
const versionName = (isoDate: string, time: string) => `${shiftIsoDate(isoDate).replace(/-/g, "")}T${time}`;

// 기준일의 날짜와 시각으로 오늘 기준 "YYYY-MM-DDTHH:mm:ss" 생성
const shiftedDateTime = (isoDate: string, time: string) => `${shiftIsoDate(isoDate)}T${time}`;

const round3 = (value: number) => Math.round(value * 1000) / 1000;

// 반복마다 줄어드는 점수 곡선, 감소 속도와 최저값을 받음
const decay = (index: number, speed: number, floor: number) =>
  ((Math.exp(-index / speed) * (100 - floor) + floor) * 0.94) / 100;

function buildLearningCurve(): LearningCurvePoint[] {
  return Array.from({ length: EPOCH_COUNT }, (_, index) => ({
    epoch: index + 1,
    train: round3(decay(index, 7, 8.5)),
    // 후반 반복에서 검증 점수가 다시 상승
    validation: round3(decay(index, 9, 16) + (index > 28 ? ((index - 28) * 0.25) / 100 : 0)),
  }));
}

function buildBins(): ScoreDistributionBin[] {
  const width = RANGE_END / BIN_COUNT;
  const density = Array.from({ length: BIN_COUNT }, (_, index) => {
    const center = (index + 0.5) * width;
    return Math.exp(-(((center - 0.0195) / 0.0062) ** 2)) * 100 + (center > 0.0405 ? 5.5 : 0) + 0.3;
  });
  const sum = density.reduce((total, value) => total + value, 0);
  return density.map((value, index) => ({
    start: index * width,
    end: (index + 1) * width,
    windowCount: Math.round((value / sum) * TOTAL_WINDOWS),
  }));
}

function buildRootCause(): RootCauseReport {
  const windows: [string, string, string, number, number][] = [
    ["2026-09-21", "14:22:00", "베어링 진동 RMS", 0.512, 6.3],
    ["2026-09-21", "14:23:00", "모터 권선온도", 0.437, 5.1],
    ["2026-09-21", "15:04:00", "압축기 토출압력", 0.398, 4.7],
    ["2026-09-20", "09:11:00", "오일 온도", 0.361, 4.2],
    ["2026-09-20", "09:12:00", "냉각수 유량", 0.322, 3.8],
    ["2026-09-19", "18:40:00", "모터 전류 불균형", 0.301, 3.5],
    ["2026-09-19", "18:41:00", "베어링 온도", 0.288, 3.3],
    ["2026-09-18", "07:15:00", "축전지 셀전압", 0.251, 2.9],
  ];
  return {
    topWindows: windows.map(([date, time, topSensorName, reconstructionError, zScore]) => ({
      windowStartAt: shiftedDateTime(date, time),
      topSensorName,
      reconstructionError,
      zScore,
    })),
    sensorFrequency: [
      { sensorName: "베어링 진동 RMS", count: 12 },
      { sensorName: "모터 권선온도", count: 9 },
      { sensorName: "압축기 토출압력", count: 6 },
    ],
  };
}

// 모델 진단의 초기 장치와 Model 응답, 이후 버전과 진단 조회는 첫 진입으로 처리
export function respondModelDiagnosticsOptions(signal?: AbortSignal): Promise<ModelDiagnosticsOptions> {
  markScreenEntry(ENTRY_QUERY_NAMES);
  return respondNow(signal, () => OPTIONS);
}

// 장치와 Model에 상관없이 같은 버전 목록을 최신 순으로 응답
export function respondModelVersions(
  query: ModelVersionQuery,
  signal?: AbortSignal,
): Promise<readonly ModelVersion[]> {
  return respondLater("modelVersions", signal, () => [
    { version: versionName("2026-09-20", "111321"), segment: "default" },
    { version: versionName("2026-09-13", "101204"), segment: "default" },
    { version: versionName("2026-09-06", "093015"), segment: "default" },
  ]);
}

// Model에 따라 시각화 종류와 근본원인 리포트가 달라지는 진단 응답, 곡선과 분포는 항상 같음
export function respondModelDiagnostics(
  query: ModelDiagnosticsQuery,
  signal?: AbortSignal,
): Promise<ModelDiagnostics> {
  return respondLater("modelDiagnostics", signal, () => ({
    learningCurve: buildLearningCurve(),
    visualization: VISUALIZATION_BY_MODEL[query.modelCode] ?? "reconstruction",
    scoreDistribution: { rangeStart: 0, rangeEnd: RANGE_END, bins: buildBins(), threshold: THRESHOLD },
    rootCause: query.modelCode === ROOT_CAUSE_MODEL ? buildRootCause() : null,
  }));
}
