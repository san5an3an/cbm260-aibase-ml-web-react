import { cn } from "@/lib/utils";

interface StepConnectorProps {
  // 앞 단계를 마쳐 선을 칠할지 여부
  reached: boolean;
}

// 단계와 다음 단계 사이를 잇는 가로선 표시
export function StepConnector({ reached }: StepConnectorProps) {
  return (
    <span
      data-slot="step-connector"
      data-reached={reached}
      aria-hidden
      className={cn(
        "h-0.5 min-w-5 flex-1 rounded-[0.0625rem]",
        reached ? "bg-brand-line4" : "bg-border",
      )}
    />
  );
}
