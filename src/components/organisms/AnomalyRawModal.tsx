"use client";

import { useId, useState } from "react";
import { ActionButton } from "@/components/atoms/ActionButton";
import { CheckboxControl } from "@/components/atoms/CheckboxControl";
import { popupReducedMotionClassName } from "@/components/atoms/popupReducedMotionClassName";
import { tooltipBubbleClassName } from "@/components/atoms/tooltipBubbleClassName";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { Segmented } from "@/components/molecules/Segmented";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AnomalyRawDetail, AnomalySignal } from "@/domain/anomalyDetection";
import { useRootFontSize } from "@/lib/useRootFontSize";
import { cn } from "@/lib/utils";

type AnomalyRawTab = "graph" | "table";

const TABS: readonly { value: AnomalyRawTab; label: string }[] = [
  { value: "graph", label: "연관 장치 그래프" },
  { value: "table", label: "원본 표" },
];

// Graph와 원본 Table의 Column 폭
const GRAPH_COLUMNS = "13.75rem minmax(0,1fr) 3.5rem";
const RAW_COLUMN_WIDTHS: readonly string[] = [
  "6.875rem", "8.75rem", "5rem", "4.375rem", "3.75rem", "8.125rem", "6.875rem", "minmax(6.875rem,1fr)", "9.375rem", "8.75rem",
];
const RAW_FALLBACK_WIDTH = "8.75rem";
const RAW_MIN_WIDTH = "71.875rem";
const SOURCE_NOTE = "값은 select 서버가 Hive 원천에서 1초 평균으로 낸 것입니다 · 열차 종합 제어 장치 속도는 운전실차(0·9호차) 중 큰 값";

