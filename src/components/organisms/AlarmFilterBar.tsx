import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { IconButton } from "@/components/atoms/IconButton";
import { FilterBar } from "@/components/molecules/FilterBar";
import { SelectField } from "@/components/molecules/SelectField";
import type { AlarmFilter, AlarmSeverityKey, AlarmStatusKey } from "@/domain/alarms";
import type { Device } from "@/domain/device";
import { alarmSeverityLabels } from "@/domain/labels/alarmSeverity";
import { alarmStatusLabels } from "@/domain/labels/alarmStatus";

// 상태, 심각도, 장치를 선택하지 않은 상태를 나타내는 값
const ALL = "";

interface AlarmFilterBarProps {
  statuses: readonly AlarmStatusKey[];
  severities: readonly AlarmSeverityKey[];
  devices: readonly Device[];
  filter: AlarmFilter;
  onFilterChange: (filter: AlarmFilter) => void;
  onReset: () => void;
  onSearch: () => void;
  onOpenRules: () => void;
  onOpenCreate: () => void;
}

// Alarm 목록의 조건(상태, 심각도, 장치)과 검색, Alarm 규칙, Alarm 등록 Button 표시
export function AlarmFilterBar({
  statuses,
  severities,
  devices,
  filter,
  onFilterChange,
  onReset,
  onSearch,
  onOpenRules,
  onOpenCreate,
}: AlarmFilterBarProps) {
  return (
    <FilterBar data-slot="alarm-filter-bar">
      <SelectField<AlarmStatusKey | typeof ALL>
        label="상태"
        value={filter.status ?? ALL}
        options={[
          { value: ALL, label: "상태 (전체)" },
          ...statuses.map((status) => ({ value: status, label: alarmStatusLabels[status].label })),
        ]}
        onValueChange={(value) => onFilterChange({ ...filter, status: value === ALL ? null : value })}
        className="w-40"
      />
      <SelectField<AlarmSeverityKey | typeof ALL>
        label="심각도"
        value={filter.severity ?? ALL}
        options={[
          { value: ALL, label: "심각도 (전체)" },
          ...severities.map((severity) => ({
            value: severity,
            label: alarmSeverityLabels[severity].label,
          })),
        ]}
        onValueChange={(value) =>
          onFilterChange({ ...filter, severity: value === ALL ? null : value })
        }
        className="w-40"
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
        className="w-[12.5rem]"
      />
      <IconButton
        label="초기화"
        icon={<RefreshRoundedIcon className="size-[1.125rem]" />}
        onClick={onReset}
      />
      <ActionButton
        label="검색"
        size="mdNarrow"
        icon={<SearchRoundedIcon className="size-[1.125rem]" />}
        onClick={onSearch}
      />
      <span className="flex-1" />
      <ActionButton
        label="알람 규칙"
        variant="outline"
        title="추론이 끝나면 이 규칙으로 알람을 자동 생성합니다"
        icon={<TuneRoundedIcon className="size-[1.125rem] text-muted-foreground" />}
        onClick={onOpenRules}
      />
      <ActionButton
        label="알람 등록"
        icon={<AddRoundedIcon className="size-[1.125rem]" />}
        onClick={onOpenCreate}
      />
    </FilterBar>
  );
}
