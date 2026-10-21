import { expect, test, type Page } from "@playwright/test";
import {
  fetchInferenceFilterOptions,
  fetchInferenceJobs,
  fetchInferenceResults,
} from "../src/services/inference";
import { INFERENCE_RESULT_ROW } from "./helpers/inference";
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

const INFERENCE_PATH = "/info/inference";
const SKELETON = '[data-slot="inference-skeleton"]';
const SHIMMER = `${SKELETON} [data-slot="shimmer-block"]`;
const FILTER = '[data-slot="inference-filter-bar"]';
const SELECTS = `${FILTER} [data-slot="select-trigger"]`;
const TRIGGER = `${FILTER} [data-slot="date-range-trigger"]`;
const FILTER_CONTROLS = `${SELECTS}, ${TRIGGER}, ${FILTER} [data-slot="icon-button"], ${FILTER} [data-slot="action-button"]`;
const JOBS = '[data-slot="inference-jobs-card"]';
const JOB_LIST = '[data-slot="inference-job-list"]';
const RESULTS = '[data-slot="inference-results-card"]';
const ROW = INFERENCE_RESULT_ROW;
const CURRENT_PAGE = `${RESULTS} [data-slot="pagination-page"][aria-current="page"]`;
const PAGES = `${RESULTS} [data-slot="pagination-page"]`;
const CSV = `${RESULTS} [data-slot="section-card-header"] [data-slot="action-button"]`;
const PICKER = '[data-slot="popover-content"][data-picker="range"]';
const CALENDAR = `${PICKER} [data-slot="calendar"]`;
const OVERLAY = '[data-overlay="searching"]';
const POPUP = '[data-slot="searching-overlay"]';
const MESSAGE = '[data-slot="searching-overlay-message"]';
const SPINNER = `${POPUP} [data-slot="spinner"]`;
const OVERLAY_TEXT = "데이터를 불러오는 중입니다.\n잠시만 기다려주세요\n\n취소 버튼을 누르거나, esc로 취소 할 수 있습니다.";
const OVERLAY_DELAY_MS = 300;
const SLOW_SEARCH_MS = 2500;
const FAILURE_TEXT = "추론 화면을 불러오지 못했습니다.";
const RESULTS_QUERY = "inferenceResults";
const SEARCH_QUERIES = ["inferenceResults", "inferenceJobs"];
const JOB = `${JOB_LIST} [data-slot="job-card"]`;
const SHELL = '[data-slot="monitoring-shell"]';
const LEFT_RAIL = '[data-slot="left-rail"]';
const RAIL_LINK = '[data-slot="rail-link"][title="CBM 모델"]';

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
      ["skeleton", '[data-slot="inference-skeleton"]'],
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
  await page.goto(INFERENCE_PATH);
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

async function waitForSettledRows(page: Page) {
  await expect(page.locator(ROW).first()).toBeVisible();
  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator(`${JOB_LIST} [data-slot="job-card"][aria-disabled="true"]`)).toHaveCount(0);
}

async function waitForReloadedRows(page: Page) {
  await expect(page.locator(`${ROW}[aria-disabled="true"]`).first()).toBeVisible();
  await waitForSettledRows(page);
}

