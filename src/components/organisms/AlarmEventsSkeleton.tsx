import { kpiStatFrameClassName } from "@/components/atoms/kpiStatFrameClassName";
import { sectionCardClassName } from "@/components/atoms/sectionCardClassName";
import { ShimmerBlock } from "@/components/atoms/ShimmerBlock";
import { CardHeadingSkeleton } from "@/components/molecules/CardHeadingSkeleton";
import { FilterBar } from "@/components/molecules/FilterBar";
import { ALARM_CAR_RANKING_COLUMNS } from "@/components/organisms/AlarmCarRankingCard";
import {
  ALARM_WORKLIST_COLUMNS,
  ALARM_WORKLIST_MIN_WIDTH,
} from "@/components/organisms/AlarmWorklistCard";
import { cn } from "@/lib/utils";

// 화면 읽기 프로그램에만 읽히는 Loading 안내
const LOADING_TEXT = "알람/이벤트 화면을 불러오는 중입니다.";
// 조건 Row의 Button 영역 Width, 상태, 심각도, 장치, 초기화, 검색, (빈 영역), Alarm 규칙, Alarm 등록 순서
const FILTER_BLOCK_WIDTHS: readonly string[] = ["w-40", "w-40", "w-[12.5rem]", "w-8", "w-[4.875rem]"];
const ACTION_BLOCK_WIDTHS: readonly string[] = ["w-[7.0625rem]", "w-[6.9375rem]"];
// KPI Card 수, 미처리, 신규, 조치중, 해소, 오탐
const KPI_CARD_COUNT = 5;
// Alarm 목록 Table의 Skeleton Row 수, 넘치면 Table 영역 안에서 잘림
const WORKLIST_ROW_COUNT = 10;
// Alarm 목록 Table Cell별 Text Skeleton의 Width와 정렬, Checkbox, 심각도, 상태, 관리는 가운데, 이상비율은 오른쪽
const WORKLIST_CELL_BLOCKS: readonly { width: string; align: "start" | "center" | "end" }[] = [
  { width: "w-4", align: "center" },
  { width: "w-[5.5rem]", align: "start" },
  { width: "w-[7.5rem]", align: "start" },
  { width: "w-[5.75rem]", align: "start" },
  { width: "w-[3.25rem]", align: "center" },
  { width: "w-[6.25rem]", align: "start" },
  { width: "w-[2.75rem]", align: "end" },
  { width: "w-[2.625rem]", align: "center" },
  { width: "w-[2.625rem]", align: "start" },
  { width: "w-[6.875rem]", align: "center" },
];
// 추이 Card의 집계 Row별 Badge 수, 심각도, 출처, Model
const TALLY_CHIP_COUNTS: readonly number[] = [4, 2, 4];
// 순위 Table의 Skeleton Row 수, 넘치면 Table 영역 안에서 잘림
const RANKING_ROW_COUNT = 10;
// 순위 Table Cell별 Text Skeleton의 Width와 정렬, 순위와 최고 심각도는 가운데
const RANKING_CELL_BLOCKS: readonly { width: string; align: "start" | "center" | "end" }[] = [
  { width: "w-3", align: "center" },
  { width: "w-[6.5rem]", align: "start" },
  { width: "w-[3.5rem]", align: "start" },
  { width: "w-[3.25rem]", align: "center" },
];

const alignClassNames: Record<"start" | "center" | "end", string> = {
  start: "",
  center: "justify-center",
  end: "justify-end",
};

