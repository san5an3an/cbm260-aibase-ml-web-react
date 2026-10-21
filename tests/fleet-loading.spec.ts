import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  fetchAnomalyHistory,
  fetchAnomalyHistoryFilterOptions,
  fetchFleetOverview,
} from "../src/services/fleet";
import { color } from "./helpers/measure";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const FLEET_PATH = "/dashboard/fleet";
const SKELETON = '[data-slot="fleet-skeleton"]';
const SHIMMER = `${SKELETON} [data-slot="shimmer-block"]`;
const KPI_SKELETON = '[data-slot="kpi-flip-card-skeleton"]';
const RISK_SKELETON = '[data-slot="risk-ranking-card-skeleton"]';
const HISTORY_SKELETON = '[data-slot="anomaly-history-card-skeleton"]';
const COVERAGE_ROW_SKELETON = '[data-slot="coverage-row-skeleton"]';
const OVERVIEW = '[data-slot="fleet-overview"]';
const RISK_ROW = '[data-slot="risk-ranking-card"] tbody [data-slot="table-row"]';
const STRIPED_BLOCK_COUNT = 10 * 6;
const ENTRY_MS = 3000;

const FRAME_PAIRS: readonly (readonly [string, string])[] = [
  [SKELETON, OVERVIEW],
  ['[data-slot="fleet-kpi-column-skeleton"]', '[data-slot="fleet-kpi-column"]'],
  ...[0, 1, 2, 3, 4].map((index) => [`${KPI_SKELETON}@${index}`, `[data-slot="kpi-flip-card"]@${index}`] as const),
  ['[data-slot="fleet-overview-center-skeleton"]', '[data-slot="fleet-overview-center"]'],
  [RISK_SKELETON, '[data-slot="risk-ranking-card"]'],
  [`${RISK_SKELETON} [data-slot="data-table-skeleton"]`, '[data-slot="risk-ranking-card"] [data-slot="data-table"]'],
  [HISTORY_SKELETON, '[data-slot="anomaly-history-card"]'],
  [`${HISTORY_SKELETON} [data-slot="data-table-skeleton"]`, '[data-slot="anomaly-history-card"] [data-slot="data-table"]'],
  ['[data-slot="model-coverage-card-skeleton"]', '[data-slot="model-coverage-card"]'],
  ['[data-slot="model-coverage-rows-skeleton"]', '[data-slot="model-coverage-rows"]'],
  [`${COVERAGE_ROW_SKELETON}@0`, '[data-slot="coverage-row"]@0'],
  [`${COVERAGE_ROW_SKELETON}@20`, '[data-slot="coverage-row"]@20'],
  ['[data-slot="coverage-totals-row-skeleton"]', '[data-slot="coverage-totals-row"]'],
];

interface Latency {
  entryMs?: number;
  searchMs?: number;
  ignoreAbort?: boolean;
  failNames?: string[];
}

async function openWithLatency(page: Page, latency: Latency, width = 1920, height = 1080) {
  await page.addInitScript((value) => {
    const host = window as unknown as {
      cbmMockLatency: Latency;
      loadingMarks: [string, number][];
    };
    host.cbmMockLatency = value;
    host.loadingMarks = [];
    let isShown = false;
    new MutationObserver(() => {
      const next = document.querySelector('[data-slot="fleet-skeleton"]') !== null;
      if (next === isShown) return;
      isShown = next;
      host.loadingMarks.push([`skeleton${next ? "+" : "-"}`, performance.now()]);
    }).observe(document, { childList: true, subtree: true });
  }, latency);
  await page.setViewportSize({ width, height });
  await page.goto(FLEET_PATH);
}

async function marks(page: Page): Promise<[string, number][]> {
  return page.evaluate(() => [...(window as unknown as { loadingMarks: [string, number][] }).loadingMarks]);
}

