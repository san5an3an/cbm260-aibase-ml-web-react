import { expect, test, type Page } from "@playwright/test";
import {
  acknowledgeAlarms,
  fetchAlarmAssignees,
  fetchAlarmCarRanking,
  fetchAlarmCreateOptions,
  fetchAlarmFilterOptions,
  fetchAlarmRules,
  fetchAlarmSummary,
  fetchAlarmTrend,
  fetchAlarmWorklist,
} from "../src/services/alarms";
import { color, pickOption } from "./helpers/measure";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const ALARMS_PATH = "/dashboard/alarms";
const SKELETON = '[data-slot="alarm-events-skeleton"]';
const SHIMMER = `${SKELETON} [data-slot="shimmer-block"]`;
const FILTER_SKELETON = '[data-slot="alarm-filter-bar-skeleton"]';
const KPI_SKELETON = '[data-slot="alarm-kpi-skeleton"]';
const WORKLIST_SKELETON = '[data-slot="alarm-worklist-card-skeleton"]';
const RANKING_SKELETON = '[data-slot="alarm-car-ranking-card-skeleton"]';
const FILTER = '[data-slot="alarm-filter-bar"]';
const SELECTS = `${FILTER} [data-slot="select-trigger"]`;
const KPI_ROW = '[data-slot="alarm-kpi-row"]';
const WORKLIST = '[data-slot="alarm-worklist-card"]';
const BODY_ROW = `${WORKLIST} tbody [data-slot="table-row"]`;
const BULK_BAR = `${WORKLIST} [data-slot="bulk-bar"]`;
const CHECKBOXES = `${WORKLIST} tbody [data-slot="checkbox"]`;
const SORT_BUTTONS = `${WORKLIST} [data-slot="column-sort-button"]`;
const CURRENT_PAGE = `${WORKLIST} [data-slot="pagination-page"][aria-current="page"]`;
const PAGES = `${WORKLIST} [data-slot="pagination-page"]`;
const EMPTY_STATE = `${WORKLIST} [data-slot="empty-state"]`;
const RANKING = '[data-slot="alarm-car-ranking-card"]';
const RANK_ROW = `${RANKING} tbody [data-slot="table-row"]`;
const TREND_PANEL = '[data-slot="alarm-trend-panel"]';
const BULK_LABEL = `${BULK_BAR} [data-slot="bulk-bar-label"]`;
const LOCKED_ROW = `${BODY_ROW}[aria-disabled="true"]`;
const KPI_WAITING = `${KPI_ROW}[aria-busy="true"]`;
const TREND_WAITING = `${TREND_PANEL}[aria-busy="true"]`;
const LOCKED_RANK_ROW = `${RANK_ROW}[aria-disabled="true"]`;
const WAIT_LOOKS: readonly (readonly [string, string])[] = [
  ["worklist", LOCKED_ROW],
  ["kpi", KPI_WAITING],
  ["trend", TREND_WAITING],
  ["ranking", LOCKED_RANK_ROW],
];
const ALARM_QUERY_NAMES = ["alarmWorklist", "alarmSummary", "alarmTrend", "alarmCarRanking"];
const FAILED_TEXT = "알람/이벤트를 불러오지 못했습니다.";
const TOASTS = '[data-slot="toast-viewport"] [data-tone]';
const DATE_LABELS = '[data-slot="alarm-daily-stack-chart"] [data-slot="chart-date-label"]';
const PROCESS = '[data-modal="alarm-process"]';
const OVERLAY = '[data-overlay="searching"]';
const POPUP = '[data-slot="searching-overlay"]';
const MESSAGE = '[data-slot="searching-overlay-message"]';
const OVERLAY_TEXT = "데이터를 불러오는 중입니다.\n잠시만 기다려주세요\n\n취소 버튼을 누르거나, esc로 취소 할 수 있습니다.";
const OVERLAY_DELAY_MS = 300;
const FRAME_PAIRS: readonly (readonly [string, string])[] = [
  [FILTER_SKELETON, FILTER],
  ['[data-slot="alarm-kpi-row-skeleton"]', KPI_ROW],
  [WORKLIST_SKELETON, WORKLIST],
  ['[data-slot="alarm-events-side-skeleton"]', '[data-slot="alarm-events-side"]'],
  ['[data-slot="alarm-trend-card-skeleton"]', '[data-slot="alarm-trend-card"]'],
  [RANKING_SKELETON, RANKING],
];

interface Latency {
  entryMs?: number;
  searchMs?: number;
  ignoreAbort?: boolean;
  failNames?: string[];
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function openWithLatency(page: Page, latency: Latency, width = 1920, height = 1080) {
  const watched: (readonly [string, string])[] = [
    ["overlay", '[data-slot="searching-overlay"]'],
    ["skeleton", '[data-slot="alarm-events-skeleton"]'],
    ...WAIT_LOOKS,
  ];
  await page.addInitScript(
    ({ value, watched: watchedList, firstRow }) => {
      const host = window as unknown as {
        cbmMockLatency: Latency;
        loadingMarks: [string, number][];
        firstRowTexts: string[];
      };
      host.cbmMockLatency = value;
      host.loadingMarks = [];
      host.firstRowTexts = [];
      const shown = new Set<string>();
      new MutationObserver(() => {
        for (const [name, selector] of watchedList) {
          const isShown = document.querySelector(selector) !== null;
          if (isShown === shown.has(name)) continue;
          if (isShown) shown.add(name);
          else shown.delete(name);
          host.loadingMarks.push([`${name}${isShown ? "+" : "-"}`, performance.now()]);
        }
        const text = document.querySelector(firstRow)?.textContent ?? null;
        if (text !== null && text !== host.firstRowTexts.at(-1)) host.firstRowTexts.push(text);
      }).observe(document, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["aria-disabled", "aria-busy"],
      });
      document.addEventListener("click", () => host.loadingMarks.push(["click", performance.now()]), true);
    },
    { value: latency, watched, firstRow: BODY_ROW },
  );
  await page.setViewportSize({ width, height });
  await page.goto(ALARMS_PATH);
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

async function overlayMarks(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (window as unknown as { loadingMarks: [string, number][] }).loadingMarks
      .map(([name]) => name)
      .filter((name) => name.startsWith("overlay")),
  );
}

