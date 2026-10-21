import {
  modelConfigParamTypeRules,
  type ModelConfigParamType,
} from "@/domain/labels/modelConfigParamType";

export type { ModelConfigParamType } from "@/domain/labels/modelConfigParamType";

export type ModelConfigId = string;

// 설정 Modal의 모드 정의, edit는 수정, new는 새 설정, duplicate는 복제, threshold는 재학습 결과에서 연 임계값 관리
export type ModelConfigMode = "edit" | "new" | "duplicate" | "threshold";

// 학습 데이터를 고르는 방식 정의, full은 전체, reservoir는 표본 추출
export type ModelConfigTrainingMethod = "full" | "reservoir";

// 사용 여부 정의, Y는 다음 재학습에 자동 적용, N은 보관
export type ModelConfigUse = "Y" | "N";

// Hyperparameter와 센서 가중치 한 Row 정의, 값은 입력한 문자열 그대로 보관
export interface ModelConfigParam {
  key: string;
  value: string;
  type: ModelConfigParamType;
}

// Profile 하나를 정하는 장치, Model, Segment 정의
export interface ModelConfigScope {
  deviceCode: string;
  modelCode: string;
  segment: string;
}

// 재학습 Profile 한 건 정의, 시각은 "YYYY-MM-DDTHH:mm:ss"로 보관
export interface ModelConfig extends ModelConfigScope {
  id: ModelConfigId;
  name: string;
  // 설명이 없으면 null로 보관
  description: string | null;
  // 임계 백분위(%) 보관
  thresholdPercentile: number;
  windowSeconds: number;
  trainingMethod: ModelConfigTrainingMethod;
  use: ModelConfigUse;
  params: readonly ModelConfigParam[];
  sensorWeights: readonly ModelConfigParam[];
  // 마지막으로 저장한 시각 보관
  updatedAt: string;
}

// Hyperparameter 이름 하나가 받을 수 있는 값의 범위 정의, 양 끝 포함, integer면 정수만 허용
export interface ModelConfigParamRange {
  min: number;
  max: number;
  integer: boolean;
}

// 새 설정을 열 때 채울 값 정의
export interface ModelConfigDefaults extends ModelConfigScope {
  thresholdPercentile: number;
  windowSeconds: number;
  trainingMethod: ModelConfigTrainingMethod;
  use: ModelConfigUse;
  sensorWeights: readonly ModelConfigParam[];
  // Row를 추가할 때 선택해 둘 형식 보관
  addedRowType: ModelConfigParamType;
}

// 설정 Modal의 선택지, 범위, 프리셋, 새 설정의 초기값 정의, 나열한 순서를 선택지 순서로 사용
export interface ModelConfigOptions {
  modelCodes: readonly string[];
  trainingMethods: readonly ModelConfigTrainingMethod[];
  // 임계 백분위로 받을 수 있는 범위(양 끝 포함) 보관
  percentileRange: { min: number; max: number };
  // Model 코드별 Hyperparameter 프리셋, Model을 바꾸면 이 값으로 다시 채움
  presets: Readonly<Record<string, readonly ModelConfigParam[]>>;
  // Hyperparameter 이름별 범위 보관, 없는 이름은 범위 확인 생략
  paramRanges: Readonly<Record<string, ModelConfigParamRange>>;
  defaults: ModelConfigDefaults;
}

// 재학습 결과에서 연 설정의 출처 정의, 해당 결과의 학습 일시와 임계값이 같은 범위의 Profile이 있었는지 보관
export interface ModelConfigResultOrigin extends ModelConfigScope {
  trainedAt: string;
  threshold: number;
  hasProfile: boolean;
}

// Modal에서 편집하는 Row 하나 정의, Row를 추가하거나 삭제해도 같은 Row를 가리키는 번호를 함께 보관
export interface ModelConfigRowDraft extends ModelConfigParam {
  rowId: number;
}

