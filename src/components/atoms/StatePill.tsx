import { cn } from "@/lib/utils";

// 작은 사각형 표시의 Color
export type StatePillSmallTone = "danger";
// 알약 모양 표시의 Color, neutral은 덜 강조하는 회색 표시
export type StatePillTone = "danger" | "brand" | "caution" | "success" | "muted" | "neutral";

const smallToneClassNames: Record<StatePillSmallTone, string> = {
  danger:
    "border-[color-mix(in_srgb,var(--danger)_35%,var(--card))] bg-danger-subtle text-on-danger-subtle",
};

const toneClassNames: Record<StatePillTone, string> = {
  danger: "bg-danger-subtle text-on-danger-subtle",
  brand: "bg-brand-line4-subtle text-brand-on-line4-subtle",
  caution: "bg-caution-subtle text-on-caution-subtle",
  success: "bg-success-subtle text-on-success-subtle",
  muted: "bg-muted text-muted-foreground",
  neutral:
    "h-[1.375rem] rounded-[0.6875rem] bg-muted px-[0.5625rem] font-medium text-foreground",
};

type StatePillProps = { label: string; title?: string } & (
  | { size?: "sm"; tone: StatePillSmallTone }
  | { size: "md"; tone: StatePillTone }
);

// 상태를 작은 사각형(sm)이나 알약(md) 모양으로 표시
export function StatePill(props: StatePillProps) {
  if (props.size === "md") {
    return (
      <span
        data-slot="state-pill"
        data-tone={props.tone}
        title={props.title}
        className={cn(
          "inline-flex h-6 items-center rounded-[0.75rem] px-2.5 text-xs font-semibold whitespace-nowrap",
          toneClassNames[props.tone],
        )}
      >
        {props.label}
      </span>
    );
  }
  return (
    <span
      data-slot="state-pill"
      title={props.title}
      className={cn(
        "box-border flex h-5 items-center rounded-[0.25rem] border px-[0.4375rem] text-[0.6875rem] font-bold whitespace-nowrap",
        smallToneClassNames[props.tone],
      )}
    >
      {props.label}
    </span>
  );
}
