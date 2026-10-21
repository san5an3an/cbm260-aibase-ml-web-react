"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { Segmented } from "@/components/molecules/Segmented";
import { JobRequestModal, type JobRequestTexts } from "@/components/organisms/JobRequestModal";
import type { Device } from "@/domain/device";
import type {
  TrainingScheduleDraft,
  TrainingScheduleField,
  TrainingScheduleOptions,
  TrainingScheduleProblem,
} from "@/domain/training";

// 학습 예약의 Label, 안내, Button 문구
const SCHEDULE_TEXTS: JobRequestTexts = {
  dateLabel: "학습 일자",
  timeLabel: "학습 시각",
  modelLabel: "학습 모델",
  note: "예약하면 장치 학습 예약 카드에 추가됩니다",
  submitLabel: "예약",
  submittingLabel: "학습 예약 요청 중...",
  unavailableHint: "(학습 불가)",
  unavailableTitle: "학습·추론 경로가 아직 없는 장치입니다",
};

// 예약할 수 없는 사유의 오류 문구 반환
function describeProblem(problem: TrainingScheduleProblem): string {
  switch (problem) {
    case "missingModel":
      return "학습 모델을 선택하세요";
    case "missingPeriod":
      return "학습 일자를 선택하세요";
    case "reversedPeriod":
      return "시작일이 종료일보다 늦습니다";
    case "missingDevices":
      return "학습 대상 장치를 선택하세요";
  }
}

interface TrainingScheduleModalProps {
  open: boolean;
  options: TrainingScheduleOptions;
  devices: readonly Device[];
  draft: TrainingScheduleDraft;
  onDraftChange: (draft: TrainingScheduleDraft) => void;
  deviceQuery: string;
  onDeviceQueryChange: (query: string) => void;
  // 예약 Click 시 찾은 사유와 그 사유를 표시할 Input, 해당 Input을 바꾸면 비움
  problem: { reason: TrainingScheduleProblem; field: TrainingScheduleField } | null;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

// 학습 기간, 시각, Model, 편성, 대상 장치를 선택해 학습을 예약하는 Modal 표시
export function TrainingScheduleModal({
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
}: TrainingScheduleModalProps) {
  return (
    <JobRequestModal
      name="training-schedule"
      open={open}
      title="학습 예약"
      texts={SCHEDULE_TEXTS}
      submitIcon={<CheckRoundedIcon className="size-[1.125rem]" />}
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