async function rowTexts(page: Page): Promise<string[]> {
  return page.locator(ROW).evaluateAll((rows) =>
    rows.map((row) => [...row.querySelectorAll("td")].slice(0, 3).map((cell) => cell.textContent).join(" | ")),
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

test("처음 들어올 때 추론 Layout의 Skeleton이 보이고 조회가 끝나면 같은 위치의 본문으로 바뀜", async ({ page }) => {
  await openWithLatency(page, { entryMs: 800, searchMs: 800 });
  const skeleton = page.locator(SKELETON);
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveAttribute("role", "status");
  await expect(skeleton).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status").filter({ hasText: "추론 화면을 불러오는 중입니다." })).toHaveCount(1);
  await expect(skeleton.locator(".sr-only")).toHaveCSS("position", "absolute");
  await expect(page.locator(SHIMMER).first()).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator('[data-slot="inference-filter-bar-skeleton"] [data-slot="shimmer-block"]')).toHaveCount(6);
  const cards = page.locator('[data-slot="inference-jobs-card-skeleton"] .grid [data-slot="shimmer-block"]');
  await expect(cards).toHaveCount(4);
  expect((await cards.first().boundingBox())?.height).toBe(76);
  await expect(page.locator('[data-slot="inference-results-card-skeleton"] .grid.h-12')).toHaveCount(9);
  const muted = await color(page, "var(--muted)");
  const surfaceLow = await color(page, "var(--surface-low)");
  await expect(cards.first()).toHaveCSS(
    "background-image",
    `linear-gradient(90deg, ${muted} 0%, ${surfaceLow} 50%, ${muted} 100%)`,
  );
  await expect(cards.first()).toHaveCSS("background-size", "200% 100%");
  await expect(cards.first()).toHaveCSS("border-radius", "10px");
  await expect(page.locator('[data-slot="inference-filter-bar-skeleton"] [data-slot="shimmer-block"]').first()).toHaveCSS("border-radius", "6px");
  await expect(cards.first()).toHaveCSS("animation-name", "none");
  const skeletonFrames = await rects(page, [
    '[data-slot="inference-filter-bar-skeleton"]',
    '[data-slot="inference-jobs-card-skeleton"]',
    '[data-slot="inference-results-card-skeleton"]',
  ]);

  await expect(page.locator(ROW).first()).toBeVisible();
  await expect(skeleton).toHaveCount(0);
  const frames = await rects(page, [FILTER, JOBS, RESULTS]);
  for (const [index, frame] of frames.entries()) {
    const shown = skeletonFrames[index];
    expect(frame).not.toBeNull();
    expect(shown).not.toBeNull();
    for (const key of ["x", "y", "width", "height"] as const) {
      expect(Math.abs((frame?.[key] ?? 0) - (shown?.[key] ?? 0))).toBeLessThanOrEqual(0.5);
    }
  }
  const recorded = await marks(page);
  const shownAt = recorded.find(([name]) => name === "skeleton+")?.[1] ?? 0;
  const hiddenAt = recorded.find(([name]) => name === "skeleton-")?.[1] ?? 0;
  expect(hiddenAt - shownAt).toBeGreaterThanOrEqual(800);
});

test("Skeleton의 빛은 1.2초 linear로 반복되고, Overlay는 0.2초 Fade(움직임 줄이기를 켜도 Fade)이며, 회전 표시는 움직임 줄이기에서 멈춤", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openWithLatency(page, { entryMs: 800, searchMs: 1500 });
  const block = page.locator(SHIMMER).first();
  await expect(block).toHaveCSS("animation-name", "skeleton-shimmer");
  await expect(block).toHaveCSS("animation-duration", "1.2s");
  await expect(block).toHaveCSS("animation-timing-function", "linear");
  await expect(block).toHaveCSS("animation-iteration-count", "infinite");
  await waitForSettledRows(page);
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  for (const selector of [OVERLAY, POPUP]) {
    await expect(page.locator(selector)).toHaveCSS("animation-name", "enter");
    await expect(page.locator(selector)).toHaveCSS("animation-duration", "0.2s");
    await expect(page.locator(selector)).toHaveCSS("animation-timing-function", "cubic-bezier(0, 0, 0.2, 1)");
  }
  await expect(page.locator(SPINNER)).toHaveCSS("animation-name", "spin");
  await expect(page.locator(SPINNER)).toHaveCSS("animation-iteration-count", "infinite");
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  for (const selector of [OVERLAY, POPUP]) {
    await expect(page.locator(selector)).toHaveCSS("animation-name", "enter");
    await expect(page.locator(selector)).toHaveCSS("animation-duration", "0.2s");
    await expect(page.locator(selector)).toHaveCSS("opacity", "1");
  }
  await expect(page.locator(SPINNER)).toHaveCSS("animation-name", "none");
});

