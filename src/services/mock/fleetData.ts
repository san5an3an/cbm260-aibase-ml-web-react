import { classifyAnomalyRate } from "@/domain/anomaly";
import type { Device } from "@/domain/device";
import { countOwnedModels, isCommonAcrossModels, summarizeModelCoverage } from "@/domain/fleet";
import type {
  AnomalyHistory,
  AnomalyHistoryFilterOptions,
  AnomalyHistoryQuery,
  AnomalyHistoryRow,
  DailyHitCount,
  FleetOverview,
  FleetSummary,
  ModelCoverageCell,
  ModelCoverageRow,
  RiskRankingRow,
} from "@/domain/fleet";
import { ANOMALY_LEVEL_THRESHOLDS } from "@/services/mock/anomalyRules";
import { formatLocalIsoDateTime } from "@/lib/formatTime";
import { isoDateBeforeToday, shiftIsoDate } from "@/services/mock/dates";
import { markScreenEntry, respondLater, respondNow } from "@/services/mock/latency";

const MODEL_CODES = ["IF", "SVM", "VAE", "PCA"] as const;

function buildFleetSummary(): FleetSummary {
  return {
    totalInferenceCount: 8642,
    coveredDeviceCount: 21,
    coveredSegmentCount: 26,
    latestAnomalyRatePercent: 10.1,
    cumulativeAnomalyRatePercent: 6.8,
    alertDeviceCount: 8,
    dangerDeviceCount: 4,
    warningDeviceCount: 4,
    lastInferenceAt: `${shiftIsoDate("2026-09-23")}T12:30:00`,
  };
}

const RISK_RANKING: readonly [string, number, number, number, string, string][] = [
  ["MICOM_AIRPURIFIER", 34, 65, 190, "2026-09-21", "12:16:14"],
  ["ATC", 29, 44, 150, "2026-09-20", "12:25:21"],
  ["CMSB", 26, 70, 270, "2026-09-20", "12:13:21"],
  ["TCMS", 22, 33, 150, "2026-09-21", "12:20:14"],
  ["MASCON", 18, 41, 230, "2026-09-22", "12:27:07"],
  ["VVVF", 15, 41, 270, "2026-09-23", "12:18:00"],
  ["UNVR", 13, 35, 270, "2026-09-22", "12:23:07"],
  ["TRACTION_MOTOR", 11, 25, 230, "2026-09-21", "12:12:14"],
  ["BMS", 9, 24, 270, "2026-09-21", "12:28:14"],
  ["DCU", 8, 18, 230, "2026-09-20", "12:17:21"],
];

function buildRiskRanking(): RiskRankingRow[] {
  return RISK_RANKING.map(([deviceCode, percent, anomalyCount, totalCount, date, time]) => ({
    deviceCode,
    segment: "default",
    level: classifyAnomalyRate(percent, ANOMALY_LEVEL_THRESHOLDS),
    anomalyRatePercent: percent,
    anomalyCount,
    totalCount,
    lastInferenceAt: `${shiftIsoDate(date)}T${time}`,
  }));
}

// 장치별 Model 학습 버전, P는 운영, S는 스테이징, N은 미학습, 뒤의 숫자는 Segment 수
const COVERAGE_DEVICES = [
  "ATC",
  "AXLE_BEARING",
  "BMS",
  "CMSB",
  "DCU",
  "DRIVING_GEAR",
  "ECU",
  "ENCD",
  "ESW",
  "FRU",
  "IDBC",
  "MASCON",
  "MICOM_AIRPURIFIER",
  "MICOM_COOLER",
  "PAC",
  "PISC",
  "SIV",
  "TCMS",
  "TRACTION_MOTOR",
  "UNVR",
  "VVVF",
] as const;

const COVERAGE_CODES =
  "P2 S2 N N|S1 P1 S1 N|P1 S1 P1 S1|S1 P1 N N|P2 S2 P2 N|S1 P1 S1 P1|P1 S1 N N|S1 P1 S1 N|P2 S2 P2 S2|S1 P1 N N|P1 S1 P1 N|S1 P1 S1 P1|P2 S2 N N|S1 P1 S1 N|P1 S1 P1 S1|S1 P1 N N|P2 S2 P2 N|S1 P1 S1 P1|P1 S1 N N|S1 P1 S1 N|P2 S2 P2 S2";

function parseCoverageCell(code: string, modelCode: string): ModelCoverageCell {
  if (code === "N") {
    return { modelCode, status: "none", segmentCount: 0 };
  }
  return {
    modelCode,
    status: code.startsWith("P") ? "production" : "staging",
    segmentCount: Number(code.slice(1)),
  };
}

function buildModelCoverageRows(): ModelCoverageRow[] {
  const rows = COVERAGE_CODES.split("|").map((row) => row.split(" "));
  return COVERAGE_DEVICES.map((deviceCode, rowIndex) => {
    const cells = rows[rowIndex].map((code, columnIndex) =>
      parseCoverageCell(code, MODEL_CODES[columnIndex]),
    );
    return { deviceCode, cells, ownedModelCount: countOwnedModels(cells) };
  });
}

