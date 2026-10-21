// 숫자 뒤에 "으로"를 쓰는 끝자리, 읽을 때 받침이 있는 0 영, 3 삼, 6 육(ㄹ 받침인 1, 7, 8과 받침 없는 수는 "로")
const EURO_LAST_DIGITS = new Set(["0", "3", "6"]);

// 숫자로 끝나는 문구 뒤에 "으로"와 "로" 중 맞는 조사를 붙임
function withDirectionParticle(text: string): string {
  return `${text}${EURO_LAST_DIGITS.has(text.slice(-1)) ? "으로" : "로"}`;
}

// 공통 Layout에서 Session을 연장하거나 모니터링을 종료할 때 화면 구석에 띄우는 Toast 문구
export const shellToastTexts = {
  // 연장한 뒤 남은 시간("MM:SS")을 넣은 문구, 예: "세션을 10:00으로 연장했습니다."
  sessionExtended: (remainingText: string) => `세션을 ${withDirectionParticle(remainingText)} 연장했습니다.`,
  // Request 실패 시 표시할 문구
  logoutFailed: "모니터링을 종료하지 못했습니다.",
} as const;
