import type { MeasureEffectSortKey } from "@/domain/measures";

interface MeasureEffectSortLabel {
  // 정렬 Select의 선택지에 사용할 이름
  label: string;
  // 결과 아래 안내 Row에 표시할 설명
  description: string;
}

// 조치 효과 비교의 정렬 기준 화면 표기 정의
export const measureEffectSortLabels: Record<MeasureEffectSortKey, MeasureEffectSortLabel> = {
  change: { label: "변화 큰 순", description: "변화가 큰 순(비율 크기 반영)" },
  before: { label: "전 비율 순", description: "전 비율 높은 순" },
  after: { label: "후 비율 순", description: "후 비율 높은 순" },
  formation: { label: "편성·호차 순", description: "편성·호차 순" },
};

// 정렬 기준의 순서 목록, 화면 표기에 나열한 순서를 그대로 사용
export const measureEffectSortKeys: readonly MeasureEffectSortKey[] = Object.keys(
  measureEffectSortLabels,
) as MeasureEffectSortKey[];
