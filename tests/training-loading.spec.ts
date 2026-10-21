import { expect, test, type Page } from "@playwright/test";
import {
  fetchTrainingFilterOptions,
  fetchTrainingJobDetail,
  fetchTrainingJobs,
  fetchTrainingResultDetail,
  fetchTrainingResults,
  fetchTrainingScheduleOptions,
  fetchTrainingSummary,
} from "../src/services/training";
import {
  calendarDayCell,
  color,
  isoDaysAgo,
  lockAfterClick,
  pickOption,
  pressable,
  stopWatchingDisabled,
  watchDisabled,
  watchDisabledWithin,
  watchLockAfterClick,
} from "./helpers/measure";
import { modal } from "./helpers/modal";
import { TRAINING_RESULT_ROW } from "./helpers/training";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const TRAINING_PATH = "/info/training";
const SKELETON = '[data-slot="training-skeleton"]';
const SHIMMER = `${SKELETON} [data-slot="shimmer-block"]`;
const FILTER_SKELETON = '[data-slot="training-filter-bar-skeleton"]';
const KPI_ROW_SKELETON = '[data-slot="training-kpi-row-skeleton"]';
const KPI_CARD_SKELETON = '[data-slot="training-kpi-card-skeleton"]';
const JOBS_SKELETON = '[data-slot="training-jobs-card-skeleton"]';
const JOB_BLOCKS_SKELETON = '[data-slot="training-job-list-skeleton"] [data-slot="shimmer-block"]';
const RESULTS_SKELETON = '[data-slot="training-results-card-skeleton"]';
const TABLE_SKELETON = '[data-slot="training-results-table-skeleton"]';
const ROW_SKELETON = '[data-slot="training-result-row-skeleton"]';
const FILTER = '[data-slot="training-filter-bar"]';
const SELECTS = `${FILTER} [data-slot="select-trigger"]`;
const TRIGGER = `${FILTER} [data-slot="date-range-trigger"]`;
const FILTER_CONTROLS = `${SELECTS}, ${TRIGGER}, ${FILTER} [data-slot="icon-button"], ${FILTER} [data-slot="action-button"]`;
const KPI_ROW = '[data-slot="training-kpi-row"]';
const KPI = `${KPI_ROW} [data-slot="kpi-stat"]`;
const JOBS = '[data-slot="training-jobs-card"]';
const JOB = '[data-slot="training-job-list"] [data-slot="job-card"]';
const RESULTS = '[data-slot="training-results-card"]';
const TABLE = `${RESULTS} [data-slot="data-table"]`;
const ROW = TRAINING_RESULT_ROW;
const GEAR = `${ROW} [data-slot="icon-button"]`;
const CURRENT_PAGE = `${RESULTS} [data-slot="pagination-page"][aria-current="page"]`;
const PAGES = `${RESULTS} [data-slot="pagination-page"]`;
const PAGE_SIZE = `${RESULTS} [data-slot="select-trigger"]`;
const SORT_BUTTONS = `${RESULTS} [data-slot="table-head"] [data-slot="column-sort-button"]`;
const CSV = `${RESULTS} [data-slot="section-card-header"] [data-slot="action-button"]`;
const EMPTY_STATE = `${RESULTS} [data-slot="empty-state"]`;
const EMPTY_RESET = `${EMPTY_STATE} [data-slot="action-button"]`;
const PICKER = '[data-slot="popover-content"][data-picker="range"]';
const CALENDAR = `${PICKER} [data-slot="calendar"]`;
const JOB_DETAIL = modal("training-job-detail");
const OVERLAY = '[data-overlay="searching"]';
const POPUP = '[data-slot="searching-overlay"]';
const MESSAGE = '[data-slot="searching-overlay-message"]';
const OVERLAY_TEXT = "데이터를 불러오는 중입니다.\n잠시만 기다려주세요\n\n취소 버튼을 누르거나, esc로 취소 할 수 있습니다.";
const OVERLAY_DELAY_MS = 300;
const ENTRY_MS = 3000;
const SEARCH_MS = 3000;
const SETTLE_TIMEOUT_MS = 10_000;
const FAILURE_TEXT = "재학습 설정을 불러오지 못했습니다.";
const RESULTS_QUERY = "trainingResults";
const SEARCH_QUERIES = ["trainingResults", "trainingSummary", "trainingJobs"];
const SHELL = '[data-slot="monitoring-shell"]';
const LEFT_RAIL = '[data-slot="left-rail"]';
const RAIL_LINK = '[data-slot="rail-link"][title="CBM 모델"]';
const FRAME_PAIRS: readonly (readonly [string, string])[] = [
  [FILTER_SKELETON, FILTER],
  [KPI_ROW_SKELETON, KPI_ROW],
  [KPI_CARD_SKELETON, KPI],
  [JOBS_SKELETON, JOBS],
  [JOB_BLOCKS_SKELETON, JOB],
  [RESULTS_SKELETON, RESULTS],
  [TABLE_SKELETON, TABLE],
  [ROW_SKELETON, ROW],
  [`${FILTER_SKELETON} [data-slot="shimmer-block"]`, FILTER_CONTROLS],
];

