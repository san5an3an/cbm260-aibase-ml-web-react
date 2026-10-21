"use client";

import { HeatCell } from "@/components/atoms/HeatCell";
import { PanelEyebrow } from "@/components/atoms/PanelEyebrow";
import {
  CursorTooltip,
  CursorTooltipTarget,
  useCursorTooltipHandle,
} from "@/components/molecules/CursorTooltip";

// 편성 이름 Column의 Width(rem)
const FORMATION_COLUMN_REM = 3.5;

interface CarHeatmapProps {
  // Row의 편성과 Column의 호차, 나열한 순서대로 표시
  formations: readonly string[];
  cars: readonly number[];
  // 편성과 호차별로 이상 판정한 window 수, counts[편성 순번][호차 순번]
  counts: readonly (readonly number[])[];
}

// 편성과 호차별 이상 window 수를 Cell Color와 숫자로 표시하고, Hover한 Cell에 Tooltip 표시
export function CarHeatmap({ formations, cars, counts }: CarHeatmapProps) {
  const tooltip = useCursorTooltipHandle();
  // 편성이나 호차가 비면 Cell이 없으므로 머리글 Row와 데이터 Row를 빼고 머리글만 남김
  const gridTemplateColumns =
    formations.length > 0 && cars.length > 0
      ? `${FORMATION_COLUMN_REM}rem repeat(${cars.length}, minmax(0, 1fr))`
      : null;

  return (
    <div data-slot="car-heatmap" className="flex flex-col">
      <PanelEyebrow className="pb-1" label="편성 × 호차" />
      {gridTemplateColumns === null ? null : (
        <>
          <div
            data-slot="car-heatmap-header"
            className="grid items-center gap-1 text-[0.6875rem] leading-4 font-semibold text-muted-foreground"
            style={{ gridTemplateColumns }}
          >
            <span>편성·호차</span>
            {cars.map((car) => (
              <span key={car} className="text-center">
                {car}
              </span>
            ))}
          </div>
          {formations.map((formation, row) => (
            <div
              key={formation}
              data-slot="car-heatmap-row"
              className="mt-1 grid items-center gap-1"
              style={{ gridTemplateColumns }}
            >
              <span data-slot="car-heatmap-formation" className="text-xs leading-4 font-bold">
                {formation}
              </span>
              {cars.map((car, column) => {
                const count = counts[row]?.[column] ?? 0;
                return (
                  <CursorTooltipTarget
                    key={car}
                    handle={tooltip}
                    slot="heat-cell"
                    text={{ title: `편성 ${formation} · ${car}호차`, detail: `이상 window ${count}` }}
                  >
                    <HeatCell value={count > 0 ? String(count) : ""} tone={count > 0 ? "hot" : "cold"} />
                  </CursorTooltipTarget>
                );
              })}
            </div>
          ))}
          <CursorTooltip handle={tooltip} />
        </>
      )}
    </div>
  );
}
