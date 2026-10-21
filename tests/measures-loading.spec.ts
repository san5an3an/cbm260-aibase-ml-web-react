import { expect, test, type Page } from "@playwright/test";
import {
  fetchMeasureActionOptions,
  fetchMeasureAssignees,
  fetchMeasureEffectComparison,
  fetchMeasureEffectOptions,
  fetchMeasureFilterOptions,
  fetchMeasureSummary,
  fetchMeasureWorklist,
  fetchSensorFrequencyRanking,
} from "../src/services/measures";
import {
  calendarDayCell,
  color,
  isoDaysAgo,
  lockAfterClick,
  pickOption,
  pressable,
  stopWatchingDisabled,
  watchDisabledWithin,
  watchLockAfterClick,
} from "./helpers/measure";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const MEASURES_PATH = "/dashboard/measures";
const SKELETON = '[data-slot="measures-skeleton"]';
const SHIMMER = `${SKELETON} [data-slot="shimmer-block"]`;
const FILTER_SKELETON = '[data-slot="measures-filter-bar-skeleton"]';
const KPI_SKELETON = '[data-slot="measures-kpi-skeleton"]';
const WORKLIST_SKELETON = '[data-slot="measures-worklist-card-skeleton"]';
const RANKING_SKELETON = '[data-slot="measures-ranking-card-skeleton"]';
const ROOT = '[data-slot="measure-management"]';
const FILTER = '[data-slot="measure-filter-bar"]';
const SELECTS = `${FILTER} [data-slot="select-trigger"]`;
const TRIGGER = `${FILTER} [data-slot="date-range-trigger"]`;
const FILTER_CONTROLS = `${SELECTS}, ${TRIGGER}, ${FILTER} [data-slot="icon-button"], ${FILTER} [data-slot="action-button"]`;
const KPI_ROW = '[data-slot="measure-kpi-row"]';
const KPI = `${KPI_ROW} [data-slot="kpi-stat"]`;
const WORKLIST = '[data-slot="measure-worklist-card"]';
const RANKING = '[data-slot="sensor-frequency-ranking-card"]';
const ROW = `${WORKLIST} tbody [data-slot="table-row"]`;
const RANK_ROW = `${RANKING} tbody [data-slot="table-row"]`;
const LOCKED_PROCESS = `${ROW} [data-slot="action-button"][aria-disabled="true"]`;
const PROCESS = `${ROW} [data-slot="action-button"]`;
const ACTION_DATE = `${ROW} [data-slot="measure-action-date"]`;
const CHECKBOXES = `${WORKLIST} tbody [data-slot="checkbox"]`;
const BULK_LABEL = `${WORKLIST} [data-slot="bulk-bar"] [data-slot="bulk-bar-label"]`;
const CURRENT_PAGE = `${WORKLIST} [data-slot="pagination-page"][aria-current="page"]`;
const PAGES = `${WORKLIST} [data-slot="pagination-page"]`;
const EMPTY_STATE = `${WORKLIST} [data-slot="empty-state"]`;
const PICKER = '[data-slot="popover-content"][data-picker="range"]';
const CALENDAR = `${PICKER} [data-slot="calendar"]`;
const OVERLAY = '[data-overlay="searching"]';
const POPUP = '[data-slot="searching-overlay"]';
const MESSAGE = '[data-slot="searching-overlay-message"]';
const OVERLAY_TEXT = "데이터를 불러오는 중입니다.\n잠시만 기다려주세요\n\n취소 버튼을 누르거나, esc로 취소 할 수 있습니다.";
const OVERLAY_DELAY_MS = 300;
const ENTRY_MS = 3000;
const SLOW_SEARCH_MS = 2500;
const FAILURE_TEXT = "조치 관리를 불러오지 못했습니다.";
const WORKLIST_QUERY = "measureWorklist";
const SEARCH_QUERIES = ["measureWorklist", "measureSummary", "measureSensorRanking"];
const SHELL = '[data-slot="monitoring-shell"]';
const LEFT_RAIL = '[data-slot="left-rail"]';
const RAIL_LINK = '[data-slot="rail-link"][title="CBM 모델"]';
const FRAME_PAIRS: readonly (readonly [string, string])[] = [
  [FILTER_SKELETON, FILTER],
  ['[data-slot="measures-kpi-row-skeleton"]', KPI_ROW],
  [`${KPI_SKELETON}:nth-child(1)`, `${KPI}:nth-child(1)`],
  [`${KPI_SKELETON}:nth-child(2)`, `${KPI}:nth-child(2)`],
  [`${KPI_SKELETON}:nth-child(3)`, `${KPI}:nth-child(3)`],
  [`${KPI_SKELETON}:nth-child(4)`, `${KPI}:nth-child(4)`],
  [WORKLIST_SKELETON, WORKLIST],
  ['[data-slot="measures-worklist-table-skeleton"]', `${WORKLIST} [data-slot="data-table"]`],
  [RANKING_SKELETON, RANKING],
  ['[data-slot="measures-ranking-table-skeleton"]', `${RANKING} [data-slot="data-table"]`],
];

