"use client";

import { useMemo, useState } from "react";
import { AnomalyDetailCard } from "@/components/organisms/AnomalyDetailCard";
import { AnomalyDetectionFilterBar } from "@/components/organisms/AnomalyDetectionFilterBar";
import { AnomalyDetectionSkeleton } from "@/components/organisms/AnomalyDetectionSkeleton";
import { AnomalyHeatmapCard } from "@/components/organisms/AnomalyHeatmapCard";
import { AnomalyRawModal } from "@/components/organisms/AnomalyRawModal";
import { AnomalyDetectionTemplate } from "@/components/templates/AnomalyDetectionTemplate";
import {
  countPeriodDays,
  shiftIsoDay,
  type AnomalyCellKey,
  type AnomalyHeatmap,
} from "@/domain/anomalyDetection";
import type { DateRange } from "@/domain/period";
import { useAsyncResource } from "@/lib/useAsyncResource";
import { useWaitFeedback } from "@/lib/useWaitFeedback";
import {
  fetchAnomalyDetail,
  fetchAnomalyDetectionOptions,
  fetchAnomalyHeatmap,
  fetchAnomalyRawDetail,
} from "@/services/anomalyDetection";

// 화면에서 취소할 수 있도록 AbortSignal을 넘기는 조회
const loadOptions = (signal: AbortSignal) => fetchAnomalyDetectionOptions({ signal });

interface AppliedPeriod {
  from: string;
  to: string;
  // 길게 선택한 기간을 줄였을 때의 안내 문구, 없으면 null
  memo: string | null;
}

// 선택한 Cell이 현재 현황에 있고 결과가 있으면 그 Cell, 아니면 처음 Cell, 그것도 없으면 횟수가 가장 큰 Cell
function resolveCell(heatmap: AnomalyHeatmap, picked: AnomalyCellKey | null): AnomalyCellKey | null {
  const hasResult = (cell: AnomalyCellKey) => {
    const row = heatmap.rows.find((item) => item.deviceCode === cell.deviceCode);
    const index = heatmap.dates.indexOf(cell.date);
    return row !== undefined && index >= 0 && (row.counts[index] ?? null) !== null;
  };
  if (picked !== null && hasResult(picked)) return picked;
  if (heatmap.defaultCell !== null && hasResult(heatmap.defaultCell)) return heatmap.defaultCell;
  let best: { cell: AnomalyCellKey; count: number } | null = null;
  for (const row of heatmap.rows) {
    row.counts.forEach((count, index) => {
      if (count !== null && (best === null || count >= best.count)) {
        best = { cell: { deviceCode: row.deviceCode, date: heatmap.dates[index] }, count };
      }
    });
  }
  return (best as { cell: AnomalyCellKey } | null)?.cell ?? null;
}

