import { useState } from "react";
import type { ModelConfig, ModelConfigMode } from "@/domain/modelConfig";

// 모델 커스텀 화면에서 띄우는 Modal, 설정 Modal은 모드와 연 Row(새 설정이면 null), 삭제 확인은 지울 Row를 함께 보관
export type ModelConfigScreenModal =
  | { type: "config"; mode: Exclude<ModelConfigMode, "threshold">; config: ModelConfig | null }
  | { type: "delete"; config: ModelConfig };

export type ModelConfigScreenModalType = ModelConfigScreenModal["type"];

// 종류별로 마지막에 연 Modal, 한 번도 열지 않은 종류는 없음
type LastModelConfigModals = {
  readonly [Type in ModelConfigScreenModalType]?: Extract<ModelConfigScreenModal, { type: Type }>;
};

interface ModelConfigModalState {
  // 종류별 마지막에 연 Modal, 닫은 뒤에도 사라지는 동안 내용이 보이도록 남김
  last: LastModelConfigModals;
  // 현재 떠 있는 Modal의 종류, 없으면 null
  openType: ModelConfigScreenModalType | null;
  open: (modal: ModelConfigScreenModal) => void;
  close: () => void;
}

// 현재 열린 Modal과 종류별 대상 관리
export function useModelConfigModalState(): ModelConfigModalState {
  const [last, setLast] = useState<LastModelConfigModals>({});
  const [openType, setOpenType] = useState<ModelConfigScreenModalType | null>(null);
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
