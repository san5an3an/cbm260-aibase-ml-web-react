import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { FilterBar } from "@/components/molecules/FilterBar";

interface EnsembleFilterBarProps {
  onOpenRun: () => void;
  // Request 전송 중 실행 Button 비활성화 표시
  isRunDisabled: boolean;
}

// 모델 비교의 안내 문구와 Ensemble 실행 Button 표시
export function EnsembleFilterBar({ onOpenRun, isRunDisabled }: EnsembleFilterBarProps) {
  return (
    <FilterBar data-slot="ensemble-filter-bar">
      <span data-slot="ensemble-filter-guide" className="text-sm text-muted-foreground">
        SVM · IF · VAE 3종을 한 번에 실행해 window별 이상 판정을 다수결(any / all)로 비교합니다
      </span>
      <span className="flex-1" />
      <ActionButton
        label="앙상블 실행"
        icon={<PlayArrowRoundedIcon className="size-[1.125rem]" />}
        disabled={isRunDisabled}
        onClick={onOpenRun}
      />
    </FilterBar>
  );
}
