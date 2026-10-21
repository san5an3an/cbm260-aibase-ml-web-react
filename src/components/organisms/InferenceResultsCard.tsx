import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
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
import { Pagination } from "@/components/molecules/Pagination";
import { SectionCard } from "@/components/molecules/SectionCard";
import {
  anomalyPercent,
  formatAnomalyPercent,
  formatThreshold,
} from "@/components/organisms/inferenceRate";
import { inferenceRateTextClassNames } from "@/components/organisms/inferenceTones";
import type { AnomalyLevelThresholds } from "@/domain/anomaly";
import type { Device } from "@/domain/device";
import type { InferenceResult, InferenceResultId } from "@/domain/inference";
import { anomalyLevelLabels } from "@/domain/labels/anomalyLevel";
import type { AnalysisModel } from "@/domain/model";
import { formatIsoDate, formatIsoHourMinute } from "@/lib/formatTime";
import { isPressKey } from "@/lib/pressKey";
import { cn } from "@/lib/utils";

// 결과 Table의 Column 폭과 Table의 최소 폭, Loading Skeleton도 같은 Column으로 배치
export const INFERENCE_RESULT_COLUMNS =
  "11.25rem 13.125rem minmax(11.25rem,1fr) 9.375rem 9.375rem 8.75rem 8.125rem";
export const INFERENCE_RESULT_MIN_WIDTH = "71.25rem";

interface ColumnHead {
  label: string;
  // 도움말, 없으면 붙이지 않음
  hint?: string;
  alignEnd?: boolean;
}

// 머리글 문구 정의, 숫자 Column은 오른쪽 정렬
const columnHeads: readonly ColumnHead[] = [
  { label: "추론 일시" },
  { label: "모델 명" },
  { label: "장치 명", hint: "장치 이름에 마우스를 올리면 장치 Code 가 보입니다" },
  { label: "세그먼트" },
  { label: "이상 window", alignEnd: true },
  { label: "이상 비율", alignEnd: true },
  { label: "임계치", alignEnd: true },
];

// 이상 비율 Color의 기준 안내 계산, 위험 20% 이상, 경고 10% 이상, 주의 0% 초과 형식
function describeLevelThresholds(thresholds: AnomalyLevelThresholds): string {
  const { danger, warning, caution } = anomalyLevelLabels;
  return `${danger.label} ≥ ${thresholds.dangerMinPercent}% · ${warning.label} ≥ ${thresholds.warningMinPercent}% · ${caution.label} > 0%`;
}

interface InferenceResultsCardProps {
  rows: readonly InferenceResult[];
  // Model 코드와 장치 코드에 붙일 이름 목록, 목록에 없는 코드는 코드 그대로 표시
  models: readonly AnalysisModel[];
  devices: readonly Device[];
  totalCount: number;
  levelThresholds: AnomalyLevelThresholds;
  onExportCsv: () => void;
  // Request 전송 중 CSV 내보내기 Button 비활성화 표시
  isExportDisabled: boolean;
  // 마지막으로 연 Row, 없으면 null
  selectedResultId: InferenceResultId | null;
  onOpenResult: (result: InferenceResult) => void;
  // List를 다시 받거나 Request를 보내는 동안 Row를 옅게 표시하고 Click 비활성화
  isRowDisabled: boolean;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

// 장치 추론 결과 Table과 총 건수, CSV 내보내기, Page 이동 표시
export function InferenceResultsCard({
  rows,
  models,
  devices,
  totalCount,
  levelThresholds,
  onExportCsv,
  isExportDisabled,
  selectedResultId,
  onOpenResult,
  isRowDisabled,
  page,
  pageCount,
  onPageChange,
}: InferenceResultsCardProps) {
  const modelName = (modelCode: string) =>
    models.find((model) => model.code === modelCode)?.name ?? modelCode;
  const deviceName = (deviceCode: string) =>
    devices.find((device) => device.code === deviceCode)?.name ?? deviceCode;

  return (
    <SectionCard
      data-slot="inference-results-card"
      eyebrow="INFERENCE RESULTS"
      title="장치 추론 결과"
      description={`이상 비율은 상태 기준 색으로 강조 (${describeLevelThresholds(levelThresholds)})`}
      aside={
        <div className="flex items-center gap-3">
          <span data-slot="inference-results-total" className="text-sm text-muted-foreground">
            총 {totalCount}건
          </span>
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
      <DataTable minWidth={INFERENCE_RESULT_MIN_WIDTH}>
        <DataTableHeader>
          <DataTableHeaderRow columns={INFERENCE_RESULT_COLUMNS}>
            {columnHeads.map((head) => (
              <DataTableHead
                key={head.label}
                title={head.hint}
                className={cn(head.alignEnd && "text-right")}
              >
                {head.label}
              </DataTableHead>
            ))}
          </DataTableHeaderRow>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row) => {
            const isSelected = row.id === selectedResultId;
            const percent = anomalyPercent(row.anomalyWindowCount, row.windowCount);
            return (
              <DataTableRow
                key={row.id}
                columns={INFERENCE_RESULT_COLUMNS}
                className={cn("h-12 cursor-pointer tabular-nums", disabledLookClassName)}
                data-state={isSelected ? "selected" : undefined}
                aria-selected={isSelected}
                aria-disabled={isRowDisabled}
                tabIndex={0}
                onClick={() => onOpenResult(row)}
                onKeyDown={(event) => {
                  // Row 안의 다른 요소에서 누른 Key는 그 요소가 처리하도록 둠
                  if (event.target !== event.currentTarget || !isPressKey(event)) return;
                  event.preventDefault();
                  onOpenResult(row);
                }}
              >
                <DataTableCell className="font-bold">
                  {`${formatIsoDate(row.inferredAt)} ${formatIsoHourMinute(row.inferredAt)}`}
                </DataTableCell>
                <DataTableCell className="font-bold">{modelName(row.modelCode)}</DataTableCell>
                <DataTableCell className="font-bold" title={row.deviceCode}>
                  {deviceName(row.deviceCode)}
                </DataTableCell>
                <DataTableCell>{row.segment}</DataTableCell>
                <DataTableCell
                  className={cn("text-right", row.anomalyWindowCount > 0 && "font-bold")}
                >
                  {`${row.anomalyWindowCount} / ${row.windowCount}`}
                </DataTableCell>
                <DataTableCell
                  className={cn(
                    "text-right font-bold",
                    percent === null
                      ? "text-muted-foreground"
                      : inferenceRateTextClassNames[row.anomalyRateLevel],
                  )}
                >
                  {formatAnomalyPercent(percent)}
                </DataTableCell>
                <DataTableCell className="text-right text-muted-foreground">
                  {formatThreshold(row.threshold)}
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
      <span className="flex-1" />
      <Pagination
        label="추론 결과 쪽 이동"
        page={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
        previousLabel="이전"
        nextLabel="다음"
      />
    </SectionCard>
  );
}