async function rects(page: Page, selectors: readonly string[]) {
  return page.evaluate(
    (list) =>
      list.map((item) => {
        const [selector, index] = item.split("@");
        const rect = document.querySelectorAll(selector)[Number(index ?? 0)]?.getBoundingClientRect();
        return rect === undefined ? null : { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    selectors,
  );
}

async function blockBackdrops(page: Page): Promise<{ backdrop: string; gradient: string }[]> {
  return page.locator(SHIMMER).evaluateAll((blocks) =>
    blocks.map((block) => {
      let element = block.parentElement;
      let backdrop = "rgba(0, 0, 0, 0)";
      while (element !== null) {
        const value = getComputedStyle(element).backgroundColor;
        if (value !== "rgba(0, 0, 0, 0)" && value !== "transparent") {
          backdrop = value;
          break;
        }
        element = element.parentElement;
      }
      return { backdrop, gradient: getComputedStyle(block).backgroundImage };
    }),
  );
}

test("처음 들어올 때 플릿 개요 Layout의 Skeleton이 보이고 조회가 끝나면 같은 위치의 본문으로 바뀜", async ({ page }) => {
  await openWithLatency(page, { entryMs: ENTRY_MS, searchMs: ENTRY_MS });
  const skeleton = page.locator(SKELETON);
  await expect(skeleton).toBeVisible();
  const skeletonFrames = await rects(page, FRAME_PAIRS.map(([shown]) => shown));
  await expect(skeleton).toHaveAttribute("role", "status");
  await expect(skeleton).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status").filter({ hasText: "플릿 개요 화면을 불러오는 중입니다." })).toHaveCount(1);
  await expect(skeleton.locator(".sr-only")).toHaveCSS("position", "absolute");
  await expect(page.locator(SHIMMER).first()).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(OVERVIEW)).toHaveCount(0);
  await expect(page.locator('[data-slot="refresh-time"]')).toHaveText("갱신 --:--:--");
  await expect(page.locator(KPI_SKELETON)).toHaveCount(5);
  await expect(page.locator(`${RISK_SKELETON} [data-slot="table-row-skeleton"]`)).toHaveCount(10);
  await expect(page.locator(`${HISTORY_SKELETON} [data-slot="table-row-skeleton"]`)).toHaveCount(7);
  await expect(page.locator(COVERAGE_ROW_SKELETON)).toHaveCount(21);
  const muted = await color(page, "var(--muted)");
  const surfaceLow = await color(page, "var(--surface-low)");
  const digits = page.locator(`${KPI_SKELETON} [data-slot="shimmer-block"]`).nth(1);
  await expect(digits).toHaveCSS("background-image", `linear-gradient(90deg, ${muted} 0%, ${surfaceLow} 50%, ${muted} 100%)`);
  await expect(digits).toHaveCSS("background-size", "200% 100%");
  await expect(digits).toHaveCSS("border-radius", "10px");
  expect((await digits.boundingBox())?.height).toBe(69);
  await expect(page.locator(`${KPI_SKELETON} [data-slot="shimmer-block"]`).first()).toHaveCSS("border-radius", "6px");
  await expect(digits).toHaveCSS("animation-name", "none");

  await expect(page.locator(RISK_ROW).first()).toBeVisible();
  await expect(page.locator('[data-slot="anomaly-history-card"]')).toBeVisible();
  await expect(skeleton).toHaveCount(0);
  const frames = await rects(page, FRAME_PAIRS.map(([, real]) => real));
  for (const [index, frame] of frames.entries()) {
    const shown = skeletonFrames[index];
    const label = FRAME_PAIRS[index][0];
    expect(frame, label).not.toBeNull();
    expect(shown, label).not.toBeNull();
    for (const key of ["x", "y", "width", "height"] as const) {
      expect(Math.abs((frame?.[key] ?? 0) - (shown?.[key] ?? 0)), `${label} ${key}`).toBeLessThanOrEqual(0.5);
    }
  }
  await expect(page.locator('[data-slot="refresh-time"]')).toHaveText(/^갱신 \d{2}:\d{2}:\d{2}$/);
  const recorded = await marks(page);
  const shownAt = recorded.find(([name]) => name === "skeleton+")?.[1] ?? 0;
  const hiddenAt = recorded.find(([name]) => name === "skeleton-")?.[1] ?? 0;
  expect(hiddenAt - shownAt).toBeGreaterThanOrEqual(ENTRY_MS);
});

test("Skeleton의 블록은 모두 빛이 지나가는 효과가 1.2초 linear로 반복되고, 움직임 줄이기를 켜면 모두 멈춤", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openWithLatency(page, { entryMs: 8000 });
  await expect(page.locator(SKELETON)).toBeVisible();
  const animations = () =>
    page.locator(SHIMMER).evaluateAll((blocks) => {
      const values = blocks.map((block) => {
        const style = getComputedStyle(block);
        return `${style.animationName} ${style.animationDuration} ${style.animationTimingFunction} ${style.animationIterationCount}`;
      });
      return { count: values.length, kinds: [...new Set(values)] };
    });
  const moving = await animations();
  expect(moving.count).toBeGreaterThan(200);
  expect(moving.kinds).toEqual(["skeleton-shimmer 1.2s linear infinite"]);

  await page.emulateMedia({ reducedMotion: "reduce" });
  const stopped = await animations();
  expect(stopped.count).toBe(moving.count);
  expect(stopped.kinds.map((kind) => kind.split(" ")[0])).toEqual(["none"]);
});

test("옅은 회색 줄무늬 위 블록은 한 단계 진한 Color이고 흰 Card 위 블록은 기본 Color임(라이트, 다크)", async ({ page }) => {
  await openWithLatency(page, { entryMs: 8000 });
  await expect(page.locator(SKELETON)).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    const card = await color(page, "var(--card)");
    const surfaceLow = await color(page, "var(--surface-low)");
    const border = await color(page, "var(--border)");
    const muted = await color(page, "var(--muted)");
    const strong = `linear-gradient(90deg, ${border} 0%, ${muted} 50%, ${border} 100%)`;
    const plain = `linear-gradient(90deg, ${muted} 0%, ${surfaceLow} 50%, ${muted} 100%)`;
    await expect(page.locator(COVERAGE_ROW_SKELETON).nth(0)).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.locator(COVERAGE_ROW_SKELETON).nth(1)).toHaveCSS("background-color", surfaceLow);
    const blocks = await blockBackdrops(page);
    const onStripe = blocks.filter(({ backdrop }) => backdrop === surfaceLow);
    const onCard = blocks.filter(({ backdrop }) => backdrop === card);
    expect(onStripe.length + onCard.length, theme).toBe(blocks.length);
    expect(onStripe.length, theme).toBe(STRIPED_BLOCK_COUNT);
    expect([...new Set(onStripe.map(({ gradient }) => gradient))], theme).toEqual([strong]);
    expect([...new Set(onCard.map(({ gradient }) => gradient))], theme).toEqual([plain]);
  }
});