interface Latency {
  entryMs?: number;
  searchMs?: number;
  ignoreAbort?: boolean;
  failNames?: readonly string[];
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
      ["skeleton", '[data-slot="measures-skeleton"]'],
      ["body", '[data-slot="measure-management"]'],
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
  await page.goto(MEASURES_PATH);
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
  await expect(page.locator(RANK_ROW).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(ROOT)).toBeVisible();
  await expect(page.locator(LOCKED_PROCESS)).toHaveCount(0, { timeout: 10_000 });
}

async function waitForReloadedRows(page: Page) {
  await expect(page.locator(LOCKED_PROCESS).first()).toBeVisible();
  await waitForSettledRows(page);
}

async function rowTexts(page: Page): Promise<string[]> {
  return page.locator(ROW).evaluateAll((rows) =>
    rows.map((row) => {
      const cells = [...row.querySelectorAll('[data-slot="table-cell"]')];
      return [1, 2, 3, 5].map((index) => cells[index]?.textContent).join(" | ");
    }),
  );
}

async function columnTexts(page: Page, column: number): Promise<(string | null | undefined)[]> {
  return page.locator(ROW).evaluateAll(
    (rows, index) => rows.map((row) => row.querySelectorAll('[data-slot="table-cell"]')[index]?.textContent),
    column,
  );
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

async function rects(page: Page, selectors: readonly string[]) {
  return page.evaluate(
    (list) =>
      list.map((selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect === undefined ? null : { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    selectors,
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
  await expect(page.getByRole("alert").filter({ hasText: FAILURE_TEXT })).toBeVisible({ timeout: 10_000 });
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
  test(`처음 들어올 때 조치 관리 배치의 Skeleton이 표시되고 조회가 끝나면 같은 위치의 본문으로 바뀜 (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await openWithLatency(page, { entryMs: ENTRY_MS, searchMs: 800 }, viewport.width, viewport.height);
    const skeleton = page.locator(SKELETON);
    await expect(skeleton).toBeVisible();
    await expect(page.locator(ROOT)).toHaveCount(0);
    await expect(skeleton).toHaveAttribute("role", "status");
    await expect(skeleton).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("status").filter({ hasText: "조치 관리 화면을 불러오는 중입니다." })).toHaveCount(1);
    await expect(skeleton.locator(".sr-only")).toHaveCSS("position", "absolute");
    await expect(page.locator(SHIMMER).first()).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(`${FILTER_SKELETON} [data-slot="shimmer-block"]`)).toHaveCount(8);
    await expect(page.locator(KPI_SKELETON)).toHaveCount(4);
    await expect(page.locator('[data-slot="measures-worklist-table-skeleton"] .grid')).toHaveCount(9);
    await expect(page.locator('[data-slot="measures-ranking-table-skeleton"] .grid')).toHaveCount(10);
    const block = page.locator(`${KPI_SKELETON} [data-slot="shimmer-block"]`).first();
    const muted = await color(page, "var(--muted)");
    const surfaceLow = await color(page, "var(--surface-low)");
    await expect(block).toHaveCSS("background-image", `linear-gradient(90deg, ${muted} 0%, ${surfaceLow} 50%, ${muted} 100%)`);
    await expect(block).toHaveCSS("background-size", "200% 100%");
    await expect(block).toHaveCSS("border-radius", "6px");
    await expect(block).toHaveCSS("animation-name", "none");
    const skeletonFrames = await rects(page, FRAME_PAIRS.map(([skeletonFrame]) => skeletonFrame));

    await expect(page.locator(ROW).first()).toBeVisible({ timeout: 10_000 });
    await expect(skeleton).toHaveCount(0);
    const frames = await rects(page, FRAME_PAIRS.map(([, bodyFrame]) => bodyFrame));
    for (const [index, frame] of frames.entries()) {
      const shown = skeletonFrames[index];
      expect(frame, FRAME_PAIRS[index][1]).not.toBeNull();
      expect(shown, FRAME_PAIRS[index][0]).not.toBeNull();
      for (const key of ["x", "y", "width", "height"] as const) {
        expect(Math.abs((frame?.[key] ?? 0) - (shown?.[key] ?? 0)), `${FRAME_PAIRS[index][0]} ${key}`).toBeLessThanOrEqual(0.5);
      }
    }
    const recorded = await marks(page);
    const shownAt = recorded.find(([name]) => name === "skeleton+")?.[1] ?? Number.NaN;
    const hiddenAt = recorded.find(([name]) => name === "skeleton-")?.[1] ?? Number.NaN;
    const bodyAt = recorded.find(([name]) => name === "body+")?.[1] ?? Number.NaN;
    expect(hiddenAt - shownAt).toBeGreaterThanOrEqual(ENTRY_MS);
    expect(Math.abs(bodyAt - hiddenAt)).toBeLessThan(50);
  });
}

test("Skeleton의 조건 Row 블록은 옅은 회색 배경보다 한 단계 진한 Color(라이트, 다크), Card 안 블록은 그대로, 반짝이는 빛은 1.2초 linear로 반복됨", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openWithLatency(page, { entryMs: 60_000 });
  await expect(page.locator(SKELETON)).toBeVisible();
  const first = page.locator(SHIMMER).first();
  await expect(first).toHaveCSS("animation-name", "skeleton-shimmer");
  await expect(first).toHaveCSS("animation-duration", "1.2s");
  await expect(first).toHaveCSS("animation-timing-function", "linear");
  await expect(first).toHaveCSS("animation-iteration-count", "infinite");

  const bar = page.locator(FILTER_SKELETON);
  const gradients = (frame: string) =>
    page.locator(`${frame} [data-slot="shimmer-block"]`).evaluateAll((blocks) => ({
      count: blocks.length,
      kinds: [...new Set(blocks.map((block) => getComputedStyle(block).backgroundImage))],
    }));
  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    const border = await color(page, "var(--border)");
    const muted = await color(page, "var(--muted)");
    const surfaceLow = await color(page, "var(--surface-low)");
    await expect(bar).toHaveCSS("background-color", surfaceLow);
    expect(await gradients(FILTER_SKELETON)).toEqual({
      count: 8,
      kinds: [`linear-gradient(90deg, ${border} 0%, ${muted} 50%, ${border} 100%)`],
    });
    for (const [frame, count] of [
      [KPI_SKELETON, 12],
      [WORKLIST_SKELETON, 3 + 9 * 12],
      [RANKING_SKELETON, 3 + 10 * 7],
    ] as const) {
      expect(await gradients(frame), frame).toEqual({
        count,
        kinds: [`linear-gradient(90deg, ${muted} 0%, ${surfaceLow} 50%, ${muted} 100%)`],
      });
    }
    await expect(page.locator(KPI_SKELETON).first()).toHaveCSS("background-color", await color(page, "var(--card)"));
    await expect(page.locator(KPI_SKELETON).first()).toHaveCSS("border-left-width", "4px");
    await expect(page.locator(KPI_SKELETON).first()).toHaveCSS("border-left-color", border);
  }
});

test("검색 시 0.3초가 지나도 Response가 없으면 화면 전체를 덮는 검정 Overlay, Text, 취소 Button에 Focus가 표시되고 Response가 오면 닫힘", async ({ page }) => {
  await openWithLatency(page, { searchMs: SLOW_SEARCH_MS });
  await waitForSettledRows(page);
  await clearMarks(page);
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  const recorded = await marks(page);
  const clickedAt = recorded.find(([name]) => name === "click")?.[1] ?? Number.NaN;
  const shownAt = recorded.find(([name]) => name === "overlay+")?.[1] ?? Number.NaN;
  expect(shownAt - clickedAt).toBeGreaterThanOrEqual(OVERLAY_DELAY_MS);
  expect(shownAt - clickedAt).toBeLessThan(SLOW_SEARCH_MS);

  expect(await page.locator(MESSAGE).innerText()).toBe(OVERLAY_TEXT);
  await expect(page.getByRole("dialog", { name: "데이터를 불러오는 중입니다." })).toBeVisible();

  const spinner = page.locator(`${POPUP} [data-slot="spinner"]`);
  await expect(spinner).toHaveClass(/(^| )lucide-loader( |$)/);
  await expect(spinner.locator("path")).toHaveCount(8);
  await expect(spinner).toHaveCSS("stroke", "rgb(255, 255, 255)");
  expect(await spinner.boundingBox()).toMatchObject({ width: 40, height: 40 });

  const overlay = page.locator(OVERLAY);
  await expect(overlay).toHaveCSS("background-color", "rgba(0, 0, 0, 0.8)");
  expect(await overlay.boundingBox()).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  for (const selector of ['[data-slot="top-bar"]', '[data-slot="left-rail"]', FILTER, KPI_ROW, `${ROW}:first-child`, RANKING]) {
    expect(await overlayIsOnTopAt(page, selector), selector).toBe(true);
  }
  expect(Number(await overlay.evaluate((element) => getComputedStyle(element).zIndex))).toBe(60);
  await expect(cancelButton(page)).toBeFocused();

  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await expect(searchButton(page)).toBeFocused();
  await expect(page.locator(LOCKED_PROCESS)).toHaveCount(0);
});

test("Esc로 취소하면 List, Page 번호, 선택한 Row는 검색 전 그대로이고 Input은 바꾼 값을 유지하며 늦게 온 Response는 버리고 다시 검색하면 Input 값으로 조회함", async ({ page }) => {
  await openWithLatency(page, { searchMs: SLOW_SEARCH_MS, ignoreAbort: true });
  await waitForSettledRows(page);
  await page.locator(PAGES).nth(2).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await waitForReloadedRows(page);
  await page.locator(CHECKBOXES).nth(0).click();
  await page.locator(CHECKBOXES).nth(8).click();
  await expect(page.locator(BULK_LABEL)).toHaveText("선택 2건");
  const before = await rowTexts(page);
  expect(before).toHaveLength(9);
  const kpiBefore = await page.locator(`${KPI} [data-slot="kpi-stat-value"]`).allTextContents();

  await page.locator(SELECTS).nth(1).click();
  await pickOption(page, "미조치");
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect(page.locator(BULK_LABEL)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(searchButton(page)).toBeFocused();
  expect(await rowTexts(page)).toEqual(before);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await expect(page.locator(BULK_LABEL)).toHaveText("선택 2건");
  await expect(page.locator(SELECTS)).toHaveText(["장치 (전체)", "미조치", "검수 (전체)"]);
  await expect(page.locator(LOCKED_PROCESS)).toHaveCount(0);

  await page.waitForTimeout(SLOW_SEARCH_MS + 400);
  expect(await rowTexts(page)).toEqual(before);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await expect(page.locator(BULK_LABEL)).toHaveText("선택 2건");
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`)).toHaveText(kpiBefore);
  await expect(page.getByText("조치 관리를 불러오지 못했습니다.")).toHaveCount(0);
  await expect(page.locator('[data-slot="toast-viewport"] [data-tone]')).toHaveCount(0);

  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: 10_000 });
  await waitForSettledRows(page);
  await expect(page.locator(ROW)).toHaveCount(5);
  expect(new Set(await columnTexts(page, 5))).toEqual(new Set(["미조치"]));
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
  await expect(page.locator(BULK_LABEL)).toHaveCount(0);
});

test("취소 Button, 초기화, 기간 선택에서 종료일까지 고르면 Calendar가 닫히고 Overlay가 표시되며 시작일만 고른 동안은 옅게 잠기고 취소해도 기간 Input은 새 값을 유지함", async ({ page }) => {
  await openWithLatency(page, { searchMs: SLOW_SEARCH_MS });
  await waitForSettledRows(page);
  const before = await rowTexts(page);

  await resetButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await cancelButton(page).click();
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(resetButton(page)).toBeFocused();
  expect(await rowTexts(page)).toEqual(before);

  const start = isoDaysAgo(3);
  await page.locator(TRIGGER).click();
  await expect(page.locator(CALENDAR)).toBeVisible();
  await clearMarks(page);
  await page.locator(`${calendarDayCell(CALENDAR, start)} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText(start);
  await expect(page.locator(LOCKED_PROCESS).first()).toBeVisible();
  await expect(page.locator(LOCKED_PROCESS)).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(ROW)).toHaveCount(4);
  expect(await overlayMarks(page)).toEqual([]);
  const afterStart = await rowTexts(page);

  await page.locator(`${calendarDayCell(CALENDAR, start)} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText(`${start} ~ ${start}`);
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await expect(page.locator(POPUP)).toBeVisible();
  await cancelButton(page).click();
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(page.locator(TRIGGER)).toHaveText(`${start} ~ ${start}`);
  await expect(page.locator(TRIGGER)).toBeFocused();
  expect(await rowTexts(page)).toEqual(afterStart);

  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: 10_000 });
  await waitForSettledRows(page);
  await expect(page.locator(ROW)).toHaveCount(1);
  await expect(page.locator(ROW).first()).toContainText("ECU");
});

