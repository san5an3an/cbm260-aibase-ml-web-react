import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/molecules/DataTable";
import { RatioBar } from "@/components/molecules/RatioBar";
import { SectionCard } from "@/components/molecules/SectionCard";
import type { AnomalyLevelThresholds } from "@/domain/anomaly";
import type { RiskRankingRow } from "@/domain/fleet";
import { anomalyLevelLabels } from "@/domain/labels/anomalyLevel";
import { formatIsoDateTime } from "@/lib/formatTime";
import { cn } from "@/lib/utils";

// Table의 Column 폭과 Table의 최소 폭, Loading Skeleton도 같은 Column으로 배치
export const RISK_RANKING_COLUMNS =
  "6rem minmax(9.375rem,1.2fr) 5.75rem minmax(8.125rem,1fr) 6.25rem 10rem";
export const RISK_RANKING_MIN_WIDTH = "46.25rem";
// Bar가 가득 차는 이상비율(%)
const FULL_BAR_PERCENT = 40;
// 이상비율의 소수 자릿수, 끝의 0은 생략
const RATE_FRACTION_DIGITS = 1;

function describeLevelThresholds(thresholds: AnomalyLevelThresholds): string {
  const { danger, warning, caution, normal } = anomalyLevelLabels;
  return `${danger.label} ≥ ${thresholds.dangerMinPercent}% · ${warning.label} ≥ ${thresholds.warningMinPercent}% · ${caution.label} > 0% · ${normal.label} 0%`;
}

// Row 하나를 가리키는 값, 같은 장치가 Segment별로 여러 Row일 수 있음
export type RiskRankingRowKey = Pick<RiskRankingRow, "deviceCode" | "segment">;

interface RiskRankingCardProps {
  rows: readonly RiskRankingRow[];
  levelThresholds: AnomalyLevelThresholds;
  selectedRow: RiskRankingRowKey | null;
  onSelectRow: (row: RiskRankingRowKey) => void;
  // 새 순위를 기다리는 동안 Row를 옅게 표시하고 선택 비활성화
  isWaiting: boolean;
}

// 최신 이상비율이 높은 장치 순위 Table 표시
export function RiskRankingCard({
  rows,
  levelThresholds,
  selectedRow,
  onSelectRow,
  isWaiting,
}: RiskRankingCardProps) {
  // 기다리는 동안에는 이전 Row를 Click하거나 Keyboard로 선택해도 선택하지 않음
  const selectRow = (row: RiskRankingRowKey) => {
    if (isWaiting) return;
    onSelectRow(row);
  };

  return (
    <SectionCard
      data-slot="risk-ranking-card"
      eyebrow="RISK RANKING"
      title={`위험 장치 랭킹 · 최신 이상비율 상위 ${rows.length}`}
      aside={
        <span className="text-xs leading-4 whitespace-nowrap text-muted-foreground">
          {describeLevelThresholds(levelThresholds)}
        </span>
      }
      className="min-h-0 flex-[0_1_auto]"
    >
      <DataTable minWidth={RISK_RANKING_MIN_WIDTH}>
        <DataTableHeader>
          <DataTableHeaderRow columns={RISK_RANKING_COLUMNS}>
            <DataTableHead>상태</DataTableHead>
            <DataTableHead>장치</DataTableHead>
            <DataTableHead>세그먼트</DataTableHead>
            <DataTableHead>이상비율</DataTableHead>
            <DataTableHead className="text-right">이상 / 전체</DataTableHead>
            <DataTableHead>최근 추론</DataTableHead>
          </DataTableHeaderRow>
        </DataTableHeader>
        <DataTableBody aria-busy={isWaiting}>
          {rows.map((row) => {
            const levelLabel = anomalyLevelLabels[row.level];
            const rowKey: RiskRankingRowKey = { deviceCode: row.deviceCode, segment: row.segment };
            const isSelected =
              selectedRow !== null &&
              selectedRow.deviceCode === row.deviceCode &&
              selectedRow.segment === row.segment;
            return (
              <DataTableRow
                key={`${row.deviceCode}/${row.segment}`}
                columns={RISK_RANKING_COLUMNS}
                className={cn("h-9 cursor-pointer", disabledLookClassName)}
                data-state={isSelected ? "selected" : undefined}
                aria-selected={isSelected}
                aria-disabled={isWaiting}
                tabIndex={0}
                onClick={() => selectRow(rowKey)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectRow(rowKey);
                  }
                }}
              >
                <DataTableCell>
                  <StatusBadge
                    tone={row.level}
                    shortLabel={levelLabel.shortLabel}
                    label={levelLabel.label}
                  />
                </DataTableCell>
                <DataTableCell className="truncate font-bold">{row.deviceCode}</DataTableCell>
                <DataTableCell>{row.segment}</DataTableCell>
                <DataTableCell>
                  <RatioBar
                    tone={row.level}
                    fillPercent={(row.anomalyRatePercent / FULL_BAR_PERCENT) * 100}
                    label={`${Number(row.anomalyRatePercent.toFixed(RATE_FRACTION_DIGITS))}%`}
                  />
                </DataTableCell>
                <DataTableCell className="text-right tabular-nums">
                  {row.anomalyCount} / {row.totalCount}
                </DataTableCell>
                <DataTableCell className="text-muted-foreground tabular-nums">
                  {formatIsoDateTime(row.lastInferenceAt)}
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </SectionCard>
  );
}