// 알람/이벤트 Page를 처음 불러오는 동안 조건 Row, KPI Row, 작업 List, 추이, 순위 위치에 빛이 지나가는 Skeleton 표시
export function AlarmEventsSkeleton() {
  return (
    <div
      data-slot="alarm-events-skeleton"
      role="status"
      aria-busy="true"
      className="flex min-h-0 flex-[1_1_0] flex-col gap-3.5"
    >
      <span className="sr-only">{LOADING_TEXT}</span>
      <FilterBar data-slot="alarm-filter-bar-skeleton">
        {FILTER_BLOCK_WIDTHS.map((width, index) => (
          <ShimmerBlock key={index} shape="line" tone="strong" className={cn("h-8", width)} />
        ))}
        <span className="flex-1" />
        {ACTION_BLOCK_WIDTHS.map((width, index) => (
          <ShimmerBlock key={index} shape="line" tone="strong" className={cn("h-8", width)} />
        ))}
      </FilterBar>
      <div data-slot="alarm-kpi-row-skeleton" className="grid h-28 flex-none grid-cols-5 gap-4">
        {Array.from({ length: KPI_CARD_COUNT }, (_, index) => (
          <div key={index} data-slot="alarm-kpi-skeleton" className={kpiStatFrameClassName}>
            <div className="flex h-[1.375rem] items-center">
              <ShimmerBlock shape="line" className="h-4 w-[6.25rem]" />
            </div>
            <div className="flex h-[2.125rem] items-center">
              <ShimmerBlock shape="line" className="h-7 w-16" />
            </div>
            <div className="flex h-4 items-center">
              <ShimmerBlock shape="line" className="h-3 w-[8.75rem]" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-[1_1_0] gap-3.5">
        <section
          data-slot="alarm-worklist-card-skeleton"
          className={cn(sectionCardClassName, "min-h-0 min-w-[53.75rem] flex-[1_1_0]")}
        >
          <div className="flex h-10 flex-none items-center gap-3">
            <CardHeadingSkeleton eyebrowWidth="w-[7.5rem]" titleWidth="w-[10.3125rem]" />
            <span className="flex-1" />
            <ShimmerBlock shape="line" className="h-3.5 w-[4.875rem]" />
          </div>
          <div className="min-h-0 flex-[0_1_auto] overflow-hidden rounded-lg border border-border">
            <div style={{ minWidth: ALARM_WORKLIST_MIN_WIDTH }}>
              <div className="h-11 border-b border-border bg-muted" />
              {Array.from({ length: WORKLIST_ROW_COUNT }, (_, row) => (
                <div
                  key={row}
                  className="grid h-[3.375rem] items-center border-b border-border"
                  style={{ gridTemplateColumns: ALARM_WORKLIST_COLUMNS }}
                >
                  {WORKLIST_CELL_BLOCKS.map(({ width, align }, column) => (
                    <div key={column} className={cn("flex min-w-0 px-4", alignClassNames[align])}>
                      <ShimmerBlock shape="line" className={cn("h-3.5", width)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <span className="flex-1" />
          <ShimmerBlock shape="line" className="mx-auto h-8 w-[20.75rem] flex-none" />
        </section>
        <div
          data-slot="alarm-events-side-skeleton"
          className="flex min-h-0 min-w-0 flex-[0_0_clamp(27.5rem,30vw,35rem)] flex-col gap-3.5 overflow-hidden"
        >
          <section
            data-slot="alarm-trend-card-skeleton"
            className={cn(sectionCardClassName, "flex-none")}
          >
            <div className="flex h-10 flex-none items-start gap-3">
              <CardHeadingSkeleton eyebrowWidth="w-[5.75rem]" titleWidth="w-24" />
              <span className="flex-1" />
              <ShimmerBlock shape="line" className="h-3 w-44" />
            </div>
            <div className="flex flex-col gap-2.5 rounded-lg border border-border px-3.5 pt-3.5 pb-3">
              <div className="flex flex-col gap-1.5">
                <ShimmerBlock className="h-[7.25rem]" />
                <ShimmerBlock shape="line" className="ml-7 h-[0.8125rem]" />
              </div>
              <div className="flex flex-col gap-1.5">
                {TALLY_CHIP_COUNTS.map((count, row) => (
                  <div key={row} className="flex h-5 items-center gap-1.5">
                    <span className="flex w-12 flex-none">
                      <ShimmerBlock shape="line" className="h-3 w-8" />
                    </span>
                    {Array.from({ length: count }, (_, chip) => (
                      <ShimmerBlock key={chip} shape="line" className="h-5 w-[3.125rem]" />
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex h-4 items-center">
                <ShimmerBlock shape="line" className="h-3 w-[25rem] max-w-full" />
              </div>
            </div>
          </section>
          <section
            data-slot="alarm-car-ranking-card-skeleton"
            className={cn(sectionCardClassName, "min-h-[12.5rem] flex-[1_1_0]")}
          >
            <div className="flex h-10 flex-none items-start gap-3">
              <CardHeadingSkeleton eyebrowWidth="w-[5.75rem]" titleWidth="w-44" />
              <span className="flex-1" />
              <ShimmerBlock shape="line" className="mt-0.5 h-3 w-[11.5rem]" />
            </div>
            <div className="min-h-0 flex-[0_1_auto] overflow-hidden rounded-lg border border-border">
              <div className="h-8 border-b border-border bg-muted" />
              {Array.from({ length: RANKING_ROW_COUNT }, (_, row) => (
                <div
                  key={row}
                  className="grid h-[1.6875rem] items-center border-b border-border"
                  style={{ gridTemplateColumns: ALARM_CAR_RANKING_COLUMNS }}
                >
                  {RANKING_CELL_BLOCKS.map(({ width, align }, column) => (
                    <div key={column} className={cn("flex min-w-0 px-4", alignClassNames[align])}>
                      <ShimmerBlock shape="line" className={cn("h-3", width)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
