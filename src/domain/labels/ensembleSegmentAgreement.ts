import type { EnsembleSegmentAgreement } from "@/domain/ensemble";

// 이상 구간 일치 정도의 화면 표기 정의, 모든 Model이 일치하면 Model 수를 앞에 붙임
export const ensembleSegmentAgreementLabels: Record<
  EnsembleSegmentAgreement,
  (modelCount: number) => string
> = {
  unanimous: (modelCount) => `${modelCount}모델 일치`,
  partial: () => "일부 모델",
};
