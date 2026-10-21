// 여러 화면이 같은 동작 뒤에 같은 문구로 띄우는 Toast 문구 정의, 화면별 Toast 문구 파일이 가져다 씀
export const commonToastTexts = {
  exported: "CSV 파일을 내려받았습니다.",
  assigned: (count: number) => `${count}건에 담당자를 지정했습니다.`,
  // Request 실패 시 표시할 문구
  exportFailed: "CSV 파일을 내려받지 못했습니다.",
  assignFailed: "담당자를 지정하지 못했습니다.",
  retryFailed: "재시도를 요청하지 못했습니다.",
} as const;
