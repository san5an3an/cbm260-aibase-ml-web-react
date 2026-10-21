import { expect, test, type Page } from "@playwright/test";
import { MOCK_TODAY, color, measure } from "./helpers/measure";
import { box, confirmDialog, focusIsInside, iconShape, shownIconShape } from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const LOGOUT = confirmDialog("logout-confirm");
const WARNING = confirmDialog("session-expiry-warning");
const EXPIRED = confirmDialog("session-expired");
const FAILURE = '[data-dialog="device-failure"]';
const POWER = '[data-slot="left-rail"] [data-slot="rail-button"][title="모니터링 종료"]';
const TITLE = `${LOGOUT} [data-slot="alert-dialog-title"]`;
const DESCRIPTION = `${LOGOUT} [data-slot="alert-dialog-description"]`;
const MEDIA = `${LOGOUT} [data-slot="alert-dialog-media"]`;
const ACTION = `${LOGOUT} [data-slot="alert-dialog-action"]`;
const CANCEL = `${LOGOUT} [data-slot="alert-dialog-cancel"]`;
const REMAINING = '[data-slot="session-chip-remaining"]';
const ERROR_TOAST = '[data-slot="toast-viewport"] [data-tone="error"]';

const START = MOCK_TODAY.getTime();
const EXPIRY = START + 600 * 1000;

interface MockAuth {
  logoutDelayMs: number;
  failLogout: boolean;
  logoutCount: number;
}

type MockAuthHost = { cbmMockAuth?: Partial<MockAuth> };

async function openScreen(page: Page, path = "/dashboard/fleet", auth?: Partial<MockAuth>): Promise<void> {
  await page.clock.setFixedTime(START);
  await page.setViewportSize({ width: 1920, height: 1080 });
  if (auth) {
    await page.addInitScript((value) => {
      (window as unknown as MockAuthHost).cbmMockAuth = value;
    }, auth);
  }
  await page.goto(path);
  await expect(page.locator(REMAINING)).toHaveText("10:00");
}

async function logoutCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as MockAuthHost).cbmMockAuth?.logoutCount ?? 0);
}

async function openLogoutConfirm(page: Page): Promise<void> {
  await page.locator(POWER).click();
  await expect(page.locator(LOGOUT)).toBeVisible();
}

async function topAt(page: Page, point: { x: number; y: number }): Promise<string | null> {
  return page.evaluate(({ x, y }) => {
    const top = document.elementFromPoint(x, y);
    return top?.closest("[data-dialog]")?.getAttribute("data-dialog") ?? (top as HTMLElement | null)?.dataset.slot ?? null;
  }, point);
}

async function expectStaysOpen(page: Page, selector: string): Promise<void> {
  await page.waitForTimeout(300);
  await expect(page.locator(selector)).toBeVisible();
  await expect(page.locator(selector)).toHaveAttribute("data-open", "");
  await expect(page.locator(selector)).not.toHaveAttribute("data-closed", "");
}

async function isHiddenFromReaders(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).first().evaluate((element) => element.closest('[aria-hidden="true"]') !== null);
}