async function marks(page: Page): Promise<[string, number][]> {
  return page.evaluate(() => [...(window as unknown as { loadingMarks: [string, number][] }).loadingMarks]);
}

async function waitLookMarks(page: Page): Promise<string[]> {
  const names = WAIT_LOOKS.map(([name]) => name);
  return (await marks(page)).map(([name]) => name).filter((name) => names.includes(name.slice(0, -1)));
}

function markAt(recorded: [string, number][], name: string): number {
  return recorded.find(([markName]) => markName === name)?.[1] ?? Number.NaN;
}

async function firstRowTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => [...(window as unknown as { firstRowTexts: string[] }).firstRowTexts]);
}

async function waitLookCounts(page: Page): Promise<number[]> {
  return Promise.all(WAIT_LOOKS.map(([, selector]) => page.locator(selector).count()));
}

async function lockLook(page: Page) {
  return page.evaluate(
    ({ worklist, kpiRow, trendPanel, ranking, filter }) => {
      const all = (selector: string) => [...document.querySelectorAll(selector)];
      const effective = (element: Element | null | undefined) => {
        if (element === null || element === undefined) return -1;
        let value = 1;
        for (let node: Element | null = element; node !== null; node = node.parentElement) {
          value *= Number(getComputedStyle(node).opacity);
        }
        return value;
      };
      const isLocked = (element: Element) =>
        element.getAttribute("aria-disabled") === "true" || (element as HTMLButtonElement).disabled === true;
      const own = (element: Element) => getComputedStyle(element).opacity;
      const rows = all(`${worklist} tbody [data-slot="table-row"]`);
      const rowButtons = (label: string) =>
        rows.map((row) => [...row.querySelectorAll('[data-slot="action-button"]')].find((button) => button.textContent === label));
      const processButtons = rowButtons("처리");
      const deleteButtons = rowButtons("삭제");
      const headerCheckbox = document.querySelector(`${worklist} thead [data-slot="checkbox"]`);
      const kpiCards = all(`${kpiRow} [data-slot="kpi-stat"]`);
      const rankRows = all(`${ranking} tbody [data-slot="table-row"]`);
      return {
        rowOpacity: rows.map(own),
        rowPointerEvents: rows.map((row) => getComputedStyle(row).pointerEvents),
        rowCheckboxLocked: rows.map((row) => row.querySelector('[data-slot="checkbox"]')?.getAttribute("aria-disabled") ?? null),
        processLocked: processButtons.map((button) => button?.getAttribute("aria-disabled") ?? null),
        deleteLocked: deleteButtons.map((button) => button?.getAttribute("aria-disabled") ?? null),
        rowControlOpacity: [effective(processButtons[0]), effective(deleteButtons[0]), effective(rows[0]?.querySelector('[data-slot="checkbox"]'))],
        headerCheckbox: headerCheckbox === null ? null : [headerCheckbox.getAttribute("aria-disabled"), own(headerCheckbox)],
        bulkButtons: all(`${worklist} [data-slot="bulk-bar"] [data-slot="action-button"]`).map((button) => [button.textContent, button.getAttribute("aria-disabled"), own(button)]),
        worklistBusy: document.querySelector(`${worklist} [data-slot="table"]`)?.getAttribute("aria-busy") ?? null,
        worklistKept: [
          effective(document.querySelector(`${worklist} thead [data-slot="table-row"]`)),
          effective(document.querySelector(`${worklist} [data-slot="section-card-title"]`)),
          effective(document.querySelector(`${worklist} [data-slot="pagination-page"][aria-current="page"]`)),
        ],
        freeControls: [
          ...all(`${worklist} [data-slot="pagination-page"]`),
          ...all(`${worklist} [data-slot="column-sort-button"]`),
          ...all(`${filter} [data-slot="select-trigger"]`),
          ...all(`${filter} [data-slot="icon-button"]`),
          ...all(`${filter} [data-slot="action-button"]`),
        ].map((element) => [element.textContent || element.getAttribute("aria-label"), isLocked(element)]),
        kpiBusy: document.querySelector(kpiRow)?.getAttribute("aria-busy") ?? null,
        kpiKept: kpiCards.flatMap((card) => [
          effective(card),
          effective(card.querySelector('[data-slot="kpi-stat-label"]')),
          effective(card.querySelector('[data-slot="kpi-stat-description"]')),
        ]),
        kpiDimmed: kpiCards.flatMap((card) => [
          effective(card.querySelector('[data-slot="kpi-stat-value"]')),
          effective(card.querySelector('[data-slot="kpi-stat-unit"]')),
        ]),
        trendBusy: document.querySelector(trendPanel)?.getAttribute("aria-busy") ?? null,
        trendKept: [
          effective(document.querySelector('[data-slot="alarm-trend-card"]')),
          effective(document.querySelector('[data-slot="alarm-trend-card"] [data-slot="section-card-title"]')),
          effective(document.querySelector('[data-slot="alarm-trend-legend"]')),
          effective(document.querySelector(trendPanel)),
        ],
        trendDimmed: all(`${trendPanel} > *`).map(effective),
        rankBusy: document.querySelector(`${ranking} [data-slot="table"]`)?.getAttribute("aria-busy") ?? null,
        rankLocked: rankRows.map((row) => row.getAttribute("aria-disabled")),
        rankDimmed: rankRows.map(effective),
        rankPointerEvents: rankRows.map((row) => getComputedStyle(row).pointerEvents),
        rankKept: [
          effective(document.querySelector(ranking)),
          effective(document.querySelector(`${ranking} [data-slot="section-card-title"]`)),
          effective(document.querySelector(`${ranking} thead [data-slot="table-row"]`)),
        ],
      };
    },
    { worklist: WORKLIST, kpiRow: KPI_ROW, trendPanel: TREND_PANEL, ranking: RANKING, filter: FILTER },
  );
}

const rowButton = (page: Page, row: number, name: string) =>
  page.locator(BODY_ROW).nth(row).getByRole("button", { name, exact: true });
