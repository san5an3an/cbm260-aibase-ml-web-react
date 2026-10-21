import { useState } from "react";
import type { InferenceJobId } from "@/domain/inference";

// 추론 화면에서 바로 뜨는 Modal, 추론 상세는 연 Job의 번호를 함께 보관(Job Card와 결과 Row를 만든 Job)
export type InferenceModal = { type: "run" } | { type: "detail"; jobId: InferenceJobId };

export type InferenceModalType = InferenceModal["type"];

// 종류별로 마지막에 연 Modal, 한 번도 열지 않은 종류는 없음
type LastInferenceModals = {
  readonly [Type in InferenceModalType]?: Extract<InferenceModal, { type: Type }>;
};

interface InferenceModalState {
  // 종류별로 마지막에 연 Modal과 그 대상, 닫거나 다른 종류를 연 뒤에도 사라지는 동안 내용이 보이도록 유지
  last: LastInferenceModals;
  // 현재 떠 있는 Modal의 종류, 떠 있는 Modal이 없으면 null
  openType: InferenceModalType | null;
  open: (modal: InferenceModal) => void;
  close: () => void;
}

// 현재 열린 Modal과 종류별 대상 관리
export function useInferenceModalState(): InferenceModalState {
  const [last, setLast] = useState<LastInferenceModals>({});
  const [openType, setOpenType] = useState<InferenceModalType | null>(null);
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
