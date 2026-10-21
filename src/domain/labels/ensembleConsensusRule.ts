import type { EnsembleConsensusRule } from "@/domain/ensemble";

interface EnsembleConsensusRuleLabel {
  // 판정 Card의 이름
  label: string;
  // 규칙 코드의 표기
  codeLabel: string;
  // 화면 판정 Card의 설명과 부연 문구
  description: string;
  note: string;
  // 상세 Modal 판정 Card의 짧은 설명
  shortDescription: string;
}

// 다수결 규칙의 화면 표기 정의
export const ensembleConsensusRuleLabels: Record<EnsembleConsensusRule, EnsembleConsensusRuleLabel> = {
  any: {
    label: "한 모델 이상",
    codeLabel: "ANY",
    description: "세 모델 중 하나라도 이상이라 판정한 window 비율",
    note: "민감 · 재현율 ↑ — 놓치면 안 되는 점검에",
    shortDescription: "세 모델 중 하나라도 이상 · 민감(재현율 ↑)",
  },
  all: {
    label: "세 모델 동시",
    codeLabel: "ALL",
    description: "세 모델이 모두 이상이라 판정한 window 비율",
    note: "보수적 · 정밀도 ↑ — 오탐을 줄이고 싶을 때",
    shortDescription: "세 모델이 모두 이상 · 보수적(정밀도 ↑)",
  },
};
