const SESSION_SECONDS = 600;

// Session이 만료되기까지 남은 시간(초) 조회
export async function fetchSessionRemainingSeconds(): Promise<number> {
  return SESSION_SECONDS;
}

// Session 연장 Request 후 남은 시간(초) 반환
export async function extendSession(): Promise<number> {
  return SESSION_SECONDS;
}