test("Skeleton의 조건 Row 블록은 옅은 회색 배경보다 한 단계 진한 Color임(라이트, 다크)", async ({ page }) => {
  await openWithLatency(page, { entryMs: 8000 });
  await expect(page.locator(SKELETON)).toBeVisible();
  const bar = page.locator('[data-slot="inference-filter-bar-skeleton"]');
  const blocks = bar.locator('[data-slot="shimmer-block"]');
  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    const border = await color(page, "var(--border)");
    const muted = await color(page, "var(--muted)");
    await expect(bar).toHaveCSS("background-color", await color(page, "var(--surface-low)"));
    for (const block of await blocks.all()) {
      await expect(block).toHaveCSS("background-image", `linear-gradient(90deg, ${border} 0%, ${muted} 50%, ${border} 100%)`);
    }
  }
  const surfaceLow = await color(page, "var(--surface-low)");
  await expect(page.locator(`${SKELETON} [data-slot="inference-jobs-card-skeleton"] [data-slot="shimmer-block"]`).first()).toHaveCSS(
    "background-image",
    `linear-gradient(90deg, ${await color(page, "var(--muted)")} 0%, ${surfaceLow} 50%, ${await color(page, "var(--muted)")} 100%)`,
  );
});

test("상세 Dialog에서 불러오는 동안의 블록도 같은 빛 효과(1.2초 linear)로 움직이고, 움직임 줄이기를 켜면 멈춤", async ({ page }) => {
  await page.addInitScript(() => {
    const host = window as unknown as { panelAnimations: string[] };
    host.panelAnimations = [];
    new MutationObserver(() => {
      const panel = document.querySelector('[data-slot="skeleton-panel"]');
      if (panel === null) return;
      const blocks = [...panel.querySelectorAll('[data-slot="skeleton"], [data-slot="shimmer-block"]')];
      host.panelAnimations.push(`count ${blocks.length}`);
      for (const block of blocks) {
        const style = getComputedStyle(block);
        host.panelAnimations.push(
          `${block.getAttribute("data-slot")} ${style.animationName} ${style.animationDuration} ${style.animationTimingFunction}`,
        );
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const recorded = () =>
    page.evaluate(() => [...new Set((window as unknown as { panelAnimations: string[] }).panelAnimations)].sort());
  const clearRecorded = () =>
    page.evaluate(() => {
      (window as unknown as { panelAnimations: string[] }).panelAnimations.length = 0;
    });
  await openWithLatency(page, {});
  await waitForSettledRows(page);

  for (const [index, reducedMotion, expected] of [
    [0, "no-preference", "shimmer-block skeleton-shimmer 1.2s linear"],
    [1, "reduce", "shimmer-block none 0s ease"],
  ] as const) {
    await page.emulateMedia({ reducedMotion });
    await clearRecorded();
    await page.locator(ROW).nth(index).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator('[data-slot="skeleton-panel"]')).toHaveCount(0);
    expect(await recorded()).toEqual(["count 10", expected]);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});

test("검색 요청에 0.3초가 지나도 Response가 없으면 화면 전체를 덮는 검정 Overlay, Text, 취소 Button의 Focus가 표시됨", async ({ page }) => {
  await openWithLatency(page, { searchMs: 1500 });
  await waitForSettledRows(page);
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
  for (const line of await page.locator(`${MESSAGE} > *`).all()) await expect(line).toHaveCSS("color", "rgb(255, 255, 255)");

  const overlay = page.locator(OVERLAY);
  await expect(overlay).toHaveCSS("background-color", "rgba(0, 0, 0, 0.8)");
  await expect(overlay).toHaveCSS("position", "fixed");
  expect(await overlay.boundingBox()).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  for (const selector of ['[data-slot="top-bar"]', '[data-slot="left-rail"]', FILTER, `${ROW}:first-child`]) {
    expect(await overlayIsOnTopAt(page, selector), selector).toBe(true);
  }
  const overlayZ = Number(await overlay.evaluate((element) => getComputedStyle(element).zIndex));
  const toastZ = Number(await page.locator('[data-slot="toast-viewport"]').evaluate((element) => getComputedStyle(element).zIndex));
  expect(overlayZ).toBe(60);
  expect(overlayZ).toBeLessThan(toastZ);

  await expect(cancelButton(page)).toBeFocused();
  for (const key of ["Tab", "Tab", "Shift+Tab"] as const) {
    await page.keyboard.press(key);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await page.evaluate((selector) => document.querySelector(selector)?.contains(document.activeElement) ?? false, POPUP)).toBe(true);
  }

  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  await expect(searchButton(page)).toBeFocused();
  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(0);
});

test("Esc로 취소하면 결과와 Page 번호는 검색 전 그대로이고 Input은 바꾼 값이며 늦게 온 Response는 버려지고 다시 검색하면 Input 값으로 조회됨", async ({ page }) => {
  await openWithLatency(page, { searchMs: 1200, ignoreAbort: true });
  await waitForSettledRows(page);
  await page.locator(PAGES).nth(2).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await waitForReloadedRows(page);
  const before = await rowTexts(page);
  expect(before).toHaveLength(9);

  await page.locator(SELECTS).nth(0).click();
  await pickOption(page, "Isolation Forest");
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(searchButton(page)).toBeFocused();
  expect(await rowTexts(page)).toEqual(before);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await expect(page.locator(SELECTS).nth(0)).toHaveText("Isolation Forest");
  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator(`${JOB_LIST} [data-slot="job-card"][aria-disabled="true"]`)).toHaveCount(0);

  await page.waitForTimeout(1600);
  expect(await rowTexts(page)).toEqual(before);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await expect(page.getByText("추론 화면을 불러오지 못했습니다.")).toHaveCount(0);
  await expect(page.locator('[data-slot="toast-viewport"] [data-tone]')).toHaveCount(0);

  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: 5000 });
  await waitForSettledRows(page);
  const models = await page.locator(ROW).evaluateAll((rows) => rows.map((row) => row.querySelectorAll("td")[1]?.textContent));
  expect(models.length).toBeGreaterThan(0);
  expect(new Set(models)).toEqual(new Set(["Isolation Forest"]));
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
});

test("취소 Button, 초기화, 기간에서 끝날짜까지 고르면 Calendar가 닫히고 Overlay가 뜨며, 시작일만 고른 동안은 옅게 잠기고, 취소해도 기간 Input은 새 값임", async ({ page }) => {
  await openWithLatency(page, { searchMs: 1200 });
  await waitForSettledRows(page);
  const before = await rowTexts(page);

  await resetButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await cancelButton(page).click();
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(resetButton(page)).toBeFocused();
  expect(await rowTexts(page)).toEqual(before);

  const yesterday = isoDaysAgo(1);
  await page.locator(TRIGGER).click();
  await expect(page.locator(CALENDAR)).toBeVisible();
  await clearMarks(page);
  await page.locator(`${calendarDayCell(CALENDAR, yesterday)} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText(`추론일시 ${yesterday}`);
  await expect(page.locator(`${ROW}[aria-disabled="true"]`).first()).toBeVisible();
  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(0, { timeout: 5000 });
  expect((await marks(page)).filter(([name]) => name.startsWith("overlay"))).toEqual([]);
  const afterStart = await rowTexts(page);

  await page.locator(`${calendarDayCell(CALENDAR, yesterday)} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText(`추론일시 ${yesterday} ~ ${yesterday}`);
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await expect(page.locator(POPUP)).toBeVisible();
  await cancelButton(page).click();
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(page.locator(TRIGGER)).toHaveText(`추론일시 ${yesterday} ~ ${yesterday}`);
  await expect(page.locator(TRIGGER)).toBeFocused();
  expect(await rowTexts(page)).toEqual(afterStart);

  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect(page.locator(POPUP)).toHaveCount(0, { timeout: 5000 });
  await waitForSettledRows(page);
  const dates = await page.locator(ROW).evaluateAll((rows) => rows.map((row) => row.querySelector("td")?.textContent?.slice(0, 10)));
  expect(dates.length).toBeGreaterThan(0);
  expect(new Set(dates)).toEqual(new Set([yesterday]));
});

test("0.3초 안에 오는 Response, Page 넘기기, 실패만 보기, CSV에는 Overlay를 띄우지 않음", async ({ page }) => {
  await openWithLatency(page, { searchMs: 100 });
  await waitForSettledRows(page);
  await clearMarks(page);
  for (const button of [searchButton(page), resetButton(page)]) {
    await button.click();
    await waitForSettledRows(page);
  }
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  expect((await marks(page)).filter(([name]) => name.startsWith("overlay"))).toEqual([]);

  await page.evaluate(() => {
    (window as unknown as { cbmMockLatency: Latency }).cbmMockLatency = { searchMs: 800 };
  });
  await watchLockAfterClick(page, "pagedRow", `${ROW}:first-child`);
  await page.locator(PAGES).nth(1).click();
  await expect.poll(async () => (await lockAfterClick(page, "pagedRow")).lockedAfterMs).not.toBeNull();
  await waitForSettledRows(page);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await page.getByRole("switch", { name: "실패만 보기" }).click();
  await expect(page.locator(`${JOB_LIST} [data-slot="job-card"]`)).toHaveCount(2);
  const download = page.waitForEvent("download");
  await page.locator(CSV).click();
  await download;
  await page.waitForTimeout(OVERLAY_DELAY_MS + 200);
  expect((await marks(page)).filter(([name]) => name.startsWith("overlay"))).toEqual([]);
});

test("Page 넘기기에서 0.3초 안에 Response가 오면 결과 Row는 한 번도 옅게 막히지 않고 Overlay도 없음", async ({ page }) => {
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
  expect((await marks(page)).filter(([name]) => name.startsWith("overlay"))).toEqual([]);
  await expect(page.locator(ROW)).toHaveCount(9);
});

test("Page 넘기기를 Click한 지 0.3초 안에는 그대로이고, 0.3초가 지나면 결과 Row만 옅게 막혀 Click하거나 Keyboard로 골라도 상세가 열리지 않으며, Page 번호와 조건 Row는 그대로이고 Response가 오면 풀림", async ({ page }) => {
  await openWithLatency(page, { searchMs: SLOW_SEARCH_MS });
  await waitForSettledRows(page);
  const firstRow = `${ROW}:first-child`;
  await clearMarks(page);
  await watchLockAfterClick(page, "row", firstRow);
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await expect.poll(async () => (await lockAfterClick(page, "row")).early).toEqual({ disabled: "false", opacity: "1" });

  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(9);
  await expect(page.locator(firstRow)).toHaveCSS("opacity", "0.5");
  await expect(page.locator(firstRow)).toHaveCSS("pointer-events", "none");
  expect((await lockAfterClick(page, "row")).lockedAfterMs).toBeGreaterThanOrEqual(OVERLAY_DELAY_MS);
  await expect(page.locator(`${JOB}[aria-disabled="true"]`)).toHaveCount(0);
  const freePages = await pressable(page, PAGES);
  expect(freePages.length).toBeGreaterThanOrEqual(3);
  expect(freePages).not.toContain(false);
  expect(await pressable(page, FILTER_CONTROLS)).toEqual(Array(6).fill(true));

  await page.locator(ROW).nth(1).click({ force: true });
  await page.locator(ROW).nth(2).focus();
  await page.keyboard.press("Enter");
  expect(await page.locator(`${ROW}[aria-disabled="true"]`).count()).toBe(9);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await waitForSettledRows(page);
  await expect(page.locator(firstRow)).toHaveCSS("opacity", "1");
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  expect((await marks(page)).filter(([name]) => name.startsWith("overlay"))).toEqual([]);
});

test("Page 넘기기를 잇달아 하면 0.3초 넘게 기다린 Page가 풀린 뒤 다음 Page의 기다림도 처음부터 세어 0.3초 안에는 옅게 막지 않음", async ({ page }) => {
  await openWithLatency(page, { searchMs: SLOW_SEARCH_MS });
  await waitForSettledRows(page);
  const firstRow = `${ROW}:first-child`;
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await waitForReloadedRows(page);

  await watchLockAfterClick(page, "row", firstRow);
  await page.locator(PAGES, { hasText: /^3$/ }).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await expect.poll(async () => (await lockAfterClick(page, "row")).early).toEqual({ disabled: "false", opacity: "1" });
  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(9);
  expect((await lockAfterClick(page, "row")).lockedAfterMs).toBeGreaterThanOrEqual(OVERLAY_DELAY_MS);
  await waitForSettledRows(page);
});

test("3840×2160에서 Overlay의 회전 표시, Text, Button이 1920×1080의 2배이고 다크 Theme에서도 검정 80%임", async ({ page }) => {
  await openWithLatency(page, { searchMs: 8000 });
  await waitForSettledRows(page);
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  const parts = [POPUP, SPINNER, MESSAGE, `${MESSAGE} > :first-child`, `${MESSAGE} > :last-child`, `${POPUP} [data-slot="action-button"]`];
  const base = await rects(page, parts);
  await expect(page.locator(`${MESSAGE} > :first-child`)).toHaveCSS("font-size", "22px");
  await expect(page.locator(`${MESSAGE} > :first-child`)).toHaveCSS("font-weight", "700");
  await expect(page.locator(`${MESSAGE} > :last-child`)).toHaveCSS("font-size", "16px");
  await expect(page.locator(`${MESSAGE} > :last-child`)).toHaveCSS("font-weight", "500");
  await expect(page.locator(SPINNER)).toBeVisible();
  await expect(page.locator(SPINNER)).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(SPINNER)).toHaveCSS("color", "rgb(255, 255, 255)");
  expect(base[1]?.width).toBe(40);
  expect(base[1]?.height).toBe(40);
  await expect(page.locator(SPINNER)).toHaveClass(/(^| )lucide-loader( |$)/);
  await expect(page.locator(`${SPINNER} path`)).toHaveCount(8);
  await expect(page.locator(SPINNER)).toHaveCSS("stroke", "rgb(255, 255, 255)");
  expect((base[1]?.y ?? 0) + (base[1]?.height ?? 0)).toBeLessThan(base[2]?.y ?? 0);
  await expect(page.getByRole("dialog", { name: "데이터를 불러오는 중입니다." })).toBeVisible();

  await page.setViewportSize({ width: 3840, height: 2160 });
  await expect(page.locator(`${MESSAGE} > :first-child`)).toHaveCSS("font-size", "44px");
  await page.waitForTimeout(400);
  const doubled = await rects(page, parts);
  for (const [index, rect] of doubled.entries()) {
    for (const key of ["x", "y", "width", "height"] as const) {
      expect(Math.abs((rect?.[key] ?? 0) - 2 * (base[index]?.[key] ?? 0)), `${parts[index]} ${key}`).toBeLessThanOrEqual(0.5);
    }
  }
  expect(await page.locator(OVERLAY).boundingBox()).toEqual({ x: 0, y: 0, width: 3840, height: 2160 });
  await page.keyboard.press("Escape");
  await expect(page.locator(POPUP)).toHaveCount(0);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect(page.locator(OVERLAY)).toHaveCSS("background-color", "rgba(0, 0, 0, 0.8)");
  for (const line of await page.locator(`${MESSAGE} > *`).all()) await expect(line).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.locator(SPINNER)).toHaveCSS("color", "rgb(255, 255, 255)");
});

