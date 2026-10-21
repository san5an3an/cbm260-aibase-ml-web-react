import { KpiStat } from "@/components/molecules/KpiStat";

interface ThresholdTuningKpiRowProps {
  savedThreshold: number;
  previewThreshold: number;
  percentile: number;
  // 학습 데이터 중 임계값을 넘는 비율(%)
  trainingExceedPercent: number;
  savedOperatingRatePercent: number;
  previewOperatingRatePercent: number;
  previewOperatingWindowCount: number;
  operatingWindowCount: number;
}

// 임계값 튜닝의 KPI 6개(저장 임계값, 미리보기 임계값, 백분위, 학습 초과, 운영 이상 비율, 운영 이상 window) 표시
export function ThresholdTuningKpiRow({
  savedThreshold,
  previewThreshold,
  percentile,
  trainingExceedPercent,
  savedOperatingRatePercent,
  previewOperatingRatePercent,
  previewOperatingWindowCount,
  operatingWindowCount,
}: ThresholdTuningKpiRowProps) {
  return (
    <div
      data-slot="threshold-tuning-kpi-row"
      className="grid h-28 flex-none grid-cols-6 gap-3.5 [&>*]:min-w-0"
    >
      <KpiStat
        label="저장 임계값"
        value={savedThreshold.toFixed(4)}
        unit=""
        description="현재 학습본에 저장돼 쓰이는 값"
        tone="neutral"
        singleLine
      />
      <KpiStat
        label="미리보기 임계값"
        value={previewThreshold.toFixed(4)}
        unit=""
        description="슬라이더 백분위로 계산"
        tone="danger"
        singleLine
      />
      <KpiStat
        label="백분위"
        value={percentile.toFixed(1)}
        unit="%"
        description="선택한 분위수"
        tone="brand"
        singleLine
      />
      <KpiStat
        label="학습 데이터 초과"
        value={trainingExceedPercent.toFixed(2)}
        unit="%"
        description="정의상 ≈ 100 − 백분위"
        tone="warning"
        singleLine
      />
      <KpiStat
        label="운영 이상 비율"
        value={`${savedOperatingRatePercent.toFixed(2)} → ${previewOperatingRatePercent.toFixed(2)}`}
        unit="%"
        description="저장 임계 → 미리보기 · 운영 window 기준"
        tone="warning"
        singleLine
      />
      <KpiStat
        label="운영 이상 window"
        value={previewOperatingWindowCount.toLocaleString()}
        unit={`/ ${operatingWindowCount.toLocaleString()}`}
        description="미리보기 임계 기준 초과 window"
        tone="warning"
        singleLine
      />
    </div>
  );
}
