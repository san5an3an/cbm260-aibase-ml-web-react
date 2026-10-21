import type { ModelStage } from "@/domain/model";

// 학습된 Model 단계의 화면 표기 정의
export const modelStageLabels: Record<ModelStage, string> = {
  production: "운영",
  staging: "스테이징",
};