interface Latency {
  entryMs?: number;
  searchMs?: number;
  ignoreAbort?: boolean;
  failNames?: readonly string[];
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function openWithLatency(page: Page, latency: Latency, width = 1920, height = 1080) {
  await page.addInitScript((value) => {
    const host = window as unknown as {
      cbmMockLatency: Latency;
      loadingMarks: [string, number][];
    };
    host.cbmMockLatency = value;
    host.loadingMarks = [];
    const watched: [string, string][] = [
      ["overlay", '[data-slot="searching-overlay"]'],
      ["skeleton", '[data-slot="training-skeleton"]'],
    ];
    const shown = new Set<string>();
    new MutationObserver(() => {
      for (const [name, selector] of watched) {
        const isShown = document.querySelector(selector) !== null;
        if (isShown === shown.has(name)) continue;
        if (isShown) shown.add(name);
        else shown.delete(name);
        host.loadingMarks.push([`${name}${isShown ? "+" : "-"}`, performance.now()]);
      }
    }).observe(document, { childList: true, subtree: true });
    document.addEventListener("click", () => host.loadingMarks.push(["click", performance.now()]), true);
  }, latency);
  await page.setViewportSize({ width, height });
  await page.goto(TRAINING_PATH);
}

async function setLatency(page: Page, latency: Latency) {
  await page.evaluate((value) => {
    (window as unknown as { cbmMockLatency: Latency }).cbmMockLatency = value;
  }, latency);
}

async function clearMarks(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { loadingMarks: [string, number][] }).loadingMarks.length = 0;
  });
}

async function marks(page: Page): Promise<[string, number][]> {
  return page.evaluate(() => [...(window as unknown as { loadingMarks: [string, number][] }).loadingMarks]);
}

async function overlayMarks(page: Page): Promise<[string, number][]> {
  return (await marks(page)).filter(([name]) => name.startsWith("overlay"));
}

async function waitForSettledRows(page: Page) {
  await expect(page.locator(ROW).first()).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(0, { timeout: SETTLE_TIMEOUT_MS });
  await expect(page.locator(`${JOB}[aria-disabled="true"]`)).toHaveCount(0, { timeout: SETTLE_TIMEOUT_MS });
}

async function waitForReloadedRows(page: Page) {
  await expect(page.locator(`${ROW}[aria-disabled="true"]`).first()).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  await waitForSettledRows(page);
}

async function rowTexts(page: Page): Promise<string[]> {
  return page.locator(ROW).evaluateAll((rows) =>
    rows.map((row) => [...row.querySelectorAll("td")].slice(0, 5).map((cell) => cell.textContent).join(" | ")),
  );
}

async function cellTexts(page: Page, column: number): Promise<(string | null)[]> {
  return page.locator(ROW).evaluateAll(
    (rows, index) => rows.map((row) => row.querySelectorAll("td")[index]?.textContent ?? null),
    column,
  );
}

async function kpiValues(page: Page): Promise<string[]> {
  return page.locator(`${KPI} [data-slot="kpi-stat-value"]`).allTextContents();
}

async function overlayIsOnTopAt(page: Page, selector: string): Promise<boolean> {
  return page.evaluate(
    ({ target, overlay }) => {
      const element = document.querySelector(target);
      if (element === null) return false;
      const rect = element.getBoundingClientRect();
      const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return top?.closest(overlay) !== null && top?.closest(overlay) !== undefined;
    },
    { target: selector, overlay: `${OVERLAY}, ${POPUP}` },
  );
}

