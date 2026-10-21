import { useId } from "react";
import { foregroundTriggerTextClassName } from "@/components/atoms/foregroundTriggerTextClassName";
import { FilterBar } from "@/components/molecules/FilterBar";
import { Segmented } from "@/components/molecules/Segmented";
import { SelectField } from "@/components/molecules/SelectField";
import { DateRangePicker } from "@/components/organisms/DateRangePicker";
import type { DateRange } from "@/domain/period";
import { cn } from "@/lib/utils";

// 편성을 선택하지 않은 상태를 나타내는 값
const ALL = "";

interface AnomalyDetectionFilterBarProps {
  formations: readonly string[];
  formation: string | null;
  onFormationChange: (formation: string | null) => void;
  period: DateRange;
  onPeriodChange: (period: DateRange) => void;
  selectablePeriod: DateRange;
  spanDayCounts: readonly number[];
  // 현재 기간이 Button Group의 일수와 같으면 그 일수, 아니면 null
  spanDayCount: number | null;
  onSpanChange: (dayCount: number) => void;
  // 기간 옆 안내 문구
  memo: string;
}

// 이상 감지 내역의 조건(편성, 기간, 최근 N일)과 기간 안내 표시, 선택하는 즉시 반영
export function AnomalyDetectionFilterBar({
  formations,
  formation,
  onFormationChange,
  period,
  onPeriodChange,
  selectablePeriod,
  spanDayCounts,
  spanDayCount,
  onSpanChange,
  memo,
}: AnomalyDetectionFilterBarProps) {
  const spanLabelId = useId();
  return (
    <FilterBar data-slot="anomaly-detection-filter-bar">
      <SelectField
        label="편성"
        value={formation ?? ALL}
        options={[
          { value: ALL, label: "편성 (전체)" },
          ...formations.map((value) => ({ value, label: `편성 ${value}` })),
        ]}
        onValueChange={(value) => onFormationChange(value === ALL ? null : value)}
        className="w-40"
      />
      <DateRangePicker
        mode="range"
        closeOnComplete
        label="기간"
        value={period}
        onValueChange={onPeriodChange}
        selectableRange={selectablePeriod}
        placeholder="기간 선택"
        highlightWhenOpen
        triggerClassName={cn("w-[17.5rem]", foregroundTriggerTextClassName)}
      />
      <span id={spanLabelId} className="sr-only">
        최근 기간
      </span>
      <Segmented
        labelledBy={spanLabelId}
        value={spanDayCount === null ? null : String(spanDayCount)}
        options={spanDayCounts.map((dayCount) => ({ value: String(dayCount), label: `${dayCount}일` }))}
        onValueChange={(value) => onSpanChange(Number(value))}
        itemPadding="lg"
      />
      <span data-slot="anomaly-detection-period-memo" className="text-xs text-muted-foreground">
        {memo}
      </span>
    </FilterBar>
  );
}
