import { expect, test, type Page } from "@playwright/test";
import { measure, openFixedScreen, pickOption } from "./helpers/measure";
import { box, collectSlotRects, doubledMismatches, styleOf, texts } from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const PATH = "/model/diagnostics";
const FILTER = '[data-slot="diagnostics-filter-bar"]';
const LEARNING = '[data-slot="learning-health-card"]';
const VISUAL = '[data-slot="diagnostic-visualization-card"]';
const ROOT_CAUSE = '[data-slot="vae-root-cause-card"]';
const BAR = `${VISUAL} [data-slot="chart-bar"]`;

async function openDiagnostics(page: Page, width = 1920, height = 1080) {
  await openFixedScreen(page, PATH, BAR, width, height);
  await expect(page.locator(`${LEARNING} [data-slot="chart-dot"]`)).toHaveCount(2);
}

test("조건 Row의 Cell Width, Height, 처음 값, 안내 Text 확인", async ({ page }) => {
  await openDiagnostics(page);
  const triggers = page.locator(`${FILTER} [data-slot="select-trigger"]`);
  await expect(triggers).toHaveCount(3);
  const widths = await triggers.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().width));
  expect(widths).toEqual([190, 120, 320]);
  for (const height of await triggers.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height))) {
    expect(height).toBe(32);
  }
  await expect(triggers.nth(0)).toHaveText("DRIVING_GEAR");
  await expect(triggers.nth(1)).toHaveText("VAE");
  await expect(triggers.nth(2)).toHaveText("버전 20260920T111321 · default");
  const load = page.getByRole("button", { name: "불러오기" });
  expect((await load.boundingBox())?.height).toBe(32);
  const hint = await measure(page, '[data-slot="diagnostics-filter-hint"]');
  expect(hint.style.fontSize).toBe("12px");
  expect(await styleOf(page, FILTER, "padding")).toBe("16px");
});

test("Card 위치 확인, 학습 건강도 Height, 근본원인 Width, 사이 간격 14", async ({ page }) => {
  await openDiagnostics(page);
  const learning = await box(page, LEARNING);
  const visual = await box(page, VISUAL);
  const rootCause = await box(page, ROOT_CAUSE);
  expect(learning.height).toBeGreaterThanOrEqual(320);
  expect(learning.height).toBeLessThanOrEqual(404);
  expect(visual.y - (learning.y + learning.height)).toBeCloseTo(14, 1);
  expect(rootCause.width).toBeCloseTo(633.6, 1);
  expect(rootCause.x - (learning.x + learning.width)).toBeCloseTo(14, 1);
  expect(await styleOf(page, LEARNING, "border-radius")).toBe("16px");
  expect(await styleOf(page, LEARNING, "padding")).toBe("16px 18px");
});

test("학습 건강도 곡선의 세로 눈금, 반복 Text, 상자 확인", async ({ page }) => {
  await openDiagnostics(page);
  expect(await texts(page, `${LEARNING} [data-slot="chart-value-tick"]`)).toEqual([
    "1.00",
    "0.75",
    "0.50",
    "0.25",
    "0.00",
  ]);
  expect(await texts(page, `${LEARNING} [data-slot="learning-health-epoch-labels"] span`)).toEqual([
    "epoch 1",
    "epoch 11",
    "epoch 21",
    "epoch 31",
    "epoch 40",
  ]);
  expect(await styleOf(page, '[data-slot="learning-health-chart-box"]', "border-radius")).toBe("10px");
  expect(await styleOf(page, '[data-slot="learning-health-chart-box"]', "padding")).toBe("16px");
  const plot = await box(page, '[data-slot="learning-health-curve-chart"]');
  const labels = await box(page, '[data-slot="learning-health-epoch-labels"]');
  expect(labels.y - (plot.y + plot.height)).toBeCloseTo(6, 0);
});

test("모델 진단 시각화의 Bar 56, 임계값을 넘은 Bar 16, Label, 가로 눈금, Tooltip 확인", async ({ page }) => {
  await openDiagnostics(page);
  await expect(page.locator(BAR)).toHaveCount(56);
  await expect(page.locator(`${BAR}[data-tone="over"]`)).toHaveCount(16);
  await expect(page.locator(`${VISUAL} [data-slot="state-pill"]`)).toHaveText("VAE · 잠재공간 재구성오차");
  await expect(page.locator('[data-slot="score-distribution-threshold-label"]')).toHaveText("임계 0.0433");
  expect(await texts(page, '[data-slot="score-distribution-x-ticks"] span')).toEqual([
    "0.000",
    "0.012",
    "0.024",
    "0.036",
    "0.048",
    "0.060",
  ]);
  const chart = await box(page, '[data-slot="score-distribution-chart"]');
  const line = await box(page, '[data-slot="score-distribution-threshold-line"]');
  expect(line.x - chart.x).toBeCloseTo((chart.width * 0.0433) / 0.06, 0);
  expect(await styleOf(page, '[data-slot="diagnostic-visualization-box"]', "padding")).toBe("40px 24px 16px");
  const target = page.locator(BAR).nth(45);
  const rect = await target.boundingBox();
  await page.mouse.move(rect!.x + rect!.width / 2, rect!.y + rect!.height / 2);
  const tooltip = page.locator(`${VISUAL} [data-slot="chart-hover-tooltip"]`);
  await expect(tooltip).toContainText("재구성오차 0.0482 – 0.0493");
  await expect(tooltip).toContainText("window · 임계 초과");
  await expect(page.locator(`${VISUAL} [data-slot="chart-hovered-column"]`)).toHaveCount(1);
});