// Row 목록의 종류(params Hyperparameter, sensorWeights 센서 가중치) 정의
export type ModelConfigRowList = "params" | "sensorWeights";

// 설정 Modal에 입력 중인 값 정의, 숫자 Input도 입력한 문자열 그대로 보관
export interface ModelConfigDraft {
  name: string;
  description: string;
  deviceCode: string;
  modelCode: string;
  segment: string;
  thresholdPercentile: string;
  windowSeconds: string;
  trainingMethod: ModelConfigTrainingMethod;
  use: ModelConfigUse;
  params: readonly ModelConfigRowDraft[];
  sensorWeights: readonly ModelConfigRowDraft[];
  // 다음에 추가할 Row에 붙일 번호 보관
  nextRowId: number;
}

// 저장 실행 함수에 전달하는 값 정의
export interface ModelConfigInput extends ModelConfigScope {
  // 수정할 Profile 번호 보관, 새로 만들면 null 사용
  id: ModelConfigId | null;
  name: string;
  // 앞뒤 공백을 제거한 설명 보관, 남는 문자가 없으면 null 사용
  description: string | null;
  thresholdPercentile: number;
  windowSeconds: number;
  trainingMethod: ModelConfigTrainingMethod;
  use: ModelConfigUse;
  params: readonly ModelConfigParam[];
  sensorWeights: readonly ModelConfigParam[];
}

// Hyperparameter 한 Row를 저장할 수 없는 사유(outOfRange 이름의 범위 밖, typeMismatch 선택한 형식이 아닌 값) 정의
export type ModelConfigParamProblem =
  | { reason: "outOfRange"; key: string; range: ModelConfigParamRange }
  | { reason: "typeMismatch"; key: string; type: ModelConfigParamType };

// 저장을 막는 사유 모음 정의, Hyperparameter는 Row 순서대로 담고 사유가 없는 Row는 null 사용
export interface ModelConfigProblems {
  isNameMissing: boolean;
  isPercentileOutOfRange: boolean;
  params: readonly (ModelConfigParamProblem | null)[];
}

// 전달받은 Table에 해당 이름이 직접 있을 때만 값 반환, Object의 기본 속성 이름은 없는 것으로 판정
function ownEntry<Value>(table: Readonly<Record<string, Value>>, key: string): Value | null {
  return Object.hasOwn(table, key) ? table[key] : null;
}

// Row 목록에 이어지는 번호를 붙여 편집용 Row로 변환
function toRowDrafts(rows: readonly ModelConfigParam[], firstRowId: number): ModelConfigRowDraft[] {
  return rows.map((row, index) => ({
    key: row.key,
    value: row.value,
    type: row.type,
    rowId: firstRowId + index,
  }));
}

// 저장된 Profile로 설정 폼 생성, 복제처럼 이름과 사용 여부를 바꿔 열 때는 바꿀 값을 전달
export function createModelConfigDraft(
  config: ModelConfig,
  overrides: Partial<Pick<ModelConfigDraft, "name" | "use">> = {},
): ModelConfigDraft {
  const params = toRowDrafts(config.params, 0);
  const sensorWeights = toRowDrafts(config.sensorWeights, params.length);
  return {
    name: overrides.name ?? config.name,
    description: config.description ?? "",
    deviceCode: config.deviceCode,
    modelCode: config.modelCode,
    segment: config.segment,
    thresholdPercentile: String(config.thresholdPercentile),
    windowSeconds: String(config.windowSeconds),
    trainingMethod: config.trainingMethod,
    use: overrides.use ?? config.use,
    params,
    sensorWeights,
    nextRowId: params.length + sensorWeights.length,
  };
}

