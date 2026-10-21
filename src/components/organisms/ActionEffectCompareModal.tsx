"use client";

import type { ReactNode } from "react";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { ActionButton } from "@/components/atoms/ActionButton";
import { ModalBodyScroll } from "@/components/atoms/ModalBodyScroll";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/molecules/DataTable";
import { EmptyState } from "@/components/molecules/EmptyState";
import { ModalFrame } from "@/components/molecules/ModalFrame";
import { RatioBar } from "@/components/molecules/RatioBar";
import { SelectField } from "@/components/molecules/SelectField";
import { DateRangePicker } from "@/components/organisms/DateRangePicker";
import { measureEffectLevelClassNames } from "@/components/organisms/measureTones";
import type { Device } from "@/domain/device";
import { measureEffectAppearedLabel } from "@/domain/labels/measureEffectChange";
import { measureEffectSortLabels } from "@/domain/labels/measureEffectSort";
import type {
  MeasureEffectChange,
  MeasureEffectConditions,
  MeasureEffectOptions,
  MeasureEffectSortKey,
  RatedMeasureEffectComparison,
  RatedWindowCount,
} from "@/domain/measures";
import { formatIsoMonthDay } from "@/lib/formatTime";
import { cn } from "@/lib/utils";

// Modal의 Width(rem)
const WIDTH_REM = 62.5;
// 위치 Table의 Column 구성과 최소 Width
const COLUMNS = "9.375rem minmax(8.75rem,1fr) 14.375rem 14.375rem 6.875rem";
const TABLE_MIN_WIDTH = "55rem";
// 편성과 호차를 선택하지 않은 상태를 나타내는 값
const ALL = "";
// 이상 비율의 소수 자릿수
const RATE_DIGITS = 2;
// window가 없어 비교할 자료가 없는 비율과 변화 위치의 표시
const EMPTY_VALUE = "-";
const countFormat = new Intl.NumberFormat("ko-KR");

// 편성과 호차 조건의 Text 계산, 편성을 선택하지 않았으면 편성 전체로 표시
function describeScope(conditions: MeasureEffectConditions): string {
  if (conditions.formation === null) return "편성 전체";
  const car = conditions.car === null ? "" : ` · ${conditions.car}호차`;
  return `편성 ${conditions.formation}${car}`;
}

// Modal 제목 계산, Row의 조치일에서 열었으면 조치일, 비교를 눌렀으면 기준일로 표시
function describeTitle(applied: MeasureEffectConditions | null, isActionDatePreset: boolean): string {
  if (applied === null) return "조치 전·후 비교";
  if (isActionDatePreset) {
    return `조치 전·후 비교 — 편성 ${applied.formation} · ${applied.car}호차 · 조치일 ${applied.baseDate}`;
  }
  return `조치 전·후 비교 — ${describeScope(applied)} · 기준일 ${applied.baseDate}`;
}

// 기간 하나의 이상 비율 Text 계산, window가 없으면 빈 값으로 표시
function formatRate(count: RatedWindowCount): string {
  return count.windowCount === 0 ? EMPTY_VALUE : `${count.ratePercent.toFixed(RATE_DIGITS)}%`;
}

// 변화의 화살표와 Text 계산, 줄어들면 아래 화살표, 비교할 자료가 없으면 화살표 없이 빈 값으로 표시
function describeChange(change: MeasureEffectChange): { arrow: string | null; label: string } {
  switch (change.kind) {
    case "appeared":
      return { arrow: "▲", label: measureEffectAppearedLabel };
    case "noData":
      return { arrow: null, label: EMPTY_VALUE };
    case "rate":
      return {
        arrow: change.percent < 0 ? "▼" : "▲",
        label: `${Math.abs(Math.round(change.percent))}%`,
      };
  }
}

// Table 변화 Cell의 Text 계산, 화살표와 Text 사이를 띄어 씀
function formatChange(change: MeasureEffectChange): string {
  const { arrow, label } = describeChange(change);
  return arrow === null ? label : `${arrow} ${label}`;
}

// 변화 Card의 값 계산, 화살표는 Text보다 작게 표시
function describeTileChange(change: MeasureEffectChange): ReactNode {
  const { arrow, label } = describeChange(change);
  if (arrow === null) return label;
  return (
    <>
      <span className="text-2xl">{arrow}</span>
      {label}
    </>
  );
}

