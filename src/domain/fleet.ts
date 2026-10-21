import type { AnomalyLevelKey, AnomalyLevelThresholds } from "@/domain/anomaly";
import type { Device } from "@/domain/device";
import type { ModelStage } from "@/domain/model";

// 플릿 전체의 요약 수치 정의
export interface FleetSummary {
  totalInferenceCount: number;
  coveredDeviceCount: number;
  coveredSegmentCount: number;
  latestAnomalyRatePercent: number;
  cumulativeAnomalyRatePercent: number;
  alertDeviceCount: number;
  dangerDeviceCount: number;
  warningDeviceCount: number;
  // 시각을 "YYYY-MM-DDTHH:mm:ss" 형식으로 표기, 추론이 한 건도 없으면 null
  lastInferenceAt: string | null;
}

export interface RiskRankingRow {
  deviceCode: string;
  segment: string;
  level: AnomalyLevelKey;
  anomalyRatePercent: number;
  anomalyCount: number;
  totalCount: number;
  // 시각을 "YYYY-MM-DDTHH:mm:ss" 형식으로 표기
  lastInferenceAt: string;
}

export interface ModelHit {
  modelCode: string;
  windowCount: number;
}

// 하루 동안 이상을 낸 Model 수, null은 그날 저장된 결과가 없음
export type DailyHitCount = number | null;

// 이상 감지 내역의 Row 1개, 위치 하나에 해당
export interface AnomalyHistoryRow {
  formation: string;
  car: string;
  location: string;
  modelHits: readonly ModelHit[];
  isCommonAcrossModels: boolean;
  // AnomalyHistory의 dates와 같은 순서와 길이로 나열
  dailyHits: readonly DailyHitCount[];
}

// 이상을 낸 Model 수가 기준 이상이면 여러 Model의 공통 지목으로 판정
export function isCommonAcrossModels(
  modelHits: readonly ModelHit[],
  commonModelThreshold: number,
): boolean {
  return modelHits.length >= commonModelThreshold;
}

export interface AnomalyHistory {
  days: number;
  // 날짜를 "YYYY-MM-DD" 형식으로 오래된 날짜부터 나열
  dates: readonly string[];
  anomalyDayWindowThreshold: number;
  totalLocationCount: number;
  rows: readonly AnomalyHistoryRow[];
}

export interface AnomalyHistoryQuery {
  deviceCode: string;
  days: number;
}

// 이상 감지 내역에서 선택할 수 있는 장치와 기간(일)
export interface AnomalyHistoryFilterOptions {
  devices: readonly Device[];
  dayCounts: readonly number[];
}

export type ModelCoverageStatus = ModelStage | "none";

export interface ModelCoverageCell {
  modelCode: string;
  status: ModelCoverageStatus;
  segmentCount: number;
}

export interface ModelCoverageRow {
  deviceCode: string;
  cells: readonly ModelCoverageCell[];
  // 학습된 Model이 있는 Model 수
  ownedModelCount: number;
}

export interface ModelCoverageTotal {
  modelCode: string;
  productionCount: number;
  stagingCount: number;
  // 학습된 Model이 있는 장치 수
  ownedDeviceCount: number;
}

export interface ModelCoverage {
  modelCodes: readonly string[];
  rows: readonly ModelCoverageRow[];
  totals: readonly ModelCoverageTotal[];
}

// 학습된 Model이 있는 Cell 수 계산, 운영과 스테이징을 모두 포함
export function countOwnedModels(cells: readonly ModelCoverageCell[]): number {
  return cells.filter((cell) => cell.status !== "none").length;
}

// Model마다 운영, 스테이징, 보유 장치 수 집계
export function summarizeModelCoverage(
  modelCodes: readonly string[],
  rows: readonly Pick<ModelCoverageRow, "cells">[],
): ModelCoverageTotal[] {
  return modelCodes.map((modelCode) => {
    const cells = rows.flatMap((row) => row.cells.filter((cell) => cell.modelCode === modelCode));
    const productionCount = cells.filter((cell) => cell.status === "production").length;
    const stagingCount = cells.filter((cell) => cell.status === "staging").length;
    return {
      modelCode,
      productionCount,
      stagingCount,
      ownedDeviceCount: productionCount + stagingCount,
    };
  });
}

export interface FleetOverview {
  // 이 데이터를 조회한 시각을 "YYYY-MM-DDTHH:mm:ss" 형식으로 표기
  fetchedAt: string;
  summary: FleetSummary;
  levelThresholds: AnomalyLevelThresholds;
  riskRanking: readonly RiskRankingRow[];
  coverage: ModelCoverage;
}
