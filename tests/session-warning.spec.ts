import { expect, test, type Page } from "@playwright/test";
import { shellToastTexts } from "../src/components/organisms/shellToastTexts";
import { MOCK_TODAY, color, measure, visibleShadow } from "./helpers/measure";
import {
  box,
  confirmDialog,
  expectButton,
  focusIsInside,
  iconShape,
  modal,
  shownIconShape,
} from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const DIALOG = confirmDialog("session-expiry-warning");
const EXPIRED_DIALOG = confirmDialog("session-expired");
const SUCCESS_TOAST = '[data-slot="toast-viewport"] [data-tone="success"]';
const REMAINING = '[data-slot="session-chip-remaining"]';
const TITLE = `${DIALOG} [data-slot="alert-dialog-title"]`;
const DESCRIPTION = `${DIALOG} [data-slot="alert-dialog-description"]`;
const MEDIA = `${DIALOG} [data-slot="alert-dialog-media"]`;
const CANCEL = `${DIALOG} [data-slot="alert-dialog-cancel"]`;
const ACTION = `${DIALOG} [data-slot="alert-dialog-action"]`;

const SESSION_SECONDS = 600;
const START = MOCK_TODAY.getTime();
const FIRST_EXPIRY = START + SESSION_SECONDS * 1000;

const DESCRIPTION_LINES = [
  "계속 작업하려면 연장하세요.",
  "만료되면 저장하지 않은 입력은 사라지고",
  "로그인 화면으로 이동합니다.",
];

const CONFIRM_WIDTH = 520;
const CONFIRM_INSET = 25;
const DESCRIPTION_HEIGHT = DESCRIPTION_LINES.length * 20;
const CONFIRM_HEIGHT = 50 + 44 + 4 + 10 + 28 + 10 + DESCRIPTION_HEIGHT + 10 + 48;

const remainingText = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

async function openAtStart(page: Page, path: string, readySelector?: string): Promise<void> {
  await page.clock.setFixedTime(START);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(path);
  if (readySelector) await expect(page.locator(readySelector).first()).toBeVisible();
  await expect(page.locator(REMAINING)).toHaveText("10:00");
}

async function leaveRemaining(page: Page, expiresAt: number, seconds: number): Promise<void> {
  await page.clock.setFixedTime(expiresAt - seconds * 1000);
  await expect(page.locator(REMAINING)).toHaveText(remainingText(seconds));
}

async function expectNoDialog(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await expect(page.locator(DIALOG)).toHaveCount(0);
}

const chipExtendButton = (page: Page) =>
  page.locator('[data-slot="session-chip"]').getByRole("button", { name: "연장", exact: true });

test("남은 시간이 61초면 경고가 없고 60초가 되면 경고 Dialog가 표시됨", async ({ page }) => {
  await openAtStart(page, "/dashboard/fleet");

  await leaveRemaining(page, FIRST_EXPIRY, 61);
  await expectNoDialog(page);

  await leaveRemaining(page, FIRST_EXPIRY, 60);
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect(page.locator(DIALOG)).toHaveAttribute("role", "alertdialog");
  await expect(page.locator(TITLE)).toHaveText("세션이 1분 후 만료됩니다");
  expect((await page.locator(DESCRIPTION).innerText()).split("\n")).toEqual(DESCRIPTION_LINES);
  expect((await box(page, DESCRIPTION)).height).toBe(DESCRIPTION_HEIGHT);

  await expect(page.locator(`${DIALOG} button`)).toHaveText(["닫기", "세션 연장하기"]);
  const frame = await box(page, DIALOG);
  const cancel = await box(page, CANCEL);
  const action = await box(page, ACTION);
  expect(cancel.x + cancel.width).toBeLessThan(action.x);
  expect(action.x + action.width).toBeCloseTo(frame.x + frame.width - CONFIRM_INSET, 1);
  await expect(page.locator(ACTION)).toBeEnabled();

  const media = await measure(page, MEDIA);
  expect(media.style.backgroundColor).toBe(await color(page, "var(--caution-subtle)"));
  expect(media.style.color).toBe(await color(page, "var(--on-caution-subtle)"));
  expect(await shownIconShape(page, MEDIA)).toBe(iconShape("Schedule"));

  await expect.poll(() => focusIsInside(page, DIALOG)).toBe(true);
  expect((await measure(page, REMAINING)).style.color).toBe(await color(page, "var(--danger)"));
});

