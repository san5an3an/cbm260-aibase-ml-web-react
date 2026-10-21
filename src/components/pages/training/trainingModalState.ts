import { useState } from "react";
import type { TrainingJob, TrainingResult } from "@/domain/training";

// 재학습 설정 화면에서 띄우는 Modal 종류, 대상이 있는 종류는 열 때의 대상을 함께 보관
export type TrainingModal =
  | { type: "schedule" }
  | { type: "jobDetail"; job: TrainingJob }
  | { type: "resultDetail"; result: TrainingResult }
  | { type: "thresholdConfig"; result: TrainingResult };

export type TrainingModalType = TrainingModal["type"];

// 종류별로 마지막에 연 Modal, 한 번도 열지 않은 종류는 없음
type LastTrainingModals = {
  readonly [Type in TrainingModalType]?: Extract<TrainingModal, { type: Type }>;
};

interface TrainingModalState {
  // 종류별 마지막에 연 Modal과 그 대상, 닫거나 다른 종류를 연 뒤에도 사라지는 동안 내용이 보이도록 남김
  last: LastTrainingModals;
  // 현재 떠 있는 Modal의 종류, 없으면 null
  openType: TrainingModalType | null;
  open: (modal: TrainingModal) => void;
  close: () => void;
}

// 현재 열린 Modal과 종류별 대상 관리
export function useTrainingModalState(): TrainingModalState {
  const [last, setLast] = useState<LastTrainingModals>({});
  const [openType, setOpenType] = useState<TrainingModalType | null>(null);
  return {
    last,
    openType,
    open: (next) => {
      setLast((current) => ({ ...current, [next.type]: next }));
      setOpenType(next.type);
    },
    close: () => setOpenType(null),
  };
}
