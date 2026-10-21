import type {
  ModelConfigMode,
  ModelConfigParamProblem,
  ModelConfigResultOrigin,
  ModelConfigRowList,
  ModelConfigScope,
  ModelConfigUse,
} from "@/domain/modelConfig";
import { formatIsoDate, formatIsoHourMinute } from "@/lib/formatTime";

// 재학습 결과 임계값의 소수 자릿수 정의, 결과 Table과 같은 값 사용
const THRESHOLD_DIGITS = 4;

interface ModelConfigModeText {
  title: string;
  // 하단 Row 왼쪽에 표시할 안내 문구 보관
  note: string;
  submitLabel: string;
}

// 모드별 제목, 하단 안내, 저장 Button 문구 정의
export const modelConfigModeTexts: Record<ModelConfigMode, ModelConfigModeText> = {
  edit: {
    title: "모델 설정 수정",
    note: "수정 중에 닫으면 저장 안 됨 확인을 띄웁니다",
    submitLabel: "저장",
  },
  new: {
    title: "새 설정",
    note: "생성하면 사용 N으로 저장됩니다 · 작성 중에 닫으면 저장 안 됨 확인을 띄웁니다",
    submitLabel: "생성",
  },
  duplicate: {
    title: "새 설정 (복제)",
    note: "저장하면 새 프로파일로 생성됩니다 · 원본은 바뀌지 않습니다",
    submitLabel: "생성",
  },
  threshold: {
    title: "모델 설정 수정 · 재학습 결과에서 열림",
    note: "수정 중에 닫으면 저장 안 됨 확인을 띄웁니다",
    submitLabel: "저장",
  },
};

// 왼쪽 Group Input의 이름 정의, 나열한 순서를 화면의 Row 순서로 사용
export type ModelConfigFieldKey =
  | "name"
  | "deviceCode"
  | "modelCode"
  | "segment"
  | "thresholdPercentile"
  | "windowSeconds"
  | "trainingMethod"
  | "use"
  | "description";

interface ModelConfigFieldText {
  label: string;
  required: boolean;
  // 저장되고 표시되지만 재학습에 반영되지 않는 Input인지 여부
  isNotApplied: boolean;
}

// 왼쪽 Group Input별 Label, 필수 표시, 학습 미반영 표시 정의. Input을 추가할 때는 이 정의와 Modal의 Input Rendering에 한 줄씩 추가
export const modelConfigFieldTexts: Record<ModelConfigFieldKey, ModelConfigFieldText> = {
  name: { label: "설정 명", required: true, isNotApplied: false },
  deviceCode: { label: "장치", required: true, isNotApplied: false },
  modelCode: { label: "모델", required: true, isNotApplied: false },
  segment: { label: "세그먼트", required: false, isNotApplied: false },
  thresholdPercentile: { label: "임계 백분위", required: true, isNotApplied: false },
  windowSeconds: { label: "윈도우(초)", required: false, isNotApplied: true },
  trainingMethod: { label: "학습 방식", required: false, isNotApplied: true },
  use: { label: "사용 여부", required: false, isNotApplied: false },
  description: { label: "설명", required: false, isNotApplied: false },
};

// 왼쪽 Group Input의 순서 List, 정의에 나열한 순서 그대로 사용
export const modelConfigFieldKeys = Object.keys(modelConfigFieldTexts) as ModelConfigFieldKey[];

// 오른쪽 Group의 Row List별 제목, 추가 Button, Input 안내 문구 정의
export const modelConfigRowListTexts: Record<
  ModelConfigRowList,
  { title: string; addLabel: string; keyPlaceholder: string; valuePlaceholder: string }
> = {
  params: {
    title: "하이퍼파라미터",
    addLabel: "파라미터 추가",
    keyPlaceholder: "키",
    valuePlaceholder: "값",
  },
  sensorWeights: {
    title: "센서 가중치",
    addLabel: "가중치 추가",
    keyPlaceholder: "센서명",
    valuePlaceholder: "값",
  },
};

// 사용 여부별 Switch 이름 정의
export const modelConfigUseLabels: Record<ModelConfigUse, string> = {
  Y: "Y · 다음 재학습에 자동 적용",
  N: "N · 보관 (켜면 기존 Y는 N으로)",
};

// 범위 오류 문구에 넣을 범위 문자열 반환
function rangeText({ min, max }: { min: number; max: number }): string {
  return `${min} ~ ${max}`;
}

