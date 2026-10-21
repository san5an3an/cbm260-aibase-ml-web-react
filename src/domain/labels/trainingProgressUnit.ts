import type { TrainingProgressUnit } from "@/domain/training";

// 현재 단계의 진행을 세는 단위의 화면 표기 정의, "epoch 7 / 10"의 앞 문자열
export const trainingProgressUnitLabels: Record<TrainingProgressUnit, { label: string }> = {
  epoch: { label: "epoch" },
  part: { label: "part" },
};
