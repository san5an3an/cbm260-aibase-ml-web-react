import { expect, test, type Page } from "@playwright/test";
import { color, isoDaysAgo, measure, visibleShadow } from "./helpers/measure";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const FILTER = '[data-slot="timeline-filter-bar"]';
const TREND = '[data-slot="daily-anomaly-trend-card"]';
const DETAIL = '[data-slot="daily-detail-card"]';
const CHART = '[data-slot="daily-anomaly-bar-chart"]';
const BAR = '[data-slot="chart-bar"]';
const BODY_ROW = `${DETAIL} tbody [data-slot="table-row"]`;
const TOOLTIP = `${CHART} [data-slot="chart-hover-tooltip"]`;
const BUBBLE = `${TOOLTIP} [data-slot="chart-tooltip-bubble"]`;

const RATES = [
  3.5, 2.0, 6.5, 2.0, 3.5, 4.0, 24.1, 5.5, 6.1, 5.0, 4.5, 5.0, 6.6, 23.0, 4.1, 4.0, 13.6, 4.6, 3.2,
  2.2, 21.3, 3.8, 3.6, 6.8, 11.5, 2.69, 3.15, 22.16, 6.06, 6.67,
];
const AXIS_WIDTH = 46;
const TOP_MARGIN = 6;
const DATE_ROW_GAP = 8;
const DATE_LINE_HEIGHT = 11 * 1.171875;
const BARS_END_PADDING = 20;
const DEFAULT_SELECTED_INDEX = 27;
const CURSOR_GAP = 12;
const TOOLTIP_WRAPPER = `${CHART} .recharts-tooltip-wrapper`;
const SELECTED_COLUMN = `${CHART} [data-slot="chart-selected-column"]`;
const HOVERED_COLUMN = `${CHART} [data-slot="chart-hovered-column"]`;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function openTimeline(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto("/dashboard/timeline");
  await expect(page.locator(BAR).first()).toBeVisible();
}

async function boxes(page: Page, selector: string): Promise<Box[]> {
  return page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)].map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    selector,
  );
}

async function tooltipEdge(page: Page, edge: "left" | "right" | "top" | "bottom"): Promise<number | null> {
  const [box] = await boxes(page, TOOLTIP);
  if (!box) return null;
  if (edge === "left") return box.x;
  if (edge === "right") return box.x + box.width;
  if (edge === "top") return box.y;
  return box.y + box.height;
}

