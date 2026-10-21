import { expect, test, type Page } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

const ID_INPUT = '[data-slot="login-id-input"]';
const PASSWORD_INPUT = '[data-slot="login-password-input"]';
const SUBMIT = '[data-slot="login-submit"]';
const HINT = '[data-slot="login-id-field"] [data-slot="field-hint"]';
const HINT_TEXT = "아이디에는 한글을 입력할 수 없습니다. 한/영 키로 영문으로 바꿔 입력하세요.";

type MockAuthHost = { cbmMockAuth?: { requestedIds?: string[]; delayMs?: number } };

async function openLogin(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => {
    (window as unknown as MockAuthHost).cbmMockAuth = { delayMs: 2000 };
  });
  await page.goto("/login");
  await expect(page.locator(ID_INPUT)).toBeFocused();
}

test("아이디 Input은 한글을 받지 않고 빼며 안내를 띄우고, 영문을 다시 입력하면 안내를 거두고, 보내는 아이디에 한글이 없음", async ({ page }) => {
  await openLogin(page);
  const idInput = page.locator(ID_INPUT);

  await idInput.fill("op한글er_01");
  await expect(idInput).toHaveValue("oper_01");
  await expect(page.locator(HINT)).toHaveText(HINT_TEXT);
  await expect(idInput).not.toHaveAttribute("aria-invalid", "true");
  const hintId = await page.locator(HINT).getAttribute("id");
  expect(hintId).toBeTruthy();
  await expect(idInput).toHaveAttribute("aria-describedby", hintId as string);

  await page.keyboard.insertText("ㅇㅏ");
  await expect(idInput).toHaveValue("oper_01");
  await expect(page.locator(HINT)).toBeVisible();

  await page.keyboard.type("a");
  await expect(idInput).toHaveValue("oper_01a");
  await expect(page.locator(HINT)).toHaveCount(0);
  await expect(idInput).not.toHaveAttribute("aria-describedby", /./);

  await idInput.fill("홍길동");
  await expect(idInput).toHaveValue("");
  await page.locator(PASSWORD_INPUT).fill("secret-pw");
  await page.locator(SUBMIT).click();
  await expect(page.locator(HINT)).toHaveCount(0);
  await expect(page.locator('[data-slot="login-id-field"] [data-slot="field-error"]')).toHaveText("아이디를 입력하세요");

  await idInput.fill("관리operator");
  await page.locator(SUBMIT).click();
  await expect
    .poll(() => page.evaluate(() => [...((window as unknown as MockAuthHost).cbmMockAuth?.requestedIds ?? [])]))
    .toEqual(["operator"]);
});