test("검색 중 실패하면 Overlay가 뜬 뒤 결과 조회가 실패했을 때 실패 Text로 바뀌고 Overlay, Scroll 잠금, 바깥 숨김이 남지 않으며 왼쪽 Menu로 나갈 수 있음", async ({ page }) => {
  await openWithLatency(page, { searchMs: SLOW_SEARCH_MS });
  await waitForSettledRows(page);
  const locksBefore = await modalLocks(page);
  await setLatency(page, { searchMs: SLOW_SEARCH_MS, failNames: [RESULTS_QUERY] });
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await expect.poll(() => modalLocks(page)).not.toEqual(locksBefore);
  await expect(page.getByText(FAILURE_TEXT)).toHaveCount(0);

  await expectFailureNotTrapped(page, locksBefore);
  await leaveByRail(page);
});

test("Page 넘기기 중 실패하면 결과 Row가 옅게 잠긴 뒤 결과 조회가 실패했을 때 실패 Text로 바뀌고 잠긴 Row와 Overlay가 남지 않으며 왼쪽 Menu로 나갈 수 있음", async ({ page }) => {
  await openWithLatency(page, { searchMs: SLOW_SEARCH_MS });
  await waitForSettledRows(page);
  const locksBefore = await modalLocks(page);
  await setLatency(page, { searchMs: SLOW_SEARCH_MS, failNames: [RESULTS_QUERY] });
  await clearMarks(page);
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(`${ROW}[aria-disabled="true"]`).first()).toBeVisible();
  await expect(page.getByText(FAILURE_TEXT)).toHaveCount(0);

  await expectFailureNotTrapped(page, locksBefore);
  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator(`${JOB}[aria-disabled="true"]`)).toHaveCount(0);
  expect((await marks(page)).filter(([name]) => name.startsWith("overlay"))).toEqual([]);
  await leaveByRail(page);
});

