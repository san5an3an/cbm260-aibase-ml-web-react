import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import { Button } from "@/components/ui/button";

export type ColumnSortDirection = "asc" | "desc";

const ariaSortValues = { asc: "ascending", desc: "descending" } as const;

// 정렬 가능한 Column 머리글이 화면 읽기 도구에 알릴 정렬 상태 반환, 이 Column으로 정렬 중이 아니면 none
export function columnAriaSort(
  direction: ColumnSortDirection | null,
): "ascending" | "descending" | "none" {
  return direction === null ? "none" : ariaSortValues[direction];
}

interface ColumnSortButtonProps {
  label: string;
  // 이 Column으로 정렬 중이 아니면 null
  direction: ColumnSortDirection | null;
  onSort: () => void;
}

// Table 머리글 Text와 정렬 방향 Icon을 Button으로 표시
export function ColumnSortButton({ label, direction, onSort }: ColumnSortButtonProps) {
  const Icon =
    direction === null
      ? SwapVertRoundedIcon
      : direction === "asc"
        ? ArrowUpwardRoundedIcon
        : ArrowDownwardRoundedIcon;

  return (
    <Button
      data-slot="column-sort-button"
      data-direction={direction ?? "none"}
      variant="ghost"
      onClick={onSort}
      className="h-auto gap-1 rounded-[0.25rem] border-0 p-0 text-sm font-normal text-foreground timing-micro hover:bg-transparent dark:hover:bg-transparent"
    >
      {label}
      <Icon className={direction === null ? "size-4 text-muted-foreground" : "size-4"} />
    </Button>
  );
}
