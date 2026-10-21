import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { disabledLookClassName } from "@/components/atoms/disabledLookClassName";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AddRowButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

// List 맨 아래에 빈 Row를 더하는 점선 Border Button 표시
export function AddRowButton({ label, onClick, disabled = false }: AddRowButtonProps) {
  return (
    <Button
      data-slot="add-row-button"
      variant="outline"
      disabled={disabled}
      // 비활성화된 동안에도 방금 Click한 Button이 Focus를 잃지 않도록 유지
      focusableWhenDisabled
      onClick={onClick}
      className={cn(
        "h-9 w-max gap-1.5 rounded-md border-dashed border-brand-line4 bg-brand-line4-subtle px-3 text-sm leading-5 font-bold text-brand-line4-text timing-micro hover:bg-brand-line4-muted hover:text-brand-line4-text dark:border-brand-line4 dark:bg-brand-line4-subtle dark:hover:bg-brand-line4-muted",
        disabledLookClassName,
      )}
    >
      <AddRoundedIcon aria-hidden className="size-4" />
      {label}
    </Button>
  );
}
