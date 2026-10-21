import type {
  ModelConfig,
  ModelConfigId,
  ModelConfigFilterOptions,
  ModelConfigInput,
  ModelConfigListQuery,
  ModelConfigOptions,
  ModelConfigPage,
  ModelConfigParam,
  ModelConfigParamRange,
  ModelConfigScope,
  ModelConfigUse,
  ModelConfigUseChange,
} from "@/domain/modelConfig";
import { formatLocalIsoDateTime } from "@/lib/formatTime";
import { shiftIsoDate } from "@/services/mock/dates";
import {
  markScreenEntry,
  respondInstantly,
  respondLater,
  respondNow,
  runActionLater,
} from "@/services/mock/latency";

// Profile 기초 데이터 [설정 이름, 설명, 장치, Model, 임계 백분위, 사용 여부, 저장 일시(기준일 기준)] 정의
const MODEL_CONFIG_SEEDS: readonly (readonly [
  string,
  string,
  string,
  string,
  number,
  ModelConfigUse,
  string,
])[] = [
  ["AXLE_BEARING IF 프로파일", "민감도 조정본", "AXLE_BEARING", "IF", 99.9, "N", "2026-09-23T15:00:00"],
  ["TRACTION_MOTOR SVM 프로파일", "기본 설정", "TRACTION_MOTOR", "SVM", 99.6, "Y", "2026-09-22T11:30:00"],
  ["ECU VAE 프로파일", "윈도우 60초", "ECU", "VAE", 99.3, "Y", "2026-09-22T15:00:00"],
  ["MICOM_AIRPURIFIER PCA 프로파일", "기본 설정", "MICOM_AIRPURIFIER", "PCA", 99.0, "N", "2026-09-20T11:30:00"],
  ["VVVF IF 프로파일", "민감도 조정본", "VVVF", "IF", 98.7, "Y", "2026-09-20T15:00:00"],
  ["TCMS SVM 프로파일", "기본 설정", "TCMS", "SVM", 99.9, "Y", "2026-09-18T11:30:00"],
  ["PISC VAE 프로파일", "윈도우 60초", "PISC", "VAE", 99.6, "N", "2026-09-18T15:00:00"],
  ["ESW PCA 프로파일", "기본 설정", "ESW", "PCA", 99.3, "Y", "2026-09-16T11:30:00"],
  ["ENCD IF 프로파일", "기본 설정", "ENCD", "IF", 99.0, "Y", "2026-09-16T15:00:00"],
  ["BMS SVM 프로파일", "민감도 조정본", "BMS", "SVM", 98.7, "N", "2026-09-14T11:30:00"],
  ["IDBC VAE 프로파일", "기본 설정", "IDBC", "VAE", 99.9, "Y", "2026-09-14T15:00:00"],
  ["DRIVING_GEAR PCA 프로파일", "기본 설정", "DRIVING_GEAR", "PCA", 99.6, "Y", "2026-09-12T11:30:00"],
];

// 기초 Profile이 공통으로 쓰는 Segment, window, 학습 방식, 센서 가중치 정의
const SEED_SEGMENT = "default";
const SEED_WINDOW_SECONDS = 60;
const SEED_TRAINING_METHOD = "reservoir";
const SEED_SENSOR_WEIGHTS: readonly ModelConfigParam[] = [
  { key: "압축기 흡입압력", value: "1.5", type: "float" },
  { key: "냉각수 유량", value: "0.8", type: "float" },
];

