import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("첫 주소는 Login Page로 이동함", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL("/login");
  await expect(page).toHaveTitle("로그인 · 4호선 CBM 260칸 모니터링 시스템");
  await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
});
