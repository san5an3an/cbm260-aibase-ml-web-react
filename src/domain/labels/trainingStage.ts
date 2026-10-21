import type { TrainingStageKey } from "@/domain/training";

interface TrainingStageLabel {
  // 단계 표시, Card 머리의 단계 안내, KPI 설명에 사용할 이름
  label: string;
  // 해당 단계가 진행되는 동안 Job Card의 상태 표시에 사용할 이름
  runningLabel: string;
}

// 학습 단계의 화면 표기 정의, 나열한 순서가 단계의 진행 순서
export const trainingStageLabels: Record<TrainingStageKey, TrainingStageLabel> = {
  preprocess: { label: "전처리", runningLabel: "전처리 중" },
  featureVector: { label: "특징벡터", runningLabel: "특징벡터 생성 중" },
  train: { label: "학습", runningLabel: "학습 중" },
  save: { label: "저장", runningLabel: "저장 중" },
};

// 학습 단계의 순서 목록, 화면 표기에 나열한 순서를 그대로 사용
export const trainingStageKeys: readonly TrainingStageKey[] = Object.keys(
  trainingStageLabels,
) as TrainingStageKey[];
