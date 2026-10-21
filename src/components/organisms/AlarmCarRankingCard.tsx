import { AlarmSeverity } from "@/components/atoms/AlarmSeverity";
import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/molecules/DataTable";
import { SectionCard } from "@/components/molecules/SectionCard";
import { alarmSeverityTones } from "@/components/organisms/alarmTones";
import type { AlarmCarRankingRow, AlarmSeverityCounts } from "@/domain/alarms";
import { alarmSeverityLabels } from "@/domain/labels/alarmSeverity";
import { cn } from "@/lib/utils";

// 순위 Table의 Column Width, Loading Skeleton도 같은 Column으로 배치
export const ALARM_CAR_RANKING_COLUMNS = "3.5rem minmax(0,1fr) minmax(0,1fr) 7.5rem";

// 심각도별 수를 "L0/M0/H1" 형식의 Text로 변환
function describeSeverityCounts(counts: AlarmSeverityCounts): string {
  return (["LOW", "MID", "HIGH"] as const)
    .map((severity) => `${alarmSeverityLabels[severity].shortLabel}${counts[severity]}`)
    .join("/");
}

interface AlarmCarRankingCardProps {
  rows: readonly AlarmCarRankingRow[];
  // 순위를 다시 받는 동안 Row를 옅게 하고 Click할 수 없게 표시
  isRowDisabled: boolean;
  onSelectRow: (row: AlarmCarRankingRow) => void;
}

// Alarm이 많은 호차의 순위 Table Card 표시
export function AlarmCarRankingCard({
  rows,
  isRowDisabled,
  onSelectRow,
}: AlarmCarRankingCardProps) {
  return (
    <SectionCard
      data-slot="alarm-car-ranking-card"
      eyebrow="CAR RANKING"
      title={`호차별 알람 순위 · 상위 ${rows.length}`}
      aside={
        <span
          data-slot="alarm-car-ranking-hint"
          className="text-xs leading-4 whitespace-nowrap text-muted-foreground"
        >
          행을 누르면 그 편성의 이상 감지 내역
        </span>
      }
      className="min-h-[12.5rem] flex-[1_1_0]"
    >
      <DataTable minWidth="0" aria-busy={isRowDisabled || undefined}>
        <DataTableHeader>
          <DataTableHeaderRow columns={ALARM_CAR_RANKING_COLUMNS} className="h-8">
            <DataTableHead className="px-0 text-center">#</DataTableHead>
            <DataTableHead>편성 · 호차</DataTableHead>
            <DataTableHead>알람</DataTableHead>
            <DataTableHead className="px-0 text-center">최고 심각도</DataTableHead>
          </DataTableHeaderRow>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row, index) => (
            <DataTableRow
              key={`${row.formation}-${row.car}`}
              columns={ALARM_CAR_RANKING_COLUMNS}
              title={`누르면 이상 감지 내역 (${row.alarmDate})`}
              className={cn("h-[1.6875rem] cursor-pointer", disabledLookClassName)}
              aria-disabled={isRowDisabled || undefined}
              tabIndex={0}
              onClick={() => onSelectRow(row)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectRow(row);
                }
              }}
            >
              <DataTableCell className="px-0 text-center text-muted-foreground tabular-nums">
                {index + 1}
              </DataTableCell>
              <DataTableCell>
                편성 {row.formation} · {row.car}호차
              </DataTableCell>
              <DataTableCell className="flex items-baseline gap-2 leading-4">
                <b>{row.alarmCount}</b>
                <span className="text-[0.6875rem] leading-[0.8125rem] tracking-[0.01875rem] text-muted-foreground">
                  {describeSeverityCounts(row.countsBySeverity)}
                </span>
              </DataTableCell>
              <DataTableCell className="flex justify-center px-0">
                <AlarmSeverity
                  size="sm"
                  tone={alarmSeverityTones[row.topSeverity]}
                  label={alarmSeverityLabels[row.topSeverity].label}
                />
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </SectionCard>
  );
}