test("3840×2160에서 Skeleton의 Layout이 1920×1080의 2배임", async ({ page }) => {
  await openWithLatency(page, { entryMs: 8000 });
  await expect(page.locator(SKELETON)).toBeVisible();
  const selectors = FRAME_PAIRS.map(([shown]) => shown);
  const base = await rects(page, selectors);
  await page.setViewportSize({ width: 3840, height: 2160 });
  await expect(page.locator('[data-slot="fleet-kpi-column-skeleton"]')).toHaveCSS("width", "576px");
  const doubled = await rects(page, selectors);
  await expect(page.locator(SKELETON)).toBeVisible();
  for (const [index, rect] of doubled.entries()) {
    for (const key of ["x", "y", "width", "height"] as const) {
      expect(Math.abs((rect?.[key] ?? 0) - 2 * (base[index]?.[key] ?? 0)), `${selectors[index]} ${key}`).toBeLessThanOrEqual(0.5);
    }
  }
});

test("Mock에서 처음 들어올 때와 그 밖의 지연을 구분하고, 끊는 신호를 받으면 기다림을 멈추고 AbortError를 냄", async () => {
  const host = globalThis as { cbmMockLatency?: Latency };
  host.cbmMockLatency = { entryMs: 50, searchMs: 3000 };
  try {
    const query = { deviceCode: "AXLE_BEARING", days: 14 };
    const enteredAt = Date.now();
    await fetchFleetOverview();
    await fetchAnomalyHistoryFilterOptions();
    await fetchAnomalyHistory(query);
    expect(Date.now() - enteredAt).toBeLessThan(1000);

    const controller = new AbortController();
    const startedAt = Date.now();
    const pending = fetchAnomalyHistory({ ...query, days: 30 }, { signal: controller.signal });
    setTimeout(() => controller.abort(), 100);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(Date.now() - startedAt).toBeLessThan(1000);

    host.cbmMockLatency = { searchMs: 100, ignoreAbort: true };
    const ignored = new AbortController();
    const late = fetchAnomalyHistory(query, { signal: ignored.signal });
    ignored.abort();
    await expect(late).resolves.toHaveProperty("days", 14);

    host.cbmMockLatency = { entryMs: 50, searchMs: 3000 };
    await expect(fetchAnomalyHistoryFilterOptions({ signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    await expect(fetchFleetOverview({ signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  } finally {
    delete host.cbmMockLatency;
  }
});

const KPI_COLUMN = '[data-slot="fleet-kpi-column"]';
const RISK_CARD = '[data-slot="risk-ranking-card"]';
const HISTORY_CARD = '[data-slot="anomaly-history-card"]';
const COVERAGE_CARD = '[data-slot="model-coverage-card"]';
const HISTORY_ROW = `${HISTORY_CARD} tbody [data-slot="table-row"]`;
const TRIGGERS = `${HISTORY_CARD} [data-slot="select-trigger"]`;
const REFRESH = '[data-slot="refresh-button"]';
const REFRESH_TIME = '[data-slot="refresh-time"]';
const ERROR_TEXT = "플릿 개요를 불러오지 못했습니다.";
const WAIT_FEEDBACK_MS = 300;

const WAIT_REGIONS = {
  kpi: KPI_COLUMN,
  risk: `${RISK_CARD} tbody`,
  history: `${HISTORY_CARD} tbody`,
  coverage: '[data-slot="model-coverage-body"]',
} as const;
type CardName = keyof typeof WAIT_REGIONS;
const CARD_NAMES = Object.keys(WAIT_REGIONS) as CardName[];
const SUMMARY_CARDS: readonly CardName[] = ["kpi", "risk", "coverage"];
const busy = (name: CardName) => `${WAIT_REGIONS[name]}[aria-busy="true"]`;

const DIMMED_CONTENT = [
  '[data-slot="kpi-flip-card-value"]',
  '[data-slot="kpi-flip-card-description"]',
  RISK_ROW,
  HISTORY_ROW,
  '[data-slot="anomaly-history-notes"]',
  '[data-slot="model-coverage-rows"]',
  '[data-slot="coverage-totals-row"]',
];
const UNDIMMED_PARTS = [
  '[data-slot="kpi-flip-card"]',
  '[data-slot="kpi-flip-card-label"]',
  `${RISK_CARD} [data-slot="section-card-header"]`,
  `${HISTORY_CARD} [data-slot="section-card-header"]`,
  `${COVERAGE_CARD} [data-slot="section-card-header"]`,
  `${RISK_CARD} thead [data-slot="table-row"]`,
  `${HISTORY_CARD} thead [data-slot="table-row"]`,
  '[data-slot="model-coverage-legend"]',
  '[data-slot="model-coverage-head"]',
  TRIGGERS,
  REFRESH,
  REFRESH_TIME,
];
const WAIT_FRAMES = [
  KPI_COLUMN,
  '[data-slot="kpi-flip-card"]@4',
  RISK_CARD,
  `${RISK_ROW}@9`,
  HISTORY_CARD,
  `${HISTORY_ROW}@6`,
  COVERAGE_CARD,
  '[data-slot="coverage-totals-row"]',
];

async function openWatching(page: Page, latency: Latency) {
  await page.addInitScript(
    ({ value, regions }) => {
      const host = window as unknown as { cbmMockLatency: Latency; waitMarks: [string, number][] };
      host.cbmMockLatency = value;
      host.waitMarks = [];
      const push = (name: string) => host.waitMarks.push([name, performance.now()]);
      const watched: [string, string][] = [
        ...Object.entries(regions).map(([name, selector]): [string, string] => [name, `${selector}[aria-busy="true"]`]),
        ["overlay", '[data-slot="searching-overlay"]'],
        ["skeleton", '[data-slot="fleet-skeleton"]'],
      ];
      const shown = new Set<string>();
      let time: string | null = null;
      new MutationObserver(() => {
        for (const [name, selector] of watched) {
          const isShown = document.querySelector(selector) !== null;
          if (isShown === shown.has(name)) continue;
          if (isShown) shown.add(name);
          else shown.delete(name);
          push(`${name}${isShown ? "+" : "-"}`);
        }
        const next = document.querySelector('[data-slot="refresh-time"]')?.textContent ?? null;
        if (next === time) return;
        time = next;
        push(`time ${next}`);
      }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-busy"] });
      document.addEventListener("pointerdown", () => push("press"), true);
      document.addEventListener("keydown", () => push("press"), true);
      document.addEventListener(
        "click",
        (event) => {
          if (event.target instanceof Element && event.target.closest('[data-slot="refresh-button"]') !== null) push("refresh");
        },
        true,
      );
    },
    { value: latency, regions: WAIT_REGIONS as Record<string, string> },
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(FLEET_PATH);
}

async function setLatency(page: Page, latency: Latency) {
  await page.evaluate((value) => {
    (window as unknown as { cbmMockLatency: Latency }).cbmMockLatency = value;
  }, latency);
}

async function clearWaitMarks(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { waitMarks: [string, number][] }).waitMarks.length = 0;
  });
}

async function readWaitMarks(page: Page): Promise<[string, number][]> {
  return page.evaluate(() => [...(window as unknown as { waitMarks: [string, number][] }).waitMarks]);
}

const timesOf = (list: readonly [string, number][], name: string) =>
  list.filter(([markName]) => markName === name).map(([, at]) => at);

function delaysAfterPress(list: readonly [string, number][], name: CardName): number[] {
  return timesOf(list, `${name}+`).map((at) => at - Math.max(...list.filter(([markName, pressedAt]) => markName === "press" && pressedAt <= at).map(([, pressedAt]) => pressedAt)));
}

const shownMarks = (list: readonly [string, number][]) =>
  list.filter(([name]) => /^(kpi|risk|history|coverage|overlay|skeleton)[+-]$/.test(name)).map(([name]) => name);

async function waitForSettled(page: Page) {
  await expect(page.locator(RISK_ROW).first()).toBeVisible();
  await expect(page.locator(HISTORY_ROW).first()).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

async function effectiveOpacities(page: Page, selector: string): Promise<number[]> {
  return page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      let value = 1;
      for (let node: Element | null = element; node !== null; node = node.parentElement) {
        value *= Number(getComputedStyle(node).opacity);
      }
      return value;
    }),
  );
}

async function receivesPointer(locator: Locator): Promise<boolean> {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return top !== null && element.contains(top);
  });
}

async function pickOption(page: Page, triggerIndex: number, label: string) {
  await page.locator(TRIGGERS).nth(triggerIndex).click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: label }).click();
  await expect(page.locator('[data-slot="select-content"]:not([data-closed])')).toHaveCount(0);
}

