"use client";

import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Segmented } from "@/components/molecules/Segmented";
import { JobRequestModal, type JobRequestTexts } from "@/components/organisms/JobRequestModal";
import type { Device } from "@/domain/device";
import type {
  InferenceRunDraft,
  InferenceRunOptions,
  InferenceRunProblem,
  InferenceRunProblemField,
} from "@/domain/inference";

// 추론 실행의 Label, 안내, Button 문구
const RUN_TEXTS: JobRequestTexts = {
  dateLabel: "추론 일자",
  timeLabel: "추론 시각",
  modelLabel: "추론 모델",
  note: "학습본이 없는 장치는 추론에서 제외됩니다 (플릿 개요 · 커버리지 참고)",
  submitLabel: "추론 실행",
  submittingLabel: "추론 요청 중...",
  unavailableHint: "(학습 불가)",
  unavailableTitle: "학습·추론 경로가 아직 없는 장치입니다",
};

// 추론을 요청할 수 없는 이유의 오류 문구 반환
function describeProblem(problem: InferenceRunProblem): string {
  switch (problem) {
    case "missingModel":
      return "추론 모델을 선택하세요";
    case "missingPeriod":
      return "추론 일자를 선택하세요";
    case "reversedPeriod":
      return "시작일이 종료일보다 늦습니다";
    case "missingDevices":
      return "추론 대상 장치를 선택하세요";
  }
}

interface InferenceRunModalProps {
  open: boolean;
  options: InferenceRunOptions;
  devices: readonly Device[];
  draft: InferenceRunDraft;
  onDraftChange: (draft: InferenceRunDraft) => void;
  deviceQuery: string;
  onDeviceQueryChange: (query: string) => void;
  // 추론 실행을 눌렀을 때 찾은 이유와 그 이유를 표시할 Input, 그 Input을 바꾸면 연결이 해제됨
  problem: { reason: InferenceRunProblem; field: InferenceRunProblemField } | null;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

// 추론 기간, 시각, Model, 편성, 대상 장치를 선택해 추론을 요청하는 Modal 표시
export function InferenceRunModal({
  open,
  options,
  devices,
  draft,
  onDraftChange,
  deviceQuery,
  onDeviceQueryChange,
  problem,
  isSubmitting,
  onSubmit,
  onClose,
}: InferenceRunModalProps) {
  return (
    <JobRequestModal
      name="inference-run"
      open={open}
      title="추론 실행"
      texts={RUN_TEXTS}
      submitIcon={<PlayArrowRoundedIcon className="size-[1.125rem]" />}
      values={draft}
      onValuesChange={(values) => onDraftChange({ ...draft, ...values })}
      renderModelField={(labelId) => (
        <Segmented
          labelledBy={labelId}
          value={draft.modelCode}
          options={options.modelCodes.map((code) => ({ value: code, label: code }))}
          onValueChange={(modelCode) => onDraftChange({ ...draft, modelCode })}
          itemPadding="lg"
          outlined
          invalid={problem?.field === "model"}
        />
      )}
      selectablePeriod={options.selectablePeriod}
      formations={options.formations}
      devices={devices}
      unavailableDeviceCodes={options.unavailableDeviceCodes}
      deviceQuery={deviceQuery}
      onDeviceQueryChange={onDeviceQueryChange}
      error={
        problem === null ? null : { field: problem.field, message: describeProblem(problem.reason) }
      }
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
}