const bulkButton = (page: Page, name: string) => page.locator(BULK_BAR).getByRole("button", { name, exact: true });

async function waitForBody(page: Page) {
  await expect(page.locator(BODY_ROW).first()).toBeVisible();
  await expect(page.locator(SKELETON)).toHaveCount(0);
}

async function waitForSearchDone(page: Page) {
  await expect(page.locator(POPUP)).toBeVisible();
  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator(OVERLAY)).toHaveCount(0);
}

async function rowTexts(page: Page): Promise<string[]> {
  return page.locator(BODY_ROW).evaluateAll((rows) =>
    rows.map((row) =>
      [...row.querySelectorAll('[data-slot="table-cell"]')]
        .slice(1, 5)
        .map((cell) => cell.textContent)
        .join(" | "),
    ),
  );
}

async function statusTexts(page: Page): Promise<string[]> {
  return page.locator(BODY_ROW).evaluateAll((rows) =>
    rows.map((row) => row.querySelectorAll('[data-slot="table-cell"]')[7]?.textContent ?? ""),
  );
}

const lastDate = (page: Page) => page.locator(DATE_LABELS).last();

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

const searchButton = (page: Page) => page.locator(FILTER).getByRole("button", { name: "검색", exact: true });
const resetButton = (page: Page) => page.locator(FILTER).getByRole("button", { name: "초기화", exact: true });
const cancelButton = (page: Page) => page.locator(POPUP).getByRole("button", { name: "취소", exact: true });

async function rects(page: Page, selectors: readonly string[]): Promise<(Rect | null)[]> {
  return page.evaluate(
    (list) =>
      list.map((selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect === undefined ? null : { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    selectors,
  );
}

async function allRects(page: Page, selector: string): Promise<Rect[]> {
  return page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  );
}

function expectSameRect(actual: Rect | null | undefined, expected: Rect | null | undefined, label: string) {
  expect(actual, label).toBeTruthy();
  expect(expected, label).toBeTruthy();
  for (const key of ["x", "y", "width", "height"] as const) {
    expect(Math.abs((actual?.[key] ?? 0) - (expected?.[key] ?? 0)), `${label} ${key}`).toBeLessThanOrEqual(0.5);
  }
}

test("처음 들어올 때 알람/이벤트 Layout의 Skeleton이 보이고 조회가 끝나면 같은 위치의 본문으로 바뀜", async ({ page }) => {
  await openWithLatency(page, { entryMs: 1200, searchMs: 1200 });
  const skeleton = page.locator(SKELETON);
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveAttribute("role", "status");
  await expect(skeleton).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status").filter({ hasText: "알람/이벤트 화면을 불러오는 중입니다." })).toHaveCount(1);
  await expect(skeleton.locator(".sr-only")).toHaveCSS("position", "absolute");
  await expect(page.locator(SHIMMER).first()).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(`${FILTER_SKELETON} [data-slot="shimmer-block"]`)).toHaveCount(7);
  await expect(page.locator(KPI_SKELETON)).toHaveCount(5);
  await expect(page.locator(`${KPI_SKELETON} [data-slot="shimmer-block"]`)).toHaveCount(15);
  await expect(page.locator(`${WORKLIST_SKELETON} .grid`)).toHaveCount(10);
  await expect(page.locator(`${RANKING_SKELETON} .grid`)).toHaveCount(10);
  const kpiFrame = page.locator(KPI_SKELETON).first();
  await expect(kpiFrame).toHaveCSS("background-color", await color(page, "var(--card)"));
  await expect(kpiFrame).toHaveCSS("border-left-color", await color(page, "var(--border)"));
  await expect(kpiFrame).toHaveCSS("border-top-left-radius", "12px");
  const muted = await color(page, "var(--muted)");
  const surfaceLow = await color(page, "var(--surface-low)");
  const chartBlock = page.locator(`[data-slot="alarm-trend-card-skeleton"] [data-slot="shimmer-block"]`).nth(3);
  await expect(chartBlock).toHaveCSS("background-image", `linear-gradient(90deg, ${muted} 0%, ${surfaceLow} 50%, ${muted} 100%)`);
  await expect(chartBlock).toHaveCSS("background-size", "200% 100%");
  await expect(chartBlock).toHaveCSS("border-radius", "10px");
  await expect(page.locator(`${FILTER_SKELETON} [data-slot="shimmer-block"]`).first()).toHaveCSS("border-radius", "6px");
  await expect(chartBlock).toHaveCSS("animation-name", "none");
  const skeletonFrames = await rects(page, FRAME_PAIRS.map(([skeletonFrame]) => skeletonFrame));
  const skeletonKpis = await allRects(page, KPI_SKELETON);

  await waitForBody(page);
  const frames = await rects(page, FRAME_PAIRS.map(([, bodyFrame]) => bodyFrame));
  frames.forEach((frame, index) => expectSameRect(frame, skeletonFrames[index], FRAME_PAIRS[index][1]));
  const kpis = await allRects(page, `${KPI_ROW} [data-slot="kpi-stat"]`);
  expect(kpis).toHaveLength(skeletonKpis.length);
  kpis.forEach((kpi, index) => expectSameRect(kpi, skeletonKpis[index], `kpi ${index}`));
  const recorded = await marks(page);
  const shownAt = recorded.find(([name]) => name === "skeleton+")?.[1] ?? 0;
  const hiddenAt = recorded.find(([name]) => name === "skeleton-")?.[1] ?? 0;
  expect(hiddenAt - shownAt).toBeGreaterThanOrEqual(1200);
});

test("Skeleton의 조건 Row 블록은 옅은 회색 배경보다 한 단계 진한 Color이고(라이트, 다크) Card 안 블록은 그대로임", async ({ page }) => {
  await openWithLatency(page, { entryMs: 8000 });
  await expect(page.locator(SKELETON)).toBeVisible();
  const bar = page.locator(FILTER_SKELETON);
  const blocks = bar.locator('[data-slot="shimmer-block"]');
  await expect(blocks).toHaveCount(7);
  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    const border = await color(page, "var(--border)");
    const muted = await color(page, "var(--muted)");
    const surfaceLow = await color(page, "var(--surface-low)");
    await expect(bar).toHaveCSS("background-color", surfaceLow);
    for (const block of await blocks.all()) {
      await expect(block).toHaveCSS("background-image", `linear-gradient(90deg, ${border} 0%, ${muted} 50%, ${border} 100%)`);
    }
    for (const card of [KPI_SKELETON, WORKLIST_SKELETON, RANKING_SKELETON]) {
      await expect(page.locator(`${card} [data-slot="shimmer-block"]`).first()).toHaveCSS(
        "background-image",
        `linear-gradient(90deg, ${muted} 0%, ${surfaceLow} 50%, ${muted} 100%)`,
      );
    }
  }
});

