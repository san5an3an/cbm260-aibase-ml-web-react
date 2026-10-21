import { useId, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// 열차 몸체와 전조등 SVG path, 원본 그림은 앞이 왼쪽이라 좌우를 반전해서 사용
const BODY_PATH =
  "M33.333 0C36.0944 0 38.333 2.23858 38.333 5V13.667C38.3328 16.3419 36.2325 18.5262 33.5908 18.6602L33.333 18.667L33.3203 18.9053C33.1923 20.0818 32.1274 21 30.833 21C29.5388 20.9998 28.4747 20.0817 28.3467 18.9053L28.333 18.667H25.833L25.8203 18.9053C25.6923 20.0818 24.6274 21 23.333 21C22.0388 20.9998 20.9747 20.0817 20.8467 18.9053L20.833 18.667H18.333L18.3203 18.9053C18.1923 20.0818 17.1274 21 15.833 21C14.5388 20.9998 13.4747 20.0817 13.3467 18.9053L13.333 18.667H10.833L10.8203 18.9053C10.6923 20.0818 9.62741 21 8.33301 21C7.03878 20.9998 5.97473 20.0817 5.84668 18.9053L5.83301 18.667H3C1.34325 18.667 0.000176328 17.3237 0 15.667V15C0 6.71573 6.71573 0 15 0H33.333Z";
const HEADLIGHT_PATH = "M0 9V0L6 2.45455V6.54545L0 9Z";

// 몸체 창 4개의 왼쪽 위치(반전 전 기준), Width 6, Height 3, 간격 1
const WINDOW_XS = [14, 21, 28, 35] as const;

// 열차 표시 왼쪽 끝에서 몸체 가운데까지의 거리(19.333), 호선의 역 위에 몸체 가운데를 맞출 때 사용
export const LINE_TRAIN_BODY_CENTER = "1.2083rem";

interface LineTrainMarkerProps extends HTMLAttributes<HTMLDivElement> {
  trainNumber: string;
  formation: string;
}

// 호선 위 열차 표시, 위에 열차 번호, 아래에 4호선 Color 몸체(창 4개, 편성 번호, 전조등), 번호가 비어도 크기 유지, 장식이라 화면 읽기에서 제외
export function LineTrainMarker({ trainNumber, formation, className, ...props }: LineTrainMarkerProps) {
  const headlightId = useId();
  return (
    <div aria-hidden className={cn("flex w-11 flex-col items-center", className)} {...props}>
      <span
        data-slot="train-number"
        className="h-5 text-sm leading-5 font-medium tracking-[0.00625rem] whitespace-nowrap text-foreground"
      >
        {trainNumber}
      </span>
      <span data-slot="train-body" className="relative block">
        <svg viewBox="0 0 43.667 22" className="block h-[1.375rem] w-[2.7292rem] overflow-visible">
          <defs>
            <linearGradient id={headlightId} x1="7.1666" y1="5" x2="-0.297508" y2="7" gradientUnits="userSpaceOnUse">
              <stop className="[stop-color:var(--train-headlight-strong)]" />
              <stop offset="0.5" className="[stop-color:var(--train-headlight)]" />
              <stop offset="1" stopOpacity="0" className="[stop-color:var(--train-headlight-fade)]" />
            </linearGradient>
          </defs>
          <g transform="matrix(-1 0 0 1 43.667 0)">
            <path data-slot="train-headlight" d={HEADLIGHT_PATH} transform="translate(0 10)" fill={`url(#${headlightId})`} />
            <path data-slot="train-shell" d={BODY_PATH} transform="translate(5.333 0)" className="fill-brand-line4" />
            {WINDOW_XS.map((x) => (
              <rect key={x} data-slot="train-window" x={x} y={3} width={6} height={3} className="fill-brand-on-line4" />
            ))}
          </g>
        </svg>
        <span
          data-slot="train-formation"
          className="absolute top-[0.125rem] left-[1.2083rem] -translate-x-1/2 text-sm leading-5 font-semibold tracking-[0.00625rem] whitespace-nowrap text-brand-on-line4"
        >
          {formation}
        </span>
      </span>
    </div>
  );
}
