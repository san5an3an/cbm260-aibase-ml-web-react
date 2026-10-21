import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
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
import { RatioBar } from "@/components/molecules/RatioBar";
import { SectionCard } from "@/components/molecules/SectionCard";
import type { RootCauseReport } from "@/domain/diagnostics";
import { formatIsoHourMinute, formatIsoMonthDay } from "@/lib/formatTime";

// Card Width, window Width의 33%를 480에서 640 사이로 제한, Loading Skeleton도 같은 Width 사용
export const VAE_ROOT_CAUSE_CARD_SIZE_CLASS_NAME = "min-h-0 flex-[0_0_clamp(30rem,33vw,40rem)] overflow-y-auto";
// 상위 window Table의 Column Width
const WINDOW_COLUMNS = "8.75rem minmax(0,1fr) 5.625rem 3.75rem";
// 재구성오차와 z의 소수 자릿수
const ERROR_DIGITS = 3;
const Z_DIGITS = 1;

interface VaeRootCauseCardProps {
  // 근본원인 리포트를 만들지 않는 학습 Model이면 null
  report: RootCauseReport | null;
}

// 재구성오차가 큰 window와 그 원인 센서의 빈도를 보여 주는 Card 표시
export function VaeRootCauseCard({ report }: VaeRootCauseCardProps) {
  const maxCount = Math.max(0, ...(report?.sensorFrequency.map((row) => row.count) ?? []));

  return (
    <SectionCard
      data-slot="vae-root-cause-card"
      eyebrow="ROOT CAUSE"
      title="VAE 근본원인 리포트"
      description="VAE 전용 · 재구성오차 상위 window의 원인 센서"
      className={VAE_ROOT_CAUSE_CARD_SIZE_CLASS_NAME}
    >
      {report === null ? (
        <div data-slot="vae-root-cause-empty" className="flex flex-1 flex-col justify-center">
          <EmptyState
            icon={<InfoRoundedIcon className="size-8" />}
            title="VAE에서만 제공됩니다"
            description="근본원인 리포트는 VAE 모델 학습본에서만 만들어집니다. 모델을 VAE로 바꿔 불러오세요."
          />
        </div>
      ) : (
        <>
          <div className="text-sm font-bold">재구성오차 상위 window</div>
          <DataTable minWidth="0" frameClassName="rounded-[0.625rem]">
            <DataTableHeader>
              <DataTableHeaderRow columns={WINDOW_COLUMNS} className="h-10">
                <DataTableHead>window</DataTableHead>
                <DataTableHead>top sensor</DataTableHead>
                <DataTableHead className="text-right">recon_err</DataTableHead>
                <DataTableHead className="text-right">z</DataTableHead>
              </DataTableHeaderRow>
            </DataTableHeader>
            <DataTableBody>
              {report.topWindows.map((row) => (
                <DataTableRow
                  key={`${row.windowStartAt}-${row.topSensorName}`}
                  columns={WINDOW_COLUMNS}
                  className="h-10 tabular-nums hover:bg-transparent"
                >
                  <DataTableCell>
                    {`${formatIsoMonthDay(row.windowStartAt)} ${formatIsoHourMinute(row.windowStartAt)}`}
                  </DataTableCell>
                  <DataTableCell className="truncate">{row.topSensorName}</DataTableCell>
                  <DataTableCell className="text-right">{row.reconstructionError.toFixed(ERROR_DIGITS)}</DataTableCell>
                  <DataTableCell className="text-right">{row.zScore.toFixed(Z_DIGITS)}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <div className="pt-1 text-sm font-bold">top sensor 빈도</div>
          {report.sensorFrequency.map((row) => (
            <div
              key={row.sensorName}
              data-slot="bar-list-item"
              className="grid grid-cols-[9.375rem_minmax(0,1fr)] items-center gap-3 text-sm"
            >
              <span className="truncate">{row.sensorName}</span>
              <RatioBar
                size="md"
                tone="brandGradient"
                fillPercent={maxCount === 0 ? 0 : (row.count / maxCount) * 100}
                label={String(row.count)}
              />
            </div>
          ))}
        </>
      )}
    </SectionCard>
  );
}