// 이상 감지 내역 화면에 데이터와 사용자 동작 연결
export function AnomalyDetectionPage() {
  const [formation, setFormation] = useState<string | null>(null);
  // 선택한 기간, 선택하기 전이면 null(조회한 처음 기간)
  const [pickedPeriod, setPickedPeriod] = useState<AppliedPeriod | null>(null);
  // 시작일만 선택한 동안의 Calendar 값
  const [partialPeriod, setPartialPeriod] = useState<DateRange | null>(null);
  const [pickedCell, setPickedCell] = useState<AnomalyCellKey | null>(null);
  const [pickedChip, setPickedChip] = useState<string | null>(null);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  // 닫히는 동안에도 내용이 남도록 마지막으로 연 이상 번호 보관
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const options = useAsyncResource(loadOptions);
  const optionsData = options.resource.status === "success" ? options.resource.data : null;
  const period: AppliedPeriod | null =
    pickedPeriod ?? (optionsData === null ? null : { ...optionsData.defaultPeriod, memo: null });

  const periodFrom = period?.from ?? null;
  const periodTo = period?.to ?? null;
  const loadHeatmap = useMemo(
    () =>
      periodFrom === null || periodTo === null
        ? null
        : (signal: AbortSignal) => fetchAnomalyHeatmap({ formation, from: periodFrom, to: periodTo }, { signal }),
    [formation, periodFrom, periodTo],
  );
  const heatmap = useAsyncResource(loadHeatmap);
  const heatmapData = heatmap.resource.status === "success" ? heatmap.resource.data : null;
  const cell = heatmapData === null ? null : resolveCell(heatmapData, pickedCell);

  const cellDevice = cell?.deviceCode ?? null;
  const cellDate = cell?.date ?? null;
  const loadDetail = useMemo(
    () =>
      cellDevice === null || cellDate === null
        ? null
        : (signal: AbortSignal) =>
            fetchAnomalyDetail({ formation, deviceCode: cellDevice, date: cellDate }, { signal }),
    [formation, cellDevice, cellDate],
  );
  const detail = useAsyncResource(loadDetail);
  const detailData = detail.resource.status === "success" ? detail.resource.data : null;

  const loadRaw = useMemo(
    () => (lastEventId === null ? null : (signal: AbortSignal) => fetchAnomalyRawDetail(lastEventId, { signal })),
    [lastEventId],
  );
  const raw = useAsyncResource(loadRaw);

  const isHeatmapWaiting = useWaitFeedback(heatmap.isReloading);
  const isDetailWaiting = useWaitFeedback(detail.isReloading || heatmap.isReloading);

  if (
    options.resource.status === "error" ||
    heatmap.resource.status === "error" ||
    (loadDetail !== null && detail.resource.status === "error")
  ) {
    return (
      <p role="alert" className="text-sm text-on-danger-subtle">
        이상 감지 내역을 불러오지 못했습니다.
      </p>
    );
  }
  // 선택할 Cell이 없으면 상세는 조회하지 않고 기다리지 않음
  if (optionsData === null || period === null || heatmapData === null || (cell !== null && detailData === null)) {
    return <AnomalyDetectionSkeleton />;
  }

  const dayCount = countPeriodDays(period.from, period.to);
  const spanDayCount = optionsData.spanDayCounts.includes(dayCount) ? dayCount : null;

  // 기간을 바꾸면 선택한 Cell을 비움
  const applyPeriod = (next: AppliedPeriod) => {
    setPickedPeriod(next);
    setPartialPeriod(null);
    setPickedCell(null);
  };

  // 종료일까지 선택하면 반영, 볼 수 있는 날 수보다 길면 시작일을 당겨 맞춤
  const changePeriod = (next: DateRange) => {
    if (next.from === null || next.to === null) {
      setPartialPeriod(next);
      return;
    }
    const days = countPeriodDays(next.from, next.to);
    if (days <= optionsData.maxDayCount) {
      applyPeriod({ from: next.from, to: next.to, memo: null });
      return;
    }
    const from = shiftIsoDay(next.to, -(optionsData.maxDayCount - 1));
    applyPeriod({
      from,
      to: next.to,
      memo: `${days}일 · ${optionsData.maxDayCount}일까지 볼 수 있어 시작일을 ${from}로 맞췄습니다`,
    });
  };

  const changeSpan = (days: number) =>
    applyPeriod({ from: shiftIsoDay(period.to, -(days - 1)), to: period.to, memo: null });

  const changeFormation = (next: string | null) => {
    setFormation(next);
    setPickedChip(null);
  };

  const selectCell = (next: AnomalyCellKey) => {
    setPickedCell(next);
    setPickedChip(null);
  };

  const rawData =
    raw.resource.status === "success" && !raw.isReloading ? raw.resource.data : null;

  return (
    <>
      <AnomalyDetectionTemplate
        filterBar={
          <AnomalyDetectionFilterBar
            formations={optionsData.formations}
            formation={formation}
            onFormationChange={changeFormation}
            period={partialPeriod ?? { from: period.from, to: period.to }}
            onPeriodChange={changePeriod}
            selectablePeriod={optionsData.selectablePeriod}
            spanDayCounts={optionsData.spanDayCounts}
            spanDayCount={spanDayCount}
            onSpanChange={changeSpan}
            memo={period.memo ?? `${dayCount}일`}
          />
        }
        heatmapCard={
          <AnomalyHeatmapCard
            heatmap={heatmapData}
            formation={formation}
            selectedCell={cell}
            onSelectCell={selectCell}
            isWaiting={isHeatmapWaiting}
          />
        }
        detailCard={
          <AnomalyDetailCard
            detail={cell === null ? null : detailData}
            pickedChip={pickedChip}
            onPickChip={setPickedChip}
            onOpenEvent={(event) => {
              // 원본 데이터를 받지 못한 이상을 다시 열면 그 데이터를 다시 조회
              if (event.id === lastEventId && raw.resource.status === "error" && !raw.isReloading) raw.reload();
              setOpenEventId(event.id);
              setLastEventId(event.id);
            }}
            isWaiting={isDetailWaiting}
          />
        }
      />
      <AnomalyRawModal
        open={openEventId !== null}
        onClose={() => setOpenEventId(null)}
        detail={rawData}
        isDetailFailed={raw.resource.status === "error" && !raw.isReloading}
      />
    </>
  );
}