// 변화의 판정별 Text Color 반환
function changeClassName(change: MeasureEffectChange): string {
  switch (change.kind) {
    case "appeared":
    case "noData":
      return measureEffectLevelClassNames[change.kind];
    case "rate":
      return measureEffectLevelClassNames[change.level];
  }
}

interface SummaryTileProps {
  label: string;
  value: ReactNode;
  detail: string;
  // 아래 설명 Row의 Height, 숫자만이면 13, 한글이 섞이면 16
  detailClassName: string;
  valueClassName?: string;
}

// 전, 후, 변화 중 하나를 큰 숫자로 표시
function SummaryTile({ label, value, detail, detailClassName, valueClassName }: SummaryTileProps) {
  return (
    <div
      data-slot="measure-effect-tile"
      // 전, 후, 변화 세 Card가 Row의 Width를 똑같이 나눠 채움
      className="flex min-w-0 flex-1 flex-col gap-1 rounded-[0.625rem] border border-border bg-card px-3.5 py-3"
    >
      <span
        data-slot="measure-effect-tile-label"
        className="text-[0.6875rem] leading-4 text-muted-foreground"
      >
        {label}
      </span>
      <span
        data-slot="measure-effect-tile-value"
        className={cn("text-[1.75rem] leading-[2.125rem] font-bold", valueClassName)}
      >
        {value}
      </span>
      <span
        data-slot="measure-effect-tile-detail"
        className={cn("text-[0.6875rem] text-muted-foreground", detailClassName)}
      >
        {detail}
      </span>
    </div>
  );
}

// 전 또는 후 기간의 비율 Bar, 비율, window 수 표시
function RateCell({
  count,
  scaleMaxPercent,
  tone,
}: {
  count: RatedWindowCount;
  scaleMaxPercent: number;
  tone: "brandGradient" | "warningGradient";
}) {
  return (
    <DataTableCell className="flex items-center gap-2.5 pr-3 pl-0">
      <RatioBar
        size="xs"
        tone={tone}
        fillPercent={scaleMaxPercent === 0 ? 0 : (count.ratePercent / scaleMaxPercent) * 100}
        label={formatRate(count)}
      />
      <span
        data-slot="measure-effect-count"
        className="text-[0.6875rem] leading-[0.8125rem] text-muted-foreground tabular-nums"
      >
        {`${count.anomalyCount}/${count.windowCount}`}
      </span>
    </DataTableCell>
  );
}

interface ActionEffectCompareModalProps {
  open: boolean;
  onClose: () => void;
  // 장치 선택지, 선택할 수 있는 장치만 이름과 함께 전달
  devices: readonly Device[];
  options: MeasureEffectOptions;
  // 수정 중인 조건
  conditions: MeasureEffectConditions;
  onConditionsChange: (conditions: MeasureEffectConditions) => void;
  sort: MeasureEffectSortKey;
  onSortChange: (sort: MeasureEffectSortKey) => void;
  // 비교 Button, 조건이 그대로여도 Click할 때마다 호출
  onCompare: () => void;
  // 마지막으로 비교한 조건, 비교하기 전이면 null
  appliedConditions: MeasureEffectConditions | null;
  // Row의 조치일에서 열었고 아직 다시 비교하지 않았는지 여부
  isActionDatePreset: boolean;
  // 비교 결과, 받는 중이거나 받지 못했으면 null
  result: RatedMeasureEffectComparison | null;
  // 마지막으로 비교한 조건의 결과를 받지 못했는지 여부, 다시 받는 동안은 false
  isResultFailed: boolean;
}