async function expectSummaryAndHistoryDimmed(page: Page) {
  for (const selector of DIMMED_CONTENT) {
    const values = await effectiveOpacities(page, selector);
    expect(values.length, selector).toBeGreaterThan(0);
    expect([...new Set(values)], selector).toEqual([0.5]);
  }
  for (const selector of UNDIMMED_PARTS) {
    const values = await effectiveOpacities(page, selector);
    expect(values.length, selector).toBeGreaterThan(0);
    expect([...new Set(values)], selector).toEqual([1]);
  }
  await expect(page.locator(`${RISK_ROW}[aria-disabled="true"]`)).toHaveCount(10);
  await expect(page.locator(`${HISTORY_ROW}[aria-disabled="true"]`)).toHaveCount(7);
  await expect(page.locator(RISK_ROW).first()).toHaveCSS("pointer-events", "none");
  await expect(page.locator(HISTORY_ROW).first()).toHaveCSS("pointer-events", "none");
  for (const index of [0, 1]) {
    const trigger = page.locator(TRIGGERS).nth(index);
    await expect(trigger).toBeEnabled();
    await expect(trigger).not.toHaveAttribute("aria-disabled", "true");
    expect(await receivesPointer(trigger), `셀렉트 ${index}`).toBe(true);
  }
  await expect(page.locator(REFRESH)).toBeEnabled();
  expect(await receivesPointer(page.locator(REFRESH)), "새로고침").toBe(true);
}

