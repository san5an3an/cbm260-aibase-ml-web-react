import { levelTextClassNames } from "@/components/atoms/levelTextClassNames";
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
import type { DailyAnomalyPoint } from "@/domain/timeline";
import { cn } from "@/lib/utils";

// 일자별 상세 Table의 Column 폭과 Table의 최소 폭, Loading Skeleton도 같은 Column으로 배치
export const DAILY_DETAIL_COLUMNS = "minmax(0,1fr) 13.75rem 13.75rem 15rem 15rem";
export const DAILY_DETAIL_MIN_WIDTH = "60rem";

interface DailyDetailCardProps {
  rows: readonly DailyAnomalyPoint[];
  days: number;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

// 날짜별 추론 건수와 이상비율을 Table로 보여 주는 Card 표시
export function DailyDetailCard({
  rows,
  days,
  selectedDate,
  onSelectDate,
  page,
  pageCount,
  onPageChange,
}: DailyDetailCardProps) {
  return (
    <SectionCard
      data-slot="daily-detail-card"
      eyebrow="DAILY DETAIL"
      title="일자별 상세"
      aside={
        <span data-slot="daily-detail-range" className="text-sm text-muted-foreground">
          최근 {days}일
        </span>
      }
      className="min-h-0 flex-[1_1_0]"
    >
      <DataTable minWidth={DAILY_DETAIL_MIN_WIDTH}>
        <DataTableHeader>
          <DataTableHeaderRow columns={DAILY_DETAIL_COLUMNS}>
            <DataTableHead>일자</DataTableHead>
            <DataTableHead className="text-right">추론 건수</DataTableHead>
            <DataTableHead className="text-right">이상 window</DataTableHead>
            <DataTableHead className="text-right">평균 이상비율</DataTableHead>
            <DataTableHead className="text-right">최대 이상비율</DataTableHead>
          </DataTableHeaderRow>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row) => {
            const isSelected = row.date === selectedDate;
            return (
              <DataTableRow
                key={row.date}
                columns={DAILY_DETAIL_COLUMNS}
                className="h-[3.25rem] cursor-pointer tabular-nums"
                data-state={isSelected ? "selected" : undefined}
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => onSelectDate(row.date)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectDate(row.date);
                  }
                }}
              >
                <DataTableCell className="font-bold">{row.date}</DataTableCell>
                <DataTableCell className="text-right">{row.inferenceCount}</DataTableCell>
                <DataTableCell className={cn("text-right", isSelected && "font-bold")}>
                  {row.anomalyWindowCount}
                </DataTableCell>
                <DataTableCell className={cn("text-right font-bold", levelTextClassNames[row.level])}>
                  {row.averageRatePercent.toFixed(2)}%
                </DataTableCell>
                <DataTableCell className="text-right">{row.maxRatePercent.toFixed(2)}%</DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
      <span className="flex-1" />
      <Pagination
        label="일자별 상세 쪽 이동"
        page={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
        previousLabel="이전"
        nextLabel="다음"
      />
    </SectionCard>
  );
}