test("Skeleton의 빛은 1.2초 linear로 반복되고 Overlay는 공용 0.2초 Fade로 움직임", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openWithLatency(page, { entryMs: 1200, searchMs: 1500 });
  const block = page.locator(SHIMMER).first();
  await expect(block).toHaveCSS("animation-name", "skeleton-shimmer");
  await expect(block).toHaveCSS("animation-duration", "1.2s");
  await expect(block).toHaveCSS("animation-timing-function", "linear");
  await expect(block).toHaveCSS("animation-iteration-count", "infinite");
  await waitForBody(page);
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  for (const selector of [OVERLAY, POPUP]) {
    await expect(page.locator(selector)).toHaveCSS("animation-name", "enter");
    await expect(page.locator(selector)).toHaveCSS("animation-duration", "0.2s");
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);
});

test("검색 요청에 0.3초가 지나도 Response가 없으면 화면 전체를 덮는 검정 Overlay, Text, 취소 Button의 Focus가 표시됨", async ({ page }) => {
  await openWithLatency(page, { searchMs: 1500 });
  await waitForBody(page);
  await clearMarks(page);
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  const recorded = await marks(page);
  const clickedAt = recorded.find(([name]) => name === "click")?.[1] ?? Number.NaN;
  const shownAt = recorded.find(([name]) => name === "overlay+")?.[1] ?? Number.NaN;
  expect(shownAt - clickedAt).toBeGreaterThanOrEqual(OVERLAY_DELAY_MS);
  expect(shownAt - clickedAt).toBeLessThan(1500);

  expect(await page.locator(MESSAGE).innerText()).toBe(OVERLAY_TEXT);
  const dialog = page.getByRole("dialog", { name: "데이터를 불러오는 중입니다." });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription(/잠시만 기다려주세요\s+취소 버튼을 누르거나, esc로 취소 할 수 있습니다\./);

  const overlay = page.locator(OVERLAY);
  await expect(overlay).toHaveCSS("background-color", "rgba(0, 0, 0, 0.8)");
  expect(await overlay.boundingBox()).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  for (const selector of ['[data-slot="top-bar"]', '[data-slot="left-rail"]', FILTER, KPI_ROW, `${BODY_ROW}:first-child`, RANKING]) {
    expect(await overlayIsOnTopAt(page, selector), selector).toBe(true);
  }
  expect(Number(await overlay.evaluate((element) => getComputedStyle(element).zIndex))).toBe(60);
  await expect(cancelButton(page)).toBeFocused();

  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await expect(searchButton(page)).toBeFocused();
  await expect(page.locator(BODY_ROW)).toHaveCount(10);
});

test("Esc로 취소하면 List, Page 번호, Sort, 고른 Row, 추이, 순위는 검색 전 그대로이고 Input은 바꾼 값이며 늦게 온 Response는 버려지고 다시 검색하면 Input 값으로 조회됨", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 4, 10, 23, 57, 0));
  await openWithLatency(page, { searchMs: 1200, ignoreAbort: true });
  await waitForBody(page);
  await page.locator(PAGES).nth(2).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await page.locator(SORT_BUTTONS).nth(1).click();
  await expect(page.locator(`${BODY_ROW} [data-slot="alarm-severity"]`).first()).toHaveText("CRIT", { timeout: 5000 });
  await page.locator(CHECKBOXES).nth(0).click();
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 1건");
  const before = await rowTexts(page);
  expect(before).toHaveLength(10);
  await expect(lastDate(page)).toHaveText("05-10");
  await expect(page.locator(RANK_ROW).first()).toHaveAttribute("title", "누르면 이상 감지 내역 (2026-05-10)");

  await page.clock.setFixedTime(new Date(2026, 4, 11, 0, 3, 0));
  await page.locator(SELECTS).nth(0).click();
  await pickOption(page, "신규");
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(searchButton(page)).toBeFocused();
  expect(await rowTexts(page)).toEqual(before);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await expect(page.locator(SORT_BUTTONS).nth(1)).toHaveAttribute("data-direction", "desc");
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 1건");
  await expect(page.locator(SELECTS).nth(0)).toHaveText("신규");
  await expect(lastDate(page)).toHaveText("05-10");
  await expect(page.locator(RANK_ROW).first()).toHaveAttribute("title", "누르면 이상 감지 내역 (2026-05-10)");

  await page.waitForTimeout(1600);
  expect(await rowTexts(page)).toEqual(before);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await expect(lastDate(page)).toHaveText("05-10");
  await expect(page.locator(RANK_ROW).first()).toHaveAttribute("title", "누르면 이상 감지 내역 (2026-05-10)");
  await expect(page.getByText("알람/이벤트를 불러오지 못했습니다.")).toHaveCount(0);
  await expect(page.locator('[data-slot="toast-viewport"] [data-tone]')).toHaveCount(0);

  await searchButton(page).click();
  await waitForSearchDone(page);
  await expect(page.locator(BODY_ROW)).toHaveCount(2);
  expect(await statusTexts(page)).toEqual(["신규", "신규"]);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
  await expect(page.locator(SORT_BUTTONS).nth(1)).toHaveAttribute("data-direction", "desc");
  await expect(page.locator(BULK_BAR)).toHaveCount(0);
  await expect(lastDate(page)).toHaveText("05-11");
  await expect(page.locator(RANK_ROW).first()).toHaveAttribute("title", "누르면 이상 감지 내역 (2026-05-11)");
});