test("새Logo침 요청에 0.3초가 지나도 Response가 없으면 Card 네 개의 내용만 옅게 잠기고 한 번에 오면 같이 풀리며, Layout, 제목, 조건 Input, 새Logo침, 갱신 시각은 그대로이고 검정 화면은 없음", async ({ page }) => {
  await openWatching(page, { entryMs: 0, searchMs: 0 });
  await waitForSettled(page);
  await setLatency(page, { entryMs: 4000, searchMs: 4000 });
  const framesBefore = await rects(page, WAIT_FRAMES);
  const timeBefore = (await page.locator(REFRESH_TIME).textContent()) ?? "";
  await clearWaitMarks(page);

  await page.locator(REFRESH).click();
  for (const name of CARD_NAMES) await expect(page.locator(busy(name)), name).toHaveCount(1);
  await expectSummaryAndHistoryDimmed(page);
  const framesWaiting = await rects(page, WAIT_FRAMES);
  for (const [index, frame] of framesWaiting.entries()) {
    expect(frame, WAIT_FRAMES[index]).toEqual(framesBefore[index]);
  }
  await expect(page.locator(REFRESH_TIME)).toHaveText(timeBefore);

  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 8000 });
  for (const selector of DIMMED_CONTENT) {
    expect([...new Set(await effectiveOpacities(page, selector))], selector).toEqual([1]);
  }
  await expect(page.locator(`${RISK_ROW}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator(`${HISTORY_ROW}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator(RISK_ROW).first()).toHaveCSS("pointer-events", "auto");
  await expect(page.locator(REFRESH_TIME)).toHaveText(/^갱신 \d{2}:\d{2}:\d{2}$/);
  await expect(page.locator(REFRESH_TIME)).not.toHaveText(timeBefore);

  const recorded = await readWaitMarks(page);
  for (const name of CARD_NAMES) {
    expect(timesOf(recorded, `${name}+`), name).toHaveLength(1);
    expect(timesOf(recorded, `${name}-`), name).toHaveLength(1);
    for (const delay of delaysAfterPress(recorded, name)) expect(delay, name).toBeGreaterThanOrEqual(WAIT_FEEDBACK_MS - 10);
  }
  const releasedAt = CARD_NAMES.map((name) => timesOf(recorded, `${name}-`)[0]);
  expect(Math.max(...releasedAt) - Math.min(...releasedAt)).toBeLessThanOrEqual(500);
  expect(shownMarks(recorded).filter((name) => name.startsWith("overlay") || name.startsWith("skeleton"))).toEqual([]);
  expect(recorded.filter(([name]) => name.startsWith("time "))).toHaveLength(1);
});

