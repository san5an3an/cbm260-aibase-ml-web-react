import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { IconButton } from "@/components/atoms/IconButton";
import { FilterBar } from "@/components/molecules/FilterBar";
import { SelectField } from "@/components/molecules/SelectField";
import {
  modelConfigListTexts,
  modelConfigUseListLabels,
} from "@/components/organisms/modelConfigListTexts";
import type { Device } from "@/domain/device";
import type {
  ModelConfigFilter,
  ModelConfigFilterOptions,
  ModelConfigUse,
} from "@/domain/modelConfig";

// 장치, Model, 사용 여부를 선택하지 않은 상태를 나타내는 값
const ALL = "";

interface ModelConfigFilterBarProps {
  devices: readonly Device[];
  options: ModelConfigFilterOptions;
  filter: ModelConfigFilter;
  onFilterChange: (filter: ModelConfigFilter) => void;
  onReset: () => void;
  onSearch: () => void;
  onOpenNew: () => void;
  // Request 전송 중 새 설정 Button 비활성화 표시
  isNewDisabled: boolean;
}

// 모델 커스텀 List의 조건(장치, Model, 사용 여부)과 검색, 새 설정 Button 표시
export function ModelConfigFilterBar({
  devices,
  options,
  filter,
  onFilterChange,
  onReset,
  onSearch,
  onOpenNew,
  isNewDisabled,
}: ModelConfigFilterBarProps) {
  const texts = modelConfigListTexts;
  return (
    <FilterBar data-slot="model-config-filter-bar">
      <SelectField
        label={texts.deviceLabel}
        value={filter.deviceCode ?? ALL}
        options={[
          { value: ALL, label: texts.allDevices },
          ...devices.map((device) => ({ value: device.code, label: device.code })),
        ]}
        onValueChange={(value) =>
          onFilterChange({ ...filter, deviceCode: value === ALL ? null : value })
        }
        className="w-[11.875rem]"
      />
      <SelectField
        label={texts.modelLabel}
        value={filter.modelCode ?? ALL}
        options={[
          { value: ALL, label: texts.allModels },
          ...options.modelCodes.map((code) => ({ value: code, label: code })),
        ]}
        onValueChange={(value) =>
          onFilterChange({ ...filter, modelCode: value === ALL ? null : value })
        }
        className="w-[9.375rem]"
      />
      <SelectField<ModelConfigUse | typeof ALL>
        label={texts.useLabel}
        value={filter.use ?? ALL}
        options={[
          { value: ALL, label: texts.allUses },
          ...options.uses.map((use) => ({ value: use, label: modelConfigUseListLabels[use].filter })),
        ]}
        onValueChange={(value) => onFilterChange({ ...filter, use: value === ALL ? null : value })}
        className="w-[10.625rem]"
      />
      <IconButton
        label={texts.resetLabel}
        icon={<RefreshRoundedIcon className="size-[1.125rem]" />}
        onClick={onReset}
      />
      <ActionButton
        label={texts.searchLabel}
        icon={<SearchRoundedIcon className="size-[1.125rem]" />}
        onClick={onSearch}
      />
      <span className="flex-1" />
      <ActionButton
        label={texts.newLabel}
        icon={<AddRoundedIcon className="size-[1.125rem]" />}
        disabled={isNewDisabled}
        onClick={onOpenNew}
      />
    </FilterBar>
  );
}