// 설정 Modal의 안내, 오류, 확인 문구 정의
export const modelConfigTexts = {
  modelHint: "모델을 바꾸면 하이퍼파라미터가 그 모델 프리셋으로 채워집니다",
  percentileHint: ({ min, max }: { min: number; max: number }) =>
    `${min} – ${max} · 낮출수록 민감 (알람 ↑)`,
  useHint: "켜면 같은 장치·모델·세그먼트의 기존 Y 프로파일은 N으로 바뀝니다",
  notAppliedPill: "학습 미반영",
  percentileUnit: "%",
  windowUnit: "초",
  paramsNote: (modelCode: string) => `${modelCode} · 저장 시 범위 검증`,
  notAppliedBanner:
    "윈도우 · 학습 방식 · 센서 가중치는 저장·표시되지만 현재 재학습 파이프라인에는 반영되지 않습니다.\n실제 반영은 하이퍼파라미터와 임계 백분위뿐입니다.",
  rowTypeLabel: "형식",
  rowRemoveLabel: "삭제",
  cancelLabel: "취소",
  nameMissing: "설정 명을 입력하세요",
  percentileOutOfRange: (range: { min: number; max: number }) =>
    `임계 백분위는 ${rangeText(range)} 사이여야 합니다`,
  // 같은 범위 Profile이 있었는지에 따라 재학습 결과에서 연 출처 안내 생성
  resultOrigin: (origin: ModelConfigResultOrigin) => {
    const trainedAt = `${formatIsoDate(origin.trainedAt)} ${formatIsoHourMinute(origin.trainedAt)}`;
    const source = `재학습 결과(${origin.deviceCode} · ${origin.modelCode} · ${origin.segment} · ${trainedAt}, 임계치 ${origin.threshold.toFixed(THRESHOLD_DIGITS)})에서 열었습니다.`;
    return origin.hasProfile
      ? `${source} 같은 장치·모델·세그먼트 프로파일이 있어 그 설정을 불러왔습니다.`
      : `${source} 같은 장치·모델·세그먼트 프로파일이 없어 새 설정으로 채웠습니다.`;
  },
  // 같은 범위 Profile이 없어 새로 채울 때의 설정 이름 생성
  defaultName: (scope: ModelConfigScope) => `${scope.deviceCode} ${scope.modelCode} 프로파일`,
  // 복제할 때의 설정 이름 생성
  duplicateName: (name: string) => `${name} 복사본`,
  loading: "모델 설정을 불러오는 중…",
  loadFailedTitle: "모델 설정을 불러오지 못했습니다",
  loadFailedDescription: "잠시 뒤 다시 시도하세요.",
  retryLabel: "다시 시도",
  // 변경한 채 닫으려 할 때 묻는 Dialog 문구
  unsavedTitle: "저장하지 않은 변경사항이 있습니다",
  // 문장마다 줄을 바꿔 두 줄로 표시
  unsavedDescription: (name: string) =>
    `${name.trim() || "이 설정"}의 임계 백분위·하이퍼파라미터 수정 내용이 저장되지 않았습니다.\n닫으면 변경사항이 사라집니다.`,
  unsavedConfirmLabel: "확인",
} as const;

// Hyperparameter Row를 저장할 수 없는 사유의 문구 반환
export function modelConfigParamProblemText(problem: ModelConfigParamProblem): string {
  switch (problem.reason) {
    case "outOfRange":
      return `${problem.key}는 ${rangeText(problem.range)} 사이${problem.range.integer ? " 정수" : ""}여야 합니다`;
    case "typeMismatch":
      return `${problem.key || "값"}는 ${problem.type} 형식이어야 합니다`;
  }
}

// 설정 Modal에서 동작이 끝난 뒤 화면 구석에 띄우는 Toast 문구 정의
export const modelConfigToastTexts = {
  saved: "저장되었습니다.",
  // 저장 실행이 거부된 사유를 담은 실패 문구 생성
  saveFailed: (error: unknown) => {
    const detail = (error instanceof Error ? error.message : String(error)).trim();
    return detail === "" ? "저장 실패" : `저장 실패: ${detail}`;
  },
  // 저장 Click 시 첫 Hyperparameter 오류 문구 생성
  paramProblem: (problem: ModelConfigParamProblem) =>
    `파라미터 범위 오류 — ${modelConfigParamProblemText(problem)}`,
} as const;