test("장치나 기간을 바꾸면 이상 감지 내역 Card의 내용만 0.3초 뒤 옅게 잠기고 Response가 오면 풀리며, KPI Column, 랭킹, 커버리지, 갱신 시각은 그대로임", async ({ page }) => {
  await openWatching(page, { entryMs: 0, searchMs: 2500 });
  await waitForSettled(page);
  await clearWaitMarks(page);

  for (const [triggerIndex, label] of [[0, "구동 기어"], [1, "최근 30일"]] as const) {
    await pickOption(page, triggerIndex, label);
    await expect(page.locator(TRIGGERS).nth(triggerIndex)).toHaveText(label);
    await expect(page.locator(busy("history"))).toHaveCount(1);
    await expect(page.locator(`${HISTORY_ROW}[aria-disabled="true"]`)).toHaveCount(7);
    expect([...new Set(await effectiveOpacities(page, '[data-slot="anomaly-history-notes"]'))]).toEqual([0.5]);
    expect([...new Set(await effectiveOpacities(page, TRIGGERS))]).toEqual([1]);
    for (const name of SUMMARY_CARDS) await expect(page.locator(busy(name)), name).toHaveCount(0);
    await expect(page.locator(`${RISK_ROW}[aria-disabled="true"]`)).toHaveCount(0);
    expect([...new Set(await effectiveOpacities(page, '[data-slot="kpi-flip-card-value"]'))]).toEqual([1]);
    expect([...new Set(await effectiveOpacities(page, '[data-slot="model-coverage-rows"]'))]).toEqual([1]);
    await expect(page.locator(busy("history"))).toHaveCount(0, { timeout: 6000 });
    await expect(page.locator(`${HISTORY_ROW}[aria-disabled="true"]`)).toHaveCount(0);
  }

  const recorded = await readWaitMarks(page);
  expect(shownMarks(recorded)).toEqual(["history+", "history-", "history+", "history-"]);
  for (const delay of delaysAfterPress(recorded, "history")) expect(delay).toBeGreaterThanOrEqual(WAIT_FEEDBACK_MS - 10);
  expect(recorded.filter(([name]) => name.startsWith("time "))).toEqual([]);
});

