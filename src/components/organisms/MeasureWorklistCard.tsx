"use client";

import FindInPageRoundedIcon from "@mui/icons-material/FindInPageRounded";
import { AnimatePresence } from "motion/react";
import { ActionButton } from "@/components/atoms/ActionButton";
import { CheckboxControl } from "@/components/atoms/CheckboxControl";
import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
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
import { measureActionTones, measureInspectionTones } from "@/components/organisms/measureTones";
import { Button } from "@/components/ui/button";
import type { Measure, MeasureId } from "@/domain/measures";
import { measureActionLabels } from "@/domain/labels/measureAction";
import { measureInspectionLabels } from "@/domain/labels/measureInspection";
import { formatIsoHourMinute, formatIsoMonthDay } from "@/lib/formatTime";
import { cn } from "@/lib/utils";

// 워크List Table의 Column 폭과 Table의 최소 폭, Loading Skeleton도 같은 Column으로 배치
export const MEASURE_WORKLIST_COLUMNS =
  "3.5rem 6.25rem minmax(10rem,1.3fr) minmax(10.625rem,1fr) 6.875rem 4.75rem 5.625rem 6rem 5.375rem";
export const MEASURE_WORKLIST_MIN_WIDTH = "61.25rem";
// 값이 없는 Cell에 표시할 문구
const EMPTY_VALUE = "-";
// 센서 값의 소수 자릿수
const VALUE_DIGITS = 2;

interface ColumnHead {
  label: string;
  className?: string;
}

// Checkbox Column 뒤에 오는 머리글 문구 정의
const columnHeads: readonly ColumnHead[] = [
  { label: "발생시각", className: "px-2" },
  { label: "장치 / 센서" },
  { label: "진단" },
  { label: "편성 / 호차" },
  { label: "조치", className: "px-0 text-center" },
  { label: "조치일", className: "px-3" },
  { label: "검수", className: "px-0 text-center" },
  { label: "처리", className: "px-0 text-center" },
];