async function plotArea(page: Page): Promise<Box> {
  const [chart] = await boxes(page, CHART);
  return {
    x: chart.x + AXIS_WIDTH,
    y: chart.y + TOP_MARGIN,
    width: chart.width - AXIS_WIDTH,
    height: chart.height - TOP_MARGIN - DATE_ROW_GAP - DATE_LINE_HEIGHT,
  };
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`이상 타임라인의 배치와 조건 Row (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await openTimeline(page, viewport.width, viewport.height);

    const screen = await measure(page, '[data-slot="anomaly-timeline"]');
    expect(screen.style.rowGap).toBe("14px");
    expect(screen.height).toBe(viewport.height - 58 - 14 - 32 - 14 - 14);

    const filter = await measure(page, FILTER);
    expect(filter.height).toBe(66);
    expect(filter.style.backgroundColor).toBe(await color(page, "var(--surface-low)"));
    expect(filter.style.borderTopWidth).toBe("1px");
    expect(filter.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(filter.style.borderTopLeftRadius).toBe("16px");
    expect(filter.style.paddingTop).toBe("16px");
    expect(filter.style.paddingLeft).toBe("16px");
    expect(filter.style.columnGap).toBe("10px");

    const triggers = `${FILTER} [data-slot="select-trigger"]`;
    await expect(page.locator(triggers)).toHaveText(["장치 (전체)", "모델 (전체)", "최근 30일"]);
    for (const [index, width] of [200, 160, 150].entries()) {
      const trigger = await measure(page, triggers, index);
      expect(trigger.width).toBe(width);
      expect(trigger.height).toBe(32);
      expect(trigger.style.paddingLeft).toBe("12px");
      expect(trigger.style.paddingRight).toBe("10px");
      expect(trigger.style.borderTopLeftRadius).toBe("6px");
      expect(trigger.style.fontSize).toBe("14px");
      expect(trigger.style.backgroundColor).toBe(await color(page, "var(--card)"));
      expect(trigger.style.color).toBe(await color(page, "var(--fg)"));
    }

    const reset = await measure(page, `${FILTER} [data-slot="icon-button"]`);
    expect(reset.width).toBe(32);
    expect(reset.height).toBe(32);
    expect(reset.style.borderTopLeftRadius).toBe("6px");
    expect(reset.style.borderTopWidth).toBe("1px");
    expect(reset.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(reset.style.backgroundColor).toBe(await color(page, "var(--card)"));
    await expect(page.locator(`${FILTER} [data-slot="icon-button"]`)).toHaveAttribute(
      "aria-label",
      "초기화",
    );
    const resetIcon = await measure(page, `${FILTER} [data-slot="icon-button"] svg`);
    expect(resetIcon.width).toBe(18);

    const query = await measure(page, `${FILTER} [data-slot="action-button"]`);
    expect(query.height).toBe(32);
    expect(query.style.paddingLeft).toBe("16px");
    expect(query.style.paddingRight).toBe("16px");
    expect(query.style.borderTopLeftRadius).toBe("6px");
    expect(query.style.borderTopWidth).toBe("0px");
    expect(query.style.borderRightWidth).toBe("0px");
    expect(query.style.backgroundColor).toBe(await color(page, "var(--primary)"));
    expect(query.style.color).toBe(await color(page, "var(--on-primary)"));
    expect(query.style.fontSize).toBe("14px");
    expect(query.style.fontWeight).toBe("500");
    expect(query.style.columnGap).toBe("6px");
    await expect(page.locator(`${FILTER} [data-slot="action-button"]`)).toHaveText("조회");
    const queryIcon = await measure(page, `${FILTER} [data-slot="action-button"] svg`);
    expect(queryIcon.width).toBe(18);

    const trend = await measure(page, TREND);
    expect(trend.height).toBeCloseTo(Math.min(380, Math.max(300, screen.height * 0.4)), 1);
    expect(trend.style.borderTopLeftRadius).toBe("16px");
    expect(trend.style.paddingTop).toBe("16px");
    expect(trend.style.paddingLeft).toBe("18px");
    expect(trend.style.rowGap).toBe("14px");
    expect(trend.style.backgroundColor).toBe(await color(page, "var(--card)"));

    const detail = await measure(page, DETAIL);
    expect(detail.height).toBeCloseTo(screen.height - 66 - 14 - trend.height - 14, 1);
  });

  test(`Bar Chart의 배치 (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await openTimeline(page, viewport.width, viewport.height);
    const plot = await plotArea(page);
    const band = (plot.width - BARS_END_PADDING) / RATES.length;
    const bottom = plot.y + plot.height;

    const bars = await boxes(page, BAR);
    expect(bars).toHaveLength(RATES.length);
    const barWidth = Math.min(24, band * 0.7);
    bars.forEach((bar, index) => {
      expect(bar.x + bar.width / 2).toBeCloseTo(plot.x + band * (index + 0.5), 1);
      expect(bar.width).toBeCloseTo(barWidth, 1);
      expect(Math.abs(bar.y + bar.height - bottom)).toBeLessThan(0.5);
      expect(Math.abs(bar.height - (Math.min(40, RATES[index]) / 40) * plot.height)).toBeLessThan(0.5);
    });

    const gridLines = await boxes(page, `${CHART} .recharts-cartesian-grid-horizontal line`);
    const gridOffsets = gridLines.map((line) => line.y - plot.y).sort((a, b) => a - b);
    expect(gridOffsets).toHaveLength(5);
    gridOffsets.forEach((offset, index) => {
      expect(Math.abs(offset - (plot.height * index) / 4)).toBeLessThan(0.5);
    });

    const referenceLines = await boxes(page, `${CHART} .recharts-reference-line line`);
    expect(referenceLines).toHaveLength(2);
    expect(Math.abs(referenceLines[0].y - (plot.y + plot.height * 0.5))).toBeLessThan(0.5);
    expect(Math.abs(referenceLines[1].y - (plot.y + plot.height * 0.75))).toBeLessThan(0.5);
    expect(referenceLines[0].x).toBeCloseTo(plot.x, 1);
    expect(referenceLines[0].width).toBeCloseTo(plot.width, 1);

    const pills = await boxes(page, `${CHART} [data-slot="chart-label-pill"]`);
    expect(pills).toHaveLength(2);
    for (const [index, ratio] of [0.5, 0.75].entries()) {
      expect(plot.x + plot.width - (pills[index].x + pills[index].width)).toBeCloseTo(6, 1);
      expect(pills[index].y).toBeCloseTo(plot.y + plot.height * ratio - 20, 1);
      expect(pills[index].height).toBe(18);
    }

    const rateTicks = await boxes(page, `${CHART} [data-slot="chart-rate-tick"]`);
    expect(rateTicks).toHaveLength(5);
    const [chart] = await boxes(page, CHART);
    rateTicks.forEach((tick, index) => {
      expect(tick.x + tick.width).toBeCloseTo(chart.x + 40, 0);
      expect(Math.abs(tick.y + tick.height / 2 - (bottom - (plot.height * index) / 4))).toBeLessThan(1);
    });

    const dateTicks = await boxes(page, `${CHART} [data-slot="chart-date-tick"]`);
    expect(dateTicks).toHaveLength(RATES.length);
    expect(dateTicks[0].x + dateTicks[0].width / 2).toBeCloseTo(plot.x + band * 0.5, 0);
    expect(Math.abs(dateTicks[0].y - (bottom + DATE_ROW_GAP))).toBeLessThan(1);
    expect(Math.abs(dateTicks[0].height - DATE_LINE_HEIGHT)).toBeLessThan(1);

    const [column] = await boxes(page, `${CHART} [data-slot="chart-selected-column"]`);
    const columnWidth = Math.min(42, band * 0.96);
    expect(column.width).toBeCloseTo(columnWidth, 1);
    expect(column.x + column.width / 2).toBeCloseTo(plot.x + band * (DEFAULT_SELECTED_INDEX + 0.5), 1);
    expect(column.y).toBeCloseTo(plot.y - 6, 1);
    expect(Math.abs(column.y + column.height - bottom)).toBeLessThan(0.5);

    await expect(page.locator(TOOLTIP)).toHaveCount(0);
    const cursorY = plot.y + plot.height / 2;
    await page.mouse.move(plot.x + band * 6.5, cursorY);
    await expect(page.locator(TOOLTIP)).toHaveCount(1);
    await expect.poll(() => tooltipEdge(page, "left")).toBeCloseTo(plot.x + band * 6.5 + CURSOR_GAP, 0);
    await expect.poll(() => tooltipEdge(page, "bottom")).toBeCloseTo(cursorY - CURSOR_GAP, 0);
  });
}

