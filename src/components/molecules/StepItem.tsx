import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { cn } from "@/lib/utils";

// done은 마친 단계, current는 진행 중인 단계, failed는 멈춘 단계, pending은 아직 오지 않은 단계
export type StepItemState = "done" | "current" | "failed" | "pending";

const markClassNames: Record<StepItemState, string> = {
  done: "border-0 bg-brand-line4 text-primary-foreground",
  current: "border-[0.09375rem] border-brand-line4 bg-card text-brand-line4-text",
  failed: "border-[0.09375rem] border-destructive bg-card text-destructive",
  pending: "border-[0.09375rem] border-border-strong bg-card text-muted-foreground",
};

const labelClassNames: Record<StepItemState, string> = {
  done: "font-bold text-brand-line4-text",
  current: "font-bold text-brand-line4-text",
  failed: "font-bold text-destructive",
  pending: "font-normal text-muted-foreground",
};

interface StepItemProps {
  label: string;
  // 원 안에 표시할 단계의 순번, 마친 단계는 체크, 멈춘 단계는 "!"
  order: number;
  state: StepItemState;
}

// 단계 하나를 순번 원과 이름으로 표시
export function StepItem({ label, order, state }: StepItemProps) {
  return (
    <span data-slot="step-item" data-state={state} className="flex flex-none items-center gap-2">
      <span
        data-slot="step-item-mark"
        className={cn(
          "box-border grid size-7 flex-none place-items-center rounded-[50%] text-[0.6875rem] font-bold",
          markClassNames[state],
        )}
      >
        {state === "done" ? (
          <CheckRoundedIcon aria-hidden className="size-[0.6875rem]" />
        ) : state === "failed" ? (
          "!"
        ) : (
          order
        )}
      </span>
      <span
        data-slot="step-item-label"
        className={cn("text-sm leading-5 whitespace-nowrap", labelClassNames[state])}
      >
        {label}
      </span>
    </span>
  );
}
