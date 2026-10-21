import type { ComponentProps, ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableProps extends ComponentProps<typeof Table> {
  minWidth: string;
  frameClassName?: string;
  // Row가 없을 때 Table 아래에 표시할 내용
  emptyState?: ReactNode;
}

// 머리 Row가 고정되고 안에서 Scroll되는 Table의 Layout 표시
export function DataTable({
  minWidth,
  frameClassName,
  emptyState,
  className,
  style,
  ...props
}: DataTableProps) {
  return (
    <div
      data-slot="data-table"
      className={cn(
        "min-h-0 flex-[0_1_auto] overflow-auto rounded-lg border border-border [&>[data-slot=table-container]]:overflow-visible",
        frameClassName,
      )}
    >
      <Table role="table" className={cn("block", className)} style={{ minWidth, ...style }} {...props} />
      {emptyState}
    </div>
  );
}

export function DataTableHeader({ className, ...props }: ComponentProps<typeof TableHeader>) {
  return (
    <TableHeader role="rowgroup" className={cn("sticky top-0 z-[1] block", className)} {...props} />
  );
}

export function DataTableBody({ className, ...props }: ComponentProps<typeof TableBody>) {
  return (
    <TableBody
      role="rowgroup"
      className={cn("block [&_tr:last-child]:border-b", className)}
      {...props}
    />
  );
}

interface DataTableRowProps extends ComponentProps<typeof TableRow> {
  columns: string;
}

// Column Width를 받아 Row 하나를 격자로 배치
export function DataTableHeaderRow({ columns, className, style, ...props }: DataTableRowProps) {
  return (
    <TableRow
      role="row"
      className={cn(
        "grid h-11 items-center border-border bg-muted hover:bg-muted",
        className,
      )}
      style={{ gridTemplateColumns: columns, ...style }}
      {...props}
    />
  );
}

export function DataTableRow({ columns, className, style, ...props }: DataTableRowProps) {
  return (
    <TableRow
      role="row"
      className={cn(
        "grid items-center border-border timing-micro hover:bg-brand-line4-subtle data-[state=selected]:bg-brand-line4-subtle",
        className,
      )}
      style={{ gridTemplateColumns: columns, ...style }}
      {...props}
    />
  );
}

export function DataTableHead({ className, ...props }: ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      role="columnheader"
      className={cn("h-auto px-4 font-normal", className)}
      {...props}
    />
  );
}

export function DataTableCell({ className, ...props }: ComponentProps<typeof TableCell>) {
  return <TableCell role="cell" className={cn("min-w-0 px-4 py-0", className)} {...props} />;
}