test("추이 Card의 머리, 범례, Chart의 Text와 Color", async ({ page }) => {
  await openTimeline(page, 1920, 1080);

  await expect(page.locator(`${TREND} [data-slot="section-card-eyebrow"]`)).toHaveText("DAILY TREND");
  await expect(page.locator(`${TREND} [data-slot="section-card-title"]`)).toHaveText(
    "일별 이상 추이",
  );
  await expect(page.locator(`${TREND} [data-slot="section-card-description"]`)).toHaveText(
    "막대 높이 = 그날의 평균 이상비율 · 색 = 상태 기준(표·배지와 동일) · 점선 = 경고 10% / 위험 20% 기준선",
  );

  const legend = await measure(page, '[data-slot="daily-anomaly-trend-legend"]');
  expect(legend.style.columnGap).toBe("14px");
  expect(legend.style.fontSize).toBe("12px");
  expect(legend.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator(`${TREND} [data-slot="legend-swatch"]`)).toHaveText([
    "주의",
    "경고",
    "위험",
  ]);
  for (const [index, token] of ["--caution", "--warning", "--danger"].entries()) {
    const mark = await measure(page, `${TREND} [data-slot="legend-swatch-mark"]`, index);
    expect(mark.width).toBe(9);
    expect(mark.height).toBe(9);
    expect(mark.style.borderTopLeftRadius).toBe("2px");
    expect(mark.style.backgroundColor).toBe(await color(page, `var(${token})`));
  }
  const swatch = await measure(page, `${TREND} [data-slot="legend-swatch"]`);
  expect(swatch.style.columnGap).toBe("5px");

  await expect(page.locator(`${CHART} [data-slot="chart-rate-tick"]`)).toHaveText([
    "0%",
    "10%",
    "20%",
    "30%",
    "40%",
  ]);
  const rateTick = page.locator(`${CHART} [data-slot="chart-rate-tick"]`).first();
  await expect(rateTick).toHaveAttribute("font-size", "11");
  await expect(rateTick).toHaveAttribute("font-weight", "600");
  await expect(rateTick).toHaveAttribute("fill", "var(--muted-fg)");

  const dateTexts = await page.locator(`${CHART} [data-slot="chart-date-tick"]`).allTextContents();
  dateTexts.forEach((text, index) => {
    const isShown = index === DEFAULT_SELECTED_INDEX || (index % 2 === 0 && index !== 29);
    expect(text).toBe(isShown ? isoDaysAgo(29 - index).slice(5) : "");
  });
  const selectedTick = page.locator(`${CHART} [data-slot="chart-date-tick"]`).nth(DEFAULT_SELECTED_INDEX);
  await expect(selectedTick).toHaveAttribute("font-weight", "700");
  await expect(selectedTick).toHaveAttribute("fill", "var(--fg)");
  const plainTick = page.locator(`${CHART} [data-slot="chart-date-tick"]`).first();
  await expect(plainTick).toHaveAttribute("font-size", "11");
  await expect(plainTick).toHaveAttribute("font-weight", "400");
  await expect(plainTick).toHaveAttribute("fill", "var(--muted-fg)");

  const fills = await page
    .locator(BAR)
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("fill") ?? ""));
  fills.forEach((fill, index) => {
    const level = RATES[index] >= 20 ? "danger" : RATES[index] >= 10 ? "warning" : "caution";
    expect(fill).toMatch(new RegExp(`-${level}\\)$`));
  });

  const referenceLines = page.locator(`${CHART} .recharts-reference-line line`);
  await expect(referenceLines.nth(0)).toHaveAttribute("stroke", "var(--danger)");
  await expect(referenceLines.nth(1)).toHaveAttribute("stroke", "var(--warning)");
  await expect(referenceLines.nth(0)).toHaveAttribute("stroke-width", "1.5");
  await expect(referenceLines.nth(0)).toHaveAttribute("stroke-dasharray", /\d/);

  await expect(page.locator(`${CHART} [data-slot="chart-label-pill"]`)).toHaveText([
    "위험 20%",
    "경고 10%",
  ]);
  const dangerPill = await measure(page, `${CHART} [data-slot="chart-label-pill"]`, 0);
  expect(dangerPill.style.paddingLeft).toBe("6px");
  expect(dangerPill.style.borderTopLeftRadius).toBe("4px");
  expect(dangerPill.style.fontSize).toBe("11px");
  expect(dangerPill.style.fontWeight).toBe("700");
  expect(dangerPill.style.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect(dangerPill.style.color).toBe(await color(page, "var(--danger)"));
  const warningPill = await measure(page, `${CHART} [data-slot="chart-label-pill"]`, 1);
  expect(warningPill.style.backgroundColor).toBe(await color(page, "var(--warning-subtle)"));
  expect(warningPill.style.color).toBe(await color(page, "var(--warning-strong)"));

  const plot = await plotArea(page);
  const band = (plot.width - BARS_END_PADDING) / RATES.length;
  await page.mouse.move(plot.x + band * (DEFAULT_SELECTED_INDEX + 0.5), plot.y + plot.height / 2);
  await expect(page.locator(`${BUBBLE} > b`)).toHaveText(
    `${isoDaysAgo(2).slice(5)} · 평균 이상비율 22.16%`,
  );
  await expect(page.locator(`${BUBBLE} > span`)).toHaveText("추론 33건 · 이상 window 8");
  const bubble = await measure(page, BUBBLE);
  expect(bubble.style.backgroundColor).toBe(await color(page, "var(--fg)"));
  expect(bubble.style.color).toBe(await color(page, "var(--bg)"));
  expect(bubble.style.paddingTop).toBe("8px");
  expect(bubble.style.paddingLeft).toBe("12px");
  expect(bubble.style.borderTopLeftRadius).toBe("8px");
  expect(bubble.style.rowGap).toBe("2px");
  expect(visibleShadow(bubble.style.boxShadow)).toBe("rgba(0, 0, 0, 0.2) 0px 6px 16px 0px");
  const bubbleTitle = await measure(page, `${BUBBLE} > b`);
  expect(bubbleTitle.style.fontSize).toBe("12px");
  const bubbleDetail = await measure(page, `${BUBBLE} > span`);
  expect(bubbleDetail.style.fontSize).toBe("11px");
  expect(bubbleDetail.style.opacity).toBe("0.85");

  await expect(page.locator(`${CHART} [data-slot="chart-selected-column"]`)).toHaveAttribute(
    "fill",
    "var(--brand-line4-subtle)",
  );
});

