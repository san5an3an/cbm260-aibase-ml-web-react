// 형식 한 가지의 화면 표기와 값 판정 정의
interface ModelConfigParamTypeRule {
  label: string;
  accepts: (value: string) => boolean;
}

// 정수, 소수, 참거짓 문자열을 판별하는 패턴 정의
const INTEGER_PATTERN = /^[+-]?\d+$/;
const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const BOOLEAN_VALUES: readonly string[] = ["true", "false"];

// Hyperparameter와 센서 가중치 값의 형식 정의, 나열한 순서를 선택지 순서로 사용하고 형식을 추가할 때는 이 Table에 한 Row만 추가
export const modelConfigParamTypeRules = {
  int: { label: "int", accepts: (value) => INTEGER_PATTERN.test(value) },
  float: { label: "float", accepts: (value) => NUMBER_PATTERN.test(value) },
  str: { label: "str", accepts: () => true },
  bool: { label: "bool", accepts: (value) => BOOLEAN_VALUES.includes(value) },
} as const satisfies Record<string, ModelConfigParamTypeRule>;

// 값의 형식(int 정수, float 소수, str 문자열, bool 참거짓) 정의
export type ModelConfigParamType = keyof typeof modelConfigParamTypeRules;

// 형식의 순서 목록, Table에 나열한 순서 그대로 사용
export const modelConfigParamTypes: readonly ModelConfigParamType[] = Object.keys(
  modelConfigParamTypeRules,
) as ModelConfigParamType[];
