import type { AnomalyLevelKey, AnomalyLevelThresholds } from "@/domain/anomaly";
import type {
  JobRequestDraft,
  JobRequestInput,
  JobRequestOptions,
  JobRequestProblem,
  JobRequestProblemField,
} from "@/domain/jobRequest";
import type { ModelStage } from "@/domain/model";
import type { DateRange } from "@/domain/period";

export type InferenceJobId = string;
export type InferenceResultId = string;

// 추론 Job의 상태, queued는 요청됨(아직 시작 전), running은 추론 중, succeeded는 성공, failed는 실패
export type InferenceJobStatus = "queued" | "running" | "succeeded" | "failed";

// Segment 단위로 나눠 처리하는 진행 상황, 끝낸 Segment 수와 전체 Segment 수
export interface InferenceSegmentProgress {
  done: number;
  total: number;
}

// 추론 Job의 상태별로 따라오는 값
export type InferenceJobState =
  | { status: "queued" }
  | {
      status: "running";
      // Job 전체의 진행률(%)
      progressPercent: number;
      // Segment 처리 진행 상황, 세지 않으면 null
      segmentProgress: InferenceSegmentProgress | null;
    }
  | {
      status: "succeeded";
      // 추론한 window 중 이상으로 판정한 비율(%)
      anomalyRatePercent: number;
    }
  | { status: "failed"; failureReason: string };

// 추론 Job 1건, 시각은 "YYYY-MM-DDTHH:mm:ss" 형식
export type InferenceJob = {
  id: InferenceJobId;
  deviceCode: string;
  modelCode: string;
  // 추론한 편성, 전체 편성이거나 편성을 정하기 전에 멈췄으면 null
  formation: string | null;
  createdAt: string;
  // 실패한 Job을 재시도해 같은 조건으로 새로 만든 Job인지 여부
  isRetry: boolean;
} & InferenceJobState;

// 최근 추론 Job 목록, 표시할 순서대로
export interface InferenceJobList {
  jobs: readonly InferenceJob[];
  // 목록이 담는 최근 일수
  recentDays: number;
}

// 실패한 Job인지 판정, 상태마다 결과를 적어 빠뜨리면 Type 오류 발생
export function isFailedInferenceJobStatus(status: InferenceJobStatus): boolean {
  switch (status) {
    case "failed":
      return true;
    case "queued":
    case "running":
    case "succeeded":
      return false;
  }
}

// 아직 끝나지 않은 상태(요청됨, 추론 중)인지 판정, 상태마다 결과를 적어 빠뜨리면 Type 오류 발생
export function isActiveInferenceJobStatus(status: InferenceJobStatus): boolean {
  switch (status) {
    case "queued":
    case "running":
      return true;
    case "succeeded":
    case "failed":
      return false;
  }
}

// 장치, Model, Segment별 추론 결과 1건
export interface InferenceResult {
  id: InferenceResultId;
  // 이 결과를 만든 추론 Job, Row를 Click하면 이 Job의 상세를 엶
  jobId: InferenceJobId;
  inferredAt: string;
  modelCode: string;
  deviceCode: string;
  segment: string;
  // 추론한 window 수와 그 중 이상으로 판정한 window 수
  windowCount: number;
  anomalyWindowCount: number;
  // 이상 window 비율의 등급, 기준값(levelThresholds)으로 판정한 값
  anomalyRateLevel: AnomalyLevelKey;
  threshold: number;
}

// Model, 장치가 null이면 전체
export interface InferenceResultFilter {
  modelCode: string | null;
  deviceCode: string | null;
}

// 추론 결과 조회 조건, 기간은 추론 일시의 날짜 기준이고 끝이 null이면 해당 끝은 제한 없음, Page 번호는 1부터
export interface InferenceResultQuery extends InferenceResultFilter {
  period: DateRange;
  page: number;
}

export interface InferenceResultPage {
  // 조건을 적용한 해당 Page의 Row, 표시할 순서대로
  rows: readonly InferenceResult[];
  // 조건에 맞는 결과 전체 수
  totalCount: number;
  pageCount: number;
}