// Model별 Hyperparameter 기본 설정값 정의
const PRESETS: Readonly<Record<string, readonly ModelConfigParam[]>> = {
  IF: [
    { key: "n_estimators", value: "200", type: "int" },
    { key: "max_samples", value: "256", type: "int" },
    { key: "contamination", value: "auto", type: "str" },
  ],
  SVM: [
    { key: "nu", value: "0.05", type: "float" },
    { key: "kernel", value: "rbf", type: "str" },
    { key: "gamma", value: "scale", type: "str" },
  ],
  VAE: [
    { key: "epochs", value: "50", type: "int" },
    { key: "batch_size", value: "256", type: "int" },
    { key: "latent_dim", value: "8", type: "int" },
    { key: "lr", value: "0.001", type: "float" },
    { key: "beta", value: "1.0", type: "float" },
    { key: "dropout", value: "0.1", type: "float" },
  ],
  PCA: [{ key: "n_components", value: "0.95", type: "float" }],
};

// Hyperparameter 이름별 범위 정의
const PARAM_RANGES: Readonly<Record<string, ModelConfigParamRange>> = {
  epochs: { min: 1, max: 1000, integer: true },
  batch_size: { min: 1, max: 1048576, integer: true },
  latent_dim: { min: 1, max: 4096, integer: true },
  n_estimators: { min: 1, max: 100000, integer: true },
  max_samples: { min: 1, max: 1000000, integer: true },
  n_components: { min: 0, max: 100000, integer: false },
  lr: { min: 0, max: 1, integer: false },
  beta: { min: 0, max: 1000, integer: false },
  dropout: { min: 0, max: 1, integer: false },
  nu: { min: 0, max: 1, integer: false },
};

// 선택지, 임계 백분위 범위, 새 설정의 초기 값 정의
const MODEL_CODES: readonly string[] = ["IF", "SVM", "VAE", "PCA"];
const PERCENTILE_RANGE = { min: 90, max: 100 } as const;
const NEW_CONFIG_DEFAULTS = {
  deviceCode: "ATC",
  modelCode: "IF",
  segment: "default",
  thresholdPercentile: 99.5,
  windowSeconds: 60,
} as const;
// Profile 번호의 접두 문자열 정의
const CONFIG_ID_PREFIX = "cfg-";

// Parameter 목록을 외부에서 수정할 수 없도록 복사
function copyParams(params: readonly ModelConfigParam[]): ModelConfigParam[] {
  return params.map((param) => ({ ...param }));
}

// "YYYY-MM-DDTHH:mm:ss"를 오늘 기준 시각으로 변환
function shiftIsoDateTime(isoDateTime: string): string {
  return `${shiftIsoDate(isoDateTime.slice(0, 10))}${isoDateTime.slice(10)}`;
}

// 메모리의 Profile 목록 보관, 앞이 가장 최근에 만든 Profile, 실행 함수가 바꾸고 조회 함수가 읽음
let configStore: ModelConfig[] | null = null;

function readConfigs(): ModelConfig[] {
  configStore ??= MODEL_CONFIG_SEEDS.map(
    ([name, description, deviceCode, modelCode, thresholdPercentile, use, updatedAt], index) => ({
      id: `${CONFIG_ID_PREFIX}${index + 1}`,
      name,
      description,
      deviceCode,
      modelCode,
      segment: SEED_SEGMENT,
      thresholdPercentile,
      windowSeconds: SEED_WINDOW_SECONDS,
      trainingMethod: SEED_TRAINING_METHOD,
      use,
      params: copyParams(PRESETS[modelCode] ?? []),
      sensorWeights: copyParams(SEED_SENSOR_WEIGHTS),
      updatedAt: shiftIsoDateTime(updatedAt),
    }),
  );
  return configStore;
}

function copyConfig(config: ModelConfig): ModelConfig {
  return {
    ...config,
    params: copyParams(config.params),
    sensorWeights: copyParams(config.sensorWeights),
  };
}

function isSameScope(config: ModelConfigScope, scope: ModelConfigScope): boolean {
  return (
    config.deviceCode === scope.deviceCode &&
    config.modelCode === scope.modelCode &&
    config.segment === scope.segment
  );
}