// 새 설정 폼 생성, 범위를 전달하면 해당 장치, Model, Segment로 채우고 Hyperparameter는 해당 Model의 프리셋으로 채움
export function createNewModelConfigDraft(
  options: ModelConfigOptions,
  scope: ModelConfigScope | null,
  name: string,
): ModelConfigDraft {
  const { defaults } = options;
  const modelCode = scope?.modelCode ?? defaults.modelCode;
  const params = toRowDrafts(ownEntry(options.presets, modelCode) ?? [], 0);
  const sensorWeights = toRowDrafts(defaults.sensorWeights, params.length);
  return {
    name,
    description: "",
    deviceCode: scope?.deviceCode ?? defaults.deviceCode,
    modelCode,
    segment: scope?.segment ?? defaults.segment,
    thresholdPercentile: String(defaults.thresholdPercentile),
    windowSeconds: String(defaults.windowSeconds),
    trainingMethod: defaults.trainingMethod,
    use: defaults.use,
    params,
    sensorWeights,
    nextRowId: params.length + sensorWeights.length,
  };
}

// Model을 바꾸고 Hyperparameter를 해당 Model의 프리셋으로 다시 채운 폼 반환, 프리셋이 없는 Model이면 빈 목록 사용
export function changeModelConfigModel(
  draft: ModelConfigDraft,
  modelCode: string,
  options: ModelConfigOptions,
): ModelConfigDraft {
  const params = toRowDrafts(ownEntry(options.presets, modelCode) ?? [], draft.nextRowId);
  return { ...draft, modelCode, params, nextRowId: draft.nextRowId + params.length };
}

// 목록 맨 아래에 빈 Row 하나를 추가한 폼 반환
export function addModelConfigRow(
  draft: ModelConfigDraft,
  list: ModelConfigRowList,
  type: ModelConfigParamType,
): ModelConfigDraft {
  const row: ModelConfigRowDraft = { key: "", value: "", type, rowId: draft.nextRowId };
  return { ...draft, [list]: [...draft[list], row], nextRowId: draft.nextRowId + 1 };
}

// 목록에서 해당 번호의 Row를 제거한 폼 반환
export function removeModelConfigRow(
  draft: ModelConfigDraft,
  list: ModelConfigRowList,
  rowId: number,
): ModelConfigDraft {
  return { ...draft, [list]: draft[list].filter((row) => row.rowId !== rowId) };
}

// Hyperparameter 한 Row를 저장할 수 없는 사유 반환, 이름의 범위를 먼저 검사하고 그다음 선택한 형식을 검사하며 없으면 null 반환
export function findModelConfigParamProblem(
  param: ModelConfigParam,
  ranges: Readonly<Record<string, ModelConfigParamRange>>,
): ModelConfigParamProblem | null {
  const key = param.key.trim();
  const value = param.value.trim();
  const range = ownEntry(ranges, key);
  if (range !== null) {
    const number = Number(value);
    const isOutOfRange =
      value === "" ||
      Number.isNaN(number) ||
      number < range.min ||
      number > range.max ||
      (range.integer && !Number.isInteger(number));
    if (isOutOfRange) return { reason: "outOfRange", key, range };
  }
  if (value !== "" && !modelConfigParamTypeRules[param.type].accepts(value)) {
    return { reason: "typeMismatch", key, type: param.type };
  }
  return null;
}

// 설정 이름, 임계 백분위, Hyperparameter Row별로 저장을 막는 사유 계산
export function findModelConfigProblems(
  draft: ModelConfigDraft,
  options: ModelConfigOptions,
): ModelConfigProblems {
  const percentileText = draft.thresholdPercentile.trim();
  const percentile = Number(percentileText);
  const { min, max } = options.percentileRange;
  return {
    isNameMissing: draft.name.trim() === "",
    isPercentileOutOfRange:
      percentileText === "" || Number.isNaN(percentile) || percentile < min || percentile > max,
    params: draft.params.map((param) => findModelConfigParamProblem(param, options.paramRanges)),
  };
}

// 저장을 막는 사유가 하나라도 있는지 판정
export function hasModelConfigProblem(problems: ModelConfigProblems): boolean {
  return (
    problems.isNameMissing ||
    problems.isPercentileOutOfRange ||
    problems.params.some((problem) => problem !== null)
  );
}

