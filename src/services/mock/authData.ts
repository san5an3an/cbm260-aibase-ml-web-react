import type { LoginCredentials } from "@/domain/auth";

// Test와 스크린샷이 전역 window에서 쓰는 Test hook, Login과 Logout의 응답 지연, 실패, 받은 Request 기록
interface MockAuthHook {
  // Login 응답 지연 시간(ms)
  delayMs: number;
  // true면 아이디와 비밀번호와 상관없이 실패로 응답
  fail: boolean;
  // Login Request로 받은 아이디, 받은 순서대로 기록하며 실패로 응답한 Request 포함
  requestedIds: string[];
  // Logout 응답 지연 시간(ms)
  logoutDelayMs: number;
  // true면 Logout Request를 실패로 응답
  failLogout: boolean;
  // 받은 Logout Request 수, 실패로 응답한 Request 포함
  logoutCount: number;
}

// Test가 미리 넣거나 Mock이 채우는 Test hook을 담는 전역 객체 정의
interface MockAuthHost {
  cbmMockAuth?: Partial<MockAuthHook>;
}

// window의 Test hook 반환, 없거나 Test가 미리 넣은 값에 빠진 필드가 있으면 기본값으로 채움
function mockHook(): MockAuthHook {
  const host = globalThis as MockAuthHost;
  const hook = (host.cbmMockAuth ??= {});
  hook.delayMs ??= 0;
  hook.fail ??= false;
  hook.requestedIds ??= [];
  hook.logoutDelayMs ??= 0;
  hook.failLogout ??= false;
  hook.logoutCount ??= 0;
  return hook as MockAuthHook;
}

// 아이디와 비밀번호가 비어 있지 않으면 성공, Test hook 설정대로 지연하거나 실패로 응답
export function loginWithMock(credentials: LoginCredentials): Promise<void> {
  const hook = mockHook();
  hook.requestedIds.push(credentials.id);
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (hook.fail || credentials.id === "" || credentials.password === "") {
        reject(new Error("더미 로그인 실패"));
        return;
      }
      resolve();
    }, hook.delayMs);
  });
}

// Logout Request를 세고 Test hook 설정대로 지연한 뒤 성공이나 실패로 응답
export function logoutWithMock(): Promise<void> {
  const hook = mockHook();
  hook.logoutCount += 1;
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (hook.failLogout) {
        reject(new Error("더미 로그아웃 실패"));
        return;
      }
      resolve();
    }, hook.logoutDelayMs);
  });
}