test("취소 Button, 초기화, 빈 상태의 Filter 초기화에서 Overlay를 띄우고 취소하면 List는 그대로이고 Input은 초기화한 값이며 Focus는 누른 Button에 남음", async ({ page }) => {
  await openWithLatency(page, { searchMs: 1200 });
  await waitForBody(page);

  await page.locator(SELECTS).nth(2).click();
  await pickOption(page, "TCMS");
  await searchButton(page).click();
  await waitForSearchDone(page);
  await expect(page.locator(BODY_ROW)).toHaveCount(2);
  const filtered = await rowTexts(page);

  await resetButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await cancelButton(page).click();
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(resetButton(page)).toBeFocused();
  expect(await rowTexts(page)).toEqual(filtered);
  await expect(page.locator(SELECTS)).toHaveText(["상태 (전체)", "심각도 (전체)", "장치 (전체)"]);
  await page.waitForTimeout(1500);
  expect(await rowTexts(page)).toEqual(filtered);

  await page.locator(SELECTS).nth(0).click();
  await pickOption(page, "신규");
  await page.locator(SELECTS).nth(1).click();
  await pickOption(page, "CRIT");
  await searchButton(page).click();
  await waitForSearchDone(page);
  await expect(page.locator(EMPTY_STATE)).toBeVisible();
  const emptyReset = page.locator(EMPTY_STATE).getByRole("button", { name: "필터 초기화", exact: true });
  await emptyReset.click();
  await expect(page.locator(POPUP)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(emptyReset).toBeFocused();
  await expect(page.locator(BODY_ROW)).toHaveCount(0);
  await expect(page.locator(SELECTS)).toHaveText(["상태 (전체)", "심각도 (전체)", "장치 (전체)"]);

  await searchButton(page).click();
  await waitForSearchDone(page);
  await expect(page.locator(BODY_ROW)).toHaveCount(10);
  await expect(page.locator(EMPTY_STATE)).toHaveCount(0);
});

test("0.3초 안에 오는 Response, Page 넘기기, Sort, 일괄 확인, 처리 저장에는 Overlay를 띄우지 않고 늦으면 옅은 잠금만 적용됨", async ({ page }) => {
  test.setTimeout(60_000);
  await openWithLatency(page, { searchMs: 100 });
  await waitForBody(page);
  await clearMarks(page);
  for (const button of [searchButton(page), resetButton(page)]) {
    await button.click();
    await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  }
  expect(await overlayMarks(page)).toEqual([]);

  await setLatency(page, { searchMs: 3000 });
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  expect(await overlayMarks(page)).toEqual([]);
  expect(await waitLookCounts(page)).toEqual([10, 0, 0, 0]);
  await expect(page.locator(LOCKED_ROW)).toHaveCount(0, { timeout: 10_000 });
  await page.locator(SORT_BUTTONS).nth(1).click();
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  expect(await overlayMarks(page)).toEqual([]);
  expect(await waitLookCounts(page)).toEqual([10, 0, 0, 0]);
  await expect(page.locator(`${BODY_ROW} [data-slot="alarm-severity"]`).first()).toHaveText("CRIT", { timeout: 10_000 });
  await expect(page.locator(LOCKED_ROW)).toHaveCount(0);

  await page.locator(CHECKBOXES).nth(0).click();
  await bulkButton(page, "일괄 확인").click();
  await expect(page.getByText("1건을 확인 처리했습니다.")).toBeVisible();
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  expect(await overlayMarks(page)).toEqual([]);
  expect((await waitLookCounts(page)).map((count) => count > 0)).toEqual([true, true, true, true]);
  await expect.poll(() => waitLookCounts(page), { timeout: 10_000 }).toEqual([0, 0, 0, 0]);
  await rowButton(page, 1, "처리").click();
  await expect(page.locator(PROCESS)).toBeVisible();
  await page.locator(PROCESS).getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("알람을 저장했습니다.")).toBeVisible();
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  expect(await overlayMarks(page)).toEqual([]);
  expect((await waitLookCounts(page)).map((count) => count > 0)).toEqual([true, true, true, true]);
  await expect.poll(() => waitLookCounts(page), { timeout: 10_000 }).toEqual([0, 0, 0, 0]);
});

