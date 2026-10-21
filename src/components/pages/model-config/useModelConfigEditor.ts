import { useState } from "react";
import { showToast } from "@/components/molecules/Toast";
import type { ModelConfigModalContent } from "@/components/organisms/ModelConfigModal";
import { modelConfigToastTexts } from "@/components/organisms/modelConfigTexts";
import {
  addModelConfigRow,
  changeModelConfigModel,
  findModelConfigProblems,
  hasModelConfigProblem,
  isModelConfigDraftChanged,
  removeModelConfigRow,
  toModelConfigInput,
  type ModelConfigDraft,
  type ModelConfigId,
  type ModelConfigInput,
  type ModelConfigMode,
  type ModelConfigOptions,
  type ModelConfigResultOrigin,
  type ModelConfigRowList,
} from "@/domain/modelConfig";

// 설정 Modal을 한 번 여는 동안의 편집 시작 값 정의
export interface ModelConfigEditStart {
  // 이 편집을 시작하게 한 대상 보관, 다른 대상을 열면 새 편집으로 판정
  source: object;
  mode: ModelConfigMode;
  // 수정할 Profile 번호 보관, 새로 만들면 null
  configId: ModelConfigId | null;
  origin: ModelConfigResultOrigin | null;
  options: ModelConfigOptions;
  draft: ModelConfigDraft;
}

// 편집 중인 값과 오류를 표시할 시점을 정하는 기록 정의
interface ModelConfigEditSession extends ModelConfigEditStart {
  // Modal을 열 때의 Form 보관, 변경 여부를 비교할 때 사용
  snapshot: ModelConfigDraft;
  // 값 Input에서 Focus가 나간 Hyperparameter Row 번호 보관, 해당 Row의 오류만 저장 전에도 표시
  touchedRowIds: readonly number[];
  // 저장을 한 번이라도 눌렀는지 보관, 누른 뒤에는 모든 오류 표시
  hasTriedSave: boolean;
}

interface ModelConfigEditor {
  session: ModelConfigEditSession | null;
  start: (start: ModelConfigEditStart) => void;
  changeDraft: (draft: ModelConfigDraft) => void;
  changeModel: (modelCode: string) => void;
  addRow: (list: ModelConfigRowList) => void;
  removeRow: (list: ModelConfigRowList, rowId: number) => void;
  touchParam: (rowId: number) => void;
  // Modal에 넘길 본문 계산, 편집 중이 아니면 null 반환
  readyContent: () => ModelConfigModalContent | null;
  // 저장을 누를 때의 확인, 막는 사유가 있으면 오류를 모두 표시하고 첫 Hyperparameter 오류를 알린 뒤 null 반환, 없으면 넘길 값 반환
  prepareSave: () => ModelConfigInput | null;
}

// 설정 Modal의 편집 값, 오류 표시 시점, 변경 여부 관리, 임계값 관리 화면과 설정 화면이 함께 사용
export function useModelConfigEditor(): ModelConfigEditor {
  const [session, setSession] = useState<ModelConfigEditSession | null>(null);

  const update = (change: (current: ModelConfigEditSession) => ModelConfigEditSession) =>
    setSession((current) => (current === null ? null : change(current)));

  return {
    session,
    start: (start) =>
      setSession({ ...start, snapshot: start.draft, touchedRowIds: [], hasTriedSave: false }),
    changeDraft: (draft) => update((current) => ({ ...current, draft })),
    changeModel: (modelCode) =>
      update((current) => ({
        ...current,
        draft: changeModelConfigModel(current.draft, modelCode, current.options),
      })),
    addRow: (list) =>
      update((current) => ({
        ...current,
        draft: addModelConfigRow(current.draft, list, current.options.defaults.addedRowType),
      })),
    removeRow: (list, rowId) =>
      update((current) => ({
        ...current,
        draft: removeModelConfigRow(current.draft, list, rowId),
        touchedRowIds: current.touchedRowIds.filter((touchedId) => touchedId !== rowId),
      })),
    touchParam: (rowId) =>
      update((current) =>
        current.touchedRowIds.includes(rowId)
          ? current
          : { ...current, touchedRowIds: [...current.touchedRowIds, rowId] },
      ),
    readyContent: () => {
      if (session === null) return null;
      const { draft, options, hasTriedSave, touchedRowIds } = session;
      const problems = findModelConfigProblems(draft, options);
      return {
        status: "ready",
        draft,
        options,
        origin: session.origin,
        // 표시할 오류, 설정 이름과 임계 백분위는 저장을 누른 뒤, Hyperparameter는 해당 값 Input에서 나간 뒤에도 표시
        problems: {
          isNameMissing: hasTriedSave && problems.isNameMissing,
          isPercentileOutOfRange: hasTriedSave && problems.isPercentileOutOfRange,
          params: problems.params.map((problem, index) =>
            hasTriedSave || touchedRowIds.includes(draft.params[index].rowId) ? problem : null,
          ),
        },
        isDirty: isModelConfigDraftChanged(session.snapshot, draft),
      };
    },
    prepareSave: () => {
      if (session === null) return null;
      const problems = findModelConfigProblems(session.draft, session.options);
      if (hasModelConfigProblem(problems)) {
        update((current) => ({ ...current, hasTriedSave: true }));
        const firstParamProblem = problems.params.find((problem) => problem !== null);
        if (firstParamProblem) showToast(modelConfigToastTexts.paramProblem(firstParamProblem), "error");
        return null;
      }
      return toModelConfigInput(session.draft, session.configId, session.options);
    },
  };
}
