import { expect, test, type Page } from "@playwright/test";
import { MOCK_TODAY, color, measure } from "./helpers/measure";
import {
  box,
  confirmDialog,
  focusIsInside,
  iconShape,
  modal,
  shownIconShape,
  styleOf,
} from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const EXPIRED = confirmDialog("session-expired");
const WARNING = confirmDialog("session-expiry-warning");
const FAILURE = '[data-dialog="device-failure"]';
const FAILURE_CONFIRM = `${FAILURE} [data-slot="device-failure-confirm"]`;
const REMAINING = '[data-slot="session-chip-remaining"]';
const CHIP_EXTEND = '[data-slot="session-chip"] button';
const TITLE = `${EXPIRED} [data-slot="alert-dialog-title"]`;
const DESCRIPTION = `${EXPIRED} [data-slot="alert-dialog-description"]`;
const MEDIA = `${EXPIRED} [data-slot="alert-dialog-media"]`;
const ACTION = `${EXPIRED} [data-slot="alert-dialog-action"]`;
const ALARM_SEGMENT = '[data-slot="chart-stack-segment"]';
const ALARM_FILTER_BUTTON = '[data-slot="alarm-filter-bar"] [data-slot="action-button"]';

const SESSION_SECONDS = 600;
const START = MOCK_TODAY.getTime();
const EXPIRY = START + SESSION_SECONDS * 1000;

const remainingText = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

async function openAtStart(page: Page, path: string, readySelector?: string): Promise<void> {
  await page.clock.setFixedTime(START);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(path);
  if (readySelector) await expect(page.locator(readySelector).first()).toBeVisible();
  await expect(page.locator(REMAINING)).toHaveText("10:00");
}

async function leaveRemaining(page: Page, seconds: number): Promise<void> {
  await page.clock.setFixedTime(EXPIRY - seconds * 1000);
  await expect(page.locator(REMAINING)).toHaveText(remainingText(seconds));
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 300)));
      }),
  );
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

async function isHiddenFromReaders(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).first().evaluate((element) => element.closest('[aria-hidden="true"]') !== null);
}

async function emitFailure(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { cbmMockDeviceFailures?: { emit?: unknown } }).cbmMockDeviceFailures?.emit === "function",
  );
  await page.evaluate(() =>
    (window as unknown as { cbmMockDeviceFailures: { emit: () => void } }).cbmMockDeviceFailures.emit(),
  );
  await expect(page.locator(FAILURE)).toBeVisible();
}

test("0초가 되면 1분 전 경고 대신 만료 Dialog가 표시되며, Text, 시계 꺼짐 Icon, 다시 Login Button 하나, Focus 확인", async ({ page }) => {
  await openAtStart(page, "/dashboard/fleet");
  await leaveRemaining(page, 1);
  await expect(page.locator(WARNING)).toBeVisible();
  await settle(page);
  await expect(page.locator(EXPIRED)).toHaveCount(0);

  await leaveRemaining(page, 0);
  await expect(page.locator(EXPIRED)).toBeVisible();
  await expect(page.locator(WARNING)).toHaveCount(0);
  await expect(page.locator(EXPIRED)).toHaveAttribute("role", "alertdialog");
  await expect(page.locator(EXPIRED)).toHaveAccessibleName("세션이 만료되었습니다");
  await expect(page.locator(TITLE)).toHaveText("세션이 만료되었습니다");
  await expect(page.locator(DESCRIPTION)).toHaveText("다시 로그인하면 보던 화면으로 돌아갑니다.");
  await expect(page.locator(`${EXPIRED} button`)).toHaveText(["다시 로그인"]);
  expect((await measure(page, ACTION)).style.backgroundColor).toBe(await color(page, "var(--primary)"));

  const media = await measure(page, MEDIA);
  expect(media.style.backgroundColor).toBe(await color(page, "var(--warning-subtle)"));
  expect(media.style.color).toBe(await color(page, "var(--warning)"));
  expect(await shownIconShape(page, MEDIA)).toBe(iconShape("TimerOff"));

  const frame = await box(page, EXPIRED);
  expect(frame.width).toBe(520);
  expect(frame.x).toBeCloseTo((1920 - 520) / 2, 1);
  expect(frame.y).toBeCloseTo((1080 - frame.height) / 2, 1);

  await expect.poll(() => focusIsInside(page, EXPIRED)).toBe(true);
  await expect(page.locator(ACTION)).toBeFocused();
  await expect(page.locator(REMAINING)).toHaveText("00:00");
  await expect(page).toHaveURL("/dashboard/fleet");
});

test("Esc와 바깥 Click으로 닫히지 않고, 뒤의 Chip 연장은 Overlay에 가려 Click할 수 없음", async ({ page }) => {
  await openAtStart(page, "/dashboard/fleet");
  await leaveRemaining(page, 0);
  await expect(page.locator(EXPIRED)).toBeVisible();

  await page.keyboard.press("Escape");
  await page.mouse.click(40, 540);
  await page.keyboard.press("Escape");
  await settle(page);
  await expect(page.locator(EXPIRED)).toBeVisible();
  expect(await topAt(page, await centerOf(page, CHIP_EXTEND))).toBe("alert-dialog-overlay");
  await expect(page.locator(REMAINING)).toHaveText("00:00");
  await expect(page).toHaveURL("/dashboard/fleet");
});