export function buildModelConfigOptions(): ModelConfigOptions {
  return {
    modelCodes: [...MODEL_CODES],
    trainingMethods: ["full", "reservoir"],
    percentileRange: { ...PERCENTILE_RANGE },
    presets: Object.fromEntries(
      Object.entries(PRESETS).map(([modelCode, params]) => [modelCode, copyParams(params)]),
    ),
    paramRanges: Object.fromEntries(
      Object.entries(PARAM_RANGES).map(([key, range]) => [key, { ...range }]),
    ),
    defaults: {
      ...NEW_CONFIG_DEFAULTS,
      trainingMethod: SEED_TRAINING_METHOD,
      use: "N",
      sensorWeights: [],
      addedRowType: "float",
    },
  };
}

// 같은 장치, Model, Segment의 Profile 반환, 여럿이면 사용 Y를 먼저, 그다음 목록 앞(가장 최근에 만든 Profile)을 선택하고 없으면 null 반환
export function findModelConfigProfile(scope: ModelConfigScope): ModelConfig | null {
  const sameScope = readConfigs().filter((config) => isSameScope(config, scope));
  const found = sameScope.find((config) => config.use === "Y") ?? sameScope[0];
  return found === undefined ? null : copyConfig(found);
}

// 다음에 만들 Profile 번호 계산, 현재 번호 중 가장 큰 수의 다음 번호 사용
function nextConfigId(configs: readonly ModelConfig[]): ModelConfigId {
  const numbers = configs.map((config) => Number(config.id.slice(CONFIG_ID_PREFIX.length)));
  return `${CONFIG_ID_PREFIX}${Math.max(0, ...numbers) + 1}`;
}

// Profile 저장, 번호가 없으면 맨 앞에 새로 만들고 있으면 해당 Profile을 수정, 사용 Y로 저장하면 같은 범위의 다른 Y는 N으로 변경, 없는 번호면 오류 발생
export function saveModelConfigInStore(input: ModelConfigInput): ModelConfigId {
  const configs = readConfigs();
  if (input.id !== null && !configs.some((config) => config.id === input.id)) {
    throw new Error(`프로파일 없음: ${input.id}`);
  }
  const id = input.id ?? nextConfigId(configs);
  const saved: ModelConfig = {
    ...input,
    id,
    params: copyParams(input.params),
    sensorWeights: copyParams(input.sensorWeights),
    updatedAt: formatLocalIsoDateTime(new Date()),
  };
  const others = configs.map((config) =>
    saved.use === "Y" && config.id !== id && isSameScope(config, saved) && config.use === "Y"
      ? { ...config, use: "N" as const }
      : config,
  );
  configStore =
    input.id === null
      ? [saved, ...others]
      : others.map((config) => (config.id === id ? saved : config));
  return id;
}

// 설정 Modal의 선택지 응답, 즉시 응답하며 Test가 이름으로 지연하거나 실패시킴
export function respondModelConfigOptions(signal?: AbortSignal): Promise<ModelConfigOptions> {
  return respondInstantly("modelConfigOptions", signal, buildModelConfigOptions);
}

// 같은 범위 Profile 응답, 즉시 응답하며 Test가 이름으로 지연하거나 실패시킴
export function respondModelConfigProfile(
  scope: ModelConfigScope,
  signal?: AbortSignal,
): Promise<ModelConfig | null> {
  return respondInstantly("modelConfigProfile", signal, () => findModelConfigProfile(scope));
}

// Profile 저장 응답, 받은 Request를 기록하고 즉시 응답. Test가 이름으로 지연하거나 실패시킴. 새로 만들면 대상 번호에 new 기록
export function respondSaveModelConfig(input: ModelConfigInput): Promise<ModelConfigId> {
  return runActionLater("saveModelConfig", input.id ?? "new", () => saveModelConfigInStore(input));
}

