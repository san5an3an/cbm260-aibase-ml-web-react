import { expect, test, type Page } from "@playwright/test";
import { MOCK_TODAY } from "./helpers/measure";
import { box, confirmDialog, focusIsInside, styleOf } from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const WARNING = confirmDialog("session-expiry-warning");
const EXPIRED = confirmDialog("session-expired");
const ALARM_DELETE = confirmDialog("alarm-delete");
const FAILURE = '[data-dialog="device-failure"]';
const SEARCHING = '[data-slot="searching-overlay"]';
const SEARCHING_CANCEL = `${SEARCHING} [data-slot="action-button"]`;
const SEARCH_BUTTON = '[data-slot="alarm-filter-bar"] [data-slot="action-button"] >> nth=0';
const ALARM_SEGMENT = '[data-slot="chart-stack-segment"]';
const ALARM_ROW = '[data-slot="alarm-worklist-card"] tbody [data-slot="table-row"]';
const REMAINING = '[data-slot="session-chip-remaining"]';
const TOAST_VIEWPORT = '[data-slot="toast-viewport"]';
const SUCCESS_TOAST = `${TOAST_VIEWPORT} [data-tone="success"]`;
const COVER_POINT = { x: 200, y: 200 };

const SESSION_SECONDS = 600;
const START = MOCK_TODAY.getTime();
const EXPIRY = START + SESSION_SECONDS * 1000;

const remainingText = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

async function openAlarmsWithSlowSearch(page: Page): Promise<void> {
  await page.clock.setFixedTime(START);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => {
    (window as unknown as { cbmMockLatency: unknown }).cbmMockLatency = { entryMs: 0, searchMs: 600_000 };
  });
  await page.goto("/dashboard/alarms");
  await expect(page.locator(ALARM_SEGMENT).first()).toBeVisible();
  await expect(page.locator(REMAINING)).toHaveText("10:00");
}

async function startSlowSearch(page: Page): Promise<void> {
  await page.locator(SEARCH_BUTTON).click();
  await expect(page.locator(SEARCHING)).toBeVisible();
  await expect(page.locator(SEARCHING_CANCEL)).toBeFocused();
}

async function leaveRemaining(page: Page, expiresAt: number, seconds: number): Promise<void> {
  await page.clock.setFixedTime(expiresAt - seconds * 1000);
  await expect(page.locator(REMAINING)).toHaveText(remainingText(seconds));
}

async function topAt(page: Page, point: { x: number; y: number }): Promise<string | null> {
  return page.evaluate(({ x, y }) => {
    const top = document.elementFromPoint(x, y);
    return top?.closest("[data-dialog]")?.getAttribute("data-dialog") ?? (top as HTMLElement | null)?.dataset.slot ?? null;
  }, point);
}

async function centerOf(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const found = await box(page, selector);
  return { x: found.x + found.width / 2, y: found.y + found.height / 2 };
}

async function portalLayer(page: Page, selector: string): Promise<string> {
  return page.locator(selector).evaluate((element) => getComputedStyle(element.closest("[data-base-ui-portal]") as Element).zIndex);
}

async function isHiddenFromReaders(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).first().evaluate((element) => element.closest('[aria-hidden="true"]') !== null);
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 300)))),
  );
}

test("Overlay 위 1분 전 경고가 맨 위에서 Focus를 가지고, Overlay와 취소는 그 아래에 있으며, 닫기를 Click하면 Overlay와 취소가 다시 쓰임", async ({ page }) => {
  await openAlarmsWithSlowSearch(page);
  await startSlowSearch(page);
  expect(await topAt(page, COVER_POINT)).toBe("dialog-overlay");

  await leaveRemaining(page, EXPIRY, 60);
  await expect(page.locator(WARNING)).toBeVisible();
  expect(await topAt(page, await centerOf(page, WARNING))).toBe("session-expiry-warning");
  expect(await topAt(page, await centerOf(page, SEARCHING_CANCEL))).toBe("session-expiry-warning");
  expect(await topAt(page, COVER_POINT)).toBe("alert-dialog-overlay");
  expect(await portalLayer(page, WARNING)).toBe("70");
  await expect.poll(() => focusIsInside(page, WARNING)).toBe(true);
  expect(await isHiddenFromReaders(page, SEARCHING)).toBe(true);

  await page.locator(WARNING).getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.locator(WARNING)).toHaveCount(0);
  await expect(page.locator(SEARCHING)).toBeVisible();
  await expect(page.locator(SEARCHING_CANCEL)).toBeFocused();
  expect(await topAt(page, COVER_POINT)).toBe("dialog-overlay");
  expect(await isHiddenFromReaders(page, SEARCHING)).toBe(false);
  await page.keyboard.press("Escape");
  await expect(page.locator(SEARCHING)).toHaveCount(0);
});