test("일자별 상세 Card", async ({ page }) => {
  await openTimeline(page, 1920, 1080);

  await expect(page.locator(`${DETAIL} [data-slot="section-card-eyebrow"]`)).toHaveText(
    "DAILY DETAIL",
  );
  await expect(page.locator(`${DETAIL} [data-slot="section-card-title"]`)).toHaveText("일자별 상세");
  await expect(page.locator('[data-slot="daily-detail-range"]')).toHaveText("최근 30일");
  const range = await measure(page, '[data-slot="daily-detail-range"]');
  expect(range.style.fontSize).toBe("14px");
  expect(range.style.color).toBe(await color(page, "var(--muted-fg)"));

  const frame = await measure(page, `${DETAIL} [data-slot="data-table"]`);
  expect(frame.style.borderTopWidth).toBe("1px");
  expect(frame.style.borderTopLeftRadius).toBe("10px");

  const headRow = await measure(page, `${DETAIL} thead [data-slot="table-row"]`);
  expect(headRow.height).toBe(44);
  expect(headRow.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  const heads = `${DETAIL} [data-slot="table-head"]`;
  await expect(page.locator(heads)).toHaveText([
    "일자",
    "추론 건수",
    "이상 window",
    "평균 이상비율",
    "최대 이상비율",
  ]);
  for (const [index, width] of [220, 220, 240, 240].entries()) {
    const head = await measure(page, heads, index + 1);
    expect(head.width).toBe(width);
    expect(head.style.textAlign).toBe("right");
    expect(head.style.paddingLeft).toBe("16px");
    expect(head.style.fontSize).toBe("14px");
  }

  await expect(page.locator(BODY_ROW)).toHaveCount(5);
  const row = await measure(page, BODY_ROW);
  expect(row.height).toBe(52);
  expect(row.style.borderBottomWidth).toBe("1px");
  expect(row.style.fontSize).toBe("14px");
  const expectedRows = [
    [isoDaysAgo(0), "11", "1", "6.67%", "11.82%"],
    [isoDaysAgo(1), "15", "1", "6.06%", "18.96%"],
    [isoDaysAgo(2), "33", "8", "22.16%", "32.54%"],
    [isoDaysAgo(3), "25", "0", "3.15%", "13.26%"],
    [isoDaysAgo(4), "21", "1", "2.69%", "13.21%"],
  ];
  for (const [index, texts] of expectedRows.entries()) {
    await expect(page.locator(BODY_ROW).nth(index).locator('[data-slot="table-cell"]')).toHaveText(
      texts,
    );
  }

  const cells = `${BODY_ROW}:nth-child(1) [data-slot="table-cell"]`;
  const dateCell = await measure(page, cells, 0);
  expect(dateCell.style.fontWeight).toBe("700");
  expect(dateCell.style.paddingLeft).toBe("16px");
  const averageCell = await measure(page, cells, 3);
  expect(averageCell.style.fontWeight).toBe("700");
  expect(averageCell.style.textAlign).toBe("right");
  expect(averageCell.style.color).toBe(await color(page, "var(--on-caution-subtle)"));

  const selectedRow = `${BODY_ROW}:nth-child(3)`;
  const selected = await measure(page, selectedRow);
  expect(selected.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  const selectedWindow = await measure(page, `${selectedRow} [data-slot="table-cell"]`, 2);
  expect(selectedWindow.style.fontWeight).toBe("700");
  const selectedAverage = await measure(page, `${selectedRow} [data-slot="table-cell"]`, 3);
  expect(selectedAverage.style.color).toBe(await color(page, "var(--danger)"));
  const plainWindow = await measure(page, cells, 2);
  expect(plainWindow.style.fontWeight).toBe("400");

  const pagination = await measure(page, `${DETAIL} [data-slot="pagination"]`);
  const paginationList = await measure(page, `${DETAIL} [data-slot="pagination-content"]`);
  expect(paginationList.style.columnGap).toBe("6px");
  expect(pagination.style.fontSize).toBe("14px");
  const pages = `${DETAIL} [data-slot="pagination-page"]`;
  await expect(page.locator(pages)).toHaveText(["1", "2", "3", "4", "5", "6"]);
  const current = await measure(page, pages, 0);
  expect(current.height).toBe(32);
  expect(current.style.minWidth).toBe("32px");
  expect(current.style.paddingLeft).toBe("6px");
  expect(current.style.borderTopLeftRadius).toBe("6px");
  expect(current.style.fontWeight).toBe("600");
  expect(current.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(current.style.borderTopColor).toBe(await color(page, "var(--border)"));
  const other = await measure(page, pages, 1);
  expect(other.style.fontWeight).toBe("400");
  expect(other.style.borderTopColor).toBe("rgba(0, 0, 0, 0)");

  const previous = await measure(page, `${DETAIL} [data-slot="pagination-previous"]`);
  expect(previous.height).toBe(32);
  expect(previous.style.paddingLeft).toBe("10px");
  expect(previous.style.columnGap).toBe("4px");
  expect(previous.style.color).toBe(await color(page, "var(--disabled)"));
  await expect(page.locator(`${DETAIL} [data-slot="pagination-previous"]`)).toHaveText("이전");
  const next = await measure(page, `${DETAIL} [data-slot="pagination-next"]`);
  expect(next.style.color).toBe(await color(page, "var(--fg)"));
  await expect(page.locator(`${DETAIL} [data-slot="pagination-next"]`)).toHaveText("다음");
  expect(previous.style.borderRightWidth).toBe("0px");
  expect(next.style.borderRightWidth).toBe("0px");
  expect(current.style.borderRightWidth).toBe("1px");
  const previousIcon = await measure(page, `${DETAIL} [data-slot="pagination-previous"] svg`);
  expect(previousIcon.width).toBe(18);
});

test("Bar와 선을 Click해 날을 고르고 Page를 옮김", async ({ page }) => {
  await openTimeline(page, 1920, 1080);
  const plot = await plotArea(page);
  const band = (plot.width - BARS_END_PADDING) / RATES.length;

  await page.mouse.click(plot.x + band * 6.5, plot.y + plot.height / 2);
  const [column] = await boxes(page, `${CHART} [data-slot="chart-selected-column"]`);
  expect(column.x + column.width / 2).toBeCloseTo(plot.x + band * 6.5, 1);
  await expect(page.locator(`${BUBBLE} > b`)).toHaveText(
    `${isoDaysAgo(23).slice(5)} · 평균 이상비율 24.10%`,
  );
  await expect(page.locator(`${DETAIL} [data-slot="pagination-page"][aria-current="page"]`)).toHaveText(
    "5",
  );
  await expect(page.locator(`${BODY_ROW}[aria-selected="true"]`)).toContainText(isoDaysAgo(23));
  await expect(page.locator(`${CHART} [data-slot="chart-date-tick"]`).nth(6)).toHaveAttribute(
    "font-weight",
    "700",
  );

  await page.locator(BODY_ROW).first().click();
  await expect(page.locator(`${BODY_ROW}[aria-selected="true"]`)).toContainText(isoDaysAgo(20));
  await expect(page.locator(`${CHART} [data-slot="chart-date-tick"]`).nth(9)).toHaveAttribute(
    "font-weight",
    "700",
  );
  await expect(page.locator(TOOLTIP)).toHaveCount(0);

  await page.locator(`${DETAIL} [data-slot="pagination-next"]`).click();
  await expect(page.locator(`${DETAIL} [data-slot="pagination-page"][aria-current="page"]`)).toHaveText(
    "6",
  );
  await expect(page.locator(`${DETAIL} [data-slot="pagination-next"]`)).toBeDisabled();
  await page.locator(`${DETAIL} [data-slot="pagination-page"]`).nth(0).click();
  await expect(page.locator(BODY_ROW).first()).toContainText(isoDaysAgo(0));
  await expect(page.locator(`${DETAIL} [data-slot="pagination-previous"]`)).toBeDisabled();

  await page.locator(BODY_ROW).nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(`${BODY_ROW}[aria-selected="true"]`)).toContainText(isoDaysAgo(1));
});

test("조건은 조회를 Click해야 반영되고 초기화로 되돌아감", async ({ page }) => {
  await openTimeline(page, 1920, 1080);
  const triggers = page.locator(`${FILTER} [data-slot="select-trigger"]`);

  await triggers.nth(2).click();
  await expect(page.locator('[data-slot="select-content"][data-open] [data-slot="select-item"]')).toHaveText([
    "최근 7일",
    "최근 14일",
    "최근 30일",
  ]);
  await page.getByRole("option", { name: "최근 7일" }).click();
  await expect(triggers.nth(2)).toHaveText("최근 7일");
  await expect(page.locator(BAR)).toHaveCount(30);
  await expect(page.locator('[data-slot="daily-detail-range"]')).toHaveText("최근 30일");

  await page.locator(`${FILTER} [data-slot="action-button"]`).click();
  await expect(page.locator(BAR)).toHaveCount(7);
  await expect(page.locator('[data-slot="daily-detail-range"]')).toHaveText("최근 7일");
  await expect(page.locator(`${DETAIL} [data-slot="pagination-page"]`)).toHaveText(["1", "2"]);
  const dateTexts = await page.locator(`${CHART} [data-slot="chart-date-tick"]`).allTextContents();
  expect(dateTexts).toEqual(Array.from({ length: 7 }, (_, index) => isoDaysAgo(6 - index).slice(5)));

  await triggers.nth(0).click();
  const deviceItems = page.locator('[data-slot="select-content"][data-open] [data-slot="select-item"]');
  await expect(deviceItems).toHaveCount(22);
  await expect(deviceItems.first()).toHaveText("장치 (전체)");
  await expect(deviceItems.nth(1)).toHaveText("ATC");
  await page.keyboard.press("Escape");
  await triggers.nth(1).click();
  await expect(
    page.locator('[data-slot="select-content"][data-open] [data-slot="select-item"]'),
  ).toHaveText(["모델 (전체)", "IF", "SVM", "VAE", "PCA"]);
  await page.keyboard.press("Escape");

  await page.locator(`${FILTER} [data-slot="icon-button"]`).click();
  await expect(triggers.nth(2)).toHaveText("최근 30일");
  await expect(page.locator(BAR)).toHaveCount(30);
  await expect(page.locator(`${DETAIL} [data-slot="pagination-page"]`)).toHaveCount(6);
});

test("조회와 초기화는 조건이 그대로여도 다시 조회함", async ({ page }) => {
  const firstRow = page.locator(BODY_ROW).first();

  await page.clock.setFixedTime(new Date(2026, 4, 10, 23, 59, 0));
  await openTimeline(page, 1920, 1080);
  await expect(firstRow).toContainText("2026-05-10");

  await page.clock.setFixedTime(new Date(2026, 4, 11, 0, 1, 0));
  await page.locator(`${FILTER} [data-slot="action-button"]`).click();
  await expect(firstRow).toContainText("2026-05-11");

  await page.clock.setFixedTime(new Date(2026, 4, 11, 23, 59, 0));
  await openTimeline(page, 1920, 1080);
  await expect(firstRow).toContainText("2026-05-11");
  await page.clock.setFixedTime(new Date(2026, 4, 12, 0, 1, 0));
  await page.locator(`${FILTER} [data-slot="icon-button"]`).click();
  await expect(firstRow).toContainText("2026-05-12");
  await expect(page.locator(BAR)).toHaveCount(30);
});

test("Tooltip은 Mouse를 올렸을 때만 표시되고 Cursor를 따라감", async ({ page }) => {
  await openTimeline(page, 1920, 1080);
  const plot = await plotArea(page);
  const band = (plot.width - BARS_END_PADDING) / RATES.length;
  const middle = plot.y + plot.height / 2;
  const center = (index: number) => plot.x + band * (index + 0.5);

  await expect(page.locator(TOOLTIP)).toHaveCount(0);
  await expect(page.locator('[data-slot="chart-tooltip-bubble"]')).toHaveCount(0);

  await page.mouse.move(center(6), middle);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  await expect(page.locator(`${BUBBLE} > b`)).toHaveText(
    `${isoDaysAgo(23).slice(5)} · 평균 이상비율 24.10%`,
  );
  await expect(page.locator(`${BUBBLE} > span`)).toHaveText(/^추론 \d+건 · 이상 window \d+$/);

  await expect.poll(() => tooltipEdge(page, "left")).toBeCloseTo(center(6) + CURSOR_GAP, 0);
  await expect.poll(() => tooltipEdge(page, "bottom")).toBeCloseTo(middle - CURSOR_GAP, 0);

  const bubble = await measure(page, BUBBLE);
  expect(bubble.style.backgroundColor).toBe(await color(page, "var(--fg)"));
  expect(bubble.style.color).toBe(await color(page, "var(--bg)"));
  expect(bubble.style.paddingTop).toBe("8px");
  expect(bubble.style.paddingLeft).toBe("12px");
  expect(bubble.style.borderTopLeftRadius).toBe("8px");
  expect(bubble.style.rowGap).toBe("2px");
  expect(visibleShadow(bubble.style.boxShadow)).toBe("rgba(0, 0, 0, 0.2) 0px 6px 16px 0px");

  await page.mouse.move(center(6) + 10, middle + 40);
  await expect.poll(() => tooltipEdge(page, "bottom")).toBeCloseTo(middle + 40 - CURSOR_GAP, 0);
  await expect.poll(() => tooltipEdge(page, "left")).toBeCloseTo(center(6) + CURSOR_GAP, 0);

  await page.mouse.move(center(6), plot.y + 20);
  await expect.poll(() => tooltipEdge(page, "top")).toBeCloseTo(plot.y + 20 + CURSOR_GAP, 0);

  await page.mouse.move(center(13), middle);
  await expect(page.locator(`${BUBBLE} > b`)).toHaveText(
    `${isoDaysAgo(16).slice(5)} · 평균 이상비율 23.00%`,
  );
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  await expect.poll(() => tooltipEdge(page, "left")).toBeCloseTo(center(13) + CURSOR_GAP, 0);
  await expect(page.locator(`${BODY_ROW}[aria-selected="true"]`)).toContainText(isoDaysAgo(2));

  await page.mouse.move(center(DEFAULT_SELECTED_INDEX), middle);
  await expect(page.locator(`${BUBBLE} > b`)).toHaveText(
    `${isoDaysAgo(2).slice(5)} · 평균 이상비율 22.16%`,
  );
  await expect(page.locator(`${BUBBLE} > span`)).toHaveText("추론 33건 · 이상 window 8");

  await page.mouse.move(center(29), middle);
  await expect(page.locator(`${BUBBLE} > b`)).toContainText(isoDaysAgo(0).slice(5));
  await expect.poll(() => tooltipEdge(page, "right")).toBeCloseTo(center(29) - CURSOR_GAP, 0);

  const wrapperTransition = await page
    .locator(TOOLTIP_WRAPPER)
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(wrapperTransition).toBe("0s");

  await page.mouse.move(plot.x + 10, plot.y - 60);
  await expect(page.locator(TOOLTIP)).toHaveCount(0);
});

test("Hover한 날은 연한 회색 기둥으로 표시됨", async ({ page }) => {
  await openTimeline(page, 1920, 1080);
  const plot = await plotArea(page);
  const band = (plot.width - BARS_END_PADDING) / RATES.length;
  const middle = plot.y + plot.height / 2;
  const bottom = plot.y + plot.height;
  const center = (index: number) => plot.x + band * (index + 0.5);
  const hoveredCenter = async () => {
    const [box] = await boxes(page, HOVERED_COLUMN);
    return box ? box.x + box.width / 2 : null;
  };

  await expect(page.locator(HOVERED_COLUMN)).toHaveCount(0);

  await page.mouse.move(center(6), middle);
  await expect(page.locator(HOVERED_COLUMN)).toHaveCount(1);
  await expect(page.locator(HOVERED_COLUMN)).toHaveAttribute("fill", "var(--muted)");
  const [hovered] = await boxes(page, HOVERED_COLUMN);
  expect(hovered.width).toBeCloseTo(Math.min(42, band * 0.96), 1);
  expect(hovered.x + hovered.width / 2).toBeCloseTo(center(6), 1);
  expect(hovered.y).toBeCloseTo(plot.y - 6, 1);
  expect(Math.abs(hovered.y + hovered.height - bottom)).toBeLessThan(0.5);

  const fillOf = (selector: string) =>
    page.locator(selector).evaluate((element) => getComputedStyle(element).fill);
  expect(await fillOf(HOVERED_COLUMN)).toBe(await color(page, "var(--muted)"));
  expect(await fillOf(SELECTED_COLUMN)).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(await fillOf(HOVERED_COLUMN)).not.toBe(await fillOf(SELECTED_COLUMN));

  const isBehindBar = await page.evaluate(
    ({ column, bar }) => {
      const columnElement = document.querySelector(column);
      const barElement = document.querySelectorAll(bar)[6];
      if (!columnElement || !barElement) return null;
      return Boolean(
        columnElement.compareDocumentPosition(barElement) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    },
    { column: HOVERED_COLUMN, bar: BAR },
  );
  expect(isBehindBar).toBe(true);

  const [selected] = await boxes(page, SELECTED_COLUMN);
  expect(selected.x + selected.width / 2).toBeCloseTo(center(DEFAULT_SELECTED_INDEX), 1);

  await page.mouse.move(center(7), middle);
  await expect.poll(hoveredCenter).toBeCloseTo(center(7), 1);
  await expect(page.locator(HOVERED_COLUMN)).toHaveCount(1);

  await page.mouse.move(center(DEFAULT_SELECTED_INDEX), middle);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  await expect(page.locator(`${BUBBLE} > b`)).toContainText(isoDaysAgo(2).slice(5));
  await expect(page.locator(HOVERED_COLUMN)).toHaveCount(0);
  await expect(page.locator(SELECTED_COLUMN)).toHaveAttribute("fill", "var(--brand-line4-subtle)");

  await page.mouse.move(center(6), middle);
  await expect(page.locator(HOVERED_COLUMN)).toHaveCount(1);
  await page.mouse.click(center(6), middle);
  await expect(page.locator(HOVERED_COLUMN)).toHaveCount(0);
  await expect
    .poll(async () => {
      const [box] = await boxes(page, SELECTED_COLUMN);
      return box.x + box.width / 2;
    })
    .toBeCloseTo(center(6), 1);

  await page.mouse.move(plot.x + 10, plot.y - 60);
  await page.mouse.move(center(13), middle);
  await expect.poll(hoveredCenter).toBeCloseTo(center(13), 1);
  await page.mouse.move(plot.x + 10, plot.y - 60);
  await expect(page.locator(HOVERED_COLUMN)).toHaveCount(0);
});

test.describe("움직임을 줄이지 않은 상태", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("Tooltip은 제자리에 나타난 뒤 Cursor를 따라 미끄러짐", async ({ page }) => {
    await openTimeline(page, 1920, 1080);
    await page.waitForTimeout(700);
    const plot = await plotArea(page);
    const band = (plot.width - BARS_END_PADDING) / RATES.length;
    const middle = plot.y + plot.height / 2;
    const center = (index: number) => plot.x + band * (index + 0.5);

    await page.mouse.move(center(6), middle);
    await expect(page.locator(TOOLTIP)).toHaveCount(1);
    expect(await tooltipEdge(page, "left")).toBeCloseTo(center(6) + CURSOR_GAP, 0);
    expect(await tooltipEdge(page, "bottom")).toBeCloseTo(middle - CURSOR_GAP, 0);

    const fade = await page.locator(TOOLTIP).evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.animationName, style.animationDuration, style.animationTimingFunction];
    });
    expect(fade).toEqual(["enter", "0.2s", "cubic-bezier(0, 0, 0.2, 1)"]);

    const columnFade = await page.locator(HOVERED_COLUMN).evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.animationName, style.animationDuration, style.animationTimingFunction];
    });
    expect(columnFade).toEqual(["enter", "0.1s", "cubic-bezier(0, 0, 0.2, 1)"]);

    await expect
      .poll(() =>
        page.locator(TOOLTIP_WRAPPER).evaluate((element) => {
          const style = getComputedStyle(element);
          return [style.transitionProperty, style.transitionDuration, style.transitionTimingFunction];
        }),
      )
      .toEqual(["transform", "0.2s", "cubic-bezier(0, 0, 0.2, 1)"]);

    await page.mouse.move(center(10), middle - 40);
    const midway = await tooltipEdge(page, "left");
    expect(midway).not.toBeNull();
    expect(midway as number).toBeLessThan(center(10) + CURSOR_GAP - 1);
    await expect.poll(() => tooltipEdge(page, "left")).toBeCloseTo(center(10) + CURSOR_GAP, 0);
    await expect.poll(() => tooltipEdge(page, "bottom")).toBeCloseTo(middle - 40 - CURSOR_GAP, 0);

    await page.mouse.move(center(10), plot.y - 60);
    await expect(page.locator(TOOLTIP)).toHaveCount(0);
    await page.mouse.move(center(24), middle);
    await expect(page.locator(TOOLTIP)).toHaveCount(1);
    expect(await tooltipEdge(page, "left")).toBeCloseTo(center(24) + CURSOR_GAP, 0);
  });
});