test("Page 넘기기와 Sort에서 0.3초 넘게 기다리면 워크List Row만 옅게 잠기고 Page 번호, Sort, 조건 Row는 그대로이며 Response가 오면 잠금이 풀림", async ({ page }) => {
  test.setTimeout(60_000);
  await openWithLatency(page, { searchMs: 8000 });
  await waitForBody(page);
  await page.locator(CHECKBOXES).nth(0).click();
  await expect(page.locator(BULK_LABEL)).toHaveText("선택 1건");
  const firstPage = await rowTexts(page);
  await clearMarks(page);
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await expect(page.locator(LOCKED_ROW)).toHaveCount(10);
  for (const name of ["일괄 확인", "담당자 지정"]) await expect(bulkButton(page, name)).toHaveCSS("opacity", "0.5");
  const look = await lockLook(page);
  const recorded = await marks(page);
  const lockedAfter = markAt(recorded, "worklist+") - markAt(recorded, "click");
  expect(lockedAfter).toBeGreaterThanOrEqual(OVERLAY_DELAY_MS);
  expect(lockedAfter).toBeLessThan(8000);

  expect(look.rowOpacity).toEqual(Array(10).fill("0.5"));
  expect(look.rowPointerEvents).toEqual(Array(10).fill("none"));
  expect(look.worklistBusy).toBe("true");
  expect(look.worklistKept).toEqual([1, 1, 1]);
  expect(look.rowCheckboxLocked).toEqual(Array(10).fill("true"));
  expect(look.processLocked).toEqual(Array(10).fill("true"));
  expect(look.deleteLocked).toEqual(Array(10).fill("true"));
  expect(look.rowControlOpacity).toEqual([0.5, 0.5, 0.5]);
  expect(look.headerCheckbox).toEqual(["true", "0.5"]);
  expect(look.bulkButtons).toEqual([
    ["일괄 확인", "true", "0.5"],
    ["담당자 지정", "true", "0.5"],
  ]);
  expect(look.freeControls.length).toBeGreaterThanOrEqual(12);
  expect(look.freeControls.filter(([, isLocked]) => isLocked)).toEqual([]);
  expect([look.kpiBusy, look.trendBusy, look.rankBusy]).toEqual([null, null, null]);
  expect(look.kpiDimmed.every((value) => value === 1)).toBe(true);
  expect(look.rankLocked.every((value) => value === null)).toBe(true);
  expect(await rowTexts(page)).toEqual(firstPage);

  const headerCheckbox = page.locator(`${WORKLIST} thead [data-slot="checkbox"]`);
  await page.locator(CHECKBOXES).nth(1).click({ force: true });
  await headerCheckbox.click({ force: true });
  await rowButton(page, 1, "처리").click({ force: true });
  await bulkButton(page, "일괄 확인").click({ force: true });
  await rowButton(page, 2, "삭제").focus();
  await page.keyboard.press("Enter");
  await rowButton(page, 3, "처리").focus();
  await page.keyboard.press("Enter");
  await bulkButton(page, "담당자 지정").focus();
  await page.keyboard.press("Enter");
  expect(await waitLookCounts(page)).toEqual([10, 0, 0, 0]);
  await expect(page.locator(BULK_LABEL)).toHaveText("선택 1건");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.locator(TOASTS)).toHaveCount(0);

  await expect(page.locator(LOCKED_ROW)).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await expect(page.locator(BODY_ROW).first()).toHaveCSS("opacity", "1");
  await expect(page.locator(`${WORKLIST} [data-slot="table"]`)).not.toHaveAttribute("aria-busy", "true");
  await expect(rowButton(page, 0, "처리")).toBeEnabled();

  await setLatency(page, { searchMs: 4000 });
  await clearMarks(page);
  await page.locator(SORT_BUTTONS).nth(1).click();
  await expect(page.locator(LOCKED_ROW)).toHaveCount(10);
  const sorted = await marks(page);
  expect(markAt(sorted, "worklist+") - markAt(sorted, "click")).toBeGreaterThanOrEqual(OVERLAY_DELAY_MS);
  expect(await waitLookCounts(page)).toEqual([10, 0, 0, 0]);
  expect(await rowTexts(page)).toEqual(firstPage);
  await expect(page.locator(LOCKED_ROW)).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(`${BODY_ROW} [data-slot="alarm-severity"]`).first()).toHaveText("CRIT");
  expect(await waitLookMarks(page)).toEqual(["worklist+", "worklist-"]);
  expect(await overlayMarks(page)).toEqual([]);
});

test("기다리는 중 다른 Page 이동이나 Sort를 또 Click하면 앞 Request는 버려지고, 끊어도 늦게 온 앞 Response는 반영되지 않으며 잠금은 마지막 Response까지 이어짐", async ({ page }) => {
  test.setTimeout(60_000);
  await openWithLatency(page, { searchMs: 3000, ignoreAbort: true });
  await waitForBody(page);
  const firstPage = await rowTexts(page);
  const initialFirst = await page.locator(BODY_ROW).first().textContent();
  await clearMarks(page);
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(LOCKED_ROW)).toHaveCount(10);
  await page.locator(SORT_BUTTONS).nth(1).click();
  await expect(page.locator(SORT_BUTTONS).nth(1)).toHaveAttribute("data-direction", "desc");
  await page.locator(SORT_BUTTONS).nth(1).click();
  await expect(page.locator(SORT_BUTTONS).nth(1)).toHaveAttribute("data-direction", "asc");
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await expect(page.locator(LOCKED_ROW)).toHaveCount(10);
  expect(await rowTexts(page)).toEqual(firstPage);
  await expect(page.locator(LOCKED_ROW)).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator(`${BODY_ROW} [data-slot="alarm-severity"]`).first()).toHaveText("LOW");
  const ascending = await rowTexts(page);
  const ascendingFirst = await page.locator(BODY_ROW).first().textContent();
  expect(await waitLookMarks(page)).toEqual(["worklist+", "worklist-"]);
  const recorded = await marks(page);
  const clicks = recorded.filter(([name]) => name === "click").map(([, at]) => at);
  expect(clicks).toHaveLength(3);
  expect(markAt(recorded, "worklist-") - clicks[2]).toBeGreaterThanOrEqual(3000);

  const seen = await firstRowTexts(page);
  await setLatency(page, { searchMs: 100 });
  await page.locator(SORT_BUTTONS).nth(1).click();
  await expect(page.locator(`${BODY_ROW} [data-slot="alarm-severity"]`).first()).toHaveText("CRIT");
  const descendingFirst = await page.locator(BODY_ROW).first().textContent();
  expect(seen).toEqual([initialFirst, ascendingFirst]);
  expect(seen).not.toContain(descendingFirst);
  expect(ascending).not.toEqual(firstPage);
  await expect(page.locator(TOASTS)).toHaveCount(0);
});