// 목록 한 Page의 Row 수와 사용 여부 선택지 정의, Page 크기는 Server가 정한다고 보고 Mock이 정함
const LIST_PAGE_SIZE = 10;
const USE_VALUES: readonly ModelConfigUse[] = ["Y", "N"];
// 화면 진입 시 첫 진입 지연 시간을 적용할 조회 이름
const ENTRY_QUERY_NAMES: readonly string[] = ["modelConfigs"];

function buildModelConfigFilterOptions(): ModelConfigFilterOptions {
  return { modelCodes: [...MODEL_CODES], uses: [...USE_VALUES] };
}

// 조건에 맞는 Profile 한 Page 계산, 최근에 만든 순서, Page가 범위를 넘으면 빈 Row와 실제 Page 수 반환
export function buildModelConfigPage(query: ModelConfigListQuery): ModelConfigPage {
  const matched = readConfigs().filter(
    (config) =>
      (query.deviceCode === null || config.deviceCode === query.deviceCode) &&
      (query.modelCode === null || config.modelCode === query.modelCode) &&
      (query.use === null || config.use === query.use),
  );
  const start = (query.page - 1) * LIST_PAGE_SIZE;
  return {
    rows: matched.slice(start, start + LIST_PAGE_SIZE).map(copyConfig),
    totalCount: matched.length,
    pageCount: Math.ceil(matched.length / LIST_PAGE_SIZE),
  };
}

// Profile 삭제, 없는 번호면 오류 발생
export function deleteModelConfigInStore(id: ModelConfigId): void {
  const configs = readConfigs();
  if (!configs.some((config) => config.id === id)) throw new Error(`프로파일 없음: ${id}`);
  configStore = configs.filter((config) => config.id !== id);
}

// 사용 여부 변경, 사용 Y로 바꾸면 같은 범위의 다른 Y를 N으로 바꾸고 그 목록 반환. 없는 번호면 오류 발생
export function changeModelConfigUseInStore(
  id: ModelConfigId,
  use: ModelConfigUse,
): ModelConfigUseChange {
  const configs = readConfigs();
  const target = configs.find((config) => config.id === id);
  if (target === undefined) throw new Error(`프로파일 없음: ${id}`);
  const turnedOff =
    use === "Y"
      ? configs.filter(
          (config) => config.id !== id && config.use === "Y" && isSameScope(config, target),
        )
      : [];
  const turnedOffIds = new Set(turnedOff.map((config) => config.id));
  configStore = configs.map((config) =>
    config.id === id
      ? { ...config, use }
      : turnedOffIds.has(config.id)
        ? { ...config, use: "N" as const }
        : config,
  );
  return { turnedOff: turnedOff.map(({ id: offId, name }) => ({ id: offId, name })) };
}

// 목록 조건 선택지 응답, 즉시 응답하고 화면 진입으로 표시
export function respondModelConfigFilterOptions(
  signal?: AbortSignal,
): Promise<ModelConfigFilterOptions> {
  markScreenEntry(ENTRY_QUERY_NAMES);
  return respondNow(signal, buildModelConfigFilterOptions);
}

// 목록 한 Page 응답, 첫 진입과 검색 시 지연 시간 적용
export function respondModelConfigs(
  query: ModelConfigListQuery,
  signal?: AbortSignal,
): Promise<ModelConfigPage> {
  return respondLater("modelConfigs", signal, () => buildModelConfigPage(query));
}

// 삭제 응답, 받은 Request를 기록하고 즉시 응답. Test가 이름으로 지연하거나 실패시킴
export function respondDeleteModelConfig(id: ModelConfigId): Promise<void> {
  return runActionLater("deleteModelConfig", id, () => deleteModelConfigInStore(id));
}

// 사용 여부 변경 응답, 받은 Request를 기록하고 즉시 응답. Test가 이름으로 지연하거나 실패시킴
export function respondChangeModelConfigUse(
  id: ModelConfigId,
  use: ModelConfigUse,
): Promise<ModelConfigUseChange> {
  return runActionLater("changeModelConfigUse", id, () => changeModelConfigUseInStore(id, use));
}
