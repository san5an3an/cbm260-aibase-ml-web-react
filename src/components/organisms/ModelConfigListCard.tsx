"use client";

import FindInPageRoundedIcon from "@mui/icons-material/FindInPageRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { eyebrowClassName } from "@/components/atoms/eyebrowClassName";
import { InlineSwitch } from "@/components/atoms/InlineSwitch";
import { sectionCardClassName } from "@/components/atoms/sectionCardClassName";
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
import {
  modelConfigColumnHeads,
  modelConfigListTexts,
  modelConfigUseListLabels,
} from "@/components/organisms/modelConfigListTexts";
import type { ModelConfig, ModelConfigUse } from "@/domain/modelConfig";
import { formatIsoDate, formatIsoHourMinute } from "@/lib/formatTime";
import { cn } from "@/lib/utils";

// Table의 Column 폭과 Table의 최소 폭, Loading Skeleton도 같은 Column으로 배치
export const MODEL_CONFIG_COLUMNS =
  "minmax(13.75rem,1.6fr) 12.5rem 5.625rem 7.5rem 8.75rem 6.875rem 11.875rem 10.625rem 12.5rem";
export const MODEL_CONFIG_MIN_WIDTH = "90rem";
// 임계 백분위의 소수 자릿수
const PERCENTILE_DIGITS = 1;

const alignClassNames = { start: "", end: "text-right", center: "px-0 text-center" } as const;

interface ModelConfigListCardProps {
  rows: readonly ModelConfig[];
  totalCount: number;
  onEdit: (config: ModelConfig) => void;
  onDuplicate: (config: ModelConfig) => void;
  onDelete: (config: ModelConfig) => void;
  onUseChange: (config: ModelConfig, use: ModelConfigUse) => void;
  // Request 전송이나 List 재조회 중 Row 안의 Button과 Switch 비활성화 표시
  isRowDisabled: boolean;
  onResetFilter: () => void;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

// 모델 커스텀 설정 Table과 건수, 사용 여부 안내, Page 이동 표시
export function ModelConfigListCard({
  rows,
  totalCount,
  onEdit,
  onDuplicate,
  onDelete,
  onUseChange,
  isRowDisabled,
  onResetFilter,
  page,
  pageCount,
  onPageChange,
}: ModelConfigListCardProps) {
  const texts = modelConfigListTexts;
  return (
    <section
      data-slot="model-config-list-card"
      className={cn(sectionCardClassName, "min-h-0 flex-[1_1_0]")}
    >
      <div data-slot="section-card-header" className="flex flex-none items-start gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-0.5">
            <div data-slot="section-card-eyebrow" className={cn(eyebrowClassName, "leading-4")}>
              {texts.eyebrow}
            </div>
            <div data-slot="section-card-title" className="text-base leading-[1.375rem] font-bold">
              {texts.title}
            </div>
          </div>
          <div
            data-slot="section-card-description"
            className="text-sm leading-5 text-muted-foreground"
          >
            {texts.description}
          </div>
        </div>
        <span className="flex-1" />
        <span data-slot="model-config-count" className="text-sm text-muted-foreground">
          {texts.count(totalCount)}
        </span>
      </div>
      <DataTable
        minWidth={MODEL_CONFIG_MIN_WIDTH}
        emptyState={
          rows.length === 0 ? (
            <EmptyState
              icon={<FindInPageRoundedIcon className="size-[1.625rem]" />}
              title={texts.emptyTitle}
              description={texts.emptyDescription}
              action={
                <ActionButton
                  label={texts.emptyResetLabel}
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
          <DataTableHeaderRow columns={MODEL_CONFIG_COLUMNS}>
            {modelConfigColumnHeads.map((head) => (
              <DataTableHead key={head.label} className={alignClassNames[head.align]}>
                {head.label}
              </DataTableHead>
            ))}
          </DataTableHeaderRow>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row) => {
            const isUsed = row.use === "Y";
            const useLabels = modelConfigUseListLabels[row.use];
            return (
              <DataTableRow
                key={row.id}
                data-config-id={row.id}
                columns={MODEL_CONFIG_COLUMNS}
                className="h-[3.25rem] tabular-nums"
              >
                <DataTableCell className="flex flex-col">
                  <span data-slot="model-config-name" className="truncate font-bold">
                    {row.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{row.description ?? ""}</span>
                </DataTableCell>
                <DataTableCell className="truncate font-bold">{row.deviceCode}</DataTableCell>
                <DataTableCell className="font-bold">{row.modelCode}</DataTableCell>
                <DataTableCell>{row.segment}</DataTableCell>
                <DataTableCell className="text-right font-bold">
                  {row.thresholdPercentile.toFixed(PERCENTILE_DIGITS)}
                </DataTableCell>
                <DataTableCell className="text-right">{row.windowSeconds}</DataTableCell>
                <DataTableCell className="flex justify-center px-0">
                  <InlineSwitch
                    label={useLabels.switchLabel}
                    labelTone={isUsed ? "success" : "muted"}
                    title={useLabels.switchTitle}
                    checked={isUsed}
                    isDisabled={isRowDisabled}
                    onCheckedChange={(checked) => onUseChange(row, checked ? "Y" : "N")}
                  />
                </DataTableCell>
                <DataTableCell className="text-muted-foreground">
                  {`${formatIsoDate(row.updatedAt)} ${formatIsoHourMinute(row.updatedAt)}`}
                </DataTableCell>
                <DataTableCell className="flex justify-center gap-1.5 px-0">
                  <ActionButton
                    label={texts.editLabel}
                    variant="outline"
                    size="sm"
                    disabled={isRowDisabled}
                    onClick={() => onEdit(row)}
                  />
                  <ActionButton
                    label={texts.duplicateLabel}
                    variant="outline"
                    size="sm"
                    disabled={isRowDisabled}
                    onClick={() => onDuplicate(row)}
                  />
                  <ActionButton
                    label={texts.deleteLabel}
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
        label={texts.paginationLabel}
        page={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
        previousLabel={texts.previousLabel}
        nextLabel={texts.nextLabel}
      />
    </section>
  );
}