test("알람/이벤트의 Alarm 등록 Modal 위에서 맨 위 표시, Focus, Modal은 숨김, Esc와 Overlay Click 뒤 Esc에도 Modal이 닫히지 않음", async ({ page }) => {
  const create = modal("alarm-create");
  await openAtStart(page, "/dashboard/alarms", ALARM_SEGMENT);
  await page.locator(ALARM_FILTER_BUTTON).nth(2).click();
  await expect(page.locator(create)).toBeVisible();

  await leaveRemaining(page, 0);
  await expect(page.locator(EXPIRED)).toBeVisible();
  expect(await topAt(page, { x: 960, y: 540 })).toBe("session-expired");
  const createBox = await box(page, create);
  const insideCreate = { x: createBox.x + 40, y: createBox.y + 40 };
  expect(await topAt(page, insideCreate)).toBe("alert-dialog-overlay");
  expect(await isHiddenFromReaders(page, create)).toBe(true);
  await expect.poll(() => focusIsInside(page, EXPIRED)).toBe(true);

  await page.keyboard.press("Escape");
  await page.mouse.click(insideCreate.x, insideCreate.y);
  await page.keyboard.press("Escape");
  await settle(page);
  await expect(page.locator(EXPIRED)).toBeVisible();
  await expect(page.locator(create)).toBeVisible();
});

test("장치 고장 Dialog 아래에서 만료 Dialog가 표시된 중에 고장 알림이 오면 고장 Dialog가 맨 위에서 Focus를 가지고, 확인하면 만료 Dialog로 돌아옴", async ({ page }) => {
  await openAtStart(page, "/dashboard/fleet");
  await leaveRemaining(page, 0);
  await expect(page.locator(EXPIRED)).toBeVisible();

  await emitFailure(page);
  expect(await topAt(page, await centerOf(page, FAILURE_CONFIRM))).toBe("device-failure");
  expect(Number(await styleOf(page, EXPIRED, "z-index"))).toBeLessThan(Number(await styleOf(page, FAILURE, "z-index")));
  await expect.poll(() => focusIsInside(page, FAILURE)).toBe(true);
  expect(await isHiddenFromReaders(page, EXPIRED)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.locator(FAILURE)).toHaveCount(0);
  await expect(page.locator(EXPIRED)).toBeVisible();
  await expect(page).toHaveURL("/dashboard/fleet");
  await expect.poll(() => focusIsInside(page, EXPIRED)).toBe(true);
  expect(await isHiddenFromReaders(page, EXPIRED)).toBe(false);
});

test("장치 고장 Dialog가 표시된 동안 0초가 되면 만료 Dialog는 고장 Dialog를 확인한 뒤에 표시되고, 그동안 Focus는 고장 Dialog에 있음", async ({ page }) => {
  await openAtStart(page, "/dashboard/fleet");
  await emitFailure(page);
  await expect.poll(() => focusIsInside(page, FAILURE)).toBe(true);

  await leaveRemaining(page, 0);
  await settle(page);
  await expect(page.locator(EXPIRED)).toHaveCount(0);
  await expect.poll(() => focusIsInside(page, FAILURE)).toBe(true);
  expect(await isHiddenFromReaders(page, FAILURE)).toBe(false);

  await page.locator(FAILURE_CONFIRM).click();
  await expect(page.locator(FAILURE)).toHaveCount(0);
  await expect(page.locator(EXPIRED)).toBeVisible();
  await expect.poll(() => focusIsInside(page, EXPIRED)).toBe(true);
});

test("1분 전 경고도 같아서, 고장 Dialog가 표시된 동안 60초가 되면 확인한 뒤에 표시되고, 경고 위로 고장 Dialog가 온 뒤 0초가 되면 확인한 뒤 만료 Dialog가 표시됨", async ({ page }) => {
  await openAtStart(page, "/dashboard/fleet");
  await emitFailure(page);
  await leaveRemaining(page, 60);
  await settle(page);
  await expect(page.locator(WARNING)).toHaveCount(0);
  await expect.poll(() => focusIsInside(page, FAILURE)).toBe(true);
  await page.locator(FAILURE_CONFIRM).click();
  await expect(page.locator(WARNING)).toBeVisible();
  await expect.poll(() => focusIsInside(page, WARNING)).toBe(true);

  await emitFailure(page);
  expect(await topAt(page, await centerOf(page, FAILURE_CONFIRM))).toBe("device-failure");
  await expect.poll(() => focusIsInside(page, FAILURE)).toBe(true);
  expect(await isHiddenFromReaders(page, WARNING)).toBe(true);
  await leaveRemaining(page, 0);
  await settle(page);
  await expect.poll(() => focusIsInside(page, FAILURE)).toBe(true);
  await page.locator(FAILURE_CONFIRM).click();
  await expect(page.locator(FAILURE)).toHaveCount(0);
  await expect(page.locator(EXPIRED)).toBeVisible();
  await expect(page.locator(WARNING)).toHaveCount(0);
  await expect.poll(() => focusIsInside(page, EXPIRED)).toBe(true);
});

test("다시 Login하면 보던 경로와 조회 조건을 next로 Login 화면을 열고, Login하면 그 화면으로 돌아와 새 Session이 10:00으로 시작함", async ({ page }) => {
  const watched = "/dashboard/timeline?from=expired&page=2";
  await openAtStart(page, watched);
  await leaveRemaining(page, 0);
  await expect(page.locator(EXPIRED)).toBeVisible();

  await page.locator(ACTION).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  const url = new URL(page.url());
  expect(url.pathname).toBe("/login");
  expect(url.searchParams.get("next")).toBe(watched);
  await expect(page.locator('[data-slot="login-id-input"]')).toBeFocused();

  await page.locator('[data-slot="login-id-input"]').fill("operator");
  await page.locator('[data-slot="login-password-input"]').fill("secret-pw");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(watched);
  await expect(page.locator(REMAINING)).toHaveText("10:00");
  await settle(page);
  await expect(page.locator(EXPIRED)).toHaveCount(0);
  await expect(page.locator(WARNING)).toHaveCount(0);
});