test("닫기로 닫으면 같은 만료 시각 동안 다시 표시되지 않고, Chip으로 연장한 뒤 60초가 되면 다시 표시됨", async ({
  page,
}) => {
  await openAtStart(page, "/dashboard/fleet");
  await leaveRemaining(page, FIRST_EXPIRY, 60);
  await expect(page.locator(DIALOG)).toBeVisible();
  await page.locator(CANCEL).click();
  await expect(page.locator(DIALOG)).toHaveCount(0);

  for (const seconds of [59, 45, 30]) {
    await leaveRemaining(page, FIRST_EXPIRY, seconds);
    await expectNoDialog(page);
  }

  await chipExtendButton(page).click();
  await expect(page.locator(REMAINING)).toHaveText("10:00");
  const extendedExpiry = FIRST_EXPIRY - 30 * 1000 + SESSION_SECONDS * 1000;
  await leaveRemaining(page, extendedExpiry, 61);
  await expectNoDialog(page);
  await leaveRemaining(page, extendedExpiry, 60);
  await expect(page.locator(DIALOG)).toBeVisible();
});

test("Session 연장하기는 연장한 뒤 닫히고 Chip이 10:00이 되며, 다시 60초가 되기 전에는 표시되지 않음", async ({
  page,
}) => {
  await openAtStart(page, "/dashboard/fleet");
  await leaveRemaining(page, FIRST_EXPIRY, 60);
  await expect(page.locator(DIALOG)).toBeVisible();

  await page.locator(ACTION).click();
  await expect(page.locator(DIALOG)).toHaveCount(0);
  await expect(page.locator(REMAINING)).toHaveText("10:00");

  const extendedExpiry = FIRST_EXPIRY - 60 * 1000 + SESSION_SECONDS * 1000;
  for (const seconds of [300, 61]) {
    await leaveRemaining(page, extendedExpiry, seconds);
    await expectNoDialog(page);
  }
  await leaveRemaining(page, extendedExpiry, 60);
  await expect(page.locator(DIALOG)).toBeVisible();
});

test("Session 연장하기와 Chip의 연장이 둘 다 성공하면 연장한 뒤 남은 시간으로 성공 Toast가 표시됨", async ({ page }) => {
  await openAtStart(page, "/dashboard/fleet");
  await leaveRemaining(page, FIRST_EXPIRY, 60);
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect(page.locator(SUCCESS_TOAST)).toHaveCount(0);

  await page.locator(ACTION).click();
  await expect(page.locator(DIALOG)).toHaveCount(0);
  await expect(page.locator(REMAINING)).toHaveText("10:00");
  await expect(page.locator(SUCCESS_TOAST)).toHaveText("세션을 10:00으로 연장했습니다.");
  const toast = await box(page, SUCCESS_TOAST);
  expect([toast.x + toast.width, toast.y + toast.height]).toEqual([1920 - 24, 1080 - 24]);
  await expect(page.locator(SUCCESS_TOAST)).toHaveCount(0, { timeout: 5000 });
  const extendedExpiry = FIRST_EXPIRY - 60 * 1000 + SESSION_SECONDS * 1000;
  await leaveRemaining(page, extendedExpiry, 120);
  await expect(page.locator(REMAINING)).toHaveText("02:00");
  await chipExtendButton(page).click();
  await expect(page.locator(REMAINING)).toHaveText("10:00");
  await expect(page.locator(SUCCESS_TOAST)).toHaveText("세션을 10:00으로 연장했습니다.");
  const chipToast = await box(page, SUCCESS_TOAST);
  expect([chipToast.x + chipToast.width, chipToast.y + chipToast.height]).toEqual([1920 - 24, 1080 - 24]);
});

