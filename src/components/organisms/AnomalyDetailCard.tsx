import { ActionButton } from "@/components/atoms/ActionButton";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/molecules/DataTable";
import { KeyValueRow } from "@/components/molecules/KeyValueRow";
import { SectionCard } from "@/components/molecules/SectionCard";
import { weekdayName } from "@/components/organisms/AnomalyHeatmapCard";
import type { AnomalyDetail, AnomalyEvent } from "@/domain/anomalyDetection";
import { cn } from "@/lib/utils";

// Table의 Column Width, 편성을 선택하지 않으면 편성 Column이 추가됨
const COLUMNS_WITH_FORMATION = "8.125rem 5.625rem 8.125rem minmax(11.25rem,1fr) 11.25rem 7.5rem";
const COLUMNS_WITHOUT_FORMATION = "8.125rem 8.125rem minmax(11.25rem,1fr) 11.25rem 7.5rem";
const TABLE_MIN_WIDTH = "47.5rem";
const REFERENCE_HINT = "이 장치 모델에 함께 넣은 다른 장치 값 — 그 장치를 추론한 결과 아님";

interface BreakdownChip {
  key: string;
  label: string;
  count: number;
}

interface AnomalyDetailCardProps {
  // 선택한 Cell이 없으면 null
  detail: AnomalyDetail | null;
  // 선택한 편성과 호차 Badge, 없으면 null
  pickedChip: string | null;
  onPickChip: (key: string | null) => void;
  onOpenEvent: (event: AnomalyEvent) => void;
  // 새 상세를 기다리는 동안 옅게 표시하고 원본 보기 비활성화
  isWaiting: boolean;
}

// 선택한 장치와 날짜의 이상 판정 수, 나눠 센 Badge, 판정 List 표시
export function AnomalyDetailCard({ detail, pickedChip, onPickChip, onOpenEvent, isWaiting }: AnomalyDetailCardProps) {
  return (
    <SectionCard
      data-slot="anomaly-detail-card"
      eyebrow="DETECTION DETAIL"
      title="장치 · 날짜 상세"
      className="min-h-60 flex-[1_1_0]"
    >
      {detail === null ? null : (
        <AnomalyDetailBody
          detail={detail}
          pickedChip={pickedChip}
          onPickChip={onPickChip}
          onOpenEvent={onOpenEvent}
          isWaiting={isWaiting}
        />
      )}
    </SectionCard>
  );
}

