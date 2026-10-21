import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { TextInput } from "@/components/atoms/TextInput";
import { FilterBar } from "@/components/molecules/FilterBar";
import { SelectField } from "@/components/molecules/SelectField";
import type { Device } from "@/domain/device";

// 장치를 선택하지 않은 상태의 값
const NONE = "";

interface ThresholdTuningFilterBarProps {
  devices: readonly Device[];
  deviceCode: string | null;
  onDeviceChange: (deviceCode: string | null) => void;
  modelCodes: readonly string[];
  modelCode: string;
  onModelChange: (modelCode: string) => void;
  segment: string;
  onSegmentChange: (segment: string) => void;
  // 장치를 선택하지 않고 불러오기나 저장을 Click했는지 여부
  showsDeviceError: boolean;
  trainingWindowCount: number;
  onLoad: () => void;
  disabled: boolean;
}

// 임계값 튜닝의 불러올 범위(장치, Model, Segment) 선택, 불러오기 Button, 학습 window 수 표시
export function ThresholdTuningFilterBar({
  devices,
  deviceCode,
  onDeviceChange,
  modelCodes,
  modelCode,
  onModelChange,
  segment,
  onSegmentChange,
  showsDeviceError,
  trainingWindowCount,
  onLoad,
  disabled,
}: ThresholdTuningFilterBarProps) {
  return (
    <FilterBar data-slot="threshold-tuning-filter-bar">
      <SelectField
        label="장치"
        value={deviceCode ?? NONE}
        options={[
          { value: NONE, label: "장치 선택" },
          ...devices.map((device) => ({ value: device.code, label: device.code })),
        ]}
        onValueChange={(value) => onDeviceChange(value === NONE ? null : value)}
        className="w-[11.875rem]"
      />
      <SelectField
        label="모델"
        value={modelCode}
        options={modelCodes.map((code) => ({ value: code, label: code }))}
        onValueChange={onModelChange}
        className="w-[7.5rem]"
      />
      <TextInput
        label="세그먼트"
        value={segment}
        onValueChange={onSegmentChange}
        leadingIcon={<span className="text-sm text-muted-foreground">세그먼트</span>}
        className="w-[13.75rem]"
      />
      <ActionButton
        label="불러오기"
        icon={<SearchRoundedIcon className="size-[1.125rem]" />}
        onClick={onLoad}
        disabled={disabled}
      />
      {showsDeviceError ? (
        <span
          data-slot="threshold-tuning-device-error"
          role="alert"
          className="flex items-center gap-1 text-xs font-bold text-destructive"
        >
          <WarningAmberRoundedIcon aria-hidden className="size-3.5" />
          장치를 선택하세요.
        </span>
      ) : null}
      <span className="flex-1" />
      <span data-slot="threshold-tuning-window-count" className="text-xs text-muted-foreground">
        학습 특징벡터 {trainingWindowCount.toLocaleString()} window 기준
      </span>
    </FilterBar>
  );
}
