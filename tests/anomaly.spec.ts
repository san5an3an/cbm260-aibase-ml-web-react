import { expect, test, type Page } from "@playwright/test";
import { color, measure, MOCK_TODAY, openFixedScreen, pickOption } from "./helpers/measure";
import { box, collectSlotRects, doubledMismatches, modal, texts } from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const PATH = "/info/anomaly";
const FILTER = '[data-slot="anomaly-detection-filter-bar"]';
const HEATMAP = '[data-slot="anomaly-heatmap-card"]';
const DETAIL = '[data-slot="anomaly-detail-card"]';
const ROW = `${HEATMAP} [data-slot="anomaly-heatmap-row"]`;
const CELL = `${HEATMAP} [data-slot="anomaly-heatmap-cell"]`;
const EVENT_ROW = `${DETAIL} tbody [data-slot="table-row"]`;
const RAW = modal("anomaly-raw");

function isoDaysAgo(daysAgo: number): string {
  const day = new Date(MOCK_TODAY.getFullYear(), MOCK_TODAY.getMonth(), MOCK_TODAY.getDate() - daysAgo);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

async function openAnomaly(page: Page, width = 1920, height = 1080): Promise<void> {
  await openFixedScreen(page, PATH, CELL, width, height);
  await expect(page.locator(EVENT_ROW).first()).toBeVisible();
}

async function openRaw(page: Page): Promise<void> {
  await page.locator(EVENT_ROW).first().getByRole("button", { name: "원본 보기" }).click();
  await expect(page.locator(`${RAW} [data-slot="anomaly-graph-row"]`).first()).toBeVisible();
}

test("조건 Row의 편성 160, 기간 280, 최근 30일, 기간 안내 확인", async ({ page }) => {
  await openAnomaly(page);
  const filter = await measure(page, FILTER);
  expect(filter.style.paddingTop).toBe("16px");
  expect(filter.style.columnGap).toBe("10px");
  expect((await box(page, `${FILTER} [data-slot="select-trigger"]`)).width).toBeCloseTo(160, 0);
  const trigger = await box(page, `${FILTER} [data-slot="date-range-trigger"]`);
  expect(trigger.width).toBeCloseTo(280, 0);
  expect(trigger.height).toBeCloseTo(32, 0);
  await expect(page.locator(`${FILTER} [data-slot="date-range-trigger"]`)).toContainText(
    `${isoDaysAgo(29)} ~ ${isoDaysAgo(0)}`,
  );
  await expect(page.locator(`${FILTER} [data-slot="segmented"] [aria-pressed="true"]`)).toHaveText("30일");
  const memo = await measure(page, '[data-slot="anomaly-detection-period-memo"]');
  expect(memo.style.fontSize).toBe("12px");
  await expect(page.locator('[data-slot="anomaly-detection-period-memo"]')).toHaveText("30일");
});

test("장치별 이상 현황의 Row, Cell, 합계, 범례, Cell Color 확인", async ({ page }) => {
  await openAnomaly(page);
  await expect(page.locator(`${HEATMAP} [data-slot="section-card-description"]`)).toHaveText(
    "전체 편성 · 추론 결과가 있는 장치 3개 중 3개에서 이상",
  );
  expect(await texts(page, `${ROW} [data-slot="anomaly-heatmap-device"]`)).toEqual([
    "차축 베어링",
    "출입문장치",
    "주공기 압축기",
  ]);
  expect(await texts(page, `${ROW} [data-slot="anomaly-heatmap-total"]`)).toEqual([
    "12일 · 55회",
    "10일 · 31회",
    "8일 · 22회",
  ]);
  await expect(page.locator(`${HEATMAP} [data-slot="anomaly-heatmap-date"]`)).toHaveCount(30);
  await expect(page.locator(`${ROW}:nth-child(2) [data-slot="anomaly-heatmap-cell"]`)).toHaveCount(30);
  expect(await texts(page, `${HEATMAP} [data-slot="anomaly-heatmap-legend"] > span`)).toEqual([
    "이상 없음",
    "1~2회",
    "3~5회",
    "6회 이상",
    "추론 결과 없음",
  ]);
  const firstRow = `${ROW}:nth-child(2) [data-slot="anomaly-heatmap-cell"]`;
  const today = await measure(page, firstRow, 29);
  expect(today.height).toBeCloseTo(38, 0);
  expect(today.style.fontSize).toBe("13px");
  expect(today.style.fontWeight).toBe("700");
  expect(today.style.borderTopLeftRadius).toBe("2px");
  expect(today.style.backgroundColor).toBe(await color(page, "var(--warning)"));
  expect((await measure(page, firstRow, 17)).style.backgroundColor).toBe(await color(page, "var(--danger)"));
  expect((await measure(page, firstRow, 16)).style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect((await measure(page, firstRow, 15)).style.backgroundColor).toBe(await color(page, "var(--card)"));
  await expect(page.locator(`${firstRow}[aria-pressed="true"]`)).toHaveCount(1);
  expect((await measure(page, firstRow, 17)).style.boxShadow).toContain("inset");
  expect((await box(page, `${ROW}:nth-child(2) > span:first-child`)).width).toBeCloseTo(190, 0);
  expect((await box(page, `${ROW}:nth-child(2) [data-slot="anomaly-heatmap-total"]`)).width).toBeCloseTo(110, 0);
  const toggle = page.locator('[data-slot="anomaly-heatmap-none-toggle"]');
  await expect(toggle).toHaveText("추론 결과 없는 장치 18개 보기");
  await toggle.click();
  await expect(page.locator(ROW)).toHaveCount(21);
  await expect(toggle).toHaveText("추론 결과 없는 장치 숨기기");
});

test("장치와 날짜 상세의 요약, 편성 칩, 판정 Table 확인", async ({ page }) => {
  await openAnomaly(page);
  expect(await texts(page, `${DETAIL} [data-slot="key-value-row-value"]`)).toEqual([
    "차축 베어링",
    `${isoDaysAgo(12)} (금)`,
    "전체",
    "14회",
  ]);
  const chips = `${DETAIL} [data-slot="anomaly-detail-chip"]`;
  expect(await texts(page, chips)).toEqual(["4015회", "4023회", "4036회"]);
  const chip = await box(page, chips);
  expect(chip.width).toBeCloseTo(72, 0);
  expect(chip.height).toBeCloseTo(52, 0);
  await expect(page.locator(EVENT_ROW)).toHaveCount(14);
  expect((await measure(page, `${DETAIL} thead [data-slot="table-row"]`)).height).toBeCloseTo(44, 0);
  expect((await measure(page, EVENT_ROW)).height).toBeCloseTo(40, 0);
  await expect(page.locator(`${DETAIL} thead th`)).toHaveText([
    "발생 시각",
    "편성",
    "호차 · 위치",
    "원인 장치",
    "대표 원인",
    "원본",
  ]);
  await expect(page.locator(EVENT_ROW).first()).toHaveAttribute(
    "title",
    `${isoDaysAgo(12)} 05:04:15 ~ 05:04:45`,
  );
  expect((await box(page, `${DETAIL} [data-slot="anomaly-detail-summary"]`)).width).toBeCloseTo(340, 0);
  await page.locator(chips).nth(2).click();
  await expect(page.locator(EVENT_ROW)).toHaveCount(6);
  await expect(page.locator('[data-slot="anomaly-detail-count"]')).toHaveText(
    "목록 6건 · 표 영역 안에서 스크롤해 나머지를 봅니다",
  );
});

test("조건을 바꾸면 다시 조회함, 최근 7일, 편성 401, Cell 고르기 확인", async ({ page }) => {
  await openAnomaly(page);
  await page.locator(`${FILTER} [data-slot="segmented"]`).getByRole("button", { name: "7일" }).click();
  await expect(page.locator(`${HEATMAP} [data-slot="anomaly-heatmap-date"]`)).toHaveCount(7);
  await expect(page.locator(`${FILTER} [data-slot="date-range-trigger"]`)).toContainText(
    `${isoDaysAgo(6)} ~ ${isoDaysAgo(0)}`,
  );
  await expect(page.locator(`${CELL}[aria-pressed="true"]`)).toHaveCount(1);

  await page.locator(`${FILTER} [data-slot="segmented"]`).getByRole("button", { name: "30일" }).click();
  await page.getByRole("combobox", { name: "편성" }).click();
  await pickOption(page, "편성 401");
  await expect(page.locator(`${HEATMAP} [data-slot="section-card-description"]`)).toHaveText(
    "편성 401 · 추론 결과가 있는 장치 3개 중 3개에서 이상",
  );
  const chips = `${DETAIL} [data-slot="anomaly-detail-chip"]`;
  await expect(page.locator(chips)).toHaveCount(10);
  expect(await texts(page, chips)).toEqual([
    "00정상", "01정상", "02정상", "03정상", "042회", "05정상", "06정상", "073회", "08정상", "09정상",
  ]);
  expect((await measure(page, chips, 7)).style.backgroundColor).toBe(await color(page, "var(--danger)"));
  expect((await measure(page, chips, 4)).style.backgroundColor).toBe(await color(page, "var(--warning)"));
  await expect(page.locator(`${DETAIL} thead th`)).toHaveCount(5);
  await expect(page.locator(EVENT_ROW)).toHaveCount(5);

  await page.locator(`${ROW}:nth-child(3) [data-slot="anomaly-heatmap-cell"]`).nth(29 - 1).click();
  await expect(page.locator(`${DETAIL} [data-slot="key-value-row-value"]`).first()).toHaveText("출입문장치");
  await expect(page.locator(`${DETAIL} [data-slot="key-value-row-value"]`).nth(1)).toHaveText(
    `${isoDaysAgo(1)} (화)`,
  );
});

test("이상 상세 Graph의 Layout, Tab, 값 고르기, 범위, Tooltip 확인", async ({ page }) => {
  await openAnomaly(page);
  await openRaw(page);
  const frame = await box(page, RAW);
  expect(frame.width).toBeCloseTo(1240, 0);
  await expect(page.locator(`${RAW} [data-slot="anomaly-raw-subtitle"]`)).toHaveText(
    `편성 401 · 4호차 · 4014-H-1-True · 이상 window ${isoDaysAgo(12)} 05:04:15 ~ 05:04:45`,
  );
  const tab = await box(page, `${RAW} [data-slot="anomaly-raw-tabs"] button`);
  expect(tab.width).toBeCloseTo(150, 0);
  expect(tab.height).toBeCloseTo(26, 0);
  await expect(page.locator(`${RAW} [data-slot="anomaly-graph-row"]`)).toHaveCount(8);
  expect((await box(page, `${RAW} [data-slot="anomaly-graph-row"]`)).height).toBeCloseTo(92, 0);
  expect(await texts(page, `${RAW} [data-slot="anomaly-cause-tag"]`)).toEqual([
    "대표 원인",
    "상위 원인 2",
    "상위 원인 3",
  ]);
  await expect(page.locator(`${RAW} [data-slot="anomaly-graph-from"]`)).toHaveText("04:54:15");
  await expect(page.locator(`${RAW} [data-slot="anomaly-graph-to"]`)).toHaveText("05:14:15");
  await expect(page.locator(`${RAW} [data-slot="anomaly-pair-path"]`)).toHaveCount(1);

  await page.locator('[data-slot="anomaly-signal-picker-trigger"]').click();
  await page.locator('[data-slot="anomaly-signal-option"]').filter({ hasText: "차축 가속도 X" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-slot="anomaly-signal-picker-trigger"]')).toHaveText("값 고르기 (7/8개 표시 중)");
  await expect(page.locator(`${RAW} [data-slot="anomaly-graph-row"]`)).toHaveCount(7);

  await page.locator(RAW).getByRole("button", { name: "±2분" }).click();
  await expect(page.locator(`${RAW} [data-slot="anomaly-graph-from"]`)).toHaveText("05:02:15");

  const trace = page.locator(`${RAW} [data-slot="anomaly-signal-trace"]`).first();
  const rect = (await trace.boundingBox())!;
  await page.mouse.move(rect.x + rect.width * 0.5 + 2, rect.y + rect.height / 2);
  await expect(page.locator(`${RAW} [data-slot="anomaly-trace-tooltip"]`)).toContainText("이상 window 안");
  await page.mouse.move(rect.x + 2, rect.y + rect.height / 2);
  await expect(page.locator(`${RAW} [data-slot="anomaly-trace-tooltip"]`)).not.toContainText("이상 window 안");
});

test("원본 Table의 Column, 고정 Column, 이상 window Row, 닫기 확인", async ({ page }) => {
  await openAnomaly(page);
  await openRaw(page);
  await page.locator(`${RAW} [data-slot="anomaly-raw-tabs"]`).getByRole("button", { name: "원본 표" }).click();
  const table = `${RAW} [data-slot="anomaly-raw-table"]`;
  await expect(page.locator(`${table} [role="columnheader"]`)).toHaveCount(10);
  await expect(page.locator(`${table} [role="columnheader"]`).first()).toHaveAttribute("title", "ts");
  await expect(page.locator(`${table} [data-slot="anomaly-raw-row"]`)).toHaveCount(10);
  await expect(page.locator(`${table} [data-slot="anomaly-raw-row"][data-in-window]`)).toHaveCount(6);
  expect((await box(page, `${table} [data-slot="anomaly-raw-row"]`)).height).toBeCloseTo(40, 0);
  expect((await box(page, `${table} [role="columnheader"]`)).width).toBeCloseTo(110, 0);
  await expect(page.locator(`${table} [data-slot="anomaly-raw-row"]`).nth(2).locator('[role="cell"]').nth(1)).toHaveText("60.8");
  await expect(page.locator(`${RAW} [data-slot="anomaly-table-description"]`)).toContainText("196행");

  await page.locator(RAW).getByRole("button", { name: "닫기" }).last().click();
  await expect(page.locator(RAW)).toHaveCount(0);
});

test("조회 실패 시 현황 실패는 화면 전체에, 원본 실패는 Modal 안에 표시됨", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { cbmMockActions: object }).cbmMockActions = { failNames: ["anomalyRawDetail"] };
  });
  await openAnomaly(page);
  await page.locator(EVENT_ROW).first().getByRole("button", { name: "원본 보기" }).click();
  await expect(page.locator(`${RAW} [role="alert"]`)).toHaveText("원본을 불러오지 못했습니다.");

  await page.evaluate(() => {
    (window as unknown as { cbmMockLatency: object }).cbmMockLatency = { failNames: ["anomalyHeatmap"] };
  });
  await page.keyboard.press("Escape");
  await page.locator(`${FILTER} [data-slot="segmented"]`).getByRole("button", { name: "14일" }).click();
  await expect(page.getByText("이상 감지 내역을 불러오지 못했습니다.")).toBeVisible();
});

