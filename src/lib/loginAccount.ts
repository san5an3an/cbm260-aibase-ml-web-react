// Login 상태를 화면에 알리는 Cookie의 이름, 화면이 그려지기 전에 src/proxy.ts가 읽음
export const LOGIN_ACCOUNT_COOKIE = "cbm-login-account";

// https로 연 화면이면 Cookie가 암호화된 연결로만 오가도록 지정
function secureAttribute(): string {
  return window.location.protocol === "https:" ? "; Secure" : "";
}

// Login한 아이디를 Browser Session Cookie로 보관, 만료 시각을 두지 않아 Browser를 닫으면 사라지고 비밀번호는 저장하지 않음
export function saveLoginAccount(id: string): void {
  document.cookie = `${LOGIN_ACCOUNT_COOKIE}=${encodeURIComponent(id)}; Path=/; SameSite=Lax${secureAttribute()}`;
}

// 보관한 Login 아이디 삭제, Session 만료나 모니터링 종료 때 호출
export function clearLoginAccount(): void {
  document.cookie = `${LOGIN_ACCOUNT_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0${secureAttribute()}`;
}

// Cookie 문자열(Browser의 document.cookie, Request의 Cookie Header)에서 Login한 아이디를 읽음, 없거나 빈 값이면 null
export function readLoginAccount(cookieText: string): string | null {
  for (const part of cookieText.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1 || part.slice(0, separator).trim() !== LOGIN_ACCOUNT_COOKIE) continue;
    const value = part.slice(separator + 1).trim();
    if (value === "") return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}