// 두 Row 목록의 이름, 값, 형식이 같은지 판정, Row 번호는 비교하지 않음
function haveSameRows(
  before: readonly ModelConfigRowDraft[],
  after: readonly ModelConfigRowDraft[],
): boolean {
  return (
    before.length === after.length &&
    before.every(
      (row, index) =>
        row.key === after[index].key &&
        row.value === after[index].value &&
        row.type === after[index].type,
    )
  );
}

// 연 뒤로 입력이 바뀌었는지 판정, 바꿨다가 초기값으로 되돌리면 바뀌지 않은 것으로 처리
export function isModelConfigDraftChanged(
  before: ModelConfigDraft,
  after: ModelConfigDraft,
): boolean {
  return (
    before.name !== after.name ||
    before.description !== after.description ||
    before.deviceCode !== after.deviceCode ||
    before.modelCode !== after.modelCode ||
    before.segment !== after.segment ||
    before.thresholdPercentile !== after.thresholdPercentile ||
    before.windowSeconds !== after.windowSeconds ||
    before.trainingMethod !== after.trainingMethod ||
    before.use !== after.use ||
    !haveSameRows(before.params, after.params) ||
    !haveSameRows(before.sensorWeights, after.sensorWeights)
  );
}

// 편집 중인 Row를 전달할 Row로 변환, 이름과 값의 앞뒤 공백을 제거
function toParams(rows: readonly ModelConfigRowDraft[]): ModelConfigParam[] {
  return rows.map((row) => ({ key: row.key.trim(), value: row.value.trim(), type: row.type }));
}

// 설정 폼을 저장 실행 함수에 전달할 값으로 변환, 저장을 막는 사유가 있으면 null, 비운 Segment와 숫자가 아닌 window는 초기값으로 채움
export function toModelConfigInput(
  draft: ModelConfigDraft,
  id: ModelConfigId | null,
  options: ModelConfigOptions,
): ModelConfigInput | null {
  if (hasModelConfigProblem(findModelConfigProblems(draft, options))) return null;
  const description = draft.description.trim();
  return {
    id,
    name: draft.name.trim(),
    description: description === "" ? null : description,
    deviceCode: draft.deviceCode,
    modelCode: draft.modelCode,
    segment: draft.segment.trim() || options.defaults.segment,
    thresholdPercentile: Number(draft.thresholdPercentile.trim()),
    windowSeconds: Number(draft.windowSeconds.trim()) || options.defaults.windowSeconds,
    trainingMethod: draft.trainingMethod,
    use: draft.use,
    params: toParams(draft.params),
    sensorWeights: toParams(draft.sensorWeights),
  };
}

// 목록의 조건(장치, Model, 사용 여부) 정의, 선택하지 않은 항목은 null 사용
export interface ModelConfigFilter {
  deviceCode: string | null;
  modelCode: string | null;
  use: ModelConfigUse | null;
}

// 목록 조회 조건 정의, Page 번호는 1부터 시작
export interface ModelConfigListQuery extends ModelConfigFilter {
  page: number;
}

// 목록 한 Page 정의, 총 건수는 조건에 맞는 전체 수이고 Page 수가 0이면 맞는 건이 없음
export interface ModelConfigPage {
  rows: readonly ModelConfig[];
  totalCount: number;
  pageCount: number;
}

// 목록 조건 Input의 선택지 정의, 나열한 순서를 선택지 순서로 사용
export interface ModelConfigFilterOptions {
  modelCodes: readonly string[];
  uses: readonly ModelConfigUse[];
}

// 사용 여부를 바꾼 결과 정의, 사용 Y로 바꿀 때 같은 범위에서 N으로 바뀐 Profile을 담음
export interface ModelConfigUseChange {
  turnedOff: readonly Pick<ModelConfig, "id" | "name">[];
}
