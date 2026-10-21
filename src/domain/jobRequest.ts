import type { DateRange } from "@/domain/period";

// 작업 요청 Modal(학습 예약, 추론 실행)에서 고를 수 있는 값과 열 때 채울 값, 나열한 순서가 선택지의 순서임
export interface JobRequestOptions {
  // 열 때 채울 기간 "YYYY-MM-DD", 양 끝 포함
  defaultPeriod: { from: string; to: string };
  // 선택할 수 있는 날짜 범위, 끝이 null이면 그쪽 끝은 제한 없음
  selectablePeriod: DateRange;
  // 열 때 채울 하루 안의 시작 시각 "HH:mm:ss"
  defaultStartTime: string;
  defaultEndTime: string;
  // 선택할 수 있는 Model 코드 목록
  modelCodes: readonly string[];
  // 열 때 선택해 둘 Model, 선택하지 않은 채 열면 null
  defaultModelCode: string | null;
  // 선택할 수 있는 편성 번호 목록
  formations: readonly string[];
  // 열 때 선택해 둘 편성, 전체 편성이면 null
  defaultFormation: string | null;
  // 열 때 선택해 둘 장치 목록, 선택할 수 없는 장치가 섞여 있으면 화면에서 제외
  defaultDeviceCodes: readonly string[];
  // 경로가 아직 없어 선택할 수 없는 장치 목록
  unavailableDeviceCodes: readonly string[];
}

// 작업 요청 Modal에 입력 중인 값, 시각은 입력한 문자열 그대로 보관
export interface JobRequestDraft {
  period: DateRange;
  startTime: string;
  endTime: string;
  modelCode: string | null;
  formation: string | null;
  deviceCodes: readonly string[];
}

// 작업을 요청할 수 없는 사유 정의, Model 없음, 기간 없음, 기간 역전, 장치 없음
export type JobRequestProblem = "missingModel" | "missingPeriod" | "reversedPeriod" | "missingDevices";

// 사유를 표시할 입력 항목 정의, Model, 기간, 장치
export type JobRequestProblemField = "model" | "period" | "devices";

// 작업 요청 Modal에서 전달하는 값, 선택한 장치마다 Job 하나를 생성
export interface JobRequestInput {
  modelCode: string;
  deviceCodes: readonly string[];
  // 대상 편성, 전체 편성이면 null
  formation: string | null;
  // 대상 데이터의 날짜 범위 "YYYY-MM-DD", 양 끝 포함
  period: { from: string; to: string };
  // 하루 안에서 대상 데이터의 시작 시각 "HH:mm:ss", 정하지 않으면 null이고 입력 문자열의 형식은 검증하지 않음
  startTime: string | null;
  endTime: string | null;
}

// 열 때의 값을 채운 요청 폼 반환, 처음 장치 중 선택할 수 없는 장치는 제외
export function createJobRequestDraft(options: JobRequestOptions): JobRequestDraft {
  return {
    period: { from: options.defaultPeriod.from, to: options.defaultPeriod.to },
    startTime: options.defaultStartTime,
    endTime: options.defaultEndTime,
    modelCode: options.defaultModelCode,
    formation: options.defaultFormation,
    deviceCodes: options.defaultDeviceCodes.filter(
      (code) => !options.unavailableDeviceCodes.includes(code),
    ),
  };
}

// 요청할 수 없는 첫 사유 반환, Model, 기간, 장치 순서로 검사하고 없으면 null
export function findJobRequestProblem(draft: JobRequestDraft): JobRequestProblem | null {
  if (draft.modelCode === null) return "missingModel";
  if (draft.period.from === null || draft.period.to === null) return "missingPeriod";
  if (draft.period.from > draft.period.to) return "reversedPeriod";
  if (draft.deviceCodes.length === 0) return "missingDevices";
  return null;
}

// 사유를 표시할 입력 항목 반환
export function jobRequestProblemField(problem: JobRequestProblem): JobRequestProblemField {
  switch (problem) {
    case "missingModel":
      return "model";
    case "missingPeriod":
    case "reversedPeriod":
      return "period";
    case "missingDevices":
      return "devices";
  }
}

// 요청 폼에서 해당 항목의 값이 바뀌었는지 판정, 바뀐 항목의 오류만 지울 때 사용
export function hasJobRequestFieldChanged(
  field: JobRequestProblemField,
  before: JobRequestDraft,
  after: JobRequestDraft,
): boolean {
  switch (field) {
    case "model":
      return before.modelCode !== after.modelCode;
    case "period":
      return before.period.from !== after.period.from || before.period.to !== after.period.to;
    case "devices":
      return (
        before.deviceCodes.length !== after.deviceCodes.length ||
        before.deviceCodes.some((code, index) => after.deviceCodes[index] !== code)
      );
  }
}

// 입력한 시각을 전달할 값으로 변환, 앞뒤 공백을 제거하고 비면 null, "HH:mm"이면 초 ":00"을 붙임
function toRequestTime(text: string): string | null {
  const time = text.trim();
  if (time === "") return null;
  return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
}

// 요청 폼을 실행 함수에 전달할 값으로 변환, 요청할 수 없는 폼이면 null
export function toJobRequestInput(draft: JobRequestDraft): JobRequestInput | null {
  const { modelCode, period } = draft;
  const hasProblem = findJobRequestProblem(draft) !== null;
  if (hasProblem || modelCode === null || period.from === null || period.to === null) return null;
  return {
    modelCode,
    deviceCodes: [...draft.deviceCodes],
    formation: draft.formation,
    period: { from: period.from, to: period.to },
    startTime: toRequestTime(draft.startTime),
    endTime: toRequestTime(draft.endTime),
  };
}
