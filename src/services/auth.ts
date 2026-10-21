import type { LoginCredentials } from "@/domain/auth";
import { loginWithMock, logoutWithMock } from "@/services/mock/authData";

// 아이디와 비밀번호로 Login, 성공하면 완료하고 실패하면 거부, 인증 방식(Cookie, Token 등)과 보관은 백엔드가 정하며 이 함수 안에서 처리
export async function login(credentials: LoginCredentials): Promise<void> {
  return loginWithMock(credentials);
}

// Logout(모니터링 종료), Server의 Session 종료. 반드시 끝나야 하므로 시간 제한은 이 함수 안에 두고 넘으면 거부, 인증 정보를 지우는 방식은 백엔드가 정하며 이 함수 안에서 처리
export async function logout(): Promise<void> {
  return logoutWithMock();
}
