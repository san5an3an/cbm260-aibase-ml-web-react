import { expect, test, type Page } from "@playwright/test";
import { measure } from "./helpers/measure";
import { collectSlotRects, doubledMismatches } from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const BASE_FONT_SIZE = 16;
const RAIL_WIDTH = 72;
const TOP_BAR_HEIGHT = 58;

const SCREENS = [
  { path: "/dashboard/fleet", ready: '[data-slot="fleet-overview"]' },
  { path: "/dashboard/timeline", ready: '[data-slot="chart-bar"]' },
  { path: "/dashboard/alarms", ready: '[data-slot="chart-stack-segment"]' },
  { path: "/dashboard/measures", ready: '[data-slot="sensor-frequency-ranking-card"]' },
  { path: "/info/training", ready: '[data-slot="training-job-list"] [data-slot="job-card"]' },
  { path: "/info/inference", ready: '[data-slot="inference-job-list"] [data-slot="job-card"]' },
  { path: "/model/config", ready: '[data-slot="model-config-list-card"] tbody [data-slot="table-row"]' },
  { path: "/info/anomaly", ready: '[data-slot="anomaly-heatmap-cell"]' },
];

async function openScreen(
  page: Page,
  screen: (typeof SCREENS)[number],
  width: number,
  height: number,
): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto(screen.path);
  await expect(page.locator(screen.ready).first()).toBeVisible();
  await expect(page.locator('[data-slot="session-chip-remaining"]')).not.toHaveText("--:--");
  await page.waitForTimeout(500);
}

async function rootFontSize(page: Page): Promise<number> {
  return page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
}

for (const viewport of [
  { width: 3840, height: 2160, scale: 2 },
  { width: 2560, height: 1440, scale: 4 / 3 },
  { width: 3440, height: 1440, scale: 4 / 3 },
  { width: 2560, height: 1080, scale: 1 },
  { width: 1920, height: 1080, scale: 1 },
  { width: 1440, height: 900, scale: 1 },
  { width: 1280, height: 720, scale: 1 },
]) {
  test(`화면 크기에 따른 배율 (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await openScreen(page, SCREENS[0], viewport.width, viewport.height);

    expect(await rootFontSize(page)).toBeCloseTo(BASE_FONT_SIZE * viewport.scale, 2);

    const rail = await measure(page, '[data-slot="left-rail"]');
    expect(rail.width).toBeCloseTo(RAIL_WIDTH * viewport.scale, 1);

    const topBar = await measure(page, '[data-slot="top-bar"]');
    expect(topBar.height).toBeCloseTo(TOP_BAR_HEIGHT * viewport.scale, 1);
  });
}

for (const screen of SCREENS) {
  test(`3840×2160 화면은 1920×1080 화면의 2배임 (${screen.path})`, async ({ page }) => {
    await openScreen(page, screen, 1920, 1080);
    const base = await collectSlotRects(page);

    await openScreen(page, screen, 3840, 2160);
    const doubled = await collectSlotRects(page);

    expect(doubled.map((rect) => rect.slot)).toEqual(base.map((rect) => rect.slot));
    expect(doubledMismatches(base, doubled)).toEqual([]);
  });
}
