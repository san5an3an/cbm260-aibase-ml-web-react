// 임계값 튜닝 화면의 Toast 문구 정의
export const thresholdTuningToastTexts = {
  loaded: (deviceCode: string, modelCode: string) => `${deviceCode} · ${modelCode} 분포를 불러왔습니다.`,
  savedNew: "설정 저장됨 (미사용 상태). 모델 커스텀에서 사용(Y)으로 활성화하세요.",
  noProfile: "같은 장치·모델·세그먼트 프로파일이 없습니다. 새 프로파일로 저장하세요.",
  applied: "저장되었습니다.",
  saveFailed: "프로파일을 저장하지 못했습니다.",
} as const;

// 새 Profile로 저장할 때 붙이는 설정 이름과 설명 계산
export const thresholdTuningNewProfileTexts = {
  name: (percentileLabel: string) => `임계튜닝 p${percentileLabel}`,
  description: "임계 튜닝에서 저장",
} as const;