function AnomalyDetailBody({
  detail,
  pickedChip,
  onPickChip,
  onOpenEvent,
  isWaiting,
}: AnomalyDetailCardProps & { detail: AnomalyDetail }) {
  const byCar = detail.breakdownUnit === "car";
  const chips: BreakdownChip[] = detail.breakdown.map((item) => ({
    key: item.key,
    label: byCar ? item.key.padStart(2, "0") : item.key,
    count: item.count,
  }));
  const maxCount = Math.max(0, ...chips.map((chip) => chip.count));
  const chipKey = (event: AnomalyEvent) => (byCar ? event.car : event.formation);
  const events =
    pickedChip === null ? detail.events : detail.events.filter((event) => chipKey(event) === pickedChip);
  const showsFormation = detail.formation === null;
  const columns = showsFormation ? COLUMNS_WITH_FORMATION : COLUMNS_WITHOUT_FORMATION;

  return (
    <div
      data-slot="anomaly-detail-body"
      aria-busy={isWaiting}
      className={cn("flex min-h-0 flex-[1_1_0] flex-col gap-3.5 timing-micro", isWaiting && "opacity-50")}
    >
      <div data-slot="anomaly-detail-chips" className="flex min-w-0 flex-none flex-nowrap gap-2">
        {chips.map((chip) => {
          const isPicked = pickedChip === chip.key;
          const isZero = byCar && chip.count === 0;
          return (
            <button
              key={chip.key}
              type="button"
              data-slot="anomaly-detail-chip"
              aria-pressed={isPicked}
              aria-disabled={isZero || undefined}
              onClick={() => {
                if (!isZero) onPickChip(isPicked ? null : chip.key);
              }}
              className={cn(
                "flex h-[3.25rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[0.25rem]",
                byCar ? "flex-[1_1_0]" : "flex-[0_0_4.5rem]",
                isZero ? "cursor-default" : "cursor-pointer",
                isPicked ? "border-[0.125rem] border-brand-line4" : "border-0",
                isZero
                  ? "bg-success-subtle text-on-success-subtle"
                  : !byCar
                    ? cn("text-danger-fg", isPicked ? "bg-[color-mix(in_srgb,var(--danger)_78%,var(--foreground))]" : "bg-destructive")
                    : cn("text-warning-fg", chip.count === maxCount ? "bg-destructive" : "bg-warning"),
              )}
            >
              <span className="text-sm font-bold">{chip.label}</span>
              <span className="text-[0.6875rem]">{isZero ? "정상" : `${chip.count}회`}</span>
            </button>
          );
        })}
      </div>
      <div className="flex min-h-0 flex-[1_1_0] gap-6">
        <div className="flex min-h-0 flex-[0_0_21.25rem] flex-col gap-3 overflow-auto">
          <div data-slot="anomaly-detail-summary" className="rounded-xl border border-border px-[1.125rem] py-1.5">
            <KeyValueRow label="장치" value={detail.deviceName} />
            <KeyValueRow label="날짜" value={`${detail.date} (${weekdayName(detail.date)})`} />
            <KeyValueRow label="편성" value={detail.formation ?? "전체"} />
            <KeyValueRow label="이상" value={`${detail.anomalyCount}회`} />
          </div>
          <p className="text-xs leading-[1.125rem] text-muted-foreground">
            {byCar ? "호차를 누르면 해당 호차의 데이터만 봅니다" : "편성을 누르면 해당 편성의 데이터만 봅니다"} · 이상 {detail.anomalyCount}회
          </p>
          <p data-slot="anomaly-detail-count" className="text-xs leading-[1.125rem] text-muted-foreground">
            목록 {events.length}건 · 표 영역 안에서 스크롤해 나머지를 봅니다
          </p>
        </div>
        <DataTable minWidth={TABLE_MIN_WIDTH} frameClassName="min-w-0 flex-[1_1_0] rounded-[0.625rem]">
          <DataTableHeader>
            <DataTableHeaderRow columns={columns}>
              <DataTableHead>발생 시각</DataTableHead>
              {showsFormation ? <DataTableHead>편성</DataTableHead> : null}
              <DataTableHead>호차 · 위치</DataTableHead>
              <DataTableHead>원인 장치</DataTableHead>
              <DataTableHead>대표 원인</DataTableHead>
              <DataTableHead className="text-center">원본</DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {events.map((event) => (
              <DataTableRow
                key={event.id}
                columns={columns}
                title={`${detail.date} ${event.startTime} ~ ${event.endTime}`}
                className="h-10 text-sm"
              >
                <DataTableCell className="tabular-nums">{event.startTime}</DataTableCell>
                {showsFormation ? <DataTableCell>{event.formation}</DataTableCell> : null}
                <DataTableCell className="whitespace-nowrap">
                  {event.car}호차 · {event.location}
                </DataTableCell>
                <DataTableCell className="flex items-center gap-2 whitespace-nowrap">
                  {event.causeDeviceName}
                  {event.isReferenceValue ? (
                    <span
                      data-slot="anomaly-reference-badge"
                      title={REFERENCE_HINT}
                      className="flex h-5 items-center rounded-[0.25rem] bg-muted px-1.5 text-[0.6875rem] font-semibold text-muted-foreground"
                    >
                      참고 값
                    </span>
                  ) : null}
                </DataTableCell>
                <DataTableCell className="font-bold whitespace-nowrap text-warning-strong">
                  {event.causeName}
                </DataTableCell>
                <DataTableCell className="flex justify-center">
                  <ActionButton
                    label="원본 보기"
                    variant="outline"
                    size="sm"
                    disabled={isWaiting}
                    onClick={() => onOpenEvent(event)}
                  />
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </div>
    </div>
  );
}
