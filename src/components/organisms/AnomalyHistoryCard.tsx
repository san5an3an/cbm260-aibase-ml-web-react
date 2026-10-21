import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
import { HitStripCell } from "@/components/atoms/HitStripCell";
import { ModelHitChip } from "@/components/atoms/ModelHitChip";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/molecules/DataTable";
import type { ChartTooltipText } from "@/components/molecules/ChartTooltipBubble";
import {
  CursorTooltip,
  CursorTooltipTarget,
  useCursorTooltipHandle,
} from "@/components/molecules/CursorTooltip";
import { SectionCard } from "@/components/molecules/SectionCard";
import { SelectField } from "@/components/molecules/SelectField";
import type { Device } from "@/domain/device";
import type { AnomalyHistory, AnomalyHistoryRow, DailyHitCount } from "@/domain/fleet";
import { formatIsoMonthDay } from "@/lib/formatTime";
import { cn } from "@/lib/utils";

// Table의 Column 폭과 Table의 최소 폭, Loading Skeleton도 같은 Column으로 배치
export const ANOMALY_HISTORY_COLUMNS = "2.75rem 7.5rem 9.375rem minmax(13.75rem,1fr) 10.375rem";
export const ANOMALY_HISTORY_MIN_WIDTH = "45rem";

function describeDailyHit(date: string, hit: DailyHitCount): ChartTooltipText {
  if (hit === null) return { title: date, detail: "저장 없음" };
  if (hit === 0) return { title: date, detail: "이상 모델 없음" };
  return { title: date, detail: `이상 모델 ${hit}개` };
}

interface AnomalyHistoryCardProps {
  history: AnomalyHistory;
  devices: readonly Device[];
  deviceCode: string;
  onDeviceChange: (deviceCode: string) => void;
  dayCounts: readonly number[];
  days: number;
  onDaysChange: (days: number) => void;
  onSelectRow: (row: AnomalyHistoryRow) => void;
  // 새 내역을 기다리는 동안 Row와 아래 안내를 옅게 표시하고 Row Click 비활성화, 장치와 기간 Cell은 그대로 유지
  isWaiting: boolean;
}

// 위치별 이상 감지 내역 Table과 날짜별 Bar 표시
export function AnomalyHistoryCard({
  history,
  devices,
  deviceCode,
  onDeviceChange,
  dayCounts,
  days,
  onDaysChange,
  onSelectRow,
  isWaiting,
}: AnomalyHistoryCardProps) {
  const tooltip = useCursorTooltipHandle();
  // 기다리는 동안에는 이전 Row를 Click하거나 Keyboard로 선택해도 이상 감지 내역 Page로 이동하지 않음
  const selectRow = (row: AnomalyHistoryRow) => {
    if (isWaiting) return;
    onSelectRow(row);
  };
  const dateLabels = history.dates.map(formatIsoMonthDay);
  const firstDate = dateLabels[0] ?? "";
  const lastDate = dateLabels[dateLabels.length - 1] ?? "";

  return (
    <SectionCard
      data-slot="anomaly-history-card"
      eyebrow="ANOMALY HISTORY"
      title="이상 감지 내역"
      aside={
        <div className="flex gap-3">
          <SelectField
            label="장치"
            value={deviceCode}
            options={devices.map((device) => ({ value: device.code, label: device.name }))}
            onValueChange={onDeviceChange}
            className="w-40"
          />
          <SelectField
            label="기간"
            value={days}
            options={dayCounts.map((dayCount) => ({
              value: dayCount,
              label: `최근 ${dayCount}일`,
            }))}
            onValueChange={onDaysChange}
            className="w-[8.125rem]"
          />
        </div>
      }
      className="min-h-60 flex-[1_1_0]"
    >
      <div className="flex min-h-0 flex-[1_1_0] flex-col gap-2.5">
        <DataTable minWidth={ANOMALY_HISTORY_MIN_WIDTH}>
          <DataTableHeader>
            <DataTableHeaderRow columns={ANOMALY_HISTORY_COLUMNS}>
              <DataTableHead>#</DataTableHead>
              <DataTableHead className="px-3">편성 · 호차</DataTableHead>
              <DataTableHead className="px-3">위치</DataTableHead>
              <DataTableHead className="px-3">모델별 이상 window</DataTableHead>
              <DataTableHead className="px-3">날짜별</DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody aria-busy={isWaiting}>
            {history.rows.map((row, index) => {
              const topCount = Math.max(...row.modelHits.map((hit) => hit.windowCount));
              return (
                <DataTableRow
                  key={`${row.formation}-${row.car}-${row.location}`}
                  columns={ANOMALY_HISTORY_COLUMNS}
                  title="누르면 이상 감지 내역"
                  className={cn(
                    "h-[2.375rem] cursor-pointer",
                    disabledLookClassName,
                    row.isCommonAcrossModels && "shadow-[inset_0.1875rem_0_0_var(--danger)]",
                  )}
                  aria-disabled={isWaiting}
                  tabIndex={0}
                  onClick={() => selectRow(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectRow(row);
                    }
                  }}
                >
                  <DataTableCell className="text-muted-foreground tabular-nums">
                    {index + 1}
                  </DataTableCell>
                  <DataTableCell className="px-3">
                    {row.formation} · {row.car}호차
                  </DataTableCell>
                  <DataTableCell className="truncate px-3 text-muted-foreground">
                    {row.location}
                  </DataTableCell>
                  <DataTableCell className="flex items-center gap-1.5 overflow-hidden px-3">
                    {row.modelHits.map((hit) => (
                      <ModelHitChip
                        key={hit.modelCode}
                        label={`${hit.modelCode} · ${hit.windowCount}개`}
                        isEmphasized={hit.windowCount === topCount}
                      />
                    ))}
                  </DataTableCell>
                  <DataTableCell className="flex gap-0.5 px-3">
                    {row.dailyHits.map((hit, dayIndex) => (
                      <CursorTooltipTarget
                        key={dayIndex}
                        handle={tooltip}
                        slot="hit-strip-cell"
                        text={describeDailyHit(dateLabels[dayIndex] ?? "", hit)}
                      >
                        <HitStripCell level={hit} />
                      </CursorTooltipTarget>
                    ))}
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
        <CursorTooltip handle={tooltip} />
        <div
          data-slot="anomaly-history-notes"
          className={cn(
            "flex-none text-xs leading-[1.125rem] text-muted-foreground",
            isWaiting && "opacity-50",
          )}
        >
          <div>
            최근 {history.days}일 ({firstDate} ~ {lastDate}) · 이상일 = 하루에 이상 window{" "}
            {history.anomalyDayWindowThreshold}개 이상 · 이상 위치 {history.totalLocationCount}곳 중
            상위 {history.rows.length}곳 표시
          </div>
          <div>날짜별 칸: 진할수록 그날 이상을 낸 모델이 많음 · 점선 = 그날 저장 없음</div>
        </div>
      </div>
    </SectionCard>
  );
}
