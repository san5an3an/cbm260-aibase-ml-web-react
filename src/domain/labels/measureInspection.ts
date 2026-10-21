import type { YesNoCode } from "@/domain/measures";

interface MeasureInspectionLabel {
  // Table의 상태 표시와 조건 Select의 선택지에 사용할 이름
  label: string;
  // KPI처럼 무엇의 상태인지 함께 적는 위치에 사용할 이름
  stateLabel: string;
  // 상태를 코드 문자열로 표시하는 위치의 표기
  codeLabel: string;
}

// 검수 여부의 화면 표기 정의
export const measureInspectionLabels: Record<YesNoCode, MeasureInspectionLabel> = {
  Y: { label: "완료", stateLabel: "검수완료", codeLabel: "Y" },
  N: { label: "미검수", stateLabel: "미검수", codeLabel: "N" },
};

// 검수 여부의 순서 목록, 화면 표기에 나열한 순서를 그대로 사용
export const measureInspectionCodes: readonly YesNoCode[] = Object.keys(
  measureInspectionLabels,
) as YesNoCode[];
