"use client";

import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { JobRequestModal, type JobRequestTexts } from "@/components/organisms/JobRequestModal";
import type { Device } from "@/domain/device";
import type {
  EnsembleRunDraft,
  EnsembleRunOptions,
  EnsembleRunProblem,
  EnsembleRunProblemField,
} from "@/domain/ensemble";

// Ensemble 실행의 Label, 안내, Button 문구
const RUN_TEXTS: JobRequestTexts = {
  dateLabel: "추론 일자",
  timeLabel: "추론 시각",
  modelLabel: "사용 모델",
  note: "세 모델 모두 학습본이 있는 장치만 실행됩니다",
  submitLabel: "앙상블 실행",
  submittingLabel: "앙상블 추론 요청 중...",
  unavailableHint: "(학습 불가)",
  unavailableTitle: "학습·추론 경로가 아직 없는 장치입니다",
};
// 잠긴 Model Input의 Model을 잇는 문구
const MODEL_SEPARATOR = " · ";

// Ensemble을 요청할 수 없는 이유의 오류 문구 반환, Model은 열 때 채워 두므로 보통 나오지 않음
function describeProblem(problem: EnsembleRunProblem): string {
  switch (problem) {
    case "missingModel":
      return "사용 모델을 확인하세요";
    case "missingPeriod":
      return "추론 일자를 선택하세요";
    case "reversedPeriod":
      return "시작일이 종료일보다 늦습니다";
    case "missingDevices":
      return "추론 대상 장치를 선택하세요";
  }
}

interface EnsembleRunModalProps {
  open: boolean;
  options: EnsembleRunOptions;
  devices: readonly Device[];
  draft: EnsembleRunDraft;
  onDraftChange: (draft: EnsembleRunDraft) => void;
  deviceQuery: string;
  onDeviceQueryChange: (query: string) => void;
  // Ensemble 실행을 눌렀을 때 찾은 이유와 그 이유를 표시할 Input, 그 Input을 바꾸면 연결이 해제됨
  problem: { reason: EnsembleRunProblem; field: EnsembleRunProblemField } | null;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

// 추론 기간, 시각, 편성, 대상 장치를 선택해 Model 3개를 한 번에 실행하는 Ensemble을 요청하는 Modal 표시
export function EnsembleRunModal({
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
}: EnsembleRunModalProps) {
  const modelCount = options.ensembleModelCodes.length;
  const modelText = options.ensembleModelCodes.join(MODEL_SEPARATOR);
  return (
    <JobRequestModal
      name="ensemble-run"
      open={open}
      title="앙상블 실행"
      texts={RUN_TEXTS}
      submitIcon={<PlayArrowRoundedIcon className="size-[1.125rem]" />}
      values={draft}
      onValuesChange={(values) => onDraftChange({ ...draft, ...values })}
      renderModelField={(labelId) => (
        <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1.5">
          <span
            data-slot="ensemble-run-models"
            className="flex h-8 w-max items-center gap-1.5 rounded-[0.375rem] bg-muted px-3.5 text-sm font-semibold"
          >
            <LockRoundedIcon aria-hidden className="size-4 text-muted-foreground" />
            {modelText}
          </span>
          <span data-slot="ensemble-run-models-note" className="flex items-center gap-1 text-xs text-muted-foreground">
            <InfoRoundedIcon aria-hidden className="size-3.5" />
            {`모델은 ${modelText} ${modelCount}종 고정입니다 (수정 불가)`}
          </span>
        </div>
      )}
      selectablePeriod={options.selectablePeriod}
      formations={options.formations}
      devices={devices}
      unavailableDeviceCodes={options.unavailableDeviceCodes}
      deviceQuery={deviceQuery}
      onDeviceQueryChange={onDeviceQueryChange}
      error={problem === null ? null : { field: problem.field, message: describeProblem(problem.reason) }}
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
}