test("근본원인 리포트의 상위 window 8개 Row와 빈도 3개 Row 확인", async ({ page }) => {
  await openDiagnostics(page);
  const rows = page.locator(`${ROOT_CAUSE} tbody [data-slot="table-row"]`);
  await expect(rows).toHaveCount(8);
  await expect(rows.first().locator("td")).toHaveText(["09-21 14:22", "베어링 진동 RMS", "0.512", "6.3"]);
  expect((await rows.first().boundingBox())?.height).toBe(40);
  expect(await texts(page, `${ROOT_CAUSE} [data-slot="bar-list-item"] [data-slot="ratio-bar-label"]`)).toEqual([
    "12",
    "9",
    "6",
  ]);
});

test("불러오기를 누르면 고른 장치와 Model로 다시 조회하고, VAE가 아니면 근본원인 대신 안내를 표시함", async ({ page }) => {
  await openDiagnostics(page);
  await page.getByRole("combobox", { name: "모델" }).click();
  await pickOption(page, "IF");
  await expect(page.locator(`${VISUAL} [data-slot="state-pill"]`)).toHaveText("VAE · 잠재공간 재구성오차");
  await page.getByRole("button", { name: "불러오기" }).click();
  await expect(page.locator('[data-slot="toast"]')).toHaveText(
    "DRIVING_GEAR · IF 버전 목록을 불러와 최신 버전을 표시했습니다.",
  );
  await expect(page.locator(`${VISUAL} [data-slot="state-pill"]`)).toHaveText("IF · 트리 깊이");
  await expect(page.locator('[data-slot="vae-root-cause-empty"]')).toContainText("VAE에서만 제공됩니다");
  await expect(page.locator(`${ROOT_CAUSE} tbody [data-slot="table-row"]`)).toHaveCount(0);
});

test("버전을 고르면 고른 버전으로 진단을 다시 받음", async ({ page }) => {
  await openDiagnostics(page);
  const version = page.getByRole("combobox", { name: "버전" });
  await version.click();
  await pickOption(page, "버전 20260913T101204 · default");
  await expect(version).toHaveText("버전 20260913T101204 · default");
  await expect(page.locator(BAR)).toHaveCount(56);
});

test("3840 × 2160은 1920 × 1080의 2배", async ({ page }) => {
  await openDiagnostics(page);
  await page.waitForTimeout(500);
  const base = await collectSlotRects(page);
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.waitForTimeout(800);
  const doubled = await collectSlotRects(page);
  const counts = (rects: typeof base) =>
    rects.reduce<Record<string, number>>((all, rect) => ({ ...all, [rect.slot]: (all[rect.slot] ?? 0) + 1 }), {});
  expect(counts(doubled)).toEqual(counts(base));
  const allowed = (line: string) => {
    const match = /^([\w-]+)\[\d+\]\.(\w+): ([\d.]+) → ([\d.]+)$/.exec(line);
    if (!match) return false;
    const [, slot, key, before, after] = match;
    const gap = Math.abs(Number(after) - Number(before) * 2);
    if (["chart-bar", "chart-dot", "chart-baseline"].includes(slot)) return gap <= 1.5;
    return slot === "score-distribution-threshold-line" && key === "width" && gap <= 1;
  };
  expect(doubledMismatches(base, doubled).filter((line) => !allowed(line))).toEqual([]);
});

test("모델 진단 시각화에서 임계값 점선은 Hover한 Cell의 회색 Bar보다 위에 표시됨", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/model/diagnostics");
  const line = page.locator('[data-slot="score-distribution-threshold-line"]');
  await expect(line).toBeVisible();
  const box = (await line.boundingBox())!;
  await page.mouse.move(box.x + 1, box.y + box.height / 2);
  expect(await line.evaluate((element) => getComputedStyle(element).zIndex)).toBe("10");
  await expect(line).toBeVisible();
});