// CSV로 내려받을 추론 결과의 조건, 현재 화면에 적용된 조건 및 기간과 같음
export type InferenceResultExportQuery = Omit<InferenceResultQuery, "page">;

// Filter Row와 결과 Table에서 쓰는 처음 값, 범위, 기준값
export interface InferenceFilterOptions {
  // 처음 조회 기간, 초기화를 누르면 이 기간으로 돌아감
  defaultPeriod: DateRange;
  // 선택할 수 있는 날짜 범위, 끝이 null이면 해당 끝은 제한 없음
  selectablePeriod: DateRange;
  // 결과 Table의 이상 비율 색을 나누는 기준값
  levelThresholds: AnomalyLevelThresholds;
}

// 추론 실행 Modal에서 선택할 수 있는 값과 열 때 채워 둘 값, Job 요청 Modal과 공통인 형태
export type InferenceRunOptions = JobRequestOptions;

// 추론 실행 Modal에 입력 중인 값, 시각은 입력한 Text 그대로 보관
export type InferenceRunDraft = JobRequestDraft;

// 추론 실행을 보낼 수 없는 사유와 그 사유를 표시하는 Input
export type InferenceRunProblem = JobRequestProblem;
export type InferenceRunProblemField = JobRequestProblemField;

// 추론 실행 Modal에서 넘기는 값, 선택한 장치마다 Job 하나
export type InferenceRunInput = JobRequestInput;

// Segment 하나의 추론 결과
export interface InferenceSegmentResult {
  segment: string;
  // 추론한 window 수와 그 중 이상으로 판정한 window 수
  windowCount: number;
  anomalyWindowCount: number;
  // 이상 window 비율의 등급, 결과 Row와 같은 기준값으로 판정한 값
  anomalyRateLevel: AnomalyLevelKey;
  threshold: number;
}

// 이상으로 판정한 시간대 1개, 시각은 "YYYY-MM-DDTHH:mm:ss" 형식
export interface InferenceAnomalyWindow {
  startAt: string;
  endAt: string;
  segment: string;
  formation: string;
  // 호차 번호
  car: number;
  // 이상 점수
  score: number;
}

// 편성 × 호차별로 이상 판정한 window 수, counts[편성 순번][호차 순번]
export interface InferenceCarHeatmap {
  formations: readonly string[];
  cars: readonly number[];
  counts: readonly (readonly number[])[];
}

// 추론 상세의 상태별로 따라오는 값, 실패는 실패 내용, 그 외에는 현재까지의 결과
export type InferenceJobDetailState =
  | {
      status: "failed";
      // 중단된 시각
      endedAt: string;
      // 실패 내용, Server가 작성한 문장
      failureMessage: string;
    }
  | {
      status: "queued" | "running" | "succeeded";
      // 끝난 시각, 끝나지 않았으면 null
      endedAt: string | null;
      // 결과로 만든 Alarm 수
      autoAlarmCount: number;
      segmentResults: readonly InferenceSegmentResult[];
      anomalyWindows: readonly InferenceAnomalyWindow[];
      carHeatmap: InferenceCarHeatmap;
    };

// 추론 Job 1건의 요청 조건과 결과, 시각은 "YYYY-MM-DDTHH:mm:ss" 형식
export type InferenceJobDetail = {
  id: InferenceJobId;
  deviceCode: string;
  modelCode: string;
  // 추론한 편성, 전체 편성이거나 편성을 정하기 전에 멈췄으면 null
  formation: string | null;
  createdAt: string;
  // 추론할 데이터의 날짜 범위 "YYYY-MM-DD" 형식과 하루 안의 시작 및 끝 시각 "HH:mm:ss" 형식
  requestedPeriod: { from: string; to: string };
  requestedStartTime: string;
  requestedEndTime: string;
  // 데이터를 자르는 window 하나의 길이(초)
  windowSeconds: number;
  // 추론한 Segment, 표시할 순서대로
  segments: readonly string[];
  // 추론에 사용한 학습된 Model의 단계와 버전
  trainedModel: { stage: ModelStage; version: string };
} & InferenceJobDetailState;