test("연장 Toast의 남은 시간 뒤 조사는 끝자리 소리에 받침이 있는 숫자(0, 3, 6)에는 으로, 아니면 로를 붙임", () => {
  expect(shellToastTexts.sessionExtended("10:00")).toBe("세션을 10:00으로 연장했습니다.");
  for (const digit of ["0", "3", "6"]) {
    expect(shellToastTexts.sessionExtended(`09:5${digit}`)).toBe(`세션을 09:5${digit}으로 연장했습니다.`);
  }
  for (const digit of ["1", "2", "4", "5", "7", "8", "9"]) {
    expect(shellToastTexts.sessionExtended(`09:5${digit}`)).toBe(`세션을 09:5${digit}로 연장했습니다.`);
  }
});

test("Esc도 닫기처럼 닫고 같은 만료 시각 동안 다시 표시되지 않음", async ({ page }) => {
  await openAtStart(page, "/dashboard/fleet");
  await leaveRemaining(page, FIRST_EXPIRY, 60);
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect.poll(() => focusIsInside(page, DIALOG)).toBe(true);

  await page.keyboard.press("Escape");
  await expect(page.locator(DIALOG)).toHaveCount(0);
  for (const seconds of [59, 30]) {
    await leaveRemaining(page, FIRST_EXPIRY, seconds);
    await expectNoDialog(page);
  }

  await chipExtendButton(page).click();
  await expect(page.locator(REMAINING)).toHaveText("10:00");
  const extendedExpiry = FIRST_EXPIRY - 30 * 1000 + SESSION_SECONDS * 1000;
  await leaveRemaining(page, extendedExpiry, 60);
  await expect(page.locator(DIALOG)).toBeVisible();
});

const PAGE_MODALS = [
  {
    screen: "03 알람 등록",
    path: "/dashboard/alarms",
    ready: '[data-slot="chart-stack-segment"]',
    open: '[data-slot="alarm-filter-bar"] [data-slot="action-button"] >> nth=2',
    root: modal("alarm-create"),
    area: `${modal("alarm-create")} [data-slot="alarm-create-form"] [data-slot="text-area-input"]`,
    close: "Escape",
  },
  {
    screen: "04 이상 센서 조치",
    path: "/dashboard/measures",
    ready: '[data-slot="measure-worklist-card"] tbody [data-slot="table-row"]',
    open: '[data-slot="measure-worklist-card"] tbody [data-slot="table-row"] >> nth=1 >> [data-slot="action-button"]',
    root: modal("measure-action"),
    area: `${modal("measure-action")} [data-slot="measure-action-form"] [data-slot="text-area-input"]`,
    close: "extend",
  },
] as const;

for (const target of PAGE_MODALS) {
  test(`${target.screen} Modal이 열려 있으면 경고가 그 위에 표시되어 Focus를 가져가며, 닫은 뒤에도 Modal을 그대로 쓸 수 있음`, async ({
    page,
  }) => {
    await openAtStart(page, target.path, target.ready);
    await page.locator(target.open).click();
    await expect(page.locator(target.root)).toBeVisible();
    const area = page.locator(target.area);
    await area.fill("현장 확인 요청");
    await expect(area).toBeFocused();

    await leaveRemaining(page, FIRST_EXPIRY, 60);
    await expect(page.locator(DIALOG)).toBeVisible();
    await expect(page.locator(target.root)).toBeVisible();
    expect(
      await page.evaluate(() => {
        const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        return top?.closest("[data-dialog]")?.getAttribute("data-dialog") ?? null;
      }),
    ).toBe("session-expiry-warning");
    expect(
      await page.evaluate(() => {
        const top = document.elementFromPoint(innerWidth / 2 - 600, innerHeight / 2);
        return (top as HTMLElement | null)?.dataset.slot ?? null;
      }),
    ).toBe("alert-dialog-overlay");
    await expect.poll(() => focusIsInside(page, DIALOG)).toBe(true);
    await page.keyboard.type("x");
    await expect(area).toHaveValue("현장 확인 요청");

    if (target.close === "Escape") {
      await page.keyboard.press("Escape");
    } else {
      await page.locator(ACTION).click();
      await expect(page.locator(REMAINING)).toHaveText("10:00");
    }
    await expect(page.locator(DIALOG)).toHaveCount(0);

    await expect(page.locator(target.root)).toBeVisible();
    await expect(area).toHaveValue("현장 확인 요청");
    await expect.poll(() => focusIsInside(page, target.root)).toBe(true);
    await area.fill("현장 확인 요청 · 재확인");
    await expect(area).toHaveValue("현장 확인 요청 · 재확인");
    await page.keyboard.press("Escape");
    await expect(page.locator(target.root)).toHaveCount(0);
  });
}