const searchButton = (page: Page) => page.getByRole("button", { name: "검색", exact: true });
const resetButton = (page: Page) => page.getByRole("button", { name: "초기화", exact: true });
const cancelButton = (page: Page) => page.locator(POPUP).getByRole("button", { name: "취소", exact: true });

async function allRects(page: Page, selector: string): Promise<Rect[]> {
  return page.evaluate(
    (target) =>
      [...document.querySelectorAll(target)].map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    selector,
  );
}

interface ModalLocks {
  html: string;
  body: string;
  shellHidden: string | null;
}

async function modalLocks(page: Page): Promise<ModalLocks> {
  return page.evaluate(
    (shell) => ({
      html: document.documentElement.style.cssText,
      body: document.body.style.cssText,
      shellHidden: document.querySelector(shell)?.getAttribute("aria-hidden") ?? null,
    }),
    SHELL,
  );
}

async function expectFailureNotTrapped(page: Page, locksBefore: ModalLocks) {
  await expect(page.getByRole("alert").filter({ hasText: FAILURE_TEXT })).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect.poll(() => modalLocks(page)).toEqual(locksBefore);
  const isRailOnTop = await page.evaluate((rail) => {
    const rect = document.querySelector(rail)?.getBoundingClientRect();
    if (rect === undefined) return false;
    const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return top?.closest(rail) !== null && top?.closest(rail) !== undefined;
  }, LEFT_RAIL);
  expect(isRailOnTop).toBe(true);
  await page.locator(RAIL_LINK).focus();
  await expect(page.locator(RAIL_LINK)).toBeFocused();
}

