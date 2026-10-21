import { commonToastTexts } from "@/components/organisms/commonToastTexts";

// 조치 관리 화면에서 동작이 끝난 뒤 화면 구석에 띄우는 Toast 문구
export const measureToastTexts = {
  exported: commonToastTexts.exported,
  saved: "저장되었습니다.",
  completed: "저장되었습니다.",
  assigned: commonToastTexts.assigned,
  // Request 실패 시 표시할 문구
  exportFailed: commonToastTexts.exportFailed,
  saveFailed: "조치를 저장하지 못했습니다.",
  completeFailed: "조치완료로 바꾸지 못했습니다.",
  assignFailed: commonToastTexts.assignFailed,
} as const;