test("3840 × 2160은 1920 × 1080의 2배, 본문과 Modal 확인", async ({ page }) => {
  const collect = async (width: number, height: number) => {
    await openAnomaly(page, width, height);
    await page.waitForTimeout(300);
    const body = await collectSlotRects(page);
    await openRaw(page);
    await page.mouse.move(0, 0);
    const rawRects = await collectSlotRects(page);
    return { body, rawRects };
  };
  const base = await collect(1920, 1080);
  const doubled = await collect(3840, 2160);
  expect(doubled.body.length).toBe(base.body.length);
  expect(doubledMismatches(base.body, doubled.body)).toEqual([]);
  expect(doubled.rawRects.length).toBe(base.rawRects.length);
  expect(doubledMismatches(base.rawRects, doubled.rawRects)).toEqual([]);
});

test("원본 조회가 실패한 뒤 같은 이상을 다시 열면 원본을 다시 호출함", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { cbmMockActions: object }).cbmMockActions = { failNames: ["anomalyRawDetail"] };
  });
  await openAnomaly(page);
  const openButton = page.locator(EVENT_ROW).first().getByRole("button", { name: "원본 보기" });
  await openButton.click();
  await expect(page.locator(`${RAW} [role="alert"]`)).toHaveText("원본을 불러오지 못했습니다.");
  await page.evaluate(() => {
    (window as unknown as { cbmMockActions: object }).cbmMockActions = { failNames: [] };
  });
  await page.locator(RAW).getByRole("button", { name: "닫기" }).last().click();
  await expect(page.locator(RAW)).toHaveCount(0);
  await openButton.click();
  await page.locator(`${RAW} [data-slot="anomaly-raw-tabs"]`).getByRole("button", { name: "원본 표" }).click();
  await expect(page.locator(`${RAW} [data-slot="anomaly-raw-table"] [data-slot="anomaly-raw-row"]`)).toHaveCount(10);
  await expect(page.locator(`${RAW} [role="alert"]`)).toHaveCount(0);
});