export function buildFleetOverview(): FleetOverview {
  const coverageRows = buildModelCoverageRows();
  return {
    fetchedAt: formatLocalIsoDateTime(new Date()),
    summary: buildFleetSummary(),
    levelThresholds: ANOMALY_LEVEL_THRESHOLDS,
    riskRanking: buildRiskRanking(),
    coverage: {
      modelCodes: [...MODEL_CODES],
      rows: coverageRows,
      totals: summarizeModelCoverage(MODEL_CODES, coverageRows),
    },
  };
}

const ANOMALY_HISTORY_DEVICES: readonly Device[] = [
  { code: "AXLE_BEARING", name: "차축 베어링" },
  { code: "DRIVING_GEAR", name: "구동 기어" },
  { code: "TRACTION_MOTOR", name: "견인 전동기" },
];

const ANOMALY_HISTORY_DAY_COUNTS = [14, 30, 90] as const;

export function buildAnomalyHistoryFilterOptions(): AnomalyHistoryFilterOptions {
  return {
    devices: ANOMALY_HISTORY_DEVICES,
    dayCounts: [...ANOMALY_HISTORY_DAY_COUNTS],
  };
}

// 날짜별 이상 Model 수, 0~3, x는 그날 저장 없음
const ANOMALY_HISTORY: readonly [string, string, string, [string, number][], string][] = [
  ["401", "0", "4010-H-1-False", [["IF", 100], ["VAE", 75]], "33333113333333"],
  ["402", "4", "4024-T2-True", [["IF", 80], ["VAE", 83]], "33333333333233"],
  ["402", "3", "4023-H-1-False", [["IF", 53], ["VAE", 91]], "2233333332x011"],
  ["403", "7", "4037-T-2-True", [["IF", 85], ["VAE", 55]], "33322033302223"],
  ["403", "6", "4036-H-1-False", [["IF", 56], ["VAE", 66]], "33333322110230x"],
  ["401", "1", "4011-T-2-True", [["IF", 47], ["VAE", 71]], "22x333333332222"],
  ["402", "5", "4025-H-3-True", [["IF", 95], ["VAE", 32]], "01222222222222"],
];

// Mock 데이터가 가진 날짜 수
const ANOMALY_HISTORY_AVAILABLE_DAYS = 14;
// 하루의 이상 window가 이 수 이상이면 이상일로 판정
const ANOMALY_DAY_WINDOW_THRESHOLD = 5;
// 이 수 이상의 Model이 같은 위치를 지목하면 공통 지목으로 판정
const COMMON_MODEL_THRESHOLD = 2;

function parseDailyHit(character: string): DailyHitCount {
  if (character === "x") return null;
  return Number(character);
}

function buildAnomalyHistoryRows(dayCount: number): AnomalyHistoryRow[] {
  return ANOMALY_HISTORY.map(([formation, car, location, hits, strip]) => {
    const modelHits = hits.map(([modelCode, windowCount]) => ({ modelCode, windowCount }));
    return {
      formation,
      car,
      location,
      modelHits,
      isCommonAcrossModels: isCommonAcrossModels(modelHits, COMMON_MODEL_THRESHOLD),
      dailyHits: strip
        .slice(0, ANOMALY_HISTORY_AVAILABLE_DAYS)
        .slice(ANOMALY_HISTORY_AVAILABLE_DAYS - dayCount)
        .split("")
        .map(parseDailyHit),
    };
  });
}

export function buildAnomalyHistory(requestedDays: number): AnomalyHistory {
  const days = Math.min(requestedDays, ANOMALY_HISTORY_AVAILABLE_DAYS);
  const rows = buildAnomalyHistoryRows(days);
  return {
    days,
    dates: Array.from({ length: days }, (_, index) => isoDateBeforeToday(days - index)),
    anomalyDayWindowThreshold: ANOMALY_DAY_WINDOW_THRESHOLD,
    totalLocationCount: rows.length,
    rows,
  };
}

// 화면 진입 시 호출하는 조회 중 첫 진입에서 지연 시간을 적용할 조회 이름, 요약 조회가 호출하면 각 조회에 한 번씩 적용
const ENTRY_QUERY_NAMES = ["fleetOverview", "anomalyHistory"] as const;

// 요약 응답, 화면 진입으로 표시하고 첫 진입 시 지연 시간 적용. 새Logo침도 이 조회부터 다시 호출하므로 같은 지연 시간 적용
export function respondFleetOverview(signal?: AbortSignal): Promise<FleetOverview> {
  markScreenEntry(ENTRY_QUERY_NAMES);
  return respondLater("fleetOverview", signal, buildFleetOverview);
}

// 이상 감지 내역의 선택지 응답, 즉시 응답
export function respondAnomalyHistoryFilterOptions(
  signal?: AbortSignal,
): Promise<AnomalyHistoryFilterOptions> {
  return respondNow(signal, buildAnomalyHistoryFilterOptions);
}

// 이상 감지 내역 응답, 첫 진입과 장치나 기간 변경 시 지연 시간 적용
export function respondAnomalyHistory(
  query: AnomalyHistoryQuery,
  signal?: AbortSignal,
): Promise<AnomalyHistory> {
  return respondLater("anomalyHistory", signal, () => buildAnomalyHistory(query.days));
}
