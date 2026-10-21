import type {
  ModelConfig,
  ModelConfigFilterOptions,
  ModelConfigId,
  ModelConfigInput,
  ModelConfigListQuery,
  ModelConfigOptions,
  ModelConfigPage,
  ModelConfigScope,
  ModelConfigUse,
  ModelConfigUseChange,
} from "@/domain/modelConfig";
import {
  respondChangeModelConfigUse,
  respondDeleteModelConfig,
  respondModelConfigFilterOptions,
  respondModelConfigOptions,
  respondModelConfigs,
  respondModelConfigProfile,
  respondSaveModelConfig,
} from "@/services/mock/modelConfigsData";
import type { QueryOptions } from "@/services/queryOptions";

// 설정 Modal의 Model과 학습 방식 선택지, 임계 백분위 범위, Model별 기본 설정값, Hyperparameter 범위, 새 설정의 초기 값 조회
export async function fetchModelConfigOptions(
  options: QueryOptions = {},
): Promise<ModelConfigOptions> {
  return respondModelConfigOptions(options.signal);
}

// 장치, Model, Segment가 같은 Profile 조회, 없으면 null, 여럿일 때 사용 Y를 먼저 고르는 규칙은 Mock이 정함
export async function fetchModelConfigProfile(
  scope: ModelConfigScope,
  options: QueryOptions = {},
): Promise<ModelConfig | null> {
  return respondModelConfigProfile(scope, options.signal);
}

// Profile 저장, 번호가 null이면 새로 만들고 아니면 해당 Profile 수정. 사용 Y로 저장하면 같은 범위의 다른 Y는 N으로 변경, 저장한 Profile 번호 반환
export async function saveModelConfig(input: ModelConfigInput): Promise<ModelConfigId> {
  return respondSaveModelConfig(input);
}

// 목록 Filter 조건의 Model과 사용 여부 선택지 조회
export async function fetchModelConfigFilterOptions(
  options: QueryOptions = {},
): Promise<ModelConfigFilterOptions> {
  return respondModelConfigFilterOptions(options.signal);
}

// 조건과 Page 번호에 맞는 Profile 한 Page 조회, Page 크기는 Server가 정함. Row마다 설정 Modal에 채울 값 전부를 담음
export async function fetchModelConfigs(
  query: ModelConfigListQuery,
  options: QueryOptions = {},
): Promise<ModelConfigPage> {
  return respondModelConfigs(query, options.signal);
}

// Profile 삭제, 없는 번호면 오류 발생
export async function deleteModelConfig(id: ModelConfigId): Promise<void> {
  return respondDeleteModelConfig(id);
}

// Profile 사용 여부 변경, 사용 Y로 바꾸면 같은 장치, Model, Segment의 다른 Y를 N으로 바꾸고 그 목록 반환
export async function changeModelConfigUse(
  id: ModelConfigId,
  use: ModelConfigUse,
): Promise<ModelConfigUseChange> {
  return respondChangeModelConfigUse(id, use);
}
