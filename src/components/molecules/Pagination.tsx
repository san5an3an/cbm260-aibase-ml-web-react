import {
  Pagination as PaginationNav,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PAGE_GAP, listPageItems } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const ELLIPSIS = "…";

// 주소 없이 Click 동작만 받는 Link의 공통 모양, Button처럼 손가락 Cursor로 표시
const linkClassName = "h-8 cursor-pointer rounded-sm text-sm text-foreground timing-micro";

const pageClassName = "min-w-8 px-1.5";

// 이전, 다음의 모양, 기본 Component가 좁은 창에서 숨기는 Text를 항상 표시
const stepClassName =
  "gap-1 border-0 px-2.5 font-normal aria-disabled:pointer-events-none aria-disabled:text-disabled [&_svg:not([class*='size-'])]:size-[1.125rem] [&>span]:block";

// 이전, 다음의 Click 속성 반환, Click할 수 없으면 Click 동작 없이 Focus 순서에서 제외
function stepProps(isDisabled: boolean, onStep: () => void) {
  return isDisabled ? { "aria-disabled": true, tabIndex: -1 } : { onClick: onStep };
}

interface PaginationProps {
  label: string;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
}

// 이전, Page 번호, 다음으로 Page를 옮기는 Button Row 표시
export function Pagination({
  label,
  page,
  pageCount,
  onPageChange,
  previousLabel,
  nextLabel,
}: PaginationProps) {
  return (
    <PaginationNav aria-label={label} className="flex-none text-sm">
      <PaginationContent className="gap-1.5">
        <PaginationItem>
          <PaginationPrevious
            data-slot="pagination-previous"
            aria-label={previousLabel}
            text={previousLabel}
            className={cn(linkClassName, stepClassName, "pl-2.5!")}
            {...stepProps(page <= 1, () => onPageChange(page - 1))}
          />
        </PaginationItem>
        {listPageItems(page, pageCount).map((item, index) =>
          item === PAGE_GAP ? (
            <PaginationItem key={`gap-${index}`}>
              <span
                data-slot="pagination-ellipsis"
                aria-hidden
                className="grid h-8 min-w-8 place-items-center px-1.5 text-sm"
              >
                {ELLIPSIS}
              </span>
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                data-slot="pagination-page"
                size="default"
                isActive={item === page}
                onClick={() => onPageChange(item)}
                className={cn(
                  linkClassName,
                  pageClassName,
                  item === page
                    ? "bg-card font-semibold hover:bg-card dark:border-border dark:bg-card dark:hover:bg-muted/50"
                    : "font-normal",
                )}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            data-slot="pagination-next"
            aria-label={nextLabel}
            text={nextLabel}
            className={cn(linkClassName, stepClassName, "pr-2.5!")}
            {...stepProps(page >= pageCount, () => onPageChange(page + 1))}
          />
        </PaginationItem>
      </PaginationContent>
    </PaginationNav>
  );
}
