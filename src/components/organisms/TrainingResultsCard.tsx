import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FindInPageRoundedIcon from "@mui/icons-material/FindInPageRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import type { MouseEvent } from "react";
import { ActionButton } from "@/components/atoms/ActionButton";
import { ColumnSortButton, columnAriaSort } from "@/components/atoms/ColumnSortButton";
import { IconButton } from "@/components/atoms/IconButton";
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
import { SelectField } from "@/components/molecules/SelectField";
import type { AnalysisModel } from "@/domain/model";
import type {
  TrainingResult,
  TrainingResultId,
  TrainingResultSort,
  TrainingResultSortKey,
} from "@/domain/training";
import { formatIsoDateTime } from "@/lib/formatTime";
import { isPressKey } from "@/lib/pressKey";
import { cn } from "@/lib/utils";

// 결과 Table의 Column Width와 Table 최소 Width, Loading Skeleton도 같은 Column 사용
export const TRAINING_RESULT_COLUMNS = "13.75rem 13.75rem minmax(11.25rem,1fr) 10rem 10rem 8.75rem";
export const TRAINING_RESULT_MIN_WIDTH = "67.5rem";
// 임계값의 소수 자릿수
const THRESHOLD_DIGITS = 4;

interface ColumnHead {
  label: string;
  // Sort할 수 없는 Column은 없음
  sortKey?: TrainingResultSortKey;
  className?: string;
}

// Column 머리글 정의, Cell 안 Text의 정렬 방향은 Column마다 다름
const columnHeads: readonly ColumnHead[] = [
  { label: "모델 학습 일시", sortKey: "trainedAt" },
  { label: "모델 명", sortKey: "model" },
  { label: "장치", sortKey: "device" },
  { label: "세그먼트" },
  { label: "임계치", sortKey: "threshold", className: "justify-end" },
  { label: "임계치 관리", className: "justify-center" },
];

interface TrainingResultsCardProps {
  rows: readonly TrainingResult[];
  // Model 코드에 붙일 이름 List, List에 없는 코드는 코드 그대로 표시
  models: readonly AnalysisModel[];
  totalCount: number;
  sort: TrainingResultSort;
  onSortChange: (key: TrainingResultSortKey) => void;
  pageSize: number;
  pageSizes: readonly number[];
  onPageSizeChange: (pageSize: number) => void;
  onExportCsv: () => void;
  // Request 전송 중 CSV 내보내기 Button 비활성화
  isExportDisabled: boolean;
  // 마지막으로 연 Row, 없으면 null
  selectedResultId: TrainingResultId | null;
  onOpenResult: (result: TrainingResult) => void;
  onOpenThreshold: (result: TrainingResult) => void;
  // List를 다시 조회하는 동안 Row Click 비활성화
  isRowDisabled: boolean;
  // List를 다시 조회하거나 Request 전송 중 임계값 관리 Button 비활성화
  isThresholdDisabled: boolean;
  onResetFilter: () => void;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

// 학습 결과 Table과 총 건수, Page 크기, CSV 내보내기, Page 이동 표시
export function TrainingResultsCard({
  rows,
  models,
  totalCount,
  sort,
  onSortChange,
  pageSize,
  pageSizes,
  onPageSizeChange,
  onExportCsv,
  isExportDisabled,
  selectedResultId,
  onOpenResult,
  onOpenThreshold,
  isRowDisabled,
  isThresholdDisabled,
  onResetFilter,
  page,
  pageCount,
  onPageChange,
}: TrainingResultsCardProps) {
  const modelName = (modelCode: string) =>
    models.find((model) => model.code === modelCode)?.name ?? modelCode;

  return (
    <SectionCard
      data-slot="training-results-card"
      eyebrow="TRAINING RESULTS"
      title="장치 학습 결과"
      description="행을 누르면 학습 상세 · ⚙ 는 같은 장치·모델·세그먼트 프로파일이 있으면 그 설정을, 없으면 새 설정을 채워 엽니다"
      aside={
        <div className="flex items-center gap-3">
          <span data-slot="training-results-total" className="text-sm text-muted-foreground">
            총 {totalCount}건
          </span>
          <SelectField
            label="한 쪽의 줄 수"
            value={pageSize}
            options={pageSizes.map((size) => ({ value: size, label: `${size}개씩` }))}
            onValueChange={onPageSizeChange}
            className="w-[6.875rem]"
          />
          <ActionButton
            label="CSV 내보내기"
            variant="outline"
            weight="semibold"
            icon={<DownloadRoundedIcon className="size-[1.125rem]" />}
            disabled={isExportDisabled}
            onClick={onExportCsv}
          />
        </div>
      }
      className="min-h-0 flex-[1_1_0]"
    >
      <DataTable
        minWidth={TRAINING_RESULT_MIN_WIDTH}
        emptyState={
          rows.length === 0 ? (
            <EmptyState
              icon={<FindInPageRoundedIcon className="size-[1.625rem]" />}
              title="조건에 맞는 학습 결과가 없습니다"
              description="기간을 넓히거나 모델·장치 필터를 전체로 바꿔 보세요."
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
          <DataTableHeaderRow columns={TRAINING_RESULT_COLUMNS}>
            {columnHeads.map((head) => {
              const { sortKey } = head;
              const direction =
                sortKey !== undefined && sort.key === sortKey ? sort.direction : null;
              return (
                <DataTableHead
                  key={head.label}
                  className={cn("flex", head.className)}
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
            const isSelected = row.id === selectedResultId;
            return (
              <DataTableRow
                key={row.id}
                columns={TRAINING_RESULT_COLUMNS}
                className="h-[3.125rem] cursor-pointer aria-disabled:cursor-default"
                data-state={isSelected ? "selected" : undefined}
                aria-selected={isSelected}
                aria-disabled={isRowDisabled}
                tabIndex={0}
                onClick={() => onOpenResult(row)}
                onKeyDown={(event) => {
                  // Row 안 Button에서 누른 Key는 그 Button이 처리하도록 둠
                  if (event.target !== event.currentTarget || !isPressKey(event)) return;
                  event.preventDefault();
                  onOpenResult(row);
                }}
              >
                <DataTableCell className="font-bold tabular-nums">
                  {formatIsoDateTime(row.trainedAt)}
                </DataTableCell>
                <DataTableCell className="font-bold">{modelName(row.modelCode)}</DataTableCell>
                <DataTableCell className="font-bold">{row.deviceCode}</DataTableCell>
                <DataTableCell>{row.segment}</DataTableCell>
                <DataTableCell className="text-right font-bold tabular-nums">
                  {row.threshold.toFixed(THRESHOLD_DIGITS)}
                </DataTableCell>
                <DataTableCell
                  className="flex justify-center px-0"
                  // 임계값 관리 Click이 Row Click으로 전달되지 않도록 차단, 비활성화된 Button을 Click해도 마찬가지
                  onClick={(event: MouseEvent) => event.stopPropagation()}
                >
                  <IconButton
                    label="임계치 관리"
                    icon={<TuneRoundedIcon className="size-[1.125rem]" />}
                    disabled={isThresholdDisabled}
                    onClick={() => onOpenThreshold(row)}
                  />
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
      <span className="flex-1" />
      <Pagination
        label="학습 결과 쪽 이동"
        page={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
        previousLabel="이전"
        nextLabel="다음"
      />
    </SectionCard>
  );
}
