"use client";

import FindInPageRoundedIcon from "@mui/icons-material/FindInPageRounded";
import { AnimatePresence } from "motion/react";
import { ActionButton } from "@/components/atoms/ActionButton";
import { AlarmSeverity } from "@/components/atoms/AlarmSeverity";
import { CheckboxControl } from "@/components/atoms/CheckboxControl";
import { ColumnSortButton, columnAriaSort } from "@/components/atoms/ColumnSortButton";
import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
import { levelTextClassNames } from "@/components/atoms/levelTextClassNames";
import { StatePill } from "@/components/atoms/StatePill";
import { BulkBar } from "@/components/molecules/BulkBar";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/molecules/DataTable";
import { EmptyState } from "@/components/molecules/EmptyState";
import { Pagination } from "@/components/molecules/Pagination";
import { SectionCard } from "@/components/molecules/SectionCard";
import { alarmSeverityTones, alarmStatusTones } from "@/components/organisms/alarmTones";
import type { Alarm, AlarmId, AlarmSort, AlarmSortKey } from "@/domain/alarms";
import { alarmSeverityLabels } from "@/domain/labels/alarmSeverity";
import { alarmSourceLabels } from "@/domain/labels/alarmSource";
import { alarmStatusLabels } from "@/domain/labels/alarmStatus";
import { formatIsoDate, formatIsoDateTime, formatIsoTime } from "@/lib/formatTime";
import { cn } from "@/lib/utils";

// Alarm 목록 Table의 Column Width와 Table의 최소 Width, Loading Skeleton도 같은 Column으로 배치
export const ALARM_WORKLIST_COLUMNS =
  "3rem 10.625rem minmax(10rem,1fr) 7.8125rem 5.9375rem 8.125rem 5.9375rem 5.3125rem 5.3125rem 8.75rem";
export const ALARM_WORKLIST_MIN_WIDTH = "70.8125rem";
// 값이 없는 Cell에 표시할 Text
const EMPTY_VALUE = "-";
// 옅게 잠근 Row 안의 Button은 Row의 옅기만 따르도록 Button 자체의 옅기를 덮어씀
const lockedRowButtonClassName = "[&_[data-slot=action-button][aria-disabled=true]]:opacity-100";

interface ColumnHead {
  label: string;
  sortKey?: AlarmSortKey;
  className?: string;
}

// Checkbox Column 뒤에 오는 머리글 정의
const columnHeads: readonly ColumnHead[] = [
  { label: "발생시각", sortKey: "occurredAt" },
  { label: "장치 · 모델" },
  { label: "편성 / 호차" },
  { label: "심각도", sortKey: "severity", className: "text-center" },
  { label: "이상 window" },
  { label: "이상비율", sortKey: "anomalyRate", className: "text-right" },
  { label: "상태", className: "text-center" },
  { label: "담당" },
  { label: "관리", className: "text-center" },
];


