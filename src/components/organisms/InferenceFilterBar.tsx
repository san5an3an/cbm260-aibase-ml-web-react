import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { foregroundTriggerTextClassName } from "@/components/atoms/foregroundTriggerTextClassName";
import { IconButton } from "@/components/atoms/IconButton";
import { FilterBar } from "@/components/molecules/FilterBar";
import { SelectField } from "@/components/molecules/SelectField";
import { DateRangePicker } from "@/components/organisms/DateRangePicker";
import type { Device } from "@/domain/device";
import type { InferenceResultFilter } from "@/domain/inference";
import type { AnalysisModel } from "@/domain/model";
import type { DateRange } from "@/domain/period";
import { cn } from "@/lib/utils";

// Model이나 장치를 선택하지 않은 상태를 나타내는 값
const ALL = "";

interface InferenceFilterBarProps {
  models: readonly AnalysisModel[];
  devices: readonly Device[];
  filter: InferenceResultFilter;
  onFilterChange: (filter: InferenceResultFilter) => void;
  period: DateRange;
  onPeriodChange: (period: DateRange) => void;
  selectablePeriod: DateRange;
  onReset: () => void;
  onSearch: () => void;
  onOpenRun: () => void;
  // Request 전송 중 추론 실행 Button 비활성화 표시
  isRunDisabled: boolean;
}

// 추론 결과의 조건(추론 Model, 장치, 추론 일시)과 검색, 추론 실행 Button 표시
export function InferenceFilterBar({
  models,
  devices,
  filter,
  onFilterChange,
  period,
  onPeriodChange,
  selectablePeriod,
  onReset,
  onSearch,
  onOpenRun,
  isRunDisabled,
}: InferenceFilterBarProps) {
  return (
    <FilterBar data-slot="inference-filter-bar">
      <SelectField
        label="추론 모델"
        value={filter.modelCode ?? ALL}
        options={[
          { value: ALL, label: "추론 모델 (전체)" },
          ...models.map((model) => ({ value: model.code, label: model.name })),
        ]}
        onValueChange={(value) =>
          onFilterChange({ ...filter, modelCode: value === ALL ? null : value })
        }
        className="w-[10.625rem]"
      />
      <SelectField
        label="장치"
        value={filter.deviceCode ?? ALL}
        options={[
          { value: ALL, label: "장치 (전체)" },
          ...devices.map((device) => ({ value: device.code, label: device.code })),
        ]}
        onValueChange={(value) =>
          onFilterChange({ ...filter, deviceCode: value === ALL ? null : value })
        }
        className="w-[11.875rem]"
      />
      <DateRangePicker
        mode="range"
        closeOnComplete
        label="추론일시"
        showLabel
        value={period}
        onValueChange={onPeriodChange}
        selectableRange={selectablePeriod}
        placeholder="기간 선택"
        highlightWhenOpen
        // 선택한 기간이 없어 안내 문구를 표시해도 회색으로 바꾸지 않고 본문 Color 유지
        triggerClassName={cn("w-[20.625rem]", foregroundTriggerTextClassName)}
      />
      <IconButton
        label="초기화"
        icon={<RefreshRoundedIcon className="size-[1.125rem]" />}
        onClick={onReset}
      />
      <ActionButton
        label="검색"
        icon={<SearchRoundedIcon className="size-[1.125rem]" />}
        onClick={onSearch}
      />
      <span className="flex-1" />
      <ActionButton
        label="추론 실행"
        icon={<PlayArrowRoundedIcon className="size-[1.125rem]" />}
        disabled={isRunDisabled}
        onClick={onOpenRun}
      />
    </FilterBar>
  );
}
