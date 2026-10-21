import type { AnomalyLevelKey } from "@/domain/anomaly";

interface AnomalyLevelLabel {
  label: string;
  shortLabel: string;
}

// 이상비율 등급의 화면 표기 정의
export const anomalyLevelLabels: Record<AnomalyLevelKey, AnomalyLevelLabel> = {
  danger: { label: "위험", shortLabel: "위" },
  warning: { label: "경고", shortLabel: "경" },
  caution: { label: "주의", shortLabel: "주" },
  normal: { label: "정상", shortLabel: "정" },
};
