import { defineConfig, devices } from "@playwright/test";
import { LOGIN_ACCOUNT_COOKIE } from "./src/lib/loginAccount";

// 다른 프로젝트 Server와 겹치지 않는 전용 Port 지정, 여러 복사본을 동시에 실행할 때는 환경 변수로 변경
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3260);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL,
    // Login 상태로 Test 시작, Login 전 상태가 필요한 Test는 해당 파일에서 storageState를 비움
    storageState: {
      cookies: [
        { name: LOGIN_ACCOUNT_COOKIE, value: "operator", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" },
      ],
      origins: [],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Test 전에 build한 Server를 새로 실행
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    // Mock 응답 지연을 끄고 build, 대기가 필요한 Test는 Test 안에서 window에 설정을 넣어 활성화
    env: { NEXT_PUBLIC_MOCK_LATENCY: "off" },
  },
});