async function leaveByRail(page: Page) {
  await page.locator(RAIL_LINK).click();
  await expect(page).toHaveURL("/model/config");
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`처음 들어올 때 재학습 설정 배치의 Skeleton이 표시되고 조회가 끝나면 같은 위치의 본문으로 바뀜 (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await openWithLatency(page, { entryMs: ENTRY_MS, searchMs: 800 }, viewport.width, viewport.height);
    const skeleton = page.locator(SKELETON);
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute("role", "status");
    await expect(skeleton).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("status").filter({ hasText: "재학습 설정 화면을 불러오는 중입니다." })).toHaveCount(1);
    await expect(skeleton.locator(".sr-only")).toHaveCSS("position", "absolute");
    await expect(page.locator(SHIMMER).first()).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(`${FILTER_SKELETON} [data-slot="shimmer-block"]`)).toHaveCount(6);
    await expect(page.locator(KPI_CARD_SKELETON)).toHaveCount(5);
    await expect(page.locator(`${KPI_CARD_SKELETON} [data-slot="shimmer-block"]`)).toHaveCount(15);
    const cards = page.locator(JOB_BLOCKS_SKELETON);
    await expect(cards).toHaveCount(6);
    expect((await cards.first().boundingBox())?.height).toBe(98);
    await expect(page.locator(ROW_SKELETON)).toHaveCount(6);
    await expect(page.locator(`${ROW_SKELETON} [data-slot="shimmer-block"]`)).toHaveCount(36);
    const muted = await color(page, "var(--muted)");
    const surfaceLow = await color(page, "var(--surface-low)");
    await expect(cards.first()).toHaveCSS(
      "background-image",
      `linear-gradient(90deg, ${muted} 0%, ${surfaceLow} 50%, ${muted} 100%)`,
    );
    await expect(cards.first()).toHaveCSS("background-size", "200% 100%");
    await expect(cards.first()).toHaveCSS("border-radius", "10px");
    await expect(page.locator(`${FILTER_SKELETON} [data-slot="shimmer-block"]`).first()).toHaveCSS("border-radius", "6px");
    const kpiFrame = page.locator(KPI_CARD_SKELETON).first();
    await expect(kpiFrame).toHaveCSS("border-top-left-radius", "12px");
    await expect(kpiFrame).toHaveCSS("border-left-width", "4px");
    await expect(kpiFrame).toHaveCSS("border-left-color", await color(page, "var(--border)"));
    await expect(kpiFrame).toHaveCSS("background-color", await color(page, "var(--card)"));
    await expect(cards.first()).toHaveCSS("animation-name", "none");
    const skeletonFrames = [];
    for (const [shown] of FRAME_PAIRS) skeletonFrames.push(await allRects(page, shown));

    await expect(page.locator(ROW).first()).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
    await expect(skeleton).toHaveCount(0);
    for (const [index, [shownSelector, realSelector]] of FRAME_PAIRS.entries()) {
      const real = await allRects(page, realSelector);
      const shown = skeletonFrames[index];
      expect(shown.length, shownSelector).toBe(real.length);
      for (const [item, frame] of real.entries()) {
        for (const key of ["x", "y", "width", "height"] as const) {
          expect(Math.abs(frame[key] - shown[item][key]), `${shownSelector} ${item} ${key}`).toBeLessThanOrEqual(0.5);
        }
      }
    }
    const recorded = await marks(page);
    const shownAt = recorded.find(([name]) => name === "skeleton+")?.[1] ?? 0;
    const hiddenAt = recorded.find(([name]) => name === "skeleton-")?.[1] ?? 0;
    expect(hiddenAt - shownAt).toBeGreaterThanOrEqual(ENTRY_MS);
  });
}

test("움직임에서 Skeleton의 반짝이는 빛은 1.2초 linear 반복, Overlay는 0.2초 Fade임", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openWithLatency(page, { entryMs: ENTRY_MS, searchMs: SEARCH_MS });
  for (const selector of [SHIMMER, `${FILTER_SKELETON} [data-slot="shimmer-block"]`, `${KPI_CARD_SKELETON} [data-slot="shimmer-block"]`]) {
    const block = page.locator(selector).first();
    await expect(block).toHaveCSS("animation-name", "skeleton-shimmer");
    await expect(block).toHaveCSS("animation-duration", "1.2s");
    await expect(block).toHaveCSS("animation-timing-function", "linear");
    await expect(block).toHaveCSS("animation-iteration-count", "infinite");
  }
  await waitForSettledRows(page);
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  for (const selector of [OVERLAY, POPUP]) {
    await expect(page.locator(selector)).toHaveCSS("animation-name", "enter");
    await expect(page.locator(selector)).toHaveCSS("animation-duration", "0.2s");
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);
});

test("Skeleton의 조건 Row 블록은 옅은 회색 배경보다 한 단계 진한 Color(라이트, 다크)이고, KPI와 Card 안 블록은 흰 배경용임", async ({ page }) => {
  await openWithLatency(page, { entryMs: 8000 });
  await expect(page.locator(SKELETON)).toBeVisible();
  const bar = page.locator(FILTER_SKELETON);
  const blocks = bar.locator('[data-slot="shimmer-block"]');
  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    const border = await color(page, "var(--border)");
    const muted = await color(page, "var(--muted)");
    const surfaceLow = await color(page, "var(--surface-low)");
    await expect(bar).toHaveCSS("background-color", surfaceLow);
    await expect(blocks).toHaveCount(6);
    for (const block of await blocks.all()) {
      await expect(block).toHaveCSS("background-image", `linear-gradient(90deg, ${border} 0%, ${muted} 50%, ${border} 100%)`);
    }
    const cardBlock = `linear-gradient(90deg, ${muted} 0%, ${surfaceLow} 50%, ${muted} 100%)`;
    for (const card of [KPI_CARD_SKELETON, JOBS_SKELETON, RESULTS_SKELETON]) {
      await expect(page.locator(`${card} [data-slot="shimmer-block"]`).first()).toHaveCSS("background-image", cardBlock);
    }
  }
});

test("검색에서 0.3초가 지나도 Response가 없으면 화면 전체를 덮는 검정 Overlay, Text, 취소 Button에 Focus가 표시되고, Response가 오면 닫히며 Focus는 검색으로 돌아감", async ({ page }) => {
  await openWithLatency(page, { searchMs: SEARCH_MS });
  await waitForSettledRows(page);
  await clearMarks(page);
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  const recorded = await marks(page);
  const clickedAt = recorded.find(([name]) => name === "click")?.[1] ?? Number.NaN;
  const shownAt = recorded.find(([name]) => name === "overlay+")?.[1] ?? Number.NaN;
  expect(shownAt - clickedAt).toBeGreaterThanOrEqual(OVERLAY_DELAY_MS);
  expect(shownAt - clickedAt).toBeLessThan(SEARCH_MS);
  expect(await page.locator(MESSAGE).innerText()).toBe(OVERLAY_TEXT);
  await expect(page.getByRole("dialog", { name: "데이터를 불러오는 중입니다." })).toBeVisible();

  const overlay = page.locator(OVERLAY);
  await expect(overlay).toHaveCSS("background-color", "rgba(0, 0, 0, 0.8)");
  expect(await overlay.boundingBox()).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  for (const selector of ['[data-slot="top-bar"]', '[data-slot="left-rail"]', FILTER, KPI_ROW, JOBS, `${ROW}:first-child`]) {
    expect(await overlayIsOnTopAt(page, selector), selector).toBe(true);
  }
  await expect(cancelButton(page)).toBeFocused();
  await expect(page.locator(`${ROW}[aria-disabled="true"]`).first()).toBeVisible();
  await expect(page.locator(`${JOB}[aria-disabled="true"]`).first()).toBeVisible();

  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: SETTLE_TIMEOUT_MS });
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await expect(searchButton(page)).toBeFocused();
  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator(`${JOB}[aria-disabled="true"]`)).toHaveCount(0);
});

test("Esc로 취소하면 결과, Page 번호, KPI는 검색 전 그대로이고 Input은 바꾼 값을 유지하며, 늦게 온 Response는 버리고 다시 검색하면 Input 값으로 조회함", async ({ page }) => {
  await openWithLatency(page, { searchMs: SEARCH_MS, ignoreAbort: true });
  await waitForSettledRows(page);
  await page.locator(PAGES).nth(2).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await waitForReloadedRows(page);
  const before = await rowTexts(page);
  expect(before).toHaveLength(6);
  const kpiBefore = await kpiValues(page);

  const yesterday = isoDaysAgo(1);
  await page.locator(SELECTS).nth(0).click();
  await pickOption(page, "Isolation Forest");
  await page.locator(TRIGGER).click();
  await expect(page.locator(CALENDAR)).toBeVisible();
  await page.locator(`${calendarDayCell(CALENDAR, yesterday)} button`).click();
  await page.locator(`${calendarDayCell(CALENDAR, yesterday)} button`).click();
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await expect(page.locator(TRIGGER)).toHaveText(`학습일시 ${yesterday} ~ ${yesterday}`);

  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(searchButton(page)).toBeFocused();
  expect(await rowTexts(page)).toEqual(before);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  expect(await kpiValues(page)).toEqual(kpiBefore);
  await expect(page.locator(SELECTS).nth(0)).toHaveText("Isolation Forest");
  await expect(page.locator(TRIGGER)).toHaveText(`학습일시 ${yesterday} ~ ${yesterday}`);
  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator(`${JOB}[aria-disabled="true"]`)).toHaveCount(0);

  await page.waitForTimeout(SEARCH_MS + 400);
  expect(await rowTexts(page)).toEqual(before);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await expect(page.getByText("재학습 설정을 불러오지 못했습니다.")).toHaveCount(0);
  await expect(page.locator('[data-slot="toast-viewport"] [data-tone]')).toHaveCount(0);

  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: SETTLE_TIMEOUT_MS });
  await waitForSettledRows(page);
  await expect(page.locator(ROW)).toHaveCount(3);
  expect(new Set(await cellTexts(page, 1))).toEqual(new Set(["Isolation Forest"]));
  expect(new Set((await cellTexts(page, 0)).map((text) => text?.slice(0, 10)))).toEqual(new Set([yesterday]));
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
});

test("취소 Button, 초기화, 빈 상태의 Filter 초기화에서 Overlay가 표시되고, 취소하면 결과 그대로이며 Focus는 누른 Button에 있고 기간 선택은 조회하지 않음", async ({ page }) => {
  await openWithLatency(page, { searchMs: SEARCH_MS });
  await waitForSettledRows(page);
  const before = await rowTexts(page);
  const defaultPeriodText = await page.locator(TRIGGER).innerText();

  await resetButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await cancelButton(page).click();
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(resetButton(page)).toBeFocused();
  expect(await rowTexts(page)).toEqual(before);
  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(0);

  const yesterday = isoDaysAgo(1);
  await clearMarks(page);
  await watchDisabled(page, "row", ROW);
  await page.locator(TRIGGER).click();
  await page.locator(`${calendarDayCell(CALENDAR, yesterday)} button`).click();
  await page.locator(`${calendarDayCell(CALENDAR, yesterday)} button`).click();
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await page.waitForTimeout(OVERLAY_DELAY_MS + 300);
  expect(await overlayMarks(page)).toEqual([]);
  expect(await stopWatchingDisabled(page, "row")).toEqual([]);
  expect(await rowTexts(page)).toEqual(before);

  await setLatency(page, { searchMs: 50 });
  await page.locator(SELECTS).nth(1).click();
  await pickOption(page, "TRACTION_MOTOR");
  await page.locator(SELECTS).nth(0).click();
  await pickOption(page, "Isolation Forest");
  await searchButton(page).click();
  await expect(page.locator(EMPTY_STATE)).toBeVisible();
  await setLatency(page, { searchMs: SEARCH_MS });
  await page.locator(EMPTY_RESET).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(page.locator(EMPTY_RESET)).toBeFocused();
  await expect(page.locator(EMPTY_STATE)).toBeVisible();
  await expect(page.locator(ROW)).toHaveCount(0);
  await expect(page.locator(SELECTS)).toHaveText(["학습 모델 (전체)", "장치 (전체)"]);
  await expect(page.locator(TRIGGER)).toHaveText(defaultPeriodText);

  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: SETTLE_TIMEOUT_MS });
  await waitForSettledRows(page);
  expect(await rowTexts(page)).toEqual(before);
});

test("0.3초 안에 오는 Response, Page 넘기기, Page 크기, Sort, CSV, 재시도에는 Overlay를 표시하지 않음", async ({ page }) => {
  await openWithLatency(page, { searchMs: 50 });
  await waitForSettledRows(page);
  await clearMarks(page);
  for (const button of [searchButton(page), resetButton(page)]) {
    await button.click();
    await waitForSettledRows(page);
  }
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  expect(await overlayMarks(page)).toEqual([]);

  await setLatency(page, { searchMs: 1500 });
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(`${ROW}[aria-disabled="true"]`).first()).toBeVisible();
  await waitForSettledRows(page);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await page.locator(PAGE_SIZE).click();
  await pickOption(page, "50개씩");
  await expect(page.locator(`${ROW}[aria-disabled="true"]`).first()).toBeVisible();
  await waitForSettledRows(page);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
  await page.locator(SORT_BUTTONS).nth(3).click();
  await expect(page.locator(`${ROW}[aria-disabled="true"]`).first()).toBeVisible();
  await waitForSettledRows(page);
  expect(await cellTexts(page, 4)).toEqual(["0.5277", "0.5140", "0.4914", "0.4914", "0.0433", "-1.2758"]);
  const download = page.waitForEvent("download");
  await page.locator(CSV).click();
  await download;
  await page.locator(JOB).nth(5).click();
  await expect(page.locator(JOB_DETAIL)).toBeVisible();
  await page.locator(JOB_DETAIL).getByRole("button", { name: "재시도", exact: true }).click();
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await expect(page.locator(`${JOB}[aria-disabled="true"]`).first()).toBeVisible();
  await waitForSettledRows(page);
  await expect(page.locator(JOB)).toHaveCount(7);
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  expect(await overlayMarks(page)).toEqual([]);
});

test("Page 넘기기에서 0.3초 안에 Response가 오면 결과 Row와 임계치 관리가 한 번도 막히지 않고 Overlay도 없음", async ({ page }) => {
  await openWithLatency(page, {});
  await waitForSettledRows(page);
  await clearMarks(page);
  await watchDisabledWithin(page, "rows", `${RESULTS} tbody`);
  for (const pageNumber of ["2", "3"]) {
    await page.locator(PAGES, { hasText: new RegExp(`^${pageNumber}$`) }).click();
    await expect(page.locator(CURRENT_PAGE)).toHaveText(pageNumber);
    await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  }
  expect(await stopWatchingDisabled(page, "rows")).toEqual([]);
  expect(await overlayMarks(page)).toEqual([]);
  await expect(page.locator(ROW)).toHaveCount(6);
});

test("Page 넘기기에서 Click한 지 0.3초 안에는 그대로이고 0.3초가 지나면 결과 Row가 막히고 임계치 관리가 옅어져 Click이나 Keyboard로 골라도 Modal이 열리지 않으며, Page 번호, Page 크기, Sort, 조건 Row는 그대로이고 Response가 오면 풀림", async ({ page }) => {
  await openWithLatency(page, { searchMs: SEARCH_MS });
  await waitForSettledRows(page);
  const firstRow = `${ROW}:first-child`;
  const firstGear = `${firstRow} [data-slot="icon-button"]`;
  await clearMarks(page);
  await watchLockAfterClick(page, "row", firstRow);
  await watchLockAfterClick(page, "gear", firstGear);
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await expect.poll(async () => (await lockAfterClick(page, "row")).early).toEqual({ disabled: "false", opacity: "1" });
  await expect.poll(async () => (await lockAfterClick(page, "gear")).early).toEqual({ disabled: "false", opacity: "1" });

  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(6);
  await expect(page.locator(`${GEAR}[aria-disabled="true"]`)).toHaveCount(6);
  await expect(page.locator(firstGear)).toHaveCSS("opacity", "0.5");
  for (const name of ["row", "gear"]) {
    expect((await lockAfterClick(page, name)).lockedAfterMs, name).toBeGreaterThanOrEqual(OVERLAY_DELAY_MS);
  }
  await expect(page.locator(`${JOB}[aria-disabled="true"]`)).toHaveCount(0);
  const freePages = await pressable(page, PAGES);
  expect(freePages.length).toBeGreaterThanOrEqual(3);
  expect(freePages).not.toContain(false);
  expect(await pressable(page, `${PAGE_SIZE}, ${SORT_BUTTONS}`)).toEqual(Array(5).fill(true));
  expect(await pressable(page, FILTER_CONTROLS)).toEqual(Array(6).fill(true));

  await page.locator(ROW).nth(1).click({ force: true });
  await page.locator(GEAR).nth(2).click({ force: true });
  await page.locator(ROW).nth(3).focus();
  await page.keyboard.press("Enter");
  expect(await page.locator(`${ROW}[aria-disabled="true"]`).count()).toBe(6);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await waitForSettledRows(page);
  await expect(page.locator(firstGear)).toHaveCSS("opacity", "1");
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  expect(await overlayMarks(page)).toEqual([]);
});

test("Page 넘기기를 연달아 하면 0.3초 넘게 기다린 Page가 풀린 뒤 다음 Page의 기다림도 처음부터 세어 0.3초 안에는 막지 않음", async ({ page }) => {
  await openWithLatency(page, { searchMs: SEARCH_MS });
  await waitForSettledRows(page);
  const firstGear = `${ROW}:first-child [data-slot="icon-button"]`;
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await waitForReloadedRows(page);

  await watchLockAfterClick(page, "gear", firstGear);
  await page.locator(PAGES, { hasText: /^3$/ }).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await expect.poll(async () => (await lockAfterClick(page, "gear")).early).toEqual({ disabled: "false", opacity: "1" });
  await expect(page.locator(`${GEAR}[aria-disabled="true"]`)).toHaveCount(6);
  expect((await lockAfterClick(page, "gear")).lockedAfterMs).toBeGreaterThanOrEqual(OVERLAY_DELAY_MS);
  await waitForSettledRows(page);
});

test("검색 중 실패하면 Overlay가 표시된 뒤 결과 조회가 실패했을 때 실패 Text로 바뀌고 Overlay, Scroll 잠금, 바깥 숨김이 남지 않으며 왼쪽 Menu로 나갈 수 있음", async ({ page }) => {
  await openWithLatency(page, { searchMs: SEARCH_MS });
  await waitForSettledRows(page);
  const locksBefore = await modalLocks(page);
  await setLatency(page, { searchMs: SEARCH_MS, failNames: [RESULTS_QUERY] });
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect.poll(() => modalLocks(page)).not.toEqual(locksBefore);
  await expect(page.getByText(FAILURE_TEXT)).toHaveCount(0);

  await expectFailureNotTrapped(page, locksBefore);
  await leaveByRail(page);
});

test("Page 넘기기 중 실패하면 결과 Row가 옅게 잠긴 뒤 결과 조회가 실패했을 때 실패 Text로 바뀌고 잠긴 Row와 Overlay가 남지 않으며 왼쪽 Menu로 나갈 수 있음", async ({ page }) => {
  await openWithLatency(page, { searchMs: SEARCH_MS });
  await waitForSettledRows(page);
  const locksBefore = await modalLocks(page);
  await setLatency(page, { searchMs: SEARCH_MS, failNames: [RESULTS_QUERY] });
  await clearMarks(page);
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(`${ROW}[aria-disabled="true"]`).first()).toBeVisible();
  await expect(page.getByText(FAILURE_TEXT)).toHaveCount(0);

  await expectFailureNotTrapped(page, locksBefore);
  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator(`${JOB}[aria-disabled="true"]`)).toHaveCount(0);
  expect(await overlayMarks(page)).toEqual([]);
  await leaveByRail(page);
});

test("취소 뒤 늦은 실패가 와도, 끊지 못한 검색 조회가 취소 뒤 실패로 끝나면 버리고 결과, KPI, 학습 Job은 검색 전 그대로이며 실패 Text가 없고 다시 검색하면 Input 값으로 조회함", async ({ page }) => {
  await openWithLatency(page, { searchMs: SEARCH_MS, ignoreAbort: true });
  await waitForSettledRows(page);
  const before = await rowTexts(page);
  const kpiBefore = await kpiValues(page);
  const jobsBefore = await page.locator(JOB).allTextContents();
  await setLatency(page, { searchMs: SEARCH_MS, ignoreAbort: true, failNames: SEARCH_QUERIES });
  await page.locator(SELECTS).nth(0).click();
  await pickOption(page, "Isolation Forest");
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await cancelButton(page).click();
  await expect(page.locator(POPUP)).toHaveCount(0);
  expect(await rowTexts(page)).toEqual(before);

  await page.waitForTimeout(SEARCH_MS + 400);
  await expect(page.getByText(FAILURE_TEXT)).toHaveCount(0);
  await expect(page.locator(RESULTS)).toBeVisible();
  expect(await rowTexts(page)).toEqual(before);
  expect(await kpiValues(page)).toEqual(kpiBefore);
  expect(await page.locator(JOB).allTextContents()).toEqual(jobsBefore);
  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator(`${JOB}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator('[data-slot="toast-viewport"] [data-tone]')).toHaveCount(0);
  await expect(page.locator(SELECTS).nth(0)).toHaveText("Isolation Forest");

  await setLatency(page, { searchMs: 50 });
  await searchButton(page).click();
  await expect.poll(async () => new Set(await cellTexts(page, 1))).toEqual(new Set(["Isolation Forest"]));
  await waitForSettledRows(page);
});

