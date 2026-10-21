import type { ReactNode } from "react";
import { eyebrowClassName } from "@/components/atoms/eyebrowClassName";
import { sectionCardClassName } from "@/components/atoms/sectionCardClassName";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  className?: string;
  headerClassName?: string;
  children: ReactNode;
}

// 작은 머리글, 제목, 본문으로 된 Card 표시
export function SectionCard({
  eyebrow,
  title,
  description,
  aside,
  className,
  headerClassName,
  children,
  ...props
}: SectionCardProps & { "data-slot"?: string }) {
  return (
    <section
      data-slot="section-card"
      className={cn(sectionCardClassName, className)}
      {...props}
    >
      <div
        data-slot="section-card-header"
        className={cn("flex flex-none items-start gap-3", headerClassName)}
      >
        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-0.5">
            <div
              data-slot="section-card-eyebrow"
              className={cn(eyebrowClassName, "leading-4")}
            >
              {eyebrow}
            </div>
            <div
              data-slot="section-card-title"
              className="text-base leading-[1.375rem] font-bold"
            >
              {title}
            </div>
          </div>
          {description ? (
            <div
              data-slot="section-card-description"
              className="text-sm leading-5 text-muted-foreground"
            >
              {description}
            </div>
          ) : null}
        </div>
        {aside ? (
          <>
            <span className="flex-1" />
            {aside}
          </>
        ) : null}
      </div>
      {children}
    </section>
  );
}