test("새Logo침 중에 장치를 바꾸면 요약 Card 셋과 이상 감지 내역 Card가 각자 Response가 올 때 따로 풀림", async ({ page }) => {
  await openWatching(page, { entryMs: 0, searchMs: 0 });
  await waitForSettled(page);

  await setLatency(page, { entryMs: 1000, searchMs: 3000 });
  await clearWaitMarks(page);
  await page.locator(REFRESH).click();
  await pickOption(page, 0, "구동 기어");
  await expect(page.locator(busy("history"))).toHaveCount(1);
  for (const name of SUMMARY_CARDS) await expect(page.locator(busy(name)), name).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator(busy("history"))).toHaveCount(1);
  await expect(page.locator(`${RISK_ROW}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator(`${HISTORY_ROW}[aria-disabled="true"]`)).toHaveCount(7);
  await expect(page.locator(busy("history"))).toHaveCount(0, { timeout: 6000 });
  let recorded = await readWaitMarks(page);
  for (const name of SUMMARY_CARDS) expect(timesOf(recorded, `${name}+`), name).toHaveLength(1);
  const summaryReleasedAt = SUMMARY_CARDS.map((name) => timesOf(recorded, `${name}-`)[0]);
  expect(Math.max(...summaryReleasedAt) - Math.min(...summaryReleasedAt)).toBeLessThanOrEqual(100);
  expect(timesOf(recorded, "history-")[0] - Math.max(...summaryReleasedAt)).toBeGreaterThanOrEqual(1000);

  await setLatency(page, { entryMs: 5000, searchMs: 600 });
  await clearWaitMarks(page);
  await page.locator(REFRESH).click();
  for (const name of CARD_NAMES) await expect(page.locator(busy(name)), name).toHaveCount(1);
  await pickOption(page, 0, "견인 전동기");
  await expect(page.locator(busy("history"))).toHaveCount(0, { timeout: 4000 });
  for (const name of SUMMARY_CARDS) await expect(page.locator(busy(name)), name).toHaveCount(1);
  await expect(page.locator(`${HISTORY_ROW}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator(`${RISK_ROW}[aria-disabled="true"]`)).toHaveCount(10);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 8000 });
  recorded = await readWaitMarks(page);
  for (const name of CARD_NAMES) expect(timesOf(recorded, `${name}-`), name).toHaveLength(1);
  expect(Math.min(...SUMMARY_CARDS.map((name) => timesOf(recorded, `${name}-`)[0])) - timesOf(recorded, "history-")[0]).toBeGreaterThanOrEqual(500);
});

test("잠긴 동안 옛 Row는 Click하거나 Keyboard로 골라도 선택되거나 넘어가지 않고, 장치 Input과 새Logo침은 Click되어 다시 호출하며 늦게 온 앞 Response는 버려짐", async ({ page }) => {
  await openWatching(page, { entryMs: 0, searchMs: 0 });
  await waitForSettled(page);
  await expect(page.locator(RISK_ROW).nth(0)).toHaveAttribute("aria-selected", "true");
  const timeBefore = (await page.locator(REFRESH_TIME).textContent()) ?? "";

  await setLatency(page, { entryMs: 4000, searchMs: 4000, ignoreAbort: true });
  await clearWaitMarks(page);
  await page.locator(REFRESH).click();
  for (const name of CARD_NAMES) await expect(page.locator(busy(name)), name).toHaveCount(1);

  const rankingRow = page.locator(RISK_ROW).nth(3);
  expect(await receivesPointer(rankingRow)).toBe(false);
  await rankingRow.click({ force: true });
  await rankingRow.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press(" ");
  await expect(rankingRow).toHaveAttribute("aria-selected", "false");
  await expect(page.locator(RISK_ROW).nth(0)).toHaveAttribute("aria-selected", "true");

  const historyRow = page.locator(HISTORY_ROW).nth(0);
  expect(await receivesPointer(historyRow)).toBe(false);
  await historyRow.click({ force: true });
  await historyRow.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press(" ");
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/dashboard\/fleet$/);

  await pickOption(page, 0, "견인 전동기");
  await expect(page.locator(TRIGGERS).nth(0)).toHaveText("견인 전동기");
  const firstRefreshAt = timesOf(await readWaitMarks(page), "refresh")[0];
  const elapsed = await page.evaluate(() => performance.now());
  await page.waitForTimeout(Math.max(0, firstRefreshAt + 1200 - elapsed));
  await page.locator(REFRESH).click();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 10000 });

  const recorded = await readWaitMarks(page);
  const refreshes = timesOf(recorded, "refresh");
  expect(refreshes).toHaveLength(2);
  expect(refreshes[1]).toBeLessThan(refreshes[0] + 4000);
  for (const name of CARD_NAMES) {
    expect(timesOf(recorded, `${name}+`), name).toHaveLength(1);
    expect(timesOf(recorded, `${name}-`), name).toHaveLength(1);
    expect(timesOf(recorded, `${name}-`)[0], name).toBeGreaterThanOrEqual(refreshes[1] + 4000 - 50);
  }
  const timeChanges = recorded.filter(([name]) => name.startsWith("time "));
  expect(timeChanges).toHaveLength(1);
  expect(timeChanges[0][1]).toBeGreaterThanOrEqual(refreshes[1] + 4000 - 50);
  await expect(page.locator(REFRESH_TIME)).not.toHaveText(timeBefore);
  expect(shownMarks(recorded).filter((name) => name.startsWith("overlay") || name.startsWith("skeleton"))).toEqual([]);

  await rankingRow.click();
  await expect(rankingRow).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(TRIGGERS).nth(0)).toHaveText("견인 전동기");
});

