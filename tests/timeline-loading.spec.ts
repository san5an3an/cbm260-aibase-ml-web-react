import { expect, test, type Page } from "@playwright/test";
import type { AnomalyTimelineQuery } from "../src/domain/timeline";
import { fetchAnomalyTimeline, fetchAnomalyTimelineOptions } from "../src/services/timeline";
import { color, isoDaysAgo, pickOption } from "./helpers/measure";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const TIMELINE_PATH = "/dashboard/timeline";
const SKELETON = '[data-slot="timeline-skeleton"]';
const SHIMMER = `${SKELETON} [data-slot="shimmer-block"]`;
const FILTER_SKELETON = '[data-slot="timeline-filter-bar-skeleton"]';
const TREND_SKELETON = '[data-slot="daily-anomaly-trend-card-skeleton"]';
const DETAIL_SKELETON = '[data-slot="daily-detail-card-skeleton"]';
const FILTER = '[data-slot="timeline-filter-bar"]';
const TREND = '[data-slot="daily-anomaly-trend-card"]';
const DETAIL = '[data-slot="daily-detail-card"]';
const BAR = '[data-slot="chart-bar"]';
const BODY_ROW = `${DETAIL} tbody [data-slot="table-row"]`;
const FILTER_CONTROLS = `${FILTER} > button`;
const TRIGGERS = `${FILTER} [data-slot="select-trigger"]`;
const RANGE = '[data-slot="daily-detail-range"]';
const PAGES = `${DETAIL} [data-slot="pagination-page"]`;
const CURRENT_PAGE = `${PAGES}[aria-current="page"]`;
const SELECTED_ROW = `${BODY_ROW}[aria-selected="true"]`;
const OVERLAY = '[data-overlay="searching"]';
const POPUP = '[data-slot="searching-overlay"]';
const MESSAGE = '[data-slot="searching-overlay-message"]';
const OVERLAY_TEXT = "데이터를 불러오는 중입니다.\n잠시만 기다려주세요\n\n취소 버튼을 누르거나, esc로 취소 할 수 있습니다.";
const FAILED_TEXT = "이상 타임라인을 불러오지 못했습니다.";
const TIMELINE_QUERY_NAME = "anomalyTimeline";
const OVERLAY_DELAY_MS = 300;
const ENTRY_MS = 3000;
const SEARCH_MS = 3000;
const SETTLE_TIMEOUT_MS = 10_000;

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
  await page.addInitScript((value) => {
    const host = window as unknown as {
      cbmMockLatency: Latency;
      loadingMarks: [string, number][];
    };
    host.cbmMockLatency = value;
    host.loadingMarks = [];
    const watched: [string, string][] = [
      ["overlay", '[data-slot="searching-overlay"]'],
      ["skeleton", '[data-slot="timeline-skeleton"]'],
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
  await page.goto(TIMELINE_PATH);
}

async function clearMarks(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { loadingMarks: [string, number][] }).loadingMarks.length = 0;
  });
}

async function marks(page: Page): Promise<[string, number][]> {
  return page.evaluate(() => [...(window as unknown as { loadingMarks: [string, number][] }).loadingMarks]);
}

async function rectsOf(page: Page, selector: string): Promise<Rect[]> {
  return page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  );
}

function expectSameRects(actual: Rect[], expected: Rect[], label: string) {
  expect(actual.length, label).toBe(expected.length);
  for (const [index, rect] of actual.entries()) {
    for (const key of ["x", "y", "width", "height"] as const) {
      expect(Math.abs(rect[key] - expected[index][key]), `${label} ${index} ${key}`).toBeLessThanOrEqual(0.5);
    }
  }
}

const queryButton = (page: Page) => page.getByRole("button", { name: "조회", exact: true });
const resetButton = (page: Page) => page.getByRole("button", { name: "초기화", exact: true });
const cancelButton = (page: Page) => page.locator(POPUP).getByRole("button", { name: "취소", exact: true });

async function setLatency(page: Page, latency: Latency) {
  await page.evaluate((value) => {
    (window as unknown as { cbmMockLatency: Latency }).cbmMockLatency = value;
  }, latency);
}

