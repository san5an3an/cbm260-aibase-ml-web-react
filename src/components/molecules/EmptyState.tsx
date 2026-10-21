import type { ReactNode } from "react";
import { cardSectionClassName } from "@/components/atoms/Well";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

// plain은 배경 없이 위아래 Margin만, panel은 Card Color 상자 안의 가운데, fill은 남는 Height를 채우는 Card Color 영역의 가운데(설명의 줄바꿈 유지)
type EmptyStateVariant = "plain" | "panel" | "fill";
// muted는 회색 원, brand는 브랜드 Color 원, success는 성공 Color 원, danger는 실패 Color 원
type EmptyStateIconTone = "muted" | "brand" | "success" | "danger";

interface EmptyStateVariantClassNames {
  root: string;
  title: string;
  description: string;
  action: string;
}

const variantClassNames: Record<EmptyStateVariant, EmptyStateVariantClassNames> = {
  plain: { root: "px-4 py-10", title: "", description: "", action: "mt-2.5" },
  panel: {
    root: "min-h-[18.75rem] rounded-[0.625rem] border border-solid border-border bg-card p-6",
    title: "",
    description: "max-w-[21.25rem] leading-5 text-pretty",
    action: "mt-2.5",
  },
  fill: {
    root: cn("flex-1", cardSectionClassName),
    title: "pt-1",
    description: "leading-5 whitespace-pre-line",
    action: "mt-4",
  },
};

const iconToneClassNames: Record<EmptyStateIconTone, string> = {
  muted: "text-muted-foreground",
  brand: "bg-brand-line4-muted text-brand-on-line4-subtle",
  success: "bg-success-subtle text-on-success-subtle",
  danger: "bg-danger-subtle text-destructive",
};

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  variant?: EmptyStateVariant;
  iconTone?: EmptyStateIconTone;
}

// 표시할 내용이 없을 때의 Icon, 안내 문구, 동작 Button 표시
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "plain",
  iconTone = "muted",
}: EmptyStateProps) {
  const variantClassName = variantClassNames[variant];
  return (
    <Empty
      data-slot="empty-state"
      className={cn("flex-initial gap-2.5 text-wrap", variantClassName.root)}
    >
      <EmptyHeader className="max-w-none gap-2.5">
        <EmptyMedia
          data-slot="empty-state-icon"
          variant="icon"
          className={cn("mb-0 size-14 rounded-[50%]", iconToneClassNames[iconTone])}
        >
          {icon}
        </EmptyMedia>
        <EmptyTitle
          data-slot="empty-state-title"
          className={cn("text-base font-bold tracking-normal", variantClassName.title)}
        >
          {title}
        </EmptyTitle>
        <EmptyDescription
          data-slot="empty-state-description"
          className={cn("text-sm", variantClassName.description)}
        >
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {action ? (
        <EmptyContent className={cn("max-w-none text-wrap", variantClassName.action)}>
          {action}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
