"use client";

import { eyebrowClassName } from "@/components/atoms/eyebrowClassName";
import {
  CursorTooltip,
  CursorTooltipTarget,
  useCursorTooltipHandle,
} from "@/components/molecules/CursorTooltip";
import { rangeWindowCount } from "@/components/organisms/ensembleVerdictParts";
import type { EnsembleVerdict, EnsembleWindowRange } from "@/domain/ensemble";
import { ensembleConsensusRuleLabels } from "@/domain/labels/ensembleConsensusRule";
import { cn } from "@/lib/utils";

// 아래 눈금이 전체 window를 나누는 구간 수
const TICK_STEPS = 6;
// Row의 Column 구성, 이름, Bar, 이상 수
const STRIP_COLUMNS = "grid grid-cols-[3rem_minmax(0,1fr)_2.5rem] gap-2.5";

interface StripRow {
  key: string;
  label: string;
  // 다수결 Row는 이름을 강조 Color로 표시
  isConsensus: boolean;
  count: number;
  ranges: readonly EnsembleWindowRange[];
}

// 전체 window 가운데 해당 위치를 %로 계산
const percentOf = (value: number, total: number) => `${(value / total) * 100}%`;

// Model과 다수결 판정마다 이상 window 구간을 한 Row의 Bar로 늘어놓아 비교 표시
export function EnsembleWindowStrip({ verdict }: { verdict: EnsembleVerdict }) {
  const tooltip = useCursorTooltipHandle();
  const { windowCount } = verdict;
  const rows: StripRow[] = [
    ...verdict.models.map((model) => ({
      key: model.modelCode,
      label: model.modelCode,
      isConsensus: false,
      count: model.anomalyWindowCount,
      ranges: model.anomalyRanges,
    })),
    ...verdict.consensus.map((item) => ({
      key: item.rule,
      label: ensembleConsensusRuleLabels[item.rule].codeLabel,
      isConsensus: true,
      count: item.anomalyWindowCount,
      ranges: item.anomalyRanges,
    })),
  ];
  const ticks = Array.from({ length: TICK_STEPS + 1 }, (_, step) => Math.round((windowCount * step) / TICK_STEPS));

  return (
    <>
      <div data-slot="ensemble-strip-header" className="flex items-center">
        <div className={eyebrowClassName}>WINDOW별 판정 비교</div>
        <span className="flex-1" />
        <span className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-[0.3125rem]">
            <span className="size-[0.5625rem] rounded-[0.125rem] bg-destructive" />
            이상
          </span>
          <span className="flex items-center gap-[0.3125rem]">
            <span className="size-[0.5625rem] rounded-[0.125rem] bg-muted" />
            정상
          </span>
        </span>
      </div>
      <div data-slot="ensemble-window-strip" className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.key} data-slot="ensemble-strip-row" className={cn(STRIP_COLUMNS, "items-center")}>
            <span className={cn("text-sm font-bold", row.isConsensus ? "text-brand-line4-text" : "text-foreground")}>
              {row.label}
            </span>
            <span className="relative h-[1.125rem] rounded-[0.125rem] bg-muted">
              {row.ranges.map((range) => (
                <CursorTooltipTarget
                  key={range.startWindow}
                  handle={tooltip}
                  slot="ensemble-strip-block"
                  text={{
                    title: `${row.label} · window ${range.startWindow} – ${range.endWindow}`,
                    detail: `이상 ${rangeWindowCount(range)}개`,
                  }}
                >
                  <span
                    className="absolute inset-y-0 cursor-default bg-destructive"
                    style={{
                      left: percentOf(range.startWindow, windowCount),
                      width: percentOf(rangeWindowCount(range), windowCount),
                    }}
                  />
                </CursorTooltipTarget>
              ))}
            </span>
            <span className="text-right text-sm font-bold">{row.count}</span>
          </div>
        ))}
        <div className={STRIP_COLUMNS}>
          <span />
          <span className="relative h-3.5 text-[0.6875rem] font-semibold text-muted-foreground">
            {ticks.map((tick) => (
              <span
                key={tick}
                data-slot="ensemble-strip-tick"
                className="absolute -translate-x-1/2"
                style={{ left: percentOf(tick, windowCount) }}
              >
                {tick}
              </span>
            ))}
          </span>
          <span />
        </div>
        <span className="pt-1.5 text-xs text-muted-foreground">
          행을 비교하면 어느 모델이 먼저·혼자 잡았는지 보입니다. ALL에만 있는 구간은 알람 등록 후보, ANY에만 있는 구간은 점검 후보입니다.
        </span>
      </div>
      <CursorTooltip handle={tooltip} />
    </>
  );
}
