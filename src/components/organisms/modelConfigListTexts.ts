import type { ModelConfig, ModelConfigUse, ModelConfigUseChange } from "@/domain/modelConfig";

// 모델 커스텀 List의 조건 Input, Table, 확인 Dialog, Toast 문구 정의
export const modelConfigListTexts = {
  allDevices: "장치 (전체)",
  allModels: "모델 (전체)",
  allUses: "사용 여부 (전체)",
  deviceLabel: "장치",
  modelLabel: "모델",
  useLabel: "사용 여부",
  resetLabel: "초기화",
  searchLabel: "검색",
  newLabel: "새 설정",
  eyebrow: "MODEL PROFILES",
  title: "모델 커스텀 설정",
  description:
    "사용 Y는 다음 재학습 때 자동 적용 · 같은 장치·모델·세그먼트에는 Y 하나만 (새로 켜면 기존 Y는 N) · 복제는 N으로 생성",
  count: (totalCount: number) => `${totalCount}건`,
  editLabel: "수정",
  duplicateLabel: "복제",
  deleteLabel: "삭제",
  previousLabel: "이전",
  nextLabel: "다음",
  paginationLabel: "모델 커스텀 설정 쪽 이동",
  // Row가 없을 때 표시할 안내 문구
  emptyTitle: "조건에 맞는 설정이 없습니다",
  emptyDescription: "장치·모델·사용 여부 필터를 전체로 바꿔 보세요.",
  emptyResetLabel: "필터 초기화",
  loadFailed: "모델 커스텀 화면을 불러오지 못했습니다.",
  loading: "모델 커스텀 화면을 불러오는 중입니다.",
} as const;

// 사용 여부별 조건 선택지 이름, Table Switch 이름, Switch 안내 정의
export const modelConfigUseListLabels: Record<
  ModelConfigUse,
  { filter: string; switchLabel: string; switchTitle: string }
> = {
  Y: {
    filter: "Y · 재학습 자동적용",
    switchLabel: "사용",
    switchTitle: "누르면 미사용 — 재학습에 적용되지 않음",
  },
  N: {
    filter: "N · 보관",
    switchLabel: "미사용",
    switchTitle: "누르면 사용 — 같은 장치·모델·세그먼트의 다른 사용 설정은 꺼짐",
  },
};

// Table 머리글 정의, 숫자 Column은 오른쪽, 사용과 관리는 가운데 정렬
export const modelConfigColumnHeads: readonly { label: string; align: "start" | "end" | "center" }[] = [
  { label: "설정 명", align: "start" },
  { label: "장치", align: "start" },
  { label: "모델", align: "start" },
  { label: "세그먼트", align: "start" },
  { label: "임계 백분위(%)", align: "end" },
  { label: "윈도우(초)", align: "end" },
  { label: "사용", align: "center" },
  { label: "수정 일시", align: "start" },
  { label: "관리", align: "center" },
];

// 삭제 확인 Dialog 문구, 사용 Y이면 기본 설정 안내를 더하고 문장마다 줄을 바꿈
export const modelConfigDeleteTexts = {
  title: "설정을 삭제할까요?",
  description: (config: Pick<ModelConfig, "name" | "use">) =>
    [
      `${config.name} 설정이 삭제됩니다.`,
      ...(config.use === "Y" ? ["사용 Y인 프로파일이라 다음 재학습부터는 기본 설정이 적용됩니다."] : []),
      "삭제한 설정은 되돌릴 수 없습니다.",
    ].join("\n"),
  confirmLabel: "삭제",
  cancelLabel: "취소",
} as const;

// 모델 커스텀 화면의 동작이 끝난 뒤 표시할 문구 정의, 사용 여부 안내는 List 상단에, 나머지는 화면 구석 Toast로 표시
export const modelConfigListToastTexts = {
  deleted: "삭제되었습니다.",
  deleteFailed: "삭제하지 못했습니다.",
  useChangeFailed: "사용 여부를 바꾸지 못했습니다.",
  // 사용 여부를 바꾼 뒤 List 상단에 표시할 안내 생성, 설정 이름을 문구에 넣음
  useChanged: (name: string, use: ModelConfigUse, change: ModelConfigUseChange) =>
    use === "Y"
      ? `설정 ${name}을(를) 사용으로 바꿨습니다. 다음 재학습부터 적용됩니다.${
          change.turnedOff.length > 0
            ? ` 같은 범위의 ${change.turnedOff.map((config) => config.name).join(", ")}은(는) 껐습니다.`
            : ""
        }`
      : `설정 ${name}을(를) 미사용으로 바꿨습니다. 이 범위는 다음 재학습부터 기본값으로 학습합니다.`,
} as const;
