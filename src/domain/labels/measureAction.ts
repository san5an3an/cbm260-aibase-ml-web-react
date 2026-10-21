import type { YesNoCode } from "@/domain/measures";

interface MeasureFlagLabel {
  // Table의 상태 표시와 조건 Select의 선택지에 사용할 이름
  label: string;
  // KPI처럼 무엇의 상태인지 함께 적는 위치에 사용할 이름
  stateLabel: string;
  // 상태를 코드 문자열로 표시하는 위치의 표기
  codeLabel: string;
}

// 조치 여부의 화면 표기 정의
export const measureActionLabels: Record<YesNoCode, MeasureFlagLabel> = {
  Y: { label: "완료", stateLabel: "조치완료", codeLabel: "Y" },
  N: { label: "미조치", stateLabel: "미조치", codeLabel: "N" },
};

// 조치 여부의 순서 목록, 화면 표기에 나열한 순서를 그대로 사용
export const measureActionCodes: readonly YesNoCode[] = Object.keys(
  measureActionLabels,
) as YesNoCode[];