test("Overlay 위 경고에서 Session 연장하기가 Click되고 성공 Toast는 그 위에 표시되며, 다시 60초에 표시된 경고의 Esc는 경고만 닫고 검색은 계속됨", async ({ page }) => {
  await openAlarmsWithSlowSearch(page);
  await startSlowSearch(page);
  await leaveRemaining(page, EXPIRY, 60);
  await expect(page.locator(WARNING)).toBeVisible();

  await page.locator(WARNING).getByRole("button", { name: "세션 연장하기", exact: true }).click();
  await expect(page.locator(WARNING)).toHaveCount(0);
  await expect(page.locator(REMAINING)).toHaveText("10:00");
  await expect(page.locator(SUCCESS_TOAST)).toHaveText("세션을 10:00으로 연장했습니다.");
  expect(await topAt(page, await centerOf(page, SUCCESS_TOAST))).toBe("toast-description");
  await expect(page.locator(SEARCHING)).toBeVisible();
  await expect(page.locator(SEARCHING_CANCEL)).toBeFocused();

  const extendedExpiry = EXPIRY - 60 * 1000 + SESSION_SECONDS * 1000;
  await leaveRemaining(page, extendedExpiry, 60);
  await expect(page.locator(WARNING)).toBeVisible();
  await expect.poll(() => focusIsInside(page, WARNING)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator(WARNING)).toHaveCount(0);
  await settle(page);
  await expect(page.locator(SEARCHING)).toBeVisible();
  await expect(page.locator(SEARCHING_CANCEL)).toBeFocused();
});

test("Overlay 위 만료 Dialog가 맨 위에서 Focus를 가지고, Esc로 닫히지 않고 검색도 취소되지 않으며, 다시 Login이 Click되어 Login 화면으로 이동함", async ({ page }) => {
  await openAlarmsWithSlowSearch(page);
  await startSlowSearch(page);
  await leaveRemaining(page, EXPIRY, 0);
  await expect(page.locator(EXPIRED)).toBeVisible();
  expect(await topAt(page, await centerOf(page, EXPIRED))).toBe("session-expired");
  expect(await topAt(page, COVER_POINT)).toBe("alert-dialog-overlay");
  expect(await portalLayer(page, EXPIRED)).toBe("70");
  await expect.poll(() => focusIsInside(page, EXPIRED)).toBe(true);

  await page.keyboard.press("Escape");
  await page.mouse.click(COVER_POINT.x, COVER_POINT.y);
  await page.keyboard.press("Escape");
  await settle(page);
  await expect(page.locator(EXPIRED)).toBeVisible();
  await expect(page.locator(SEARCHING)).toBeVisible();

  await page.locator(EXPIRED).getByRole("button", { name: "다시 로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/dashboard/alarms");
});

test("겹침 순서는 Overlay 60 < Session Dialog 70 < 고장 Dialog 80 < Toast 90이고, 고장 Dialog가 오면 맨 위이며 다른 확인 Dialog는 그대로 50임", async ({ page }) => {
  await openAlarmsWithSlowSearch(page);
  await startSlowSearch(page);
  await leaveRemaining(page, EXPIRY, 60);
  await expect(page.locator(WARNING)).toBeVisible();

  await page.waitForFunction(
    () => typeof (window as unknown as { cbmMockDeviceFailures?: { emit?: unknown } }).cbmMockDeviceFailures?.emit === "function",
  );
  await page.evaluate(() => (window as unknown as { cbmMockDeviceFailures: { emit: () => void } }).cbmMockDeviceFailures.emit());
  await expect(page.locator(FAILURE)).toBeVisible();
  expect(await topAt(page, { x: 960, y: 540 })).toBe("device-failure");
  await expect.poll(() => focusIsInside(page, FAILURE)).toBe(true);
  expect([
    Number(await styleOf(page, '[data-overlay="searching"]', "z-index")),
    Number(await portalLayer(page, WARNING)),
    Number(await styleOf(page, FAILURE, "z-index")),
    Number(await styleOf(page, TOAST_VIEWPORT, "z-index")),
  ]).toEqual([60, 70, 80, 90]);
  await page.keyboard.press("Enter");
  await expect(page.locator(FAILURE)).toHaveCount(0);
  await expect.poll(() => focusIsInside(page, WARNING)).toBe(true);

  await page.goto("/dashboard/alarms");
  await expect(page.locator(ALARM_SEGMENT).first()).toBeVisible();
  await page.locator(ALARM_ROW).nth(9).locator('[data-slot="action-button"]').nth(1).click();
  await expect(page.locator(ALARM_DELETE)).toBeVisible();
  expect(await portalLayer(page, ALARM_DELETE)).toBe("auto");
  expect(await styleOf(page, ALARM_DELETE, "z-index")).toBe("50");
  expect(await page.locator(ALARM_DELETE).getAttribute("data-layer")).toBeNull();
});
