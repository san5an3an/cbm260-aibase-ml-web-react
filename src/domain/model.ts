// 이상 탐지에 사용하는 분석 Model, 목록은 조회 함수가 반환
export interface AnalysisModel {
  code: string;
  name: string;
}

// 학습된 Model이 놓인 단계 정의, production은 운영, staging은 스테이징이며 Model 커버리지와 추론 상세에서 함께 사용
export type ModelStage = "production" | "staging";