function toSeconds(time: string): number {
  const [h, m, s] = time.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

// 하루 안의 초를 "HH:mm:ss" 형식으로 변환
function formatSeconds(seconds: number): string {
  const value = ((Math.round(seconds) % 86_400) + 86_400) % 86_400;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(value / 3600))}:${pad(Math.floor(value / 60) % 60)}:${pad(value % 60)}`;
}

// 축 끝 값의 문구 변환, 1보다 작은 값은 소수 셋째 자리까지, 나머지는 소수 첫째 자리까지 표시
function formatAxis(value: number, axisMax: number): string {
  return value.toFixed(Math.abs(axisMax) < 1 ? 3 : 1);
}

// 범위 안의 값으로 svg 선 path 계산, 가로는 0부터 1000, 세로는 0(위)부터 100(아래)
function tracePath(
  samples: AnomalySignal["samples"],
  spanSeconds: number,
  axisMin: number,
  axisMax: number,
): string {
  const height = axisMax - axisMin || 1;
  return samples
    .filter((sample) => Math.abs(sample.offsetSeconds) <= spanSeconds)
    .map((sample, index) => {
      const x = ((sample.offsetSeconds + spanSeconds) / (spanSeconds * 2)) * 1000;
      const y = (1 - (sample.value - axisMin) / height) * 100;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

// 원인 순위별 선 Color, 순위 Label 문구, 순위 Label Color 반환
function causeLook(signal: AnomalySignal): { stroke: string; tag: string | null; tagClassName: string } {
  switch (signal.causeRank) {
    case 1:
      return { stroke: "var(--caution)", tag: "대표 원인", tagClassName: "text-on-caution-subtle" };
    case 2:
    case 3:
      return { stroke: "var(--brand-line4)", tag: `상위 원인 ${signal.causeRank}`, tagClassName: "text-brand-line4-text" };
    case null:
      return { stroke: "var(--warning)", tag: null, tagClassName: "" };
  }
}

interface HoverPoint {
  key: string;
  ratio: number;
}

interface GraphRowProps {
  signal: AnomalySignal;
  spanSeconds: number;
  bandLeft: string;
  bandWidth: string;
  startSeconds: number;
  windowSeconds: number;
  hover: HoverPoint | null;
  onHover: (hover: HoverPoint | null) => void;
}

// 값 하나의 이름, 선, 축 끝 값을 한 Row로 표시
function GraphRow({ signal, spanSeconds, bandLeft, bandWidth, startSeconds, windowSeconds, hover, onHover }: GraphRowProps) {
  const look = causeLook(signal);
  const cursorSeconds = hover === null ? null : startSeconds - spanSeconds + hover.ratio * spanSeconds * 2;
  return (
    <div
      data-slot="anomaly-graph-row"
      className="grid h-[5.75rem] border-b border-border"
      style={{ gridTemplateColumns: GRAPH_COLUMNS }}
    >
      <div className="flex min-w-0 flex-col justify-center gap-1 px-3.5">
        {look.tag !== null ? (
          <span className="flex items-center gap-1.5">
            <span
              data-slot="anomaly-device-badge"
              className={cn(
                "flex h-5 items-center rounded-[0.625rem] border px-2 text-[0.6875rem] font-semibold whitespace-nowrap",
                signal.isOtherDevice ? "border-chart-2 text-chart-2" : "border-brand-line4 text-brand-line4",
              )}
            >
              {signal.deviceName}
            </span>
            <span data-slot="anomaly-cause-tag" className={cn("text-[0.6875rem] font-bold", look.tagClassName)}>
              {look.tag}
            </span>
          </span>
        ) : null}
        <span data-slot="anomaly-signal-name" className="text-sm font-bold">
          {signal.name}
        </span>
        {signal.pairName !== null ? (
          <span className="text-[0.6875rem] text-muted-foreground">점선 = {signal.pairName}</span>
        ) : null}
      </div>
      <div
        data-slot="anomaly-signal-trace"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
          onHover({ key: signal.key, ratio });
        }}
        onMouseLeave={() => onHover(null)}
        className="relative cursor-crosshair border-l border-border bg-[repeating-linear-gradient(to_right,transparent_0_calc(10%-0.0625rem),var(--muted)_calc(10%-0.0625rem)_10%),repeating-linear-gradient(to_bottom,transparent_0_calc(25%-0.0625rem),var(--muted)_calc(25%-0.0625rem)_25%)]"
      >
        <span className="absolute inset-y-0 bg-danger-subtle" style={{ left: bandLeft, width: bandWidth }} />
        <span className="absolute inset-y-0 left-1/2 border-l border-dashed border-destructive opacity-60" />
        <svg
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          aria-hidden
          className="absolute inset-x-0 top-2 h-[calc(100%-1rem)] w-full overflow-visible"
        >
          {signal.pairSamples !== null ? (
            <path
              data-slot="anomaly-pair-path"
              d={tracePath(signal.pairSamples, spanSeconds, signal.axisMin, signal.axisMax)}
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <path
            data-slot="anomaly-signal-path"
            d={tracePath(signal.samples, spanSeconds, signal.axisMin, signal.axisMax)}
            fill="none"
            stroke={look.stroke}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {hover !== null ? (
          <span
            data-slot="anomaly-trace-cursor"
            className="pointer-events-none absolute inset-y-0 border-l border-foreground"
            style={{ left: `${hover.ratio * 100}%` }}
          />
        ) : null}
        {hover !== null && hover.key === signal.key && cursorSeconds !== null ? (
          <div
            data-slot="anomaly-trace-tooltip"
            className={cn(
              tooltipBubbleClassName,
              "pointer-events-none absolute top-1/2 z-[3] translate-x-2.5 -translate-y-1/2 bg-foreground whitespace-nowrap",
            )}
            style={{ left: `${hover.ratio * 100}%` }}
          >
            <div className="font-bold">{formatSeconds(cursorSeconds)}</div>
            {cursorSeconds >= startSeconds && cursorSeconds <= startSeconds + windowSeconds ? (
              <div>이상 window 안</div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col justify-between px-1.5 py-2 text-[0.6875rem] text-muted-foreground tabular-nums">
        <span data-slot="anomaly-axis-max">{formatAxis(signal.axisMax, signal.axisMax)}</span>
        <span data-slot="anomaly-axis-min">{formatAxis(signal.axisMin, signal.axisMax)}</span>
      </div>
    </div>
  );
}

interface GraphTabProps {
  detail: AnomalyRawDetail;
}

// 연관 장치 Graph 표시, 값 선택, 범위, 범례, 값별 선 포함
function GraphTab({ detail }: GraphTabProps) {
  const rangeLabelId = useId();
  const rootFontSize = useRootFontSize();
  const [rangeMinutes, setRangeMinutes] = useState(detail.defaultRangeMinutes);
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(new Set());
  const [hover, setHover] = useState<HoverPoint | null>(null);
  const spanSeconds = rangeMinutes * 60;
  const startSeconds = toSeconds(detail.startTime);
  const windowSeconds = toSeconds(detail.endTime) - startSeconds;
  const bandLeft = "50%";
  const bandWidth = `${(windowSeconds / (spanSeconds * 2)) * 100}%`;
  const visible = detail.signals.filter((signal) => !hiddenKeys.has(signal.key));
  const ranked = visible
    .filter((signal) => signal.causeRank !== null)
    .sort((a, b) => (a.causeRank ?? 0) - (b.causeRank ?? 0));
  const others = visible.filter((signal) => signal.causeRank === null);
  const rankedCount = detail.signals.filter((signal) => signal.causeRank !== null).length;
  const paired = detail.signals.find((signal) => signal.pairName !== null);
  const rowProps = { spanSeconds, bandLeft, bandWidth, startSeconds, windowSeconds, hover, onHover: setHover };

  const toggle = (key: string, shown: boolean) =>
    setHiddenKeys((current) => {
      const next = new Set(current);
      if (shown) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <>
      <p data-slot="anomaly-graph-description" className="flex-none text-xs leading-4 text-muted-foreground">
        이 장치 모델이 본 값 {detail.signals.length}개를 모두 그립니다 · 이 window 에서 오차가 큰 상위 {rankedCount}개를 맨 위에 강조
        {paired ? ` · 짝 축과의 차이가 상위 원인이라 ${paired.name}에 짝 축 값을 점선으로 겹쳤습니다` : ""} · [값 고르기]로 숨길 수 있습니다
      </p>
      <div className="flex flex-none items-center gap-3">
        <Popover>
          <PopoverTrigger
            data-slot="anomaly-signal-picker-trigger"
            render={<Button variant="outline" className="h-8 rounded-sm px-3 text-sm font-medium timing-micro" />}
          >
            값 고르기 ({visible.length}/{detail.signals.length}개 표시 중)
          </PopoverTrigger>
          <PopoverContent
            data-slot="anomaly-signal-picker"
            align="start"
            sideOffset={0.375 * rootFontSize}
            className={cn(
              "w-[16.25rem] gap-0 rounded-lg border border-border bg-card p-1.5 shadow-[0_0.5rem_1.5rem_rgba(11,31,46,0.16)] ring-0",
              popupReducedMotionClassName,
            )}
          >
            {detail.signals.map((signal) => {
              const shown = !hiddenKeys.has(signal.key);
              return (
                <label
                  key={signal.key}
                  data-slot="anomaly-signal-option"
                  className="flex h-8 cursor-pointer items-center gap-2 rounded-[0.25rem] px-2 text-sm hover:bg-muted"
                >
                  <CheckboxControl label={signal.name} checked={shown} onCheckedChange={(next) => toggle(signal.key, next)} />
                  {signal.name}
                </label>
              );
            })}
          </PopoverContent>
        </Popover>
        <span id={rangeLabelId} className="text-xs text-muted-foreground">
          범위
        </span>
        <Segmented
          labelledBy={rangeLabelId}
          value={String(rangeMinutes)}
          options={detail.rangeMinuteOptions.map((minutes) => ({ value: String(minutes), label: `±${minutes}분` }))}
          onValueChange={(value) => setRangeMinutes(Number(value))}
          itemPadding="lg"
        />
      </div>
      <div data-slot="anomaly-graph-legend" className="flex flex-none items-center gap-3.5 text-[0.6875rem] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="size-[0.5625rem] rounded-[0.125rem] bg-danger-subtle" />이상 window</span>
        <span className="flex items-center gap-1"><span className="size-[0.5625rem] rounded-[0.125rem] bg-caution" />대표 원인</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-brand-line4" />상위 원인 2·3</span>
        <span className="flex items-center gap-1"><span className="size-[0.5625rem] rounded-[0.125rem] bg-warning" />그 밖의 값</span>
        <span className="flex items-center gap-1"><span className="size-[0.5625rem] rounded-[0.125rem] bg-muted" />짝 축 비교선</span>
        <span>그래프 위에서 마우스를 움직이면 해당 지점의 시각을 볼 수 있습니다.</span>
      </div>
      <div data-slot="anomaly-graph" className="min-h-0 flex-[1_1_auto] overflow-auto rounded-[0.625rem] border border-border bg-card">
        <div
          className="sticky top-0 z-[2] grid h-14 border-b border-border bg-muted"
          style={{ gridTemplateColumns: GRAPH_COLUMNS }}
        >
          <span className="flex items-center px-4 text-sm text-muted-foreground">시각</span>
          <div className="relative border-l border-border">
            <span data-slot="anomaly-graph-from" className="absolute bottom-2 left-0 text-[0.6875rem] font-semibold text-muted-foreground">
              {formatSeconds(startSeconds - spanSeconds)}
            </span>
            <span data-slot="anomaly-graph-to" className="absolute right-0 bottom-2 text-[0.6875rem] font-semibold text-muted-foreground">
              {formatSeconds(startSeconds + spanSeconds)}
            </span>
            <span className="absolute top-6 bottom-0 bg-danger-subtle" style={{ left: bandLeft, width: bandWidth }} />
            <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[0.6875rem] font-bold whitespace-nowrap text-destructive">
              이상 {detail.startTime}
            </span>
          </div>
          <span />
        </div>
        {ranked.length > 0 ? (
          <>
            <div data-slot="anomaly-graph-group" className="flex h-8 items-center gap-2 border-b border-border bg-muted px-3 text-[0.6875rem] font-semibold text-muted-foreground">
              이 window 의 상위 원인
            </div>
            {ranked.map((signal) => (
              <GraphRow key={signal.key} signal={signal} {...rowProps} />
            ))}
          </>
        ) : null}
        {others.length > 0 ? (
          <>
            <div data-slot="anomaly-graph-group" className="flex h-8 items-center gap-2 border-b border-border bg-muted px-3 text-[0.6875rem] font-semibold text-muted-foreground">
              <span className="flex h-5 items-center rounded-[0.625rem] border border-brand-line4 px-2 text-brand-line4-text">
                {detail.deviceName}
              </span>
              그 밖의 값
            </div>
            {others.map((signal) => (
              <GraphRow key={signal.key} signal={signal} {...rowProps} />
            ))}
          </>
        ) : null}
      </div>
      <p className="flex-none text-xs text-muted-foreground">{SOURCE_NOTE}</p>
    </>
  );
}

// 원본 Table Cell의 문구 변환, 숫자는 Column의 소수 자릿수에 맞춤
function rawCellText(value: string | number, decimals: number | null): string {
  return typeof value === "number" && decimals !== null ? value.toFixed(decimals) : String(value);
}

// 원본 Table 표시, 발생 시각 Column 고정과 이상 window Row 강조
function TableTab({ detail }: { detail: AnomalyRawDetail }) {
  const columns = detail.rawColumns.map((_, index) => RAW_COLUMN_WIDTHS[index] ?? RAW_FALLBACK_WIDTH).join(" ");
  const topCause = detail.signals.find((signal) => signal.causeRank === 1);
  return (
    <>
      <p data-slot="anomaly-table-description" className="flex-none text-xs leading-4 text-muted-foreground">
        원인 구분: {detail.causeOrigin} · 대표 원인: {topCause?.name ?? "-"} — 표에서 발생 시각 바로 뒤 노란색 · {detail.rawTotalCount}행 · 붉은 줄 = 이상 window · 컬럼명에 마우스를 올리면 원천 컬럼 이름 · 맨 뒤 파란 열 = 이 모델이 함께 본 다른 장치 값(그 초의 1초 평균) · 발생 시각 열은 왼쪽에 고정
      </p>
      <div
        data-slot="anomaly-raw-table"
        role="table"
        className="min-h-0 flex-[1_1_auto] overflow-auto rounded-[0.625rem] border border-border bg-card"
      >
        <div
          role="row"
          className="sticky top-0 z-[2] grid h-11 items-center border-b border-border bg-muted text-sm"
          style={{ gridTemplateColumns: columns, minWidth: RAW_MIN_WIDTH }}
        >
          {detail.rawColumns.map((column) => (
            <span
              key={column.key}
              role="columnheader"
              title={column.sourceName}
              className={cn("bg-muted px-4 whitespace-nowrap", column.kind === "time" && "sticky left-0")}
            >
              {column.label}
            </span>
          ))}
        </div>
        {detail.rawRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            role="row"
            data-slot="anomaly-raw-row"
            data-in-window={row.inWindow || undefined}
            className={cn(
              "grid h-10 items-center border-b border-border text-sm tabular-nums",
              row.inWindow && "bg-brand-line4-subtle shadow-[inset_0.1875rem_0_0_var(--danger)]",
            )}
            style={{ gridTemplateColumns: columns, minWidth: RAW_MIN_WIDTH }}
          >
            {detail.rawColumns.map((column, index) => (
              <span
                key={column.key}
                role="cell"
                className={cn(
                  "px-4",
                  column.kind === "time" && cn("sticky left-0", row.inWindow ? "bg-brand-line4-subtle" : "bg-card"),
                  column.kind === "cause" && "font-bold text-warning-strong",
                  column.kind === "reference" && "text-muted-foreground",
                )}
              >
                {rawCellText(row.values[index] ?? "", column.decimals)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

interface AnomalyRawModalProps {
  open: boolean;
  onClose: () => void;
  // 받아 온 원본 데이터, 받기 전이면 null
  detail: AnomalyRawDetail | null;
  isDetailFailed: boolean;
}

// 이상 상세 Modal 표시, 연관 장치 Graph와 원본 Table 두 Tab으로 구성
export function AnomalyRawModal({ open, onClose, detail, isDetailFailed }: AnomalyRawModalProps) {
  const [tab, setTab] = useState<AnomalyRawTab>("graph");
  const [shownEventId, setShownEventId] = useState<string | null>(null);
  // 다른 이상을 열면 첫 Tab으로 되돌림
  if (detail !== null && detail.eventId !== shownEventId) {
    setShownEventId(detail.eventId);
    setTab("graph");
  }
  return (
    <ModalFrame
      name="anomaly-raw"
      open={open}
      onClose={onClose}
      title="이상 상세"
      widthRem={77.5}
      closeOnOutsidePress
      footerEnd={<ActionButton label="닫기" variant="outline" size="mdNarrow" onClick={onClose} />}
    >
      <p data-slot="anomaly-raw-subtitle" className="-mt-3 flex-none text-sm leading-5 text-muted-foreground">
        {detail === null
          ? " "
          : `편성 ${detail.formation} · ${detail.car}호차 · ${detail.position} · 이상 window ${detail.date} ${detail.startTime} ~ ${detail.endTime}`}
      </p>
      <ToggleGroup
        data-slot="anomaly-raw-tabs"
        aria-label="이상 상세 보기"
        value={[tab]}
        onValueChange={(next) => {
          const value = next[0] as AnomalyRawTab | undefined;
          if (value !== undefined) setTab(value);
        }}
        spacing={0.5}
        className="h-8 w-max flex-none rounded-md border border-border bg-muted p-0.5"
      >
        {TABS.map((item) => (
          <ToggleGroupItem
            key={item.value}
            value={item.value}
            className="h-[1.625rem] w-[9.375rem] gap-2 rounded-sm px-3 text-sm font-medium whitespace-nowrap text-foreground timing-micro hover:bg-transparent aria-pressed:bg-card aria-pressed:font-bold aria-pressed:shadow-[0_0.0625rem_0.125rem_rgba(11,31,46,0.12)]"
          >
            {tab === item.value ? <span data-slot="anomaly-raw-tab-dot" className="size-1.5 rounded-full bg-brand-line4" /> : null}
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div data-slot="anomaly-raw-body" className="flex min-h-0 flex-[1_1_auto] flex-col gap-3 overflow-hidden">
        {isDetailFailed ? (
          <p role="alert" className="rounded-[0.625rem] bg-danger-subtle px-3.5 py-3 text-sm text-on-danger-subtle">
            원본을 불러오지 못했습니다.
          </p>
        ) : detail === null ? null : tab === "graph" ? (
          <GraphTab key={detail.eventId} detail={detail} />
        ) : (
          <TableTab detail={detail} />
        )}
      </div>
    </ModalFrame>
  );
}