interface MeasureWorklistCardProps {
  rows: readonly Measure[];
  selectedIds: ReadonlySet<MeasureId>;
  onToggleRow: (measureId: MeasureId) => void;
  onToggleAll: () => void;
  onCompleteSelected: () => void;
  onAssignSelected: () => void;
  // Request 전송이나 List 재조회 중 일괄 확인, 담당자 지정 Button 비활성화
  isBulkActionDisabled: boolean;
  // Request 전송이나 List 재조회 중 Row 안의 처리 Button 비활성화
  isProcessDisabled: boolean;
  // List 재조회 중 Row 안의 조치일 Button 비활성화
  isActionDateDisabled: boolean;
  onProcess: (measure: Measure) => void;
  onCompare: (measure: Measure) => void;
  onResetFilter: () => void;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

// 이상 센서 조치 List Table과 선택한 건의 일괄 처리, Page 이동 표시
export function MeasureWorklistCard({
  rows,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onCompleteSelected,
  onAssignSelected,
  isBulkActionDisabled,
  isProcessDisabled,
  isActionDateDisabled,
  onProcess,
  onCompare,
  onResetFilter,
  page,
  pageCount,
  onPageChange,
}: MeasureWorklistCardProps) {
  // 일괄 처리 Bar의 건수와 머리글 Row의 Checkbox는 현재 보이는 Row 중 선택한 Row의 수로 표시
  const selectedRowCount = rows.filter((row) => selectedIds.has(row.id)).length;
  const isAllSelected = rows.length > 0 && selectedRowCount === rows.length;

  return (
    <SectionCard
      data-slot="measure-worklist-card"
      eyebrow="ACTION WORKLIST"
      title="이상 센서 조치 워크리스트"
      aside={
        <AnimatePresence>
          {selectedRowCount > 0 ? (
            <BulkBar label={`선택 ${selectedRowCount}건`}>
              <ActionButton
                label="일괄 확인"
                variant="outline"
                size="sm"
                disabled={isBulkActionDisabled}
                onClick={onCompleteSelected}
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
      }
      className="min-h-0 min-w-0 flex-[1_1_0]"
      headerClassName="min-h-10 items-center"
    >
      <DataTable
        minWidth={MEASURE_WORKLIST_MIN_WIDTH}
        emptyState={
          rows.length === 0 ? (
            <EmptyState
              icon={<FindInPageRoundedIcon className="size-[1.625rem]" />}
              title="조건에 맞는 조치 건이 없습니다"
              description="기간을 넓히거나 장치·조치·검수 필터를 전체로 바꿔 보세요."
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
          <DataTableHeaderRow columns={MEASURE_WORKLIST_COLUMNS}>
            <DataTableHead className="flex justify-center px-0">
              <CheckboxControl
                label="전체 선택"
                checked={isAllSelected}
                indeterminate={!isAllSelected && selectedRowCount > 0}
                onCheckedChange={onToggleAll}
              />
            </DataTableHead>
            {columnHeads.map((head) => (
              <DataTableHead key={head.label} className={head.className}>
                {head.label}
              </DataTableHead>
            ))}
          </DataTableHeaderRow>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row) => {
            const isSelected = selectedIds.has(row.id);
            return (
              <DataTableRow
                key={row.id}
                columns={MEASURE_WORKLIST_COLUMNS}
                className="h-[3.625rem]"
                aria-selected={isSelected}
              >
                <DataTableCell className="flex justify-center px-0">
                  <CheckboxControl
                    label="선택"
                    checked={isSelected}
                    onCheckedChange={() => onToggleRow(row.id)}
                  />
                </DataTableCell>
                <DataTableCell className="flex flex-col px-2 leading-4 tabular-nums">
                  <span className="font-bold">{formatIsoMonthDay(row.occurredAt)}</span>
                  <span className="text-xs leading-[0.875rem] text-muted-foreground">
                    {formatIsoHourMinute(row.occurredAt)}
                  </span>
                </DataTableCell>
                <DataTableCell className="flex flex-col leading-4">
                  <span className="truncate font-bold">{row.deviceCode}</span>
                  <span className="text-xs leading-[1.0625rem] text-muted-foreground">
                    {row.sensorName}
                  </span>
                </DataTableCell>
                <DataTableCell className="flex flex-col leading-5 tabular-nums">
                  <span className="font-bold">
                    실제≈{row.actualValue.toFixed(VALUE_DIGITS)} / 기대≈
                    {row.expectedValue.toFixed(VALUE_DIGITS)}
                  </span>
                  <span className="text-xs leading-[1.0625rem] text-muted-foreground">
                    오차 {row.errorValue.toFixed(VALUE_DIGITS)}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  {row.formation} · {row.car}호차
                </DataTableCell>
                <DataTableCell className="px-0 text-center">
                  <StatePill
                    size="md"
                    tone={measureActionTones[row.actionYn]}
                    label={measureActionLabels[row.actionYn].label}
                  />
                </DataTableCell>
                <DataTableCell className="px-3">
                  {row.actionDate === null ? (
                    <span className="text-muted-foreground">{EMPTY_VALUE}</span>
                  ) : (
                    <Button
                      data-slot="measure-action-date"
                      variant="link"
                      title="이 편성·호차·조치일로 전·후 비교"
                      disabled={isActionDateDisabled}
                      focusableWhenDisabled
                      onClick={() => onCompare(row)}
                      className={cn(
                        "h-auto rounded-none border-0 p-0 text-sm font-medium text-brand-line4-text tabular-nums underline-offset-auto",
                        disabledLookClassName,
                      )}
                    >
                      {formatIsoMonthDay(row.actionDate)}
                    </Button>
                  )}
                </DataTableCell>
                <DataTableCell className="px-0 text-center">
                  <StatePill
                    size="md"
                    tone={measureInspectionTones[row.inspectionYn]}
                    label={measureInspectionLabels[row.inspectionYn].label}
                  />
                </DataTableCell>
                <DataTableCell className="flex justify-center px-0">
                  <ActionButton
                    label="처리"
                    variant="outline"
                    size="sm"
                    disabled={isProcessDisabled}
                    onClick={() => onProcess(row)}
                  />
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
      <span className="flex-1" />
      <Pagination
        label="조치 워크리스트 쪽 이동"
        page={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
        previousLabel="이전"
        nextLabel="다음"
      />
    </SectionCard>
  );
}