test("처리 저장 뒤 다시 받을 때 0.3초 넘으면 KPI 값, 추이, 순위, List가 옅게 잠기고(Layout과 제목은 그대로) 순위 Row Click이 막히며 List가 먼저 오면 List만 풀림", async ({ page }) => {
  test.setTimeout(60_000);
  await openWithLatency(page, { searchMs: 8000 });
  await waitForBody(page);
  const rankCount = await page.locator(RANK_ROW).count();
  expect(rankCount).toBeGreaterThan(0);
  await rowButton(page, 1, "처리").click();
  await expect(page.locator(PROCESS)).toBeVisible();
  await clearMarks(page);
  await page.locator(PROCESS).getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("알람을 저장했습니다.")).toBeVisible();
  await expect.poll(() => waitLookCounts(page)).toEqual([10, 1, 1, rankCount]);
  const look = await lockLook(page);
  const recorded = await marks(page);
  for (const [name] of WAIT_LOOKS) {
    expect(markAt(recorded, `${name}+`) - markAt(recorded, "click"), name).toBeGreaterThanOrEqual(OVERLAY_DELAY_MS);
  }

  expect(look.kpiBusy).toBe("true");
  expect(look.kpiKept).toEqual(Array(15).fill(1));
  expect(look.kpiDimmed).toEqual(Array(10).fill(0.5));
  expect(look.trendBusy).toBe("true");
  expect(look.trendKept).toEqual([1, 1, 1, 1]);
  expect(look.trendDimmed).toEqual([0.5, 0.5, 0.5]);
  expect(look.rankBusy).toBe("true");
  expect(look.rankLocked).toEqual(Array(rankCount).fill("true"));
  expect(look.rankDimmed).toEqual(Array(rankCount).fill(0.5));
  expect(look.rankPointerEvents).toEqual(Array(rankCount).fill("none"));
  expect(look.rankKept).toEqual([1, 1, 1]);
  expect(look.rowOpacity).toEqual(Array(10).fill("0.5"));
  expect(look.processLocked).toEqual(Array(10).fill("true"));
  expect(await overlayMarks(page)).toEqual([]);

  await page.locator(RANK_ROW).first().click({ force: true });
  await page.locator(RANK_ROW).nth(1).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press(" ");
  await page.waitForTimeout(OVERLAY_DELAY_MS);
  expect(await waitLookCounts(page)).toEqual([10, 1, 1, rankCount]);
  await expect(page).toHaveURL(new RegExp(`${ALARMS_PATH}$`));

  await setLatency(page, { searchMs: 200 });
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(LOCKED_ROW)).toHaveCount(0);
  expect(await waitLookCounts(page)).toEqual([0, 1, 1, rankCount]);
  await expect.poll(() => waitLookCounts(page), { timeout: 15_000 }).toEqual([0, 0, 0, 0]);
  const settled = await lockLook(page);
  expect(settled.kpiDimmed.every((value) => value === 1)).toBe(true);
  expect(settled.trendDimmed).toEqual([1, 1, 1]);
  expect(settled.rankDimmed.every((value) => value === 1)).toBe(true);
  expect([settled.kpiBusy, settled.trendBusy, settled.rankBusy, settled.worklistBusy]).toEqual([null, null, null, null]);
  const unlocked = await waitLookMarks(page);
  expect(unlocked.indexOf("worklist-")).toBeLessThan(unlocked.indexOf("kpi-"));
  await page.locator(RANK_ROW).first().click();
  await expect(page).toHaveURL(/\/info\/anomaly$/);
});

test("일괄 확인 뒤 다시 받을 때 KPI, 추이, 순위가 먼저 오면 그 Card만 풀리고 List는 자기 Response까지 잠겨 있음", async ({ page }) => {
  test.setTimeout(60_000);
  await openWithLatency(page, { searchMs: 3000 });
  await waitForBody(page);
  const rankCount = await page.locator(RANK_ROW).count();
  await page.locator(CHECKBOXES).nth(0).click();
  await clearMarks(page);
  await bulkButton(page, "일괄 확인").click();
  await expect(page.getByText("1건을 확인 처리했습니다.")).toBeVisible();
  await expect.poll(() => waitLookCounts(page)).toEqual([10, 1, 1, rankCount]);
  await setLatency(page, { searchMs: 8000 });
  await page.locator(PAGES).nth(1).click();
  await expect.poll(() => waitLookCounts(page), { timeout: 10_000 }).toEqual([10, 0, 0, 0]);
  await expect(page.locator(BODY_ROW).first()).toHaveCSS("opacity", "0.5");
  await expect(page.locator(RANK_ROW).first()).toHaveCSS("opacity", "1");
  await expect(page.locator(LOCKED_ROW)).toHaveCount(0, { timeout: 15_000 });
  const order = await waitLookMarks(page);
  expect(order.slice(0, 4).sort()).toEqual(["kpi+", "ranking+", "trend+", "worklist+"]);
  expect(order.slice(4, 7).sort()).toEqual(["kpi-", "ranking-", "trend-"]);
  expect(order.slice(7)).toEqual(["worklist-"]);
  expect(await overlayMarks(page)).toEqual([]);
});

test("담당자 지정과 삭제 뒤 다시 받을 때도 0.3초 넘으면 Card 네 개가 옅게 잠기고 Response가 오면 풀리며 Overlay는 없음", async ({ page }) => {
  test.setTimeout(60_000);
  await openWithLatency(page, { searchMs: 3000 });
  await waitForBody(page);
  const rankCount = await page.locator(RANK_ROW).count();
  await clearMarks(page);
  await page.locator(CHECKBOXES).nth(0).click();
  await bulkButton(page, "담당자 지정").click();
  const assign = page.locator('[data-modal="assignee-bulk"]');
  await expect(assign).toBeVisible();
  await assign.locator('[data-slot="select-trigger"]').click();
  await page.locator('[data-slot="select-content"][data-open] [data-slot="select-item"]').filter({ hasText: "김정비" }).first().click();
  await assign.locator('[data-slot="dialog-footer"]').getByRole("button", { name: "지정", exact: true }).click();
  await expect(page.getByText("1건에 담당자를 지정했습니다.")).toBeVisible();
  await expect.poll(() => waitLookCounts(page)).toEqual([10, 1, 1, rankCount]);
  await expect.poll(() => waitLookCounts(page), { timeout: 10_000 }).toEqual([0, 0, 0, 0]);
  const rowCount = await page.locator(BODY_ROW).count();
  await rowButton(page, 1, "삭제").click();
  await page.locator('[data-dialog="alarm-delete"] [data-slot="alert-dialog-action"]').click();
  await expect(page.getByText("알람을 삭제했습니다.")).toBeVisible();
  await expect.poll(() => waitLookCounts(page)).toEqual([rowCount, 1, 1, rankCount]);
  await expect.poll(() => waitLookCounts(page), { timeout: 10_000 }).toEqual([0, 0, 0, 0]);
  expect(await overlayMarks(page)).toEqual([]);
});

