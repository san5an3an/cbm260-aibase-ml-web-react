// 모델 진단 화면이 처음 선택할 장치와 Model, Server가 정함
export interface ModelDiagnosticsOptions {
  defaultDeviceCode: string;
  defaultModelCode: string;
}

// 학습된 Model 버전 목록을 받을 장치와 Model
export interface ModelVersionQuery {
  deviceCode: string;
  modelCode: string;
}

// 장치와 Model의 학습된 Model 버전 1개
export interface ModelVersion {
  // 버전 이름(학습 시각 형식 "YYYYMMDDTHHmmss")
  version: string;
  // Segment 이름
  segment: string;
}

// 진단을 받을 학습된 Model, 장치, Model, 버전
export interface ModelDiagnosticsQuery extends ModelVersionQuery {
  version: string;
}

// 학습 반복 1회의 학습 및 검증 점수(0 ~ 1)
export interface LearningCurvePoint {
  epoch: number;
  train: number;
  validation: number;
}

// 모델 진단 시각화의 종류, Label은 domain/labels/diagnosticVisualization에 정의
export type DiagnosticVisualizationKind =
  | "latentReconstruction"
  | "treeDepth"
  | "decisionBoundary"
  | "reconstruction";

// 점수 분포의 Bin 하나, 점수 범위와 그 범위에 든 window 수
export interface ScoreDistributionBin {
  start: number;
  end: number;
  windowCount: number;
}

// 점수 분포, 가로축 범위, Bin, 임계값
export interface ScoreDistribution {
  rangeStart: number;
  rangeEnd: number;
  bins: readonly ScoreDistributionBin[];
  threshold: number;
}

// 재구성오차가 큰 window 1개
export interface RootCauseWindow {
  // window 시작 시각 "YYYY-MM-DDTHH:mm:ss" 형식
  windowStartAt: string;
  topSensorName: string;
  reconstructionError: number;
  zScore: number;
}

// 원인 센서로 지목된 횟수
export interface RootCauseSensorCount {
  sensorName: string;
  count: number;
}

// 근본원인 리포트, 상위 window와 원인 센서 빈도
export interface RootCauseReport {
  topWindows: readonly RootCauseWindow[];
  sensorFrequency: readonly RootCauseSensorCount[];
}

// 학습된 Model 하나의 진단, 근본원인 리포트를 만들지 않는 Model은 rootCause가 null
export interface ModelDiagnostics {
  learningCurve: readonly LearningCurvePoint[];
  visualization: DiagnosticVisualizationKind;
  scoreDistribution: ScoreDistribution;
  rootCause: RootCauseReport | null;
}

