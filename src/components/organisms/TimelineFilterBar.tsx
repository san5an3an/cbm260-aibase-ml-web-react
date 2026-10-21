import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { IconButton } from "@/components/atoms/IconButton";
import { FilterBar } from "@/components/molecules/FilterBar";
import { SelectField } from "@/components/molecules/SelectField";
import type { Device } from "@/domain/device";
import type { AnalysisModel } from "@/domain/model";

// 장치와 Model을 선택하지 않은 상태의 값
const ALL = "";

interface TimelineFilterBarProps {
  devices: readonly Device[];
  deviceCode: string | null;
  onDeviceChange: (deviceCode: string | null) => void;
  models: readonly AnalysisModel[];
  modelCode: string | null;
  onModelChange: (modelCode: string | null) => void;
  dayCounts: readonly number[];
  days: number;
  onDaysChange: (days: number) => void;
  onReset: () => void;
  onQuery: () => void;
}

// 이상 타임라인의 조회 조건(장치, Model, 기간)과 초기화, 조회 Button 표시
export function TimelineFilterBar({
  devices,
  deviceCode,
  onDeviceChange,
  models,
  modelCode,
  onModelChange,
  dayCounts,
  days,
  onDaysChange,
  onReset,
  onQuery,
}: TimelineFilterBarProps) {
  return (
    <FilterBar data-slot="timeline-filter-bar">
      <SelectField
        label="장치"
        value={deviceCode ?? ALL}
        options={[
          { value: ALL, label: "장치 (전체)" },
          ...devices.map((device) => ({ value: device.code, label: device.code })),
        ]}
        onValueChange={(value) => onDeviceChange(value === ALL ? null : value)}
        className="w-[12.5rem]"
      />
      <SelectField
        label="모델"
        value={modelCode ?? ALL}
        options={[
          { value: ALL, label: "모델 (전체)" },
          ...models.map((model) => ({ value: model.code, label: model.code })),
        ]}
        onValueChange={(value) => onModelChange(value === ALL ? null : value)}
        className="w-40"
      />
      <SelectField
        label="기간"
        value={days}
        options={dayCounts.map((dayCount) => ({ value: dayCount, label: `최근 ${dayCount}일` }))}
        onValueChange={onDaysChange}
        className="w-[9.375rem]"
      />
      <IconButton
        label="초기화"
        icon={<RefreshRoundedIcon className="size-[1.125rem]" />}
        onClick={onReset}
      />
      <ActionButton
        label="조회"
        icon={<SearchRoundedIcon className="size-[1.125rem]" />}
        onClick={onQuery}
      />
    </FilterBar>
  );
}
