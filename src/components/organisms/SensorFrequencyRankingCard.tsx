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
import { unactionedLevelClassNames } from "@/components/organisms/measureTones";
import type { SensorFrequencyRow } from "@/domain/measures";
import { formatIsoHourMinute } from "@/lib/formatTime";
import { cn } from "@/lib/utils";

// 순위 Table의 Column 폭, Loading Skeleton도 같은 Column으로 배치
export const SENSOR_FREQUENCY_COLUMNS =
  "3.5rem minmax(7.5rem,1fr) minmax(7.5rem,10.625rem) 4rem 6.25rem";

interface SensorFrequencyRankingCardProps {
  rows: readonly SensorFrequencyRow[];
}

// 이상으로 자주 지목된 센서의 순위 Table 표시, Bar는 받은 Row 중 가장 많은 발생 횟수를 가득 찬 길이로 표시
export function SensorFrequencyRankingCard({ rows }: SensorFrequencyRankingCardProps) {
  const maxCount = Math.max(0, ...rows.map((row) => row.occurrenceCount));

  return (
    <SectionCard
      data-slot="sensor-frequency-ranking-card"
      eyebrow="CHRONIC SENSORS"
      title="센서 빈발 이상 랭킹"
      description="이상으로 자주 지목된 센서 = 반복 고장 부품 후보"
      className="min-h-0 min-w-0 flex-[0_0_clamp(27.5rem,33vw,40rem)]"
    >
      <DataTable minWidth="0">
        <DataTableHeader>
          <DataTableHeaderRow columns={SENSOR_FREQUENCY_COLUMNS}>
            <DataTableHead>순위</DataTableHead>
            <DataTableHead>센서 / 장치</DataTableHead>
            <DataTableHead>발생 횟수</DataTableHead>
            <DataTableHead className="text-right">미조치</DataTableHead>
            <DataTableHead>최근 발생</DataTableHead>
          </DataTableHeaderRow>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row, index) => (
            <DataTableRow
              key={`${row.sensorName}-${row.deviceCode}`}
              columns={SENSOR_FREQUENCY_COLUMNS}
              className="h-[3.125rem] hover:bg-transparent"
            >
              <DataTableCell className="text-center">{index + 1}</DataTableCell>
              <DataTableCell className="flex flex-col leading-5">
                <span className="truncate font-bold">{row.sensorName}</span>
                <span className="text-xs leading-[0.875rem] text-muted-foreground">
                  {row.deviceCode}
                </span>
              </DataTableCell>
              <DataTableCell>
                <RatioBar
                  size="md"
                  tone="brandGradient"
                  fillPercent={maxCount === 0 ? 0 : (row.occurrenceCount / maxCount) * 100}
                  label={String(row.occurrenceCount)}
                />
              </DataTableCell>
              <DataTableCell
                className={cn(
                  "text-right font-bold",
                  unactionedLevelClassNames[row.unactionedLevel],
                )}
              >
                {row.unactionedCount}
              </DataTableCell>
              <DataTableCell className="text-muted-foreground tabular-nums">
                {formatIsoHourMinute(row.lastOccurredAt)}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </SectionCard>
  );
}