test("모니터링 종료 Button을 Click하면 종료 확인 Dialog가 표시됨, Text, 전원 Icon, 취소 / danger 모니터링 종료 Button, Focus 확인", async ({ page }) => {
  await openScreen(page);
  await openLogoutConfirm(page);
  await expect(page.locator(LOGOUT)).toHaveAttribute("role", "alertdialog");
  await expect(page.locator(TITLE)).toHaveText("모니터링을 종료할까요?");
  await expect(page.locator(DESCRIPTION)).toHaveText("진행 중인 학습·추론 작업은 서버에서 계속 실행됩니다.");
  await expect(page.locator(`${LOGOUT} button`)).toHaveText(["취소", "모니터링 종료"]);
  const media = await measure(page, MEDIA);
  expect(media.style.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect(media.style.color).toBe(await color(page, "var(--danger)"));
  expect(await shownIconShape(page, MEDIA)).toBe(iconShape("PowerSettingsNew"));
  expect((await measure(page, ACTION)).style.backgroundColor).toBe(await color(page, "var(--danger)"));
  expect((await box(page, LOGOUT)).width).toBe(520);
  await expect.poll(() => focusIsInside(page, LOGOUT)).toBe(true);
  expect(await logoutCount(page)).toBe(0);
});

test("취소와 Esc로 Dialog가 닫히고 Request를 보내지 않으며 Focus가 모니터링 종료 Button으로 돌아감", async ({ page }) => {
  await openScreen(page);
  await openLogoutConfirm(page);
  await page.locator(CANCEL).click();
  await expect(page.locator(LOGOUT)).toHaveCount(0);
  await expect(page.locator(POWER)).toBeFocused();
  await openLogoutConfirm(page);
  await page.keyboard.press("Escape");
  await expect(page.locator(LOGOUT)).toHaveCount(0);
  await expect(page.locator(POWER)).toBeFocused();
  expect(await logoutCount(page)).toBe(0);
  await expect(page).toHaveURL("/dashboard/fleet");
});

test("확인 Click 후 Request 중에는 Button, 취소, Esc가 막히고, 성공하면 Page를 새로 불러 /login?next=<보던 주소>로 이동하며 Login하면 그 화면에서 Session이 10:00으로 시작함", async ({ page }) => {
  const watched = "/dashboard/timeline?from=logout";
  await openScreen(page, watched, { logoutDelayMs: 800 });
  await page.evaluate(() => {
    (window as unknown as { beforeLogout?: boolean }).beforeLogout = true;
  });
  await openLogoutConfirm(page);
  await page.locator(ACTION).click();
  await expect(page.locator(ACTION)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(ACTION)).toBeFocused();
  expect(await logoutCount(page)).toBe(1);
  await page.keyboard.press("Escape");
  await page.locator(CANCEL).dispatchEvent("click");
  await page.locator(ACTION).dispatchEvent("click");
  await expectStaysOpen(page, LOGOUT);
  await expect(page.locator(ACTION)).toHaveAttribute("aria-disabled", "true");
  expect(await logoutCount(page)).toBe(1);

  await expect(page).toHaveURL(/\/login\?next=/);
  const url = new URL(page.url());
  expect(url.pathname).toBe("/login");
  expect(url.searchParams.get("next")).toBe(watched);
  expect(await page.evaluate(() => (window as unknown as { beforeLogout?: boolean }).beforeLogout)).toBeUndefined();

  await expect(page.locator('[data-slot="login-id-input"]')).toBeFocused();
  await page.locator('[data-slot="login-id-input"]').fill("operator");
  await page.locator('[data-slot="login-password-input"]').fill("secret-pw");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(watched);
  await expect(page.locator(REMAINING)).toHaveText("10:00");
});

test("실패하면 실패 Toast '모니터링을 종료하지 못했습니다.'가 표시되고 Dialog는 그대로이며, 다시 Click하면 Request를 다시 보내 성공 시 Login 화면으로 이동함", async ({ page }) => {
  await openScreen(page, "/dashboard/fleet", { failLogout: true, logoutDelayMs: 300 });
  await openLogoutConfirm(page);
  await page.locator(ACTION).click();
  await expect(page.locator(ERROR_TOAST)).toHaveText("모니터링을 종료하지 못했습니다.");
  await expectStaysOpen(page, LOGOUT);
  await expect.poll(() => focusIsInside(page, LOGOUT)).toBe(true);
  await expect(page.locator(ACTION)).not.toHaveAttribute("aria-disabled", "true");
  await expect(page).toHaveURL("/dashboard/fleet");
  expect(await logoutCount(page)).toBe(1);

  await page.evaluate(() => {
    Object.assign((window as unknown as { cbmMockAuth: Partial<MockAuth> }).cbmMockAuth, { failLogout: false });
  });
  await page.locator(ACTION).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Ffleet$/);
});

test("종료 확인 Dialog 위로 1분 전 경고, 장치 고장 Dialog, 만료 Dialog가 오면 그 Dialog가 맨 위에서 Focus를 가지고, 닫으면 종료 확인 Dialog로 Focus가 돌아옴", async ({ page }) => {
  await openScreen(page);
  await openLogoutConfirm(page);

  await page.clock.setFixedTime(EXPIRY - 60 * 1000);
  await expect(page.locator(WARNING)).toBeVisible();
  expect(await topAt(page, { x: 960, y: 540 })).toBe("session-expiry-warning");
  await expect.poll(() => focusIsInside(page, WARNING)).toBe(true);
  expect(await isHiddenFromReaders(page, LOGOUT)).toBe(true);
  await page.locator(WARNING).getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.locator(WARNING)).toHaveCount(0);
  await expect.poll(() => focusIsInside(page, LOGOUT)).toBe(true);

  await page.waitForFunction(
    () => typeof (window as unknown as { cbmMockDeviceFailures?: { emit?: unknown } }).cbmMockDeviceFailures?.emit === "function",
  );
  await page.evaluate(() => (window as unknown as { cbmMockDeviceFailures: { emit: () => void } }).cbmMockDeviceFailures.emit());
  await expect(page.locator(FAILURE)).toBeVisible();
  expect(await topAt(page, { x: 960, y: 540 })).toBe("device-failure");
  await expect.poll(() => focusIsInside(page, FAILURE)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.locator(FAILURE)).toHaveCount(0);
  await expect.poll(() => focusIsInside(page, LOGOUT)).toBe(true);

  await page.clock.setFixedTime(EXPIRY);
  await expect(page.locator(EXPIRED)).toBeVisible();
  expect(await topAt(page, { x: 960, y: 540 })).toBe("session-expired");
  await expect.poll(() => focusIsInside(page, EXPIRED)).toBe(true);
  expect(await isHiddenFromReaders(page, LOGOUT)).toBe(true);
  expect(await logoutCount(page)).toBe(0);
});
