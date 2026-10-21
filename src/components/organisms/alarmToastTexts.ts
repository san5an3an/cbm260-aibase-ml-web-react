import { commonToastTexts } from "@/components/organisms/commonToastTexts";

// Alarm을 등록, 처리, 삭제한 뒤 화면 구석에 띄우는 Toast 문구
export const alarmToastTexts = {
  created: "알람을 등록했습니다.",
  processed: "알람을 저장했습니다.",
  deleted: "알람을 삭제했습니다.",
  assigned: commonToastTexts.assigned,
  acknowledged: (count: number) => `${count}건을 확인 처리했습니다.`,
  // Request 실패 시 표시할 문구
  createFailed: "알람을 등록하지 못했습니다.",
  processFailed: "알람을 저장하지 못했습니다.",
  deleteFailed: "알람을 삭제하지 못했습니다.",
  assignFailed: commonToastTexts.assignFailed,
  acknowledgeFailed: "확인 처리하지 못했습니다.",
  ruleSaveFailed: "알람 규칙을 저장하지 못했습니다.",
  ruleDeleteFailed: "알람 규칙을 삭제하지 못했습니다.",
} as const;
