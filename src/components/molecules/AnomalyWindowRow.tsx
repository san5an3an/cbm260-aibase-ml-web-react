interface AnomalyWindowRowProps {
  // 이상으로 판정한 시간대, Segment, 위치(편성, 호차), 점수의 Text
  period: string;
  segment: string;
  location: string;
  score: string;
}

// 이상으로 판정한 시간대 1건을 점선 밑줄과 함께 한 Row로 표시, 폭이 모자라면 앞의 두 Cell이 줄고 넘치는 Text는 말줄임
export function AnomalyWindowRow({ period, segment, location, score }: AnomalyWindowRowProps) {
  return (
    <div
      data-slot="anomaly-window-row"
      className="grid h-11 flex-none grid-cols-[minmax(0,11.875rem)_minmax(0,5.75rem)_minmax(0,1fr)_5.625rem] items-center border-b border-dashed border-border text-sm tabular-nums *:truncate"
    >
      <b data-slot="anomaly-window-period">{period}</b>
      <span data-slot="anomaly-window-segment">{segment}</span>
      <span data-slot="anomaly-window-location">{location}</span>
      <span data-slot="anomaly-window-score" className="text-right font-bold text-destructive">
        {score}
      </span>
    </div>
  );
}