test("0.3초 안에 Response가 오면 새Logo침, 장치, 기간 모두 옅은 잠금과 검정 화면 없이 바로 바뀜", async ({ page }) => {
  await openWatching(page, { entryMs: 50, searchMs: 50 });
  await waitForSettled(page);
  const timeBefore = (await page.locator(REFRESH_TIME).textContent()) ?? "";
  await page.waitForTimeout(1100);
  await clearWaitMarks(page);

  await page.locator(REFRESH).click();
  await expect(page.locator(REFRESH_TIME)).not.toHaveText(timeBefore);
  await pickOption(page, 0, "구동 기어");
  await pickOption(page, 1, "최근 90일");
  await page.waitForTimeout(WAIT_FEEDBACK_MS + 300);

  const recorded = await readWaitMarks(page);
  expect(timesOf(recorded, "refresh")).toHaveLength(1);
  expect(shownMarks(recorded)).toEqual([]);
  await expect(page.locator('[aria-disabled="true"][data-slot="table-row"]')).toHaveCount(0);
  await page.locator(RISK_ROW).nth(2).click();
  await expect(page.locator(RISK_ROW).nth(2)).toHaveAttribute("aria-selected", "true");
});

test("새Logo침 중 요약 조회가 실패하면 지금처럼 실패 Text로 바뀌고 옅게 잠긴 채 남지 않으며, 다시 새Logo침하면 돌아옴", async ({ page }) => {
  await openWatching(page, { entryMs: 0, searchMs: 0 });
  await waitForSettled(page);

  await setLatency(page, { entryMs: 2000, searchMs: 2000, failNames: ["fleetOverview"] });
  await clearWaitMarks(page);
  await page.locator(REFRESH).click();
  await expect(page.locator(busy("kpi"))).toHaveCount(1);
  const alert = page.getByRole("alert").filter({ hasText: ERROR_TEXT });
  await expect(alert).toBeVisible({ timeout: 6000 });
  await expect(page.locator(OVERVIEW)).toHaveCount(0);
  await expect(page.locator(SKELETON)).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.locator(REFRESH)).toBeEnabled();
  expect(shownMarks(await readWaitMarks(page)).filter((name) => name.startsWith("overlay"))).toEqual([]);

  await setLatency(page, { entryMs: 800, searchMs: 800 });
  await page.locator(REFRESH).click();
  await expect(page.locator(RISK_ROW).first()).toBeVisible({ timeout: 4000 });
  await expect(alert).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.locator(`${RISK_ROW}[aria-disabled="true"]`)).toHaveCount(0);
});

test("장치를 바꾸는 중 이상 감지 내역 조회가 실패하면 지금처럼 실패 Text로 바뀌고 옅게 잠긴 채 남지 않으며, 새Logo침하면 돌아옴", async ({ page }) => {
  await openWatching(page, { entryMs: 0, searchMs: 0 });
  await waitForSettled(page);

  await setLatency(page, { entryMs: 2000, searchMs: 2000, failNames: ["anomalyHistory"] });
  await clearWaitMarks(page);
  await pickOption(page, 0, "구동 기어");
  await expect(page.locator(busy("history"))).toHaveCount(1);
  const alert = page.getByRole("alert").filter({ hasText: ERROR_TEXT });
  await expect(alert).toBeVisible({ timeout: 6000 });
  await expect(page.locator(OVERVIEW)).toHaveCount(0);
  await expect(page.locator(SKELETON)).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.locator(REFRESH)).toBeEnabled();
  expect(shownMarks(await readWaitMarks(page)).filter((name) => name.startsWith("overlay"))).toEqual([]);

  await setLatency(page, { entryMs: 800, searchMs: 800 });
  await page.locator(REFRESH).click();
  await expect(page.locator(HISTORY_ROW).first()).toBeVisible({ timeout: 4000 });
  await expect(alert).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.locator(`${HISTORY_ROW}[aria-disabled="true"]`)).toHaveCount(0);
  await expect(page.locator(TRIGGERS).nth(0)).toHaveText("구동 기어");
});