test("0.3초 안에 오는 Response에는 옅은 잠금도 없음, 한 번 오래 기다린 뒤의 짧은 Page 넘기기, Sort, 처리 저장, 검색, 초기화에서 확인", async ({ page }) => {
  await openWithLatency(page, { searchMs: 2000 });
  await waitForBody(page);
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(LOCKED_ROW)).toHaveCount(10);
  await expect(page.locator(LOCKED_ROW)).toHaveCount(0, { timeout: 8000 });
  await setLatency(page, { searchMs: 150 });
  await clearMarks(page);
  await page.locator(PAGES, { hasText: /^3$/ }).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  await page.locator(SORT_BUTTONS).nth(1).click();
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  await rowButton(page, 1, "처리").click();
  await expect(page.locator(PROCESS)).toBeVisible();
  await page.locator(PROCESS).getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("알람을 저장했습니다.")).toBeVisible();
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  for (const button of [searchButton(page), resetButton(page)]) {
    await button.click();
    await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  }
  expect(await waitLookMarks(page)).toEqual([]);
  expect(await overlayMarks(page)).toEqual([]);
  await expect(page.locator(`${BODY_ROW} [data-slot="alarm-severity"]`).first()).toHaveText("CRIT");
});

test("검색과 초기화에서 Overlay를 취소하거나 Response가 오면 Card의 옅은 잠금이 남지 않고 끊은 늦은 Response가 와도 그대로임", async ({ page }) => {
  await openWithLatency(page, { searchMs: 1200, ignoreAbort: true });
  await waitForBody(page);
  const before = await rowTexts(page);
  for (const button of [searchButton(page), resetButton(page)]) {
    await button.click();
    await expect(page.locator(POPUP)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(POPUP)).toHaveCount(0);
    expect(await waitLookCounts(page)).toEqual([0, 0, 0, 0]);
    await page.waitForTimeout(1500);
    expect(await waitLookCounts(page)).toEqual([0, 0, 0, 0]);
    expect(await rowTexts(page)).toEqual(before);
    await button.click();
    await waitForSearchDone(page);
    expect(await waitLookCounts(page)).toEqual([0, 0, 0, 0]);
  }
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
});

test("Page 넘기기 중 List 조회가 실패하면 잠금과 Overlay 없이 불러오지 못했다는 Text로 바뀜", async ({ page }) => {
  await openWithLatency(page, { searchMs: 2500 });
  await waitForBody(page);
  await setLatency(page, { searchMs: 2500, failNames: ["alarmWorklist"] });
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(LOCKED_ROW)).toHaveCount(10);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(1);
  const alert = page.getByRole("alert").filter({ hasText: FAILED_TEXT });
  await expect(alert).toBeVisible({ timeout: 10_000 });
  expect(await waitLookCounts(page)).toEqual([0, 0, 0, 0]);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await expect(page.locator(POPUP)).toHaveCount(0);
  expect(await overlayMarks(page)).toEqual([]);
  for (const selector of ['p[role="alert"]', '[data-slot="left-rail"]']) {
    expect(
      await page.evaluate((target) => {
        const element = document.querySelector(target);
        if (element === null) return false;
        const rect = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      }, selector),
      selector,
    ).toBe(true);
  }
});

test("검색을 취소한 뒤 늦게 실패로 끝난 Response는 버려지고 List, 추이, 순위, 잠금은 검색 전 그대로임", async ({ page }) => {
  await openWithLatency(page, { searchMs: 1200, ignoreAbort: true });
  await waitForBody(page);
  const before = await rowTexts(page);
  const rankTitle = await page.locator(RANK_ROW).first().getAttribute("title");
  await setLatency(page, { searchMs: 1200, ignoreAbort: true, failNames: ALARM_QUERY_NAMES });
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);
  await page.waitForTimeout(1600);
  await expect(page.getByText(FAILED_TEXT)).toHaveCount(0);
  expect(await rowTexts(page)).toEqual(before);
  await expect(page.locator(RANK_ROW).first()).toHaveAttribute("title", rankTitle ?? "");
  expect(await waitLookCounts(page)).toEqual([0, 0, 0, 0]);
  await expect(page.locator(TOASTS)).toHaveCount(0);
  await setLatency(page, { searchMs: 400 });
  await searchButton(page).click();
  await waitForSearchDone(page);
  await expect(page.locator(BODY_ROW)).toHaveCount(10);
  await expect(page.getByText(FAILED_TEXT)).toHaveCount(0);
});

test("Mock에서 처음 들어올 때와 검색의 지연을 구분하고, 끊는 신호를 받으면 기다림을 멈추고 AbortError를 내며 Modal 조회 Request는 바로 처리됨", async () => {
  const host = globalThis as { cbmMockLatency?: Latency };
  host.cbmMockLatency = { entryMs: 50, searchMs: 3000 };
  try {
    const query = {
      status: null,
      severity: null,
      deviceCode: null,
      sort: { key: "occurredAt", direction: "desc" },
      page: 1,
    } as const;
    await fetchAlarmFilterOptions();
    const enteredAt = Date.now();
    await Promise.all([fetchAlarmWorklist(query), fetchAlarmSummary(), fetchAlarmTrend(), fetchAlarmCarRanking()]);
    expect(Date.now() - enteredAt).toBeLessThan(1000);

    const directAt = Date.now();
    await Promise.all([fetchAlarmCreateOptions(), fetchAlarmRules(), fetchAlarmAssignees(), acknowledgeAlarms([])]);
    expect(Date.now() - directAt).toBeLessThan(1000);

    const controller = new AbortController();
    const startedAt = Date.now();
    const pending = Promise.all([
      fetchAlarmWorklist(query, { signal: controller.signal }).then(
        () => "resolved",
        (error: unknown) => (error as { name?: string }).name,
      ),
      fetchAlarmSummary({ signal: controller.signal }).then(
        () => "resolved",
        (error: unknown) => (error as { name?: string }).name,
      ),
    ]);
    setTimeout(() => controller.abort(), 100);
    expect(await pending).toEqual(["AbortError", "AbortError"]);
    expect(Date.now() - startedAt).toBeLessThan(1000);
    await expect(fetchAlarmTrend({ signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    await expect(fetchAlarmCarRanking({ signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });

    host.cbmMockLatency = { searchMs: 100, ignoreAbort: true };
    const ignored = new AbortController();
    const late = fetchAlarmWorklist(query, { signal: ignored.signal });
    ignored.abort();
    await expect(late).resolves.toHaveProperty("pageSize", 20);
  } finally {
    delete host.cbmMockLatency;
  }
});