test("기본 Font 크기를 2배로 하면 이상 타임라인의 크기도 2배임", async ({ page }) => {
  await openTimeline(page, 1920, 1080);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page.waitForTimeout(400);

  const filter = await measure(page, FILTER);
  expect(filter.height).toBe(132);
  expect(filter.style.borderTopWidth).toBe("2px");
  const trigger = await measure(page, `${FILTER} [data-slot="select-trigger"]`);
  expect(trigger.width).toBe(400);
  const query = await measure(page, `${FILTER} [data-slot="action-button"]`);
  expect(query.height).toBe(64);

  const bars = await boxes(page, BAR);
  expect(bars[0].width).toBeCloseTo(48, 1);
  await expect(page.locator(`${CHART} [data-slot="chart-rate-tick"]`).first()).toHaveAttribute(
    "font-size",
    "22",
  );
  await expect(page.locator(`${CHART} .recharts-reference-line line`).first()).toHaveAttribute(
    "stroke-width",
    "3",
  );
  const [chart] = await boxes(page, CHART);
  const [overlay] = await boxes(page, `${CHART} [data-slot="chart-plot-overlay"]`);
  expect(overlay.x - chart.x).toBeCloseTo(92, 1);
  const pill = await measure(page, `${CHART} [data-slot="chart-label-pill"]`);
  expect(pill.height).toBe(36);
  const [column] = await boxes(page, `${CHART} [data-slot="chart-selected-column"]`);
  const doubledBand = (overlay.width - BARS_END_PADDING * 2) / RATES.length;
  expect(column.width).toBeCloseTo(Math.min(84, doubledBand * 0.96), 1);
  const cursorY = overlay.y + overlay.height / 2;
  await page.mouse.move(overlay.x + doubledBand * 6.5, cursorY);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  await expect.poll(() => tooltipEdge(page, "bottom")).toBeCloseTo(cursorY - CURSOR_GAP * 2, 0);
  await expect
    .poll(() => tooltipEdge(page, "left"))
    .toBeCloseTo(overlay.x + doubledBand * 6.5 + CURSOR_GAP * 2, 0);
  const [hoveredColumn] = await boxes(page, HOVERED_COLUMN);
  expect(hoveredColumn.width).toBeCloseTo(Math.min(84, doubledBand * 0.96), 1);
  const bubble = await measure(page, BUBBLE);
  expect(bubble.style.paddingTop).toBe("16px");
  expect(bubble.style.paddingLeft).toBe("24px");

  const row = await measure(page, BODY_ROW);
  expect(row.height).toBe(104);
  const current = await measure(page, `${DETAIL} [data-slot="pagination-page"]`);
  expect(current.height).toBe(64);
});