test("0초가 되면 경고는 닫히고 만료 Dialog로 바뀌며, Chip은 00:00이고 화면은 그대로임", async ({ page }) => {
  await openAtStart(page, "/dashboard/fleet");
  await leaveRemaining(page, FIRST_EXPIRY, 60);
  await expect(page.locator(DIALOG)).toBeVisible();

  await leaveRemaining(page, FIRST_EXPIRY, 0);
  await expect(page.locator(EXPIRED_DIALOG)).toBeVisible();
  await expect(page.locator(DIALOG)).toHaveCount(0);
  await page.clock.setFixedTime(FIRST_EXPIRY + 5_000);
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1500)));
  await expect(page.locator(REMAINING)).toHaveText("00:00");
  await expect(page.locator(DIALOG)).toHaveCount(0);
  await expect(page.locator(EXPIRED_DIALOG)).toBeVisible();
  await expect(page).toHaveURL("/dashboard/fleet");
});

test("경고 Dialog의 Width, 제목, Icon 원, Button을 확인 Dialog(ConfirmDialog) 수치와 대조", async ({
  page,
}) => {
  await openAtStart(page, "/dashboard/fleet");
  await leaveRemaining(page, FIRST_EXPIRY, 60);
  await expect(page.locator(DIALOG)).toBeVisible();

  const frame = await box(page, DIALOG);
  expect(frame.width).toBe(CONFIRM_WIDTH);
  expect(frame.height).toBe(CONFIRM_HEIGHT);
  expect(frame.x).toBeCloseTo((1920 - CONFIRM_WIDTH) / 2, 1);
  expect(frame.y).toBeCloseTo((1080 - CONFIRM_HEIGHT) / 2, 1);
  const style = (await measure(page, DIALOG)).style;
  expect(style.paddingTop).toBe("24px");
  expect(style.borderTopLeftRadius).toBe("16px");
  expect(visibleShadow(style.boxShadow)).toBe("rgba(0, 0, 0, 0.3) 0px 24px 64px 0px");

  const media = await measure(page, MEDIA);
  expect(media.width).toBe(44);
  expect(media.height).toBe(44);
  expect(media.style.borderTopLeftRadius).toBe("50%");
  expect((await box(page, `${MEDIA} svg`)).width).toBe(22);

  const title = await measure(page, TITLE);
  expect(title.style.fontSize).toBe("22px");
  expect(title.style.lineHeight).toBe("28px");
  expect(title.style.fontWeight).toBe("500");
  const description = await measure(page, DESCRIPTION);
  expect(description.style.fontSize).toBe("14px");
  expect(description.style.lineHeight).toBe("20px");
  expect(description.style.color).toBe(await color(page, "var(--muted-fg)"));

  await expect(page.locator(CANCEL)).toBeFocused();
  const ring = await color(page, "var(--ring)");
  await expect.poll(async () => (await measure(page, CANCEL)).style.borderTopColor).toBe(ring);
  await page.keyboard.press("Tab");
  await expect(page.locator(ACTION)).toBeFocused();
  const border = await color(page, "var(--border)");
  await expect.poll(async () => (await measure(page, CANCEL)).style.borderTopColor).toBe(border);
  await expectButton(page, CANCEL, {
    height: 40,
    paddingX: 16,
    weight: "600",
    background: "var(--card)",
    text: "var(--fg)",
    border: "var(--border)",
  });
  await expectButton(page, ACTION, {
    height: 40,
    paddingX: 16,
    weight: "600",
    background: "var(--primary)",
    text: "var(--on-primary)",
  });
});
