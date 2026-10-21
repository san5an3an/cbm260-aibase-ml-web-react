import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { IconButton } from "@/components/atoms/IconButton";
import { FilterBar } from "@/components/molecules/FilterBar";
import { SelectField } from "@/components/molecules/SelectField";
import { DateRangePicker } from "@/components/organisms/DateRangePicker";
import type { Device } from "@/domain/device";
import type { MeasureFilter, YesNoCode } from "@/domain/measures";
import type { DateRange } from "@/domain/period";
import { measureActionLabels } from "@/domain/labels/measureAction";
import { measureInspectionLabels } from "@/domain/labels/measureInspection";

// 장치, 조치 여부, 검수 여부를 선택하지 않은 상태를 나타내는 값
const ALL = "";

interface MeasureFilterBarProps {
  devices: readonly Device[];
  actionStates: readonly YesNoCode[];
  inspectionStates: readonly YesNoCode[];
  filter: MeasureFilter;
  onFilterChange: (filter: MeasureFilter) => void;
  period: DateRange;
  onPeriodChange: (period: DateRange) => void;
  selectablePeriod: DateRange;
  onReset: () => void;
  onSearch: () => void;
  onOpenCompare: () => void;
  onExportCsv: () => void;
  // Request 전송 중 CSV 내보내기 Button 비활성화 표시
  isExportDisabled: boolean;
}

// 조치 List의 조건(장치, 조치 여부, 검수 여부, 기간)과 검색, 전후 비교, CSV 내보내기 Button 표시
export function MeasureFilterBar({
  devices,
  actionStates,
  inspectionStates,
  filter,
  onFilterChange,
  period,
  onPeriodChange,
  selectablePeriod,
  onReset,
  onSearch,
  onOpenCompare,
  onExportCsv,
  isExportDisabled,
}: MeasureFilterBarProps) {
  return (
    <FilterBar data-slot="measure-filter-bar">
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
        className="w-[11.25rem]"
      />
      <SelectField<YesNoCode | typeof ALL>
        label="조치 여부"
        value={filter.actionYn ?? ALL}
        options={[
          { value: ALL, label: "조치 (전체)" },
          ...actionStates.map((code) => ({ value: code, label: measureActionLabels[code].label })),
        ]}
        onValueChange={(value) => onFilterChange({ ...filter, actionYn: value === ALL ? null : value })}
        className="w-[9.375rem]"
      />
      <SelectField<YesNoCode | typeof ALL>
        label="검수 여부"
        value={filter.inspectionYn ?? ALL}
        options={[
          { value: ALL, label: "검수 (전체)" },
          ...inspectionStates.map((code) => ({
            value: code,
            label: measureInspectionLabels[code].label,
          })),
        ]}
        onValueChange={(value) =>
          onFilterChange({ ...filter, inspectionYn: value === ALL ? null : value })
        }
        className="w-[9.375rem]"
      />
      <DateRangePicker
        mode="range"
        closeOnComplete
        label="발생 기간"
        value={period}
        onValueChange={onPeriodChange}
        selectableRange={selectablePeriod}
        placeholder="기간 선택"
        triggerClassName="w-[16.25rem]"
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
      <ActionButton label="조치 전·후 비교" variant="outline" onClick={onOpenCompare} />
      <ActionButton
        label="CSV 내보내기"
        variant="outline"
        weight="semibold"
        icon={<DownloadRoundedIcon className="size-[1.125rem]" />}
        disabled={isExportDisabled}
        onClick={onExportCsv}
      />
    </FilterBar>
  );
}