// 기준일 전후의 이상 비율을 베어링 위치별로 비교하는 조치 효과 비교 Modal 표시
export function ActionEffectCompareModal({
  open,
  onClose,
  devices,
  options,
  conditions,
  onConditionsChange,
  sort,
  onSortChange,
  onCompare,
  appliedConditions,
  isActionDatePreset,
  result,
  isResultFailed,
}: ActionEffectCompareModalProps) {
  const shownResult = appliedConditions === null ? null : result;
  const hasRows = shownResult !== null && shownResult.rows.length > 0;
  const dayCount = appliedConditions?.dayCount ?? conditions.dayCount;

  return (
    <ModalFrame
      name="action-effect-compare"
      open={open}
      onClose={onClose}
      title={describeTitle(appliedConditions, isActionDatePreset)}
      widthRem={WIDTH_REM}
      closeOnOutsidePress
      footerEnd={
        <ActionButton
          label="닫기"
          variant="outline"
          size="mdNarrow"
          weight="medium"
          onClick={onClose}
        />
      }
    >
      <ModalBodyScroll bleed={false} data-slot="measure-effect-body">
        <p data-slot="measure-effect-description" className="text-xs leading-4 text-muted-foreground">
          기준일 전·후 며칠의 이상 비율을 베어링 위치별로 비교합니다. 기준일 당일은 어느 쪽에도 넣지
          않습니다.
        </p>
        <div data-slot="measure-effect-conditions" className="flex flex-wrap items-center gap-2">
          <SelectField
            label="장치"
            value={conditions.deviceCode}
            options={devices.map((device) => ({ value: device.code, label: device.name }))}
            onValueChange={(deviceCode) => onConditionsChange({ ...conditions, deviceCode })}
            // Select마다 가장 긴 선택지가 잘리지 않고 한 Row에 다 들어가는 Width로 맞춤
            className="w-[8.5rem] flex-none"
          />
          <SelectField
            label="모델"
            value={conditions.modelCode}
            options={options.modelCodes.map((code) => ({ value: code, label: code }))}
            onValueChange={(modelCode) => onConditionsChange({ ...conditions, modelCode })}
            className="w-[5.25rem] flex-none"
          />
          <SelectField
            label="편성"
            value={conditions.formation ?? ALL}
            options={[
              { value: ALL, label: "편성 (전체)" },
              ...options.formations.map((formation) => ({
                value: formation,
                label: `편성 ${formation}`,
              })),
            ]}
            // 편성을 바꾸면 선택한 호차를 비움
            onValueChange={(formation) =>
              onConditionsChange({
                ...conditions,
                formation: formation === ALL ? null : formation,
                car: null,
              })
            }
            className="w-[7.5rem] flex-none"
          />
          <SelectField<number | typeof ALL>
            label="호차"
            value={conditions.car ?? ALL}
            options={[
              { value: ALL, label: "호차 (전체)" },
              ...options.cars.map((car) => ({ value: car, label: `${car}호차` })),
            ]}
            onValueChange={(car) => onConditionsChange({ ...conditions, car: car === ALL ? null : car })}
            className="w-[7.5rem] flex-none"
          />
          <DateRangePicker
            mode="single"
            label="기준일"
            value={conditions.baseDate}
            onValueChange={(baseDate) => onConditionsChange({ ...conditions, baseDate })}
            selectableRange={options.selectableBaseDates}
            placeholder="날짜 선택"
            appearance="dropdown"
            highlightWhenOpen
            triggerClassName="w-[8rem] flex-none"
          />
          <SelectField
            label="전·후 날 수"
            value={conditions.dayCount}
            options={options.dayCounts.map((count) => ({ value: count, label: `전·후 ${count}일` }))}
            onValueChange={(count) => onConditionsChange({ ...conditions, dayCount: count })}
            className="w-[7.5rem] flex-none"
          />
          <ActionButton label="비교" onClick={onCompare} />
          <span className="flex-1" />
          <SelectField
            label="정렬"
            value={sort}
            options={options.sortKeys.map((key) => ({
              value: key,
              label: measureEffectSortLabels[key].label,
            }))}
            onValueChange={onSortChange}
            className="w-[8rem] flex-none"
          />
        </div>
        {hasRows && appliedConditions ? (
          <div data-slot="measure-effect-summary" className="flex items-center gap-3">
            <SummaryTile
              label={`전 · ${formatIsoMonthDay(shownResult.beforePeriod.from)}~${formatIsoMonthDay(shownResult.beforePeriod.to)} (${dayCount}일)`}
              value={formatRate(shownResult.before)}
              valueClassName="tabular-nums"
              detail={`${countFormat.format(shownResult.before.anomalyCount)} / ${countFormat.format(shownResult.before.windowCount)}`}
              detailClassName="leading-[0.8125rem] tabular-nums"
            />
            <span
              data-slot="measure-effect-summary-arrow"
              aria-hidden
              className="text-lg leading-[1.3125rem] text-muted-foreground"
            >
              →
            </span>
            <SummaryTile
              label={`후 · ${formatIsoMonthDay(shownResult.afterPeriod.from)}~${formatIsoMonthDay(shownResult.afterPeriod.to)} (${dayCount}일)`}
              value={formatRate(shownResult.after)}
              valueClassName="tabular-nums"
              detail={`${countFormat.format(shownResult.after.anomalyCount)} / ${countFormat.format(shownResult.after.windowCount)}`}
              detailClassName="leading-[0.8125rem] tabular-nums"
            />
            <SummaryTile
              label="변화"
              value={describeTileChange(shownResult.change)}
              valueClassName={cn("flex items-center gap-1.5", changeClassName(shownResult.change))}
              detail={`${describeScope(appliedConditions)} · ${appliedConditions.modelCode} · 기준일 ${appliedConditions.baseDate} (제외)`}
              detailClassName="leading-4"
            />
          </div>
        ) : null}
        <DataTable minWidth={TABLE_MIN_WIDTH} frameClassName="flex-none rounded-[0.625rem] bg-card">
          <DataTableHeader>
            <DataTableHeaderRow columns={COLUMNS} className="text-sm">
              <DataTableHead>편성 · 호차</DataTableHead>
              <DataTableHead>위치</DataTableHead>
              <DataTableHead className="px-3">전 이상 비율</DataTableHead>
              <DataTableHead className="px-3">후 이상 비율</DataTableHead>
              <DataTableHead className="text-right">변화</DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {hasRows
              ? shownResult.rows.map((row) => (
                  <DataTableRow
                    key={`${row.formation}-${row.car}-${row.locationCode}`}
                    columns={COLUMNS}
                    className="h-11 text-sm leading-5 hover:bg-transparent"
                  >
                    <DataTableCell className="whitespace-nowrap">{`${row.formation} · ${row.car}호차`}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      {row.locationCode}
                    </DataTableCell>
                    <RateCell
                      count={row.before}
                      scaleMaxPercent={shownResult.rateScaleMaxPercent}
                      tone="brandGradient"
                    />
                    <RateCell
                      count={row.after}
                      scaleMaxPercent={shownResult.rateScaleMaxPercent}
                      tone="warningGradient"
                    />
                    <DataTableCell
                      data-slot="measure-effect-change"
                      className={cn(
                        "text-right font-bold whitespace-nowrap",
                        changeClassName(row.change),
                      )}
                    >
                      {formatChange(row.change)}
                    </DataTableCell>
                  </DataTableRow>
                ))
              : null}
          </DataTableBody>
        </DataTable>
        {appliedConditions === null ? (
          <EmptyState
            variant="panel"
            iconTone="brand"
            icon={<PlayArrowRoundedIcon aria-hidden className="size-[1.625rem]" />}
            title="조건을 고르고 [비교]를 누르세요."
            description="장치·모델·기준일을 고른 뒤 비교합니다. 기준일 당일은 전·후 어느 쪽에도 넣지 않습니다."
          />
        ) : isResultFailed ? (
          <div role="alert">
            <EmptyState
              variant="panel"
              icon={<WarningAmberRoundedIcon aria-hidden className="size-[1.625rem]" />}
              title="비교 결과를 불러오지 못했습니다."
              description="조건을 확인하고 [비교]를 다시 누르세요."
            />
          </div>
        ) : shownResult !== null && !hasRows ? (
          <EmptyState
            variant="panel"
            iconTone="brand"
            icon={<SearchOffRoundedIcon aria-hidden className="size-[1.625rem]" />}
            title="이 조건으로 저장된 window 점수가 없습니다."
            description="편성·호차 또는 기준일을 바꿔 다시 비교하세요."
          />
        ) : null}
        {hasRows ? (
          <p data-slot="measure-effect-foot" className="text-xs leading-[1.0625rem] text-muted-foreground">
            {`위치 ${shownResult.locationCount}곳 중 ${shownResult.rows.length}곳 · 정렬: ${measureEffectSortLabels[sort].description} · 전·후 각 ${dayCount}일 · 변화: ${shownResult.changeThresholdPercent}% 이상 줄면 초록, 늘면 빨강`}
          </p>
        ) : null}
      </ModalBodyScroll>
    </ModalFrame>
  );
}