async function overlayMarks(page: Page): Promise<[string, number][]> {
  return (await marks(page)).filter(([name]) => name.startsWith("overlay"));
}

async function pickFilter(page: Page, index: number, name: string) {
  await page.locator(TRIGGERS).nth(index).click();
  await pickOption(page, name);
  await expect(page.locator(TRIGGERS).nth(index)).toHaveText(name);
}

async function rowTexts(page: Page): Promise<string[]> {
  return page.locator(BODY_ROW).evaluateAll((rows) =>
    rows.map((row) => [...row.querySelectorAll("td")].map((cell) => cell.textContent).join(" | ")),
  );
}

async function expectedRows(query: AnomalyTimelineQuery): Promise<string[]> {
  const { points } = await fetchAnomalyTimeline(query);
  return [...points]
    .reverse()
    .slice(0, 5)
    .map((point) =>
      [
        point.date,
        point.inferenceCount,
        point.anomalyWindowCount,
        `${point.averageRatePercent.toFixed(2)}%`,
        `${point.maxRatePercent.toFixed(2)}%`,
      ].join(" | "),
    );
}

async function shownState(page: Page) {
  return {
    bars: await rectsOf(page, BAR),
    rows: await rowTexts(page),
    selected: await page.locator(SELECTED_ROW).allTextContents(),
    page: await page.locator(CURRENT_PAGE).textContent(),
    range: await page.locator(RANGE).textContent(),
  };
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

async function lockState(page: Page) {
  return page.evaluate(() => ({
    inert: [...document.querySelectorAll("[inert]")].map((element) => element.getAttribute("data-slot")),
    bodyOverflow: getComputedStyle(document.body).overflow,
    hiddenRoots: [...document.body.children].filter((element) => element.getAttribute("aria-hidden") === "true").length,
  }));
}

async function expectNotTrapped(page: Page, unlocked: Awaited<ReturnType<typeof lockState>>) {
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  for (const selector of ['[data-slot="top-bar"]', '[data-slot="left-rail"]']) {
    const isOwnTop = await page.evaluate((target) => {
      const element = document.querySelector(target);
      if (element === null) return false;
      const rect = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    }, selector);
    expect(isOwnTop, selector).toBe(true);
  }
  expect(await lockState(page)).toEqual(unlocked);
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`처음 들어올 때 이상 타임라인 배치의 Skeleton이 표시되고 조회가 끝나면 같은 위치의 본문으로 바뀜 (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await openWithLatency(page, { entryMs: ENTRY_MS, searchMs: SEARCH_MS }, viewport.width, viewport.height);
    const skeleton = page.locator(SKELETON);
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute("role", "status");
    await expect(skeleton).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("status").filter({ hasText: "이상 타임라인 화면을 불러오는 중입니다." })).toHaveCount(1);
    await expect(skeleton.locator(".sr-only")).toHaveCSS("position", "absolute");
    await expect(skeleton.locator(".sr-only")).toHaveText("이상 타임라인 화면을 불러오는 중입니다.");
    for (const block of await page.locator(SHIMMER).all()) await expect(block).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(`${FILTER_SKELETON} [data-slot="shimmer-block"]`)).toHaveCount(5);
    await expect(page.locator(`${TREND_SKELETON} [data-slot="shimmer-block"]`)).toHaveCount(7);
    await expect(page.locator(`${DETAIL_SKELETON} .grid`)).toHaveCount(5);
    await expect(page.locator(`${DETAIL_SKELETON} [data-slot="shimmer-block"]`)).toHaveCount(3 + 5 * 5 + 1);
    const chartBlock = page.locator(`${TREND_SKELETON} > [data-slot="shimmer-block"]`);
    const muted = await color(page, "var(--muted)");
    const surfaceLow = await color(page, "var(--surface-low)");
    await expect(chartBlock).toHaveCSS("background-image", `linear-gradient(90deg, ${muted} 0%, ${surfaceLow} 50%, ${muted} 100%)`);
    await expect(chartBlock).toHaveCSS("background-size", "200% 100%");
    await expect(chartBlock).toHaveCSS("border-radius", "10px");
    await expect(page.locator(`${FILTER_SKELETON} [data-slot="shimmer-block"]`).first()).toHaveCSS("border-radius", "6px");
    await expect(chartBlock).toHaveCSS("animation-name", "none");
    const skeletonFrames = await rectsOf(page, `${FILTER_SKELETON}, ${TREND_SKELETON}, ${DETAIL_SKELETON}`);
    const skeletonFilterBlocks = await rectsOf(page, `${FILTER_SKELETON} [data-slot="shimmer-block"]`);
    const skeletonTable = await rectsOf(page, `${DETAIL_SKELETON} > .rounded-lg`);
    const skeletonChart = await rectsOf(page, `${TREND_SKELETON} > [data-slot="shimmer-block"]`);
    const skeletonPagination = await rectsOf(page, `${DETAIL_SKELETON} > [data-slot="shimmer-block"]`);

    await expect(page.locator(BAR).first()).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
    await expect(skeleton).toHaveCount(0);
    expectSameRects(await rectsOf(page, `${FILTER}, ${TREND}, ${DETAIL}`), skeletonFrames, "큰 틀");
    expectSameRects(await rectsOf(page, FILTER_CONTROLS), skeletonFilterBlocks, "조건 줄");
    expectSameRects(await rectsOf(page, `${DETAIL} [data-slot="data-table"]`), skeletonTable, "표 틀");
    expectSameRects(await rectsOf(page, `${TREND} [data-slot="daily-anomaly-bar-chart"]`), skeletonChart, "차트");
    const [pagination] = await rectsOf(page, `${DETAIL} [data-slot="pagination-content"]`);
    expect(Math.abs(pagination.x - skeletonPagination[0].x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(pagination.y - skeletonPagination[0].y)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(pagination.width - skeletonPagination[0].width)).toBeLessThanOrEqual(0.5);
    const recorded = await marks(page);
    const shownAt = recorded.find(([name]) => name === "skeleton+")?.[1] ?? 0;
    const hiddenAt = recorded.find(([name]) => name === "skeleton-")?.[1] ?? 0;
    expect(hiddenAt - shownAt).toBeGreaterThanOrEqual(ENTRY_MS);
  });
}

test("움직임에서 Skeleton의 반짝이는 빛은 1.2초 linear로 반복됨", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openWithLatency(page, { entryMs: 8000 });
  await expect(page.locator(SKELETON)).toBeVisible();
  for (const block of [page.locator(`${FILTER_SKELETON} [data-slot="shimmer-block"]`).first(), page.locator(`${TREND_SKELETON} > [data-slot="shimmer-block"]`)]) {
    await expect(block).toHaveCSS("animation-name", "skeleton-shimmer");
    await expect(block).toHaveCSS("animation-duration", "1.2s");
    await expect(block).toHaveCSS("animation-timing-function", "linear");
    await expect(block).toHaveCSS("animation-iteration-count", "infinite");
  }
});

test("Skeleton의 조건 Row 블록은 옅은 회색 배경보다 한 단계 진한 Color이고, Card 안 블록은 흰 배경용 Color임(라이트, 다크)", async ({ page }) => {
  await openWithLatency(page, { entryMs: 8000 });
  await expect(page.locator(SKELETON)).toBeVisible();
  const bar = page.locator(FILTER_SKELETON);
  const filterBlocks = bar.locator('[data-slot="shimmer-block"]');
  const cardBlocks = page.locator(`${TREND_SKELETON} [data-slot="shimmer-block"], ${DETAIL_SKELETON} [data-slot="shimmer-block"]`);
  await expect(cardBlocks).toHaveCount(7 + 3 + 25 + 1);
  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    const border = await color(page, "var(--border)");
    const muted = await color(page, "var(--muted)");
    const surfaceLow = await color(page, "var(--surface-low)");
    await expect(bar).toHaveCSS("background-color", surfaceLow);
    for (const block of await filterBlocks.all()) {
      await expect(block).toHaveCSS("background-image", `linear-gradient(90deg, ${border} 0%, ${muted} 50%, ${border} 100%)`);
    }
    for (const block of await cardBlocks.all()) {
      await expect(block).toHaveCSS("background-image", `linear-gradient(90deg, ${muted} 0%, ${surfaceLow} 50%, ${muted} 100%)`);
    }
    for (const card of [TREND_SKELETON, DETAIL_SKELETON]) {
      await expect(page.locator(card)).toHaveCSS("background-color", await color(page, "var(--card)"));
    }
  }
});

test("조회에서 0.3초가 지나도 Response가 없으면 머리 Row와 왼쪽 Menu까지 덮는 검정 Overlay, Text, 취소 Button에 Focus가 표시되고, Response가 오면 닫히며 Focus는 조회로 돌아감", async ({ page }) => {
  await openWithLatency(page, { searchMs: SEARCH_MS });
  await expect(page.locator(BAR)).toHaveCount(30);
  await pickFilter(page, 2, "최근 7일");
  await clearMarks(page);
  await queryButton(page).click();
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
  for (const selector of ['[data-slot="top-bar"]', '[data-slot="left-rail"]', FILTER, TREND, `${BODY_ROW}:first-child`]) {
    expect(await overlayIsOnTopAt(page, selector), selector).toBe(true);
  }

  await expect(cancelButton(page)).toBeFocused();
  for (const key of ["Tab", "Tab", "Shift+Tab"] as const) {
    await page.keyboard.press(key);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await page.evaluate((selector) => document.querySelector(selector)?.contains(document.activeElement) ?? false, POPUP)).toBe(true);
  }
  await expect(page.locator(BAR)).toHaveCount(30);
  await expect(page.locator(SKELETON)).toHaveCount(0);

  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: SETTLE_TIMEOUT_MS });
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await expect(queryButton(page)).toBeFocused();
  await expect(page.locator(BAR)).toHaveCount(7);
  await expect(page.locator(RANGE)).toHaveText("최근 7일");
  expect((await marks(page)).filter(([name]) => name.startsWith("skeleton"))).toEqual([]);
});

test("Esc로 취소하면 Chart, Table, 선택한 날, Page 번호는 누르기 전 그대로이고 Input은 바꾼 값을 유지하며, 늦게 온 Response는 버리고 다시 조회하면 Input 값으로 조회함", async ({ page }) => {
  await openWithLatency(page, { searchMs: SEARCH_MS, ignoreAbort: true });
  await expect(page.locator(BAR)).toHaveCount(30);
  await page.locator(PAGES).nth(2).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await page.locator(BODY_ROW).nth(1).click();
  await expect(page.locator(SELECTED_ROW)).toContainText(isoDaysAgo(11));
  const before = await shownState(page);
  expect(before.rows).toHaveLength(5);

  await pickFilter(page, 0, "ATC");
  await pickFilter(page, 1, "SVM");
  await pickFilter(page, 2, "최근 7일");
  await queryButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await expect(queryButton(page)).toBeFocused();
  expect(await shownState(page)).toEqual(before);
  await expect(page.locator(SELECTED_ROW)).toContainText(isoDaysAgo(11));
  await expect(page.locator(TRIGGERS)).toHaveText(["ATC", "SVM", "최근 7일"]);

  await page.waitForTimeout(SEARCH_MS + 400);
  expect(await shownState(page)).toEqual(before);
  await expect(page.getByText(FAILED_TEXT)).toHaveCount(0);
  await expect(page.locator(SKELETON)).toHaveCount(0);

  await queryButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: SETTLE_TIMEOUT_MS });
  await expect(page.locator(BAR)).toHaveCount(7);
  await expect(page.locator(RANGE)).toHaveText("최근 7일");
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
  const expected = await expectedRows({ deviceCode: "ATC", modelCode: "SVM", days: 7 });
  expect(expected).not.toEqual(await expectedRows({ deviceCode: null, modelCode: null, days: 7 }));
  expect(await rowTexts(page)).toEqual(expected);
});

test("취소 Button과 초기화에서 이미 처음 조건이어도 Overlay가 표시되고, 취소하면 Chart, Table, 선택한 날, Page는 그대로이며 Input은 초기화한 값이고 Focus는 초기화로 돌아감", async ({ page }) => {
  await openWithLatency(page, { searchMs: SEARCH_MS });
  await expect(page.locator(BAR)).toHaveCount(30);
  await page.locator(PAGES).nth(1).click();
  await page.locator(BODY_ROW).nth(3).click();
  await expect(page.locator(SELECTED_ROW)).toContainText(isoDaysAgo(8));
  const initial = await shownState(page);

  await resetButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await cancelButton(page).click();
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(resetButton(page)).toBeFocused();
  expect(await shownState(page)).toEqual(initial);
  await expect(page.locator(SELECTED_ROW)).toContainText(isoDaysAgo(8));

  await setLatency(page, { searchMs: 50 });
  await pickFilter(page, 0, "ATC");
  await pickFilter(page, 2, "최근 7일");
  await queryButton(page).click();
  await expect(page.locator(BAR)).toHaveCount(7);
  await page.locator(PAGES).nth(1).click();
  await page.locator(BODY_ROW).nth(0).click();
  await expect(page.locator(SELECTED_ROW)).toContainText(isoDaysAgo(5));
  const before = await shownState(page);
  expect(before.range).toBe("최근 7일");

  await setLatency(page, { searchMs: SEARCH_MS });
  await resetButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(resetButton(page)).toBeFocused();
  expect(await shownState(page)).toEqual(before);
  await expect(page.locator(SELECTED_ROW)).toContainText(isoDaysAgo(5));
  await expect(page.locator(TRIGGERS)).toHaveText(["장치 (전체)", "모델 (전체)", "최근 30일"]);

  await queryButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: SETTLE_TIMEOUT_MS });
  await expect(queryButton(page)).toBeFocused();
  await expect(page.locator(BAR)).toHaveCount(30);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
  expect(await rowTexts(page)).toEqual(await expectedRows({ deviceCode: null, modelCode: null, days: 30 }));

  await resetButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: SETTLE_TIMEOUT_MS });
  await expect(resetButton(page)).toBeFocused();
  await expect(page.locator(SELECTED_ROW)).toContainText(isoDaysAgo(2));
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
});

test("취소한 조회와 초기화가 늦게 실패로 끝나도 버리고, 오류 Text 없이 누르기 전 그대로 유지함", async ({ page }) => {
  await openWithLatency(page, { searchMs: SEARCH_MS });
  await expect(page.locator(BAR)).toHaveCount(30);
  const before = await shownState(page);
  await setLatency(page, { searchMs: SEARCH_MS, ignoreAbort: true, failNames: [TIMELINE_QUERY_NAME] });

  await pickFilter(page, 2, "최근 7일");
  await queryButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await cancelButton(page).click();
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(queryButton(page)).toBeFocused();
  await resetButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(resetButton(page)).toBeFocused();

  await page.waitForTimeout(SEARCH_MS + 400);
  await expect(page.locator('[role="alert"]').filter({ hasText: FAILED_TEXT })).toHaveCount(0);
  expect(await shownState(page)).toEqual(before);
  await expect(page.locator(TRIGGERS)).toHaveText(["장치 (전체)", "모델 (전체)", "최근 30일"]);
});

test("조회와 초기화 중 실패하면 실패 Text로 바뀌고 Overlay가 남지 않아 다른 화면으로 옮길 수 있음", async ({ page }) => {
  await openWithLatency(page, { searchMs: SEARCH_MS });
  await expect(page.locator(BAR)).toHaveCount(30);
  const unlocked = await lockState(page);

  await setLatency(page, { searchMs: 1500, failNames: [TIMELINE_QUERY_NAME] });
  await queryButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  expect(await lockState(page)).not.toEqual(unlocked);
  await expect(page.getByRole("alert").filter({ hasText: FAILED_TEXT })).toBeVisible({ timeout: SETTLE_TIMEOUT_MS });
  await expectNotTrapped(page, unlocked);

  await page.goto(TIMELINE_PATH);
  await expect(page.locator(BAR)).toHaveCount(30);
  await setLatency(page, { searchMs: 50, failNames: [TIMELINE_QUERY_NAME] });
  await clearMarks(page);
  await resetButton(page).click();
  await expect(page.getByRole("alert").filter({ hasText: FAILED_TEXT })).toBeVisible();
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  expect(await overlayMarks(page)).toEqual([]);
  await expectNotTrapped(page, unlocked);

  await page.locator('[data-slot="left-rail"] a[href^="/info"]').first().click();
  await expect(page).toHaveURL(/\/info\//);
});

test("0.3초 안에 오는 Response, Page 넘기기, Row 고르기, Chart에서 날 고르기에는 Overlay와 Skeleton을 표시하지 않음", async ({ page }) => {
  await openWithLatency(page, { searchMs: 50 });
  await expect(page.locator(BAR)).toHaveCount(30);
  await clearMarks(page);

  await pickFilter(page, 2, "최근 7일");
  await queryButton(page).click();
  await expect(page.locator(BAR)).toHaveCount(7);
  await expect(page.locator(RANGE)).toHaveText("최근 7일");
  await resetButton(page).click();
  await expect(page.locator(BAR)).toHaveCount(30);
  await expect(page.locator(BODY_ROW)).toHaveCount(5);
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  expect((await marks(page)).filter(([name]) => name !== "click")).toEqual([]);

  await setLatency(page, { searchMs: SEARCH_MS });
  await page.locator(`${DETAIL} [data-slot="pagination-next"]`).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2", { timeout: 1000 });
  await page.locator(BODY_ROW).nth(2).click();
  await expect(page.locator(SELECTED_ROW)).toContainText(isoDaysAgo(7), { timeout: 1000 });
  await page.locator(BAR).nth(6).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("5", { timeout: 1000 });
  await expect(page.locator(SELECTED_ROW)).toContainText(isoDaysAgo(23), { timeout: 1000 });
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  expect((await marks(page)).filter(([name]) => name !== "click")).toEqual([]);
});

test("Mock은 처음 들어올 때와 조회의 지연을 구분하고 중단 신호를 받으면 기다림을 멈추고 AbortError를 내며, 실패로 정한 이름은 지연한 뒤 거부함", async () => {
  const host = globalThis as { cbmMockLatency?: Latency };
  host.cbmMockLatency = { entryMs: 50, searchMs: 3000 };
  try {
    const query = { deviceCode: null, modelCode: null, days: 30 };
    const options = await fetchAnomalyTimelineOptions();
    expect(options.defaultDayCount).toBe(30);
    const enteredAt = Date.now();
    await expect(fetchAnomalyTimeline(query)).resolves.toHaveProperty("days", 30);
    expect(Date.now() - enteredAt).toBeLessThan(1000);

    const controller = new AbortController();
    const startedAt = Date.now();
    const pending = fetchAnomalyTimeline(query, { signal: controller.signal });
    setTimeout(() => controller.abort(), 100);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(Date.now() - startedAt).toBeLessThan(1000);
    await expect(fetchAnomalyTimeline(query, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    await expect(fetchAnomalyTimelineOptions({ signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });

    host.cbmMockLatency = { searchMs: 100, ignoreAbort: true };
    const ignored = new AbortController();
    const late = fetchAnomalyTimeline({ ...query, days: 7 }, { signal: ignored.signal });
    ignored.abort();
    await expect(late).resolves.toHaveProperty("days", 7);

    host.cbmMockLatency = { searchMs: 50, failNames: [TIMELINE_QUERY_NAME] };
    await expect(fetchAnomalyTimeline(query)).rejects.toThrow(`더미 조회 실패: ${TIMELINE_QUERY_NAME}`);
    await expect(fetchAnomalyTimelineOptions()).resolves.toHaveProperty("defaultDayCount", 30);
  } finally {
    delete host.cbmMockLatency;
  }
});