test("취소 뒤 늦은 실패는 끊지 못한 검색 조회가 취소 뒤 실패로 끝나도 버려지고, 결과와 추론 Job은 검색 전 그대로이며 실패 Text는 없고 다시 검색하면 Input 값으로 조회됨", async ({ page }) => {
  await openWithLatency(page, { searchMs: SLOW_SEARCH_MS, ignoreAbort: true });
  await waitForSettledRows(page);
  const before = await rowTexts(page);
  const jobsBefore = await page.locator(JOB).allTextContents();
  await setLatency(page, { searchMs: SLOW_SEARCH_MS, ignoreAbort: true, failNames: SEARCH_QUERIES });
  await page.locator(SELECTS).nth(0).click();
  await pickOption(page, "Isolation Forest");
  await searchButton(page).click();
  await expect(page.locator(POPUP)).toBeVisible();
  await cancelButton(page).click();
  await expect(page.locator(POPUP)).toHaveCount(0);
  expect(await rowTexts(page)).toEqual(before);

  await page.waitForTimeout(SLOW_SEARCH_MS + 400);
  await expect(page.getByText(FAILURE_TEXT)).toHaveCount(0);
  await expect(page.locator(RESULTS)).toBeVisible();
  expect(await rowTexts(page)).toEqual(before);
  expect(await page.locator(JOB).allTextContents()).toEqual(jobsBefore);
  await expect(page.locator(`${ROW}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator(`${JOB}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator('[data-slot="toast-viewport"] [data-tone]')).toHaveCount(0);
  await expect(page.locator(SELECTS).nth(0)).toHaveText("Isolation Forest");

  await setLatency(page, { searchMs: 100 });
  await searchButton(page).click();
  await expect
    .poll(async () => new Set(await page.locator(ROW).evaluateAll((rows) => rows.map((row) => row.querySelectorAll("td")[1]?.textContent))))
    .toEqual(new Set(["Isolation Forest"]));
  await waitForSettledRows(page);
});

test("Mock에서 처음 들어올 때와 검색의 지연을 구분하고, 끊는 신호를 받으면 기다림을 멈추고 AbortError를 냄", async () => {
  const host = globalThis as { cbmMockLatency?: Latency };
  host.cbmMockLatency = { entryMs: 50, searchMs: 3000 };
  try {
    const query = { modelCode: null, deviceCode: null, period: { from: null, to: null }, page: 1 };
    await fetchInferenceFilterOptions();
    const enteredAt = Date.now();
    await fetchInferenceJobs();
    await fetchInferenceResults(query);
    expect(Date.now() - enteredAt).toBeLessThan(1000);

    const controller = new AbortController();
    const startedAt = Date.now();
    const pending = fetchInferenceJobs({ signal: controller.signal });
    setTimeout(() => controller.abort(), 100);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(Date.now() - startedAt).toBeLessThan(1000);
    await expect(fetchInferenceResults(query, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });

    host.cbmMockLatency = { searchMs: 100, ignoreAbort: true };
    const ignored = new AbortController();
    const late = fetchInferenceJobs({ signal: ignored.signal });
    ignored.abort();
    await expect(late).resolves.toHaveProperty("recentDays", 7);
  } finally {
    delete host.cbmMockLatency;
  }
});