interface AlarmWorklistCardProps {
  rows: readonly Alarm[];
  pageSize: number;
  sort: AlarmSort;
  onSortChange: (key: AlarmSortKey) => void;
  selectedIds: ReadonlySet<AlarmId>;
  onToggleRow: (alarmId: AlarmId) => void;
  onToggleAll: () => void;
  onAcknowledgeSelected: () => void;
  onAssignSelected: () => void;
  // Request 전송이나 List 재조회 중 일괄 확인, 담당자 지정 Button 비활성화
  isBulkActionDisabled: boolean;
  // List를 다시 받는 동안 Row를 옅게 하고 Row 선택, 처리, 삭제를 Click할 수 없게 표시
  isRowDisabled: boolean;
  onProcess: (alarm: Alarm) => void;
  onDelete: (alarm: Alarm) => void;
  onResetFilter: () => void;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

// Alarm 목록 Table과 선택한 Alarm의 일괄 처리, Page 이동 표시
export function AlarmWorklistCard({
  rows,
  pageSize,
  sort,
  onSortChange,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onAcknowledgeSelected,
  onAssignSelected,
  isBulkActionDisabled,
  isRowDisabled,
  onProcess,
  onDelete,
  onResetFilter,
  page,
  pageCount,
  onPageChange,
}: AlarmWorklistCardProps) {
  // 일괄 처리 Bar의 건수와 머리 Row Checkbox는 현재 보이는 Row 중 선택된 Row 수로 표시
  const selectedRowCount = rows.filter((row) => selectedIds.has(row.id)).length;
  const isAllSelected = rows.length > 0 && selectedRowCount === rows.length;

  return (
    <SectionCard
      data-slot="alarm-worklist-card"
      eyebrow="ALARM WORKLIST"
      title="알람 / 이벤트 워크리스트"
      aside={
        <>
          <span data-slot="alarm-worklist-order" className="text-sm text-muted-foreground">
            최신순 · {pageSize}건
          </span>
          <AnimatePresence>
            {selectedRowCount > 0 ? (
              <BulkBar label={`선택 ${selectedRowCount}건`}>
                <ActionButton
                  label="일괄 확인"
                  variant="outline"
                  size="sm"
                  disabled={isBulkActionDisabled}
                  onClick={onAcknowledgeSelected}
                />
                <ActionButton
                  label="담당자 지정"
                  variant="outline"
                  size="sm"
                  disabled={isBulkActionDisabled}
                  onClick={onAssignSelected}
                />
              </BulkBar>
            ) : null}
          </AnimatePresence>
        </>
      }
      className="min-h-0 min-w-[53.75rem] flex-[1_1_0]"
      headerClassName="min-h-10 items-center"
    >
      <DataTable
        minWidth={ALARM_WORKLIST_MIN_WIDTH}
        aria-busy={isRowDisabled || undefined}
        emptyState={
          rows.length === 0 ? (
            <EmptyState
              icon={<FindInPageRoundedIcon className="size-[1.625rem]" />}
              title="조건에 맞는 알람이 없습니다"
              description="상태·심각도·장치 필터를 전체로 바꿔 보세요."
              action={
                <ActionButton
                  label="필터 초기화"
                  variant="outline"
                  size="lg"
                  onClick={onResetFilter}
                />
              }
            />
          ) : undefined
        }
      >
        <DataTableHeader>
          <DataTableHeaderRow columns={ALARM_WORKLIST_COLUMNS}>
            <DataTableHead className="flex justify-center px-0">
              <CheckboxControl
                label="전체 선택"
                checked={isAllSelected}
                indeterminate={!isAllSelected && selectedRowCount > 0}
                disabled={isRowDisabled}
                onCheckedChange={onToggleAll}
                className={disabledLookClassName}
              />
            </DataTableHead>
            {columnHeads.map((head) => {
              const { sortKey } = head;
              const direction = sortKey !== undefined && sort.key === sortKey ? sort.direction : null;
              return (
                <DataTableHead
                  key={head.label}
                  className={head.className}
                  aria-sort={sortKey === undefined ? undefined : columnAriaSort(direction)}
                >
                  {sortKey === undefined ? (
                    head.label
                  ) : (
                    <ColumnSortButton
                      label={head.label}
                      direction={direction}
                      onSort={() => onSortChange(sortKey)}
                    />
                  )}
                </DataTableHead>
              );
            })}
          </DataTableHeaderRow>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row) => {
            const isSelected = selectedIds.has(row.id);
            return (
              <DataTableRow
                key={row.id}
                columns={ALARM_WORKLIST_COLUMNS}
                className={cn(
                  "h-[3.375rem]",
                  disabledLookClassName,
                  isRowDisabled && lockedRowButtonClassName,
                )}
                aria-selected={isSelected}
                aria-disabled={isRowDisabled || undefined}
              >
                <DataTableCell className="flex justify-center px-0">
                  <CheckboxControl
                    label="선택"
                    checked={isSelected}
                    disabled={isRowDisabled}
                    onCheckedChange={() => onToggleRow(row.id)}
                  />
                </DataTableCell>
                <DataTableCell
                  className="flex items-center gap-2.5 pr-2 pl-4 leading-4 tabular-nums"
                  title={
                    row.anomalyWindow === null
                      ? undefined
                      : `마지막 발생 ${formatIsoDateTime(row.occurredAt)}`
                  }
                >
                  <span className="flex flex-col">
                    <span className="font-bold">{formatIsoDate(row.occurredAt)}</span>
                    <span className="text-xs leading-[0.875rem] text-muted-foreground">
                      {formatIsoTime(row.occurredAt)}
                    </span>
                  </span>
                  {row.source === "auto" ? (
                    <StatePill
                      size="md"
                      tone="neutral"
                      label={alarmSourceLabels.auto}
                      title="추론 후 알람 규칙으로 자동 생성"
                    />
                  ) : null}
                </DataTableCell>
                <DataTableCell className="flex flex-col leading-4">
                  <span className="truncate font-bold">{row.deviceCode}</span>
                  <span className="text-xs leading-[1.0625rem] text-muted-foreground">
                    {row.modelCode} 모델
                  </span>
                </DataTableCell>
                <DataTableCell>
                  편성 {row.formation} · {row.car}호차
                </DataTableCell>
                <DataTableCell className="flex justify-center">
                  <AlarmSeverity
                    tone={alarmSeverityTones[row.severity]}
                    label={alarmSeverityLabels[row.severity].label}
                  />
                </DataTableCell>
                <DataTableCell className="px-3 tabular-nums">
                  {row.anomalyWindow === null
                    ? EMPTY_VALUE
                    : `${row.anomalyWindow.count}개 · 최장 ${row.anomalyWindow.longestMinutes.toFixed(1)}분`}
                </DataTableCell>
                <DataTableCell
                  className={cn(
                    "text-right font-bold tabular-nums",
                    levelTextClassNames[row.anomalyRateLevel],
                  )}
                >
                  {row.anomalyRatePercent.toFixed(1)}%
                </DataTableCell>
                <DataTableCell className="flex justify-center px-2">
                  <StatePill
                    size="md"
                    tone={alarmStatusTones[row.status]}
                    label={alarmStatusLabels[row.status].label}
                  />
                </DataTableCell>
                <DataTableCell className="px-3">{row.assignee ?? EMPTY_VALUE}</DataTableCell>
                <DataTableCell className="flex justify-center gap-1.5 px-2">
                  <ActionButton
                    label="처리"
                    variant="outline"
                    size="sm"
                    disabled={isRowDisabled}
                    onClick={() => onProcess(row)}
                  />
                  <ActionButton
                    label="삭제"
                    variant="dangerOutline"
                    size="sm"
                    disabled={isRowDisabled}
                    onClick={() => onDelete(row)}
                  />
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
      <span className="flex-1" />
      <Pagination
        label="알람 워크리스트 쪽 이동"
        page={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
        previousLabel="이전"
        nextLabel="다음"
      />
    </SectionCard>
  );
}
