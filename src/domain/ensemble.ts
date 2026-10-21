import type { AlarmSeverityKey } from "@/domain/alarms";
import type { AnomalyLevelKey } from "@/domain/anomaly";
import type { InferenceJobStatus } from "@/domain/inference";
import type {
  JobRequestDraft,
  JobRequestInput,
  JobRequestOptions,
  JobRequestProblem,
  JobRequestProblemField,
} from "@/domain/jobRequest";

export type EnsembleJobId = string;

// Ensemble Job의 상태, 추론 Job과 같은 네 가지(요청됨, 추론 중, 성공, 실패)
export type EnsembleJobStatus = InferenceJobStatus;

// Ensemble Job의 상태별로 따라오는 값, 끝난 시각은 "YYYY-MM-DDTHH:mm:ss" 형식
export type EnsembleJobState =
  | { status: "queued" }
  | { status: "running" }
  | { status: "succeeded"; endedAt: string }
  | {
      status: "failed";
      endedAt: string;
      // Card 설명에 표시할 실패 사유, Server가 작성한 글
      failureReason: string;
    };

// Ensemble Job 1건, 시각은 "YYYY-MM-DDTHH:mm:ss" 형식
export type EnsembleJob = {
  id: EnsembleJobId;
  deviceCode: string;
  // 한 번에 실행한 Model의 코드, 표시할 순서대로
  modelCodes: readonly string[];
  // 추론한 편성, 전체 편성이면 null
  formation: string | null;
  createdAt: string;
  // 추론할 데이터의 날짜 범위 "YYYY-MM-DD" 형식, 양 끝 포함
  requestedPeriod: { from: string; to: string };
  // 실패한 Job을 재시도해 같은 조건으로 새로 만든 Job인지 여부
  isRetry: boolean;
} & EnsembleJobState;

// 다수결 판정의 규칙, any는 한 Model 이상, all은 세 Model 동시
export type EnsembleConsensusRule = "any" | "all";

// window 번호의 구간, 0부터 세고 양 끝 포함
export interface EnsembleWindowRange {
  startWindow: number;
  endWindow: number;
}

// 판정 Row 1개의 공통 값, 이상 window 수, 비율(%), 그 비율의 등급, 이상 구간
interface EnsembleVerdictValues {
  anomalyWindowCount: number;
  anomalyRatePercent: number;
  anomalyRateLevel: AnomalyLevelKey;
  // 이상으로 판정한 window 구간, 앞에서부터 나열
  anomalyRanges: readonly EnsembleWindowRange[];
}

// Model 하나의 판정
export interface EnsembleModelVerdict extends EnsembleVerdictValues {
  modelCode: string;
  threshold: number;
}

// 다수결 규칙 하나의 판정
export interface EnsembleConsensusVerdict extends EnsembleVerdictValues {
  rule: EnsembleConsensusRule;
}

// 이상 구간에서 Model이 얼마나 함께 잡았는지, unanimous는 모든 Model이 구간 전체, partial은 일부 Model
export type EnsembleSegmentAgreement = "unanimous" | "partial";

// 이상 구간 1개, Model마다 그 구간에서 이상으로 판정한 window 수(표시할 순서대로, 0인 Model은 제외)
export interface EnsembleAnomalySegment {
  range: EnsembleWindowRange;
  agreement: EnsembleSegmentAgreement;
  modelHits: readonly { modelCode: string; anomalyWindowCount: number }[];
}

// 성공한 Job의 판정, Model, 다수결, 이상 구간은 표시할 순서대로
export interface EnsembleVerdict {
  // 추론한 전체 window 수
  windowCount: number;
  models: readonly EnsembleModelVerdict[];
  consensus: readonly EnsembleConsensusVerdict[];
  segments: readonly EnsembleAnomalySegment[];
}

// 판정에서 Alarm으로 등록할 때 채워 둘 Model과 심각도
export interface EnsembleAlarmDefaults {
  modelCode: string;
  severity: AlarmSeverityKey;
}

// Ensemble 상세의 상태별로 따라오는 값
export type EnsembleJobDetailState =
  | { status: "queued" | "running" }
  | {
      status: "succeeded";
      endedAt: string;
      verdict: EnsembleVerdict;
      alarmDefaults: EnsembleAlarmDefaults;
    }
  | {
      status: "failed";
      endedAt: string;
      // 실패 내용, Server가 작성한 문장
      failureMessage: string;
    };

// Ensemble Job 1건의 요청 조건과 판정, 시각은 "YYYY-MM-DDTHH:mm:ss" 형식
export type EnsembleJobDetail = {
  id: EnsembleJobId;
  deviceCode: string;
  modelCodes: readonly string[];
  formation: string | null;
  createdAt: string;
  requestedPeriod: { from: string; to: string };
  // 추론한 Segment
  segment: string;
  // 데이터를 자르는 window 하나의 길이(초)
  windowSeconds: number;
} & EnsembleJobDetailState;

// Ensemble 실행 Modal의 선택지와 열 때 채워 둘 값, Model은 Ensemble 코드 하나로 채워 두고 선택하지 않음
export type EnsembleRunOptions = JobRequestOptions & {
  // Ensemble 하나가 함께 실행하는 Model의 코드, 잠긴 Model Input에 표시할 순서대로
  ensembleModelCodes: readonly string[];
};

// Ensemble 실행 Modal의 입력 중인 값, 전송할 수 없는 이유, 전달 값 Type 정의, Job 요청 Modal과 공통 형태
export type EnsembleRunDraft = JobRequestDraft;
export type EnsembleRunProblem = JobRequestProblem;
export type EnsembleRunProblemField = JobRequestProblemField;
export type EnsembleRunInput = JobRequestInput;

// 구간에 든 window 수 계산
export function countWindows(range: EnsembleWindowRange): number {
  return range.endWindow - range.startWindow + 1;
}

// 이상 구간의 Model 일치 정도 판정, 모든 Model이 구간의 window를 전부 잡았으면 unanimous
export function classifySegmentAgreement(
  range: EnsembleWindowRange,
  modelHits: EnsembleAnomalySegment["modelHits"],
  modelCount: number,
): EnsembleSegmentAgreement {
  const length = countWindows(range);
  const isUnanimous =
    modelHits.length === modelCount && modelHits.every((hit) => hit.anomalyWindowCount === length);
  return isUnanimous ? "unanimous" : "partial";
}
