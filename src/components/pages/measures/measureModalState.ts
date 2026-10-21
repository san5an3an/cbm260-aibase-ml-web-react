import { useState } from "react";
import type { Measure } from "@/domain/measures";

// 조치 관리 화면에서 띄우는 Modal과 확인 Dialog 종류, 대상이 있는 종류는 열 때의 대상을 함께 보관
export type MeasureModal =
  | { type: "action"; measure: Measure }
  | { type: "compare" }
  | { type: "bulkComplete"; measures: readonly Measure[] }
  | { type: "assign"; measures: readonly Measure[] };

export type MeasureModalType = MeasureModal["type"];

// 종류별로 마지막에 연 Modal, 한 번도 열지 않은 종류는 없음
type LastMeasureModals = {
  readonly [Type in MeasureModalType]?: Extract<MeasureModal, { type: Type }>;
};

interface MeasureModalState {
  // 종류별 마지막에 연 Modal과 그 대상, 닫거나 다른 종류를 연 뒤에도 사라지는 동안 내용이 보이도록 남김
  last: LastMeasureModals;
  // 현재 떠 있는 Modal의 종류, 없으면 null
  openType: MeasureModalType | null;
  open: (modal: MeasureModal) => void;
  close: () => void;
}

// 현재 열린 Modal과 종류별 대상 관리
export function useMeasureModalState(): MeasureModalState {
  const [last, setLast] = useState<LastMeasureModals>({});
  const [openType, setOpenType] = useState<MeasureModalType | null>(null);
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