for (const theme of ["라이트", "다크"] as const) {
  test(`조회 Button에 Hover했을 때의 Color (${theme} Theme)`, async ({ page }) => {
    await openTimeline(page, 1920, 1080);
    if (theme === "다크") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    const QUERY = `${FILTER} [data-slot="action-button"]`;
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    expect((await measure(page, QUERY)).style.backgroundColor).toBe(
      await color(page, "var(--primary)"),
    );
    await page.locator(QUERY).hover();
    await page.waitForTimeout(300);
    const hovered = (await measure(page, QUERY)).style;
    expect(hovered.backgroundColor).toBe(await color(page, "var(--primary-hover)"));
    expect(hovered.color).toBe(await color(page, "var(--on-primary)"));
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    expect((await measure(page, QUERY)).style.backgroundColor).toBe(
      await color(page, "var(--primary)"),
    );
  });
}

test("다크 Theme에서 이상 타임라인의 Color", async ({ page }) => {
  await openTimeline(page, 1920, 1080);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  const filter = await measure(page, FILTER);
  expect(filter.style.backgroundColor).toBe(await color(page, "var(--surface-low)"));
  const trigger = await measure(page, `${FILTER} [data-slot="select-trigger"]`);
  expect(trigger.style.color).toBe(await color(page, "var(--fg)"));
  const trend = await measure(page, TREND);
  expect(trend.style.backgroundColor).toBe(await color(page, "var(--card)"));
  const query = await measure(page, `${FILTER} [data-slot="action-button"]`);
  expect(query.style.backgroundColor).toBe(await color(page, "var(--primary)"));
  const reset = await measure(page, `${FILTER} [data-slot="icon-button"]`);
  expect(reset.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(reset.style.borderTopColor).toBe(await color(page, "var(--border)"));
  const headRow = await measure(page, `${DETAIL} thead [data-slot="table-row"]`);
  expect(headRow.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  const selected = await measure(page, `${BODY_ROW}:nth-child(3)`);
  expect(selected.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  const [overlay] = await boxes(page, `${CHART} [data-slot="chart-plot-overlay"]`);
  await page.mouse.move(overlay.x + overlay.width / 2, overlay.y + overlay.height / 2);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  const hoveredFill = await page
    .locator(HOVERED_COLUMN)
    .evaluate((element) => getComputedStyle(element).fill);
  expect(hoveredFill).toBe(await color(page, "var(--muted)"));
  const bubble = await measure(page, BUBBLE);
  expect(bubble.style.backgroundColor).toBe(await color(page, "var(--fg)"));
  expect(bubble.style.color).toBe(await color(page, "var(--bg)"));
  const pill = await measure(page, `${CHART} [data-slot="chart-label-pill"]`);
  expect(pill.style.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
});