test("빈 상태의 Filter 초기화도 Overlay가 표시되며 취소하면 빈 상태 그대로, Input은 처음 조건, Focus는 Filter 초기화로 돌아감", async ({ page }) => {
  await openWithLatency(page, { searchMs: 100 });
  await waitForSettledRows(page);
  await page.locator(SELECTS).nth(0).click();
  await pickOption(page, "DCU");
  await page.locator(SELECTS).nth(1).click();
  await pickOption(page, "미조치");
  await searchButton(page).click();
  await expect(page.locator(EMPTY_STATE)).toBeVisible();

  await setLatency(page, { searchMs: SLOW_SEARCH_MS });
  const emptyReset = page.locator(EMPTY_STATE).getByRole("button", { name: "필터 초기화" });
  await emptyReset.click();
  await expect(page.locator(POPUP)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(page.locator(EMPTY_STATE)).toBeVisible();
  await expect(page.locator(ROW)).toHaveCount(0);
  await expect(emptyReset).toBeFocused();
  await expect(page.locator(SELECTS)).toHaveText(["장치 (전체)", "조치 (전체)", "검수 (전체)"]);

  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: 10_000 });
  await waitForSettledRows(page);
  await expect(page.locator(ROW)).toHaveCount(9);
});

test("0.3초 안에 오는 Response, Page 넘기기, CSV, 일괄 확인 뒤 다시 받기, 조치 전후 비교에는 Overlay를 표시하지 않음", async ({ page }) => {
  await openWithLatency(page, { searchMs: 100 });
  await waitForSettledRows(page);
  await clearMarks(page);
  for (const button of [searchButton(page), resetButton(page)]) {
    await button.click();
    await waitForSettledRows(page);
  }
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  expect(await overlayMarks(page)).toEqual([]);

  await setLatency(page, { searchMs: 800 });
  await watchLockAfterClick(page, "pagedProcess", `${ROW}:first-child [data-slot="action-button"]`);
  await page.locator(PAGES).nth(1).click();
  await expect.poll(async () => (await lockAfterClick(page, "pagedProcess")).lockedAfterMs).not.toBeNull();
  await waitForSettledRows(page);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV 내보내기" }).click();
  await download;

  await page.locator(CHECKBOXES).nth(1).click();
  await page.getByRole("button", { name: "일괄 확인", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "확인", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.locator(LOCKED_PROCESS).first()).toBeVisible();
  await waitForSettledRows(page);

  await page.getByRole("button", { name: "조치 전·후 비교", exact: true }).click();
  const compare = page.getByRole("dialog", { name: "조치 전·후 비교" });
  await expect(compare).toBeVisible();
  await compare.getByRole("button", { name: "비교", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(compare).toHaveCount(0);

  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  expect(await overlayMarks(page)).toEqual([]);
});

test("Page 넘기기에서 0.3초 안에 Response가 오면 Row 안의 처리와 조치일이 한 번도 옅게 잠기지 않고 Overlay도 없음", async ({ page }) => {
  await openWithLatency(page, {});
  await waitForSettledRows(page);
  await clearMarks(page);
  await watchDisabledWithin(page, "rows", `${WORKLIST} tbody`);
  for (const pageNumber of ["2", "3"]) {
    await page.locator(PAGES, { hasText: new RegExp(`^${pageNumber}$`) }).click();
    await expect(page.locator(CURRENT_PAGE)).toHaveText(pageNumber);
    await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  }
  expect(await stopWatchingDisabled(page, "rows")).toEqual([]);
  expect(await overlayMarks(page)).toEqual([]);
  await expect(page.locator(ROW)).toHaveCount(9);
});

test("Page 넘기기에서 Click한 지 0.3초 안에는 그대로이고 0.3초가 지나면 Row 안의 처리와 조치일만 옅게 잠겨 Click이나 Keyboard로 골라도 Modal이 열리지 않으며, Page 번호와 조건 Row는 그대로이고 Response가 오면 풀림", async ({ page }) => {
  await openWithLatency(page, { searchMs: SLOW_SEARCH_MS });
  await waitForSettledRows(page);
  const firstProcess = `${ROW}:first-child [data-slot="action-button"]`;
  await clearMarks(page);
  await watchLockAfterClick(page, "process", firstProcess);
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await expect.poll(async () => (await lockAfterClick(page, "process")).early).toEqual({ disabled: "false", opacity: "1" });

  await expect(page.locator(LOCKED_PROCESS)).toHaveCount(9);
  await expect(page.locator(`${ACTION_DATE}[aria-disabled="true"]`)).toHaveCount(4);
  await expect(page.locator(firstProcess)).toHaveCSS("opacity", "0.5");
  await expect(page.locator(ACTION_DATE).first()).toHaveCSS("opacity", "0.5");
  expect((await lockAfterClick(page, "process")).lockedAfterMs).toBeGreaterThanOrEqual(OVERLAY_DELAY_MS);
  const freePages = await pressable(page, PAGES);
  expect(freePages.length).toBeGreaterThanOrEqual(3);
  expect(freePages).not.toContain(false);
  expect(await pressable(page, FILTER_CONTROLS)).toEqual(Array(8).fill(true));

  await page.locator(PROCESS).nth(1).click({ force: true });
  await page.locator(ACTION_DATE).first().click({ force: true });
  await page.locator(PROCESS).nth(2).focus();
  await page.keyboard.press("Enter");
  expect(await page.locator(LOCKED_PROCESS).count()).toBe(9);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await waitForSettledRows(page);
  await expect(page.locator(firstProcess)).toHaveCSS("opacity", "1");
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  expect(await overlayMarks(page)).toEqual([]);
});

test("Page 넘기기를 연달아 하면 0.3초 넘게 기다린 Page가 풀린 뒤 다음 Page의 기다림도 처음부터 세어 0.3초 안에는 옅게 잠그지 않음", async ({ page }) => {
  await openWithLatency(page, { searchMs: SLOW_SEARCH_MS });
  await waitForSettledRows(page);
  const firstProcess = `${ROW}:first-child [data-slot="action-button"]`;
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await waitForReloadedRows(page);

  await watchLockAfterClick(page, "process", firstProcess);
  await page.locator(PAGES, { hasText: /^3$/ }).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await expect.poll(async () => (await lockAfterClick(page, "process")).early).toEqual({ disabled: "false", opacity: "1" });
  await expect(page.locator(LOCKED_PROCESS)).toHaveCount(9);
  expect((await lockAfterClick(page, "process")).lockedAfterMs).toBeGreaterThanOrEqual(OVERLAY_DELAY_MS);
  await waitForSettledRows(page);
});

test("검색 중 실패하면 Overlay가 표시된 뒤 List 조회가 실패했을 때 실패 Text로 바뀌고 Overlay, Scroll 잠금, 바깥 숨김이 남지 않으며 왼쪽 Menu로 나갈 수 있음", async ({ page }) => {
  await openWithLatency(page, { searchMs: SLOW_SEARCH_MS });
  await waitForSettledRows(page);
  const locksBefore = await modalLocks(page);
  await setLatency(page, { searchMs: SLOW_SEARCH_MS, failNames: [WORKLIST_QUERY] });
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect.poll(() => modalLocks(page)).not.toEqual(locksBefore);
  await expect(page.getByText(FAILURE_TEXT)).toHaveCount(0);

  await expectFailureNotTrapped(page, locksBefore);
  await leaveByRail(page);
});

test("Page 넘기기 중 실패하면 Row가 옅게 잠긴 뒤 List 조회가 실패했을 때 실패 Text로 바뀌고 잠긴 Row와 Overlay가 남지 않으며 왼쪽 Menu로 나갈 수 있음", async ({ page }) => {
  await openWithLatency(page, { searchMs: SLOW_SEARCH_MS });
  await waitForSettledRows(page);
  const locksBefore = await modalLocks(page);
  await setLatency(page, { searchMs: SLOW_SEARCH_MS, failNames: [WORKLIST_QUERY] });
  await clearMarks(page);
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(LOCKED_PROCESS).first()).toBeVisible();
  await expect(page.getByText(FAILURE_TEXT)).toHaveCount(0);

  await expectFailureNotTrapped(page, locksBefore);
  await expect(page.locator(LOCKED_PROCESS)).toHaveCount(0);
  expect(await overlayMarks(page)).toEqual([]);
  await leaveByRail(page);
});

test("취소 뒤 늦은 실패가 와도, 끊지 못한 검색 조회가 취소 뒤 실패로 끝나면 버리고 List, KPI, 순위는 검색 전 그대로이며 실패 Text가 없고 다시 검색하면 Input 값으로 조회함", async ({ page }) => {
  await openWithLatency(page, { searchMs: SLOW_SEARCH_MS, ignoreAbort: true });
  await waitForSettledRows(page);
  const before = await rowTexts(page);
  const kpiBefore = await page.locator(`${KPI} [data-slot="kpi-stat-value"]`).allTextContents();
  const rankBefore = await page.locator(RANK_ROW).allTextContents();
  await setLatency(page, { searchMs: SLOW_SEARCH_MS, ignoreAbort: true, failNames: SEARCH_QUERIES });
  await page.locator(SELECTS).nth(1).click();
  await pickOption(page, "미조치");
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await cancelButton(page).click();
  await expect(page.locator(POPUP)).toHaveCount(0);
  expect(await rowTexts(page)).toEqual(before);

  await page.waitForTimeout(SLOW_SEARCH_MS + 400);
  await expect(page.getByText(FAILURE_TEXT)).toHaveCount(0);
  await expect(page.locator(ROOT)).toBeVisible();
  expect(await rowTexts(page)).toEqual(before);
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`)).toHaveText(kpiBefore);
  expect(await page.locator(RANK_ROW).allTextContents()).toEqual(rankBefore);
  await expect(page.locator(LOCKED_PROCESS)).toHaveCount(0);
  await expect(page.locator('[data-slot="toast-viewport"] [data-tone]')).toHaveCount(0);
  await expect(page.locator(SELECTS).nth(1)).toHaveText("미조치");

  await setLatency(page, { searchMs: 100 });
  await searchButton(page).click();
  await expect(page.locator(ROW)).toHaveCount(5);
  await waitForSettledRows(page);
  expect(new Set(await columnTexts(page, 5))).toEqual(new Set(["미조치"]));
});

test("Mock은 처음 들어올 때와 검색의 지연을 구분하고 중단 신호를 받으면 기다림을 멈추고 AbortError를 내며 선택지와 Modal 조회는 바로 응답함", async () => {
  const host = globalThis as { cbmMockLatency?: Latency };
  host.cbmMockLatency = { entryMs: 50, searchMs: 3000 };
  try {
    const query = {
      deviceCode: null,
      actionYn: null,
      inspectionYn: null,
      period: { from: null, to: null },
      page: 1,
    };
    await fetchMeasureFilterOptions();
    const enteredAt = Date.now();
    await fetchMeasureWorklist(query);
    await fetchMeasureSummary();
    await fetchSensorFrequencyRanking();
    expect(Date.now() - enteredAt).toBeLessThan(1000);

    const controller = new AbortController();
    const startedAt = Date.now();
    const pending = Promise.allSettled([
      fetchMeasureWorklist(query, { signal: controller.signal }),
      fetchMeasureSummary({ signal: controller.signal }),
      fetchSensorFrequencyRanking({ signal: controller.signal }),
    ]);
    setTimeout(() => controller.abort(), 100);
    const settled = await pending;
    expect(settled.map((result) => result.status)).toEqual(["rejected", "rejected", "rejected"]);
    for (const result of settled) {
      if (result.status === "rejected") expect(result.reason).toMatchObject({ name: "AbortError" });
    }
    expect(Date.now() - startedAt).toBeLessThan(1000);
    await expect(fetchMeasureWorklist(query, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });

    const quickAt = Date.now();
    await fetchMeasureActionOptions();
    await fetchMeasureAssignees();
    const effectOptions = await fetchMeasureEffectOptions();
    await fetchMeasureEffectComparison({ ...effectOptions.defaultConditions, sort: effectOptions.defaultSort });
    expect(Date.now() - quickAt).toBeLessThan(1000);

    host.cbmMockLatency = { searchMs: 100, ignoreAbort: true };
    const ignored = new AbortController();
    const late = fetchMeasureSummary({ signal: ignored.signal });
    ignored.abort();
    await expect(late).resolves.toHaveProperty("totalCount");
  } finally {
    delete host.cbmMockLatency;
  }
});
