import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { FilterBar } from "@/components/molecules/FilterBar";
import { SelectField } from "@/components/molecules/SelectField";
import type { Device } from "@/domain/device";
import type { ModelVersion } from "@/domain/diagnostics";
import type { AnalysisModel } from "@/domain/model";

// 조건 Row의 Filter 폭 목록, Loading Skeleton도 같은 폭 사용(장치, Model, 불러오기, 버전)
export const DIAGNOSTICS_FILTER_WIDTHS = ["w-[11.875rem]", "w-[7.5rem]", "w-[6.5rem]", "w-[20rem]"] as const;

interface DiagnosticsFilterBarProps {
  devices: readonly Device[];
  deviceCode: string;
  onDeviceChange: (deviceCode: string) => void;
  models: readonly AnalysisModel[];
  modelCode: string;
  onModelChange: (modelCode: string) => void;
  onLoad: () => void;
  versions: readonly ModelVersion[];
  // 버전, 없으면 null
  version: string | null;
  onVersionChange: (version: string) => void;
}

// 모델 진단의 장치 선택, Model 선택, 불러오기 Button, 학습 버전 선택 표시
export function DiagnosticsFilterBar({
  devices,
  deviceCode,
  onDeviceChange,
  models,
  modelCode,
  onModelChange,
  onLoad,
  versions,
  version,
  onVersionChange,
}: DiagnosticsFilterBarProps) {
  return (
    <FilterBar data-slot="diagnostics-filter-bar">
      <SelectField
        label="장치"
        value={deviceCode}
        options={devices.map((device) => ({ value: device.code, label: device.code }))}
        onValueChange={onDeviceChange}
        className={DIAGNOSTICS_FILTER_WIDTHS[0]}
      />
      <SelectField
        label="모델"
        value={modelCode}
        options={models.map((model) => ({ value: model.code, label: model.code }))}
        onValueChange={onModelChange}
        className={DIAGNOSTICS_FILTER_WIDTHS[1]}
      />
      <ActionButton
        label="불러오기"
        icon={<SearchRoundedIcon className="size-[1.125rem]" />}
        onClick={onLoad}
      />
      <SelectField
        label="버전"
        value={version}
        options={versions.map((item) => ({
          value: item.version,
          label: `버전 ${item.version} · ${item.segment}`,
        }))}
        onValueChange={onVersionChange}
        placeholder="버전 없음"
        disabled={versions.length === 0}
        className={DIAGNOSTICS_FILTER_WIDTHS[3]}
      />
      <span className="flex-1" />
      <span data-slot="diagnostics-filter-hint" className="text-xs text-muted-foreground">
        버전 목록은 불러온 뒤 채워집니다
      </span>
    </FilterBar>
  );
}
