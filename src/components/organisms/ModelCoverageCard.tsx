import {
  CoverageRow,
  coverageGridClassName,
  coverageGridTemplate,
} from "@/components/molecules/CoverageRow";
import { CoverageTotalsRow } from "@/components/molecules/CoverageTotalsRow";
import { SectionCard } from "@/components/molecules/SectionCard";
import type { ModelCoverage } from "@/domain/fleet";
import { cn } from "@/lib/utils";

const legendItemClassName = "flex items-center gap-1.5";
const legendBoxClassName = "grid h-[1.125rem] w-[1.875rem] place-items-center rounded-[0.25rem]";

interface ModelCoverageCardProps {
  coverage: ModelCoverage;
  // 새 현황을 기다리는 동안 장치 Row와 합계를 옅게 표시하고 화면 읽기 프로그램에 기다리는 중임을 알림, 범례와 머리글 Row는 그대로 유지
  isWaiting: boolean;
}

// 장치 × Model의 학습 버전 보유 현황 표시
export function ModelCoverageCard({ coverage, isWaiting }: ModelCoverageCardProps) {
  const modelCount = coverage.modelCodes.length;
  const totals = coverage.modelCodes.map((modelCode) => {
    const total = coverage.totals.find((item) => item.modelCode === modelCode);
    return {
      key: modelCode,
      splitText: total ? `${total.productionCount} / ${total.stagingCount}` : "",
      ownedText: total ? `${total.ownedDeviceCount}/${coverage.rows.length}` : "",
    };
  });

  return (
    <SectionCard
      data-slot="model-coverage-card"
      eyebrow="MODEL COVERAGE"
      title="모델 커버리지 매트릭스"
      description="전체 장치 × 모델 학습본 · output/{production,staging} 스캔"
      className="min-h-0 flex-[0_0_clamp(30rem,33vw,40rem)]"
    >
      <div
        data-slot="model-coverage-body"
        aria-busy={isWaiting}
        className="flex min-h-0 flex-[1_1_0] flex-col"
      >
        <div
          data-slot="model-coverage-legend"
          className="mb-1.5 flex flex-none flex-wrap items-center gap-4 text-xs text-muted-foreground"
        >
          <span className={legendItemClassName}>
            <span className={cn(legendBoxClassName, "bg-brand-line4-subtle")}>
              <span className="size-2 rounded-full bg-brand-line4" />
            </span>
            운영
          </span>
          <span className={legendItemClassName}>
            <span className={cn(legendBoxClassName, "border border-dashed border-brand-line4")}>
              <span className="box-border size-2 rounded-full border-[0.09375rem] border-brand-line4" />
            </span>
            스테이징
          </span>
          <span className={legendItemClassName}>
            <span className="h-[0.0625rem] w-3 bg-border-strong" />
            미학습 → 추론 skip
          </span>
          <span className={legendItemClassName}>
            <span className="flex h-[1.125rem] items-center gap-[0.1875rem] rounded-[0.25rem] bg-brand-line4-subtle px-1.5">
              <span className="size-2 rounded-full bg-brand-line4" />
              <span className="size-2 rounded-full bg-brand-line4" />
            </span>
            점 개수 = 세그먼트 수
          </span>
        </div>
        <div
          data-slot="model-coverage-head"
          className={cn(coverageGridClassName, "h-[1.875rem] flex-none text-xs font-bold")}
          style={{ gridTemplateColumns: coverageGridTemplate(modelCount) }}
        >
          <span className="pl-2 text-muted-foreground">장치 {coverage.rows.length}</span>
          {coverage.modelCodes.map((modelCode) => (
            <span key={modelCode} className="text-center">
              {modelCode}
            </span>
          ))}
          <span className="text-right text-muted-foreground">보유</span>
        </div>
        <div
          data-slot="model-coverage-rows"
          className={cn(
            "flex min-h-0 flex-[1_1_0] flex-col overflow-y-auto",
            isWaiting && "opacity-50",
          )}
        >
          {coverage.rows.map((row, rowIndex) => (
            <CoverageRow
              key={row.deviceCode}
              name={row.deviceCode}
              cells={coverage.modelCodes.map((modelCode) => {
                const cell = row.cells.find((item) => item.modelCode === modelCode);
                return {
                  key: modelCode,
                  status: cell?.status ?? "none",
                  segmentCount: cell?.segmentCount ?? 0,
                };
              })}
              ownedText={`${row.ownedModelCount}/${modelCount}`}
              isStriped={rowIndex % 2 === 1}
            />
          ))}
        </div>
        <CoverageTotalsRow
          labelLines={["모델별 합계", "운영 / 스테이징"]}
          totals={totals}
          className={cn(isWaiting && "opacity-50")}
        />
      </div>
    </SectionCard>
  );
}
