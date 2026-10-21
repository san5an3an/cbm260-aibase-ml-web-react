import type { DiagnosticVisualizationKind } from "@/domain/diagnostics";

// Model 진단 시각화 종류별 화면 이름
export const diagnosticVisualizationLabels: Record<DiagnosticVisualizationKind, string> = {
  latentReconstruction: "잠재공간 재구성오차",
  treeDepth: "트리 깊이",
  decisionBoundary: "결정 경계",
  reconstruction: "재구성오차",
};