test("Mock은 처음 들어올 때와 검색의 지연을 구분하고 중단 신호를 받으면 기다림을 멈추고 AbortError를 냄", async () => {
  const host = globalThis as { cbmMockLatency?: Latency };
  host.cbmMockLatency = { entryMs: 50, searchMs: 3000 };
  try {
    const query = {
      modelCode: null,
      deviceCode: null,
      period: { from: null, to: null },
      sort: { key: "trainedAt", direction: "desc" },
      page: 1,
      pageSize: 20,
    } as const;
    await fetchTrainingFilterOptions();
    const enteredAt = Date.now();
    await fetchTrainingSummary();
    await fetchTrainingJobs();
    await fetchTrainingResults(query);
    expect(Date.now() - enteredAt).toBeLessThan(1000);

    const directAt = Date.now();
    await fetchTrainingScheduleOptions();
    await fetchTrainingJobDetail("trn-1002");
    await fetchTrainingResultDetail("1");
    expect(Date.now() - directAt).toBeLessThan(1000);

    const calls = [
      (signal: AbortSignal) => fetchTrainingSummary({ signal }),
      (signal: AbortSignal) => fetchTrainingJobs({ signal }),
      (signal: AbortSignal) => fetchTrainingResults(query, { signal }),
    ];
    for (const call of calls) {
      const controller = new AbortController();
      const startedAt = Date.now();
      const pending = call(controller.signal);
      setTimeout(() => controller.abort(), 100);
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      expect(Date.now() - startedAt).toBeLessThan(1000);
    }
    const aborted = AbortSignal.abort();
    await expect(fetchTrainingResults(query, { signal: aborted })).rejects.toMatchObject({ name: "AbortError" });
    await expect(fetchTrainingFilterOptions({ signal: aborted })).rejects.toMatchObject({ name: "AbortError" });
    await expect(fetchTrainingJobDetail("trn-1002", { signal: aborted })).rejects.toMatchObject({ name: "AbortError" });

    host.cbmMockLatency = { searchMs: 100, ignoreAbort: true };
    const ignored = new AbortController();
    const late = fetchTrainingResults(query, { signal: ignored.signal });
    ignored.abort();
    await expect(late).resolves.toHaveProperty("totalCount", 81);
  } finally {
    delete host.cbmMockLatency;
  }
});
