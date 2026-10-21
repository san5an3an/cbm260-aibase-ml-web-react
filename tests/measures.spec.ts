import { expect, test, type Page } from "@playwright/test";
import {
  applyMeasureAction,
  classifyUnactionedCount,
  markMeasureActioned,
  summarizeMeasures,
  type Measure,
} from "../src/domain/measures";
import { measureActionCodes, measureActionLabels } from "../src/domain/labels/measureAction";
import {
  measureInspectionCodes,
  measureInspectionLabels,
} from "../src/domain/labels/measureInspection";
import {
  assignMeasures,
  completeMeasures,
  exportMeasureCsv,
  fetchMeasureFilterOptions,
  fetchMeasureSummary,
  fetchMeasureWorklist,
  fetchSensorFrequencyRanking,
  saveMeasureAction,
} from "../src/services/measures";
import { downloadCsv } from "./helpers/download";
import {
  calendarDayCell,
  color,
  delayMockResponses,
  hoveredStyle,
  isoDaysAgo,
  measure,
  pickOption,
  visibleShadow,
} from "./helpers/measure";
import { box, boxes, iconShape, shownIconShape, texts } from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const ROOT = '[data-slot="measure-management"]';
const FILTER = '[data-slot="measure-filter-bar"]';
const KPI_ROW = '[data-slot="measure-kpi-row"]';
const KPI = `${KPI_ROW} [data-slot="kpi-stat"]`;
const BODY = '[data-slot="measure-management-body"]';
const WORKLIST = '[data-slot="measure-worklist-card"]';
const RANKING = '[data-slot="sensor-frequency-ranking-card"]';
const HEAD = `${WORKLIST} [data-slot="table-head"]`;
const BODY_ROW = `${WORKLIST} tbody [data-slot="table-row"]`;
const BULK_BAR = `${WORKLIST} [data-slot="bulk-bar"]`;
const RANK_HEAD = `${RANKING} [data-slot="table-head"]`;
const RANK_ROW = `${RANKING} tbody [data-slot="table-row"]`;
const TRIGGER = `${FILTER} [data-slot="date-range-trigger"]`;
const PICKER = '[data-slot="popover-content"][data-picker="range"]';
const CALENDAR = `${PICKER} [data-slot="calendar"]`;
const SELECTS = `${FILTER} [data-slot="select-trigger"]`;
const BUTTONS = `${FILTER} [data-slot="action-button"]`;
const RESET = `${FILTER} [data-slot="icon-button"]`;
const OPEN_ITEMS = '[data-slot="select-content"][data-open] [data-slot="select-item"]';
const EMPTY_STATE = `${WORKLIST} [data-slot="empty-state"]`;
const CURRENT_PAGE = `${WORKLIST} [data-slot="pagination-page"][aria-current="page"]`;
const RELOAD_MS = 1500;
const NO_RELOAD_WATCH_MS = 800;

const MEASURES = [
  { daysAgo: 0, time: "09:12", device: "DRIVING_GEAR", sensor: "압축기 토출압력", diag: "실제≈0.60 / 기대≈0.20", error: "오차 0.40", car: "401 · 1호차", action: "완료", inspection: "완료" },
  { daysAgo: 1, time: "10:13", device: "TRACTION_MOTOR", sensor: "압축기 흡입압력", diag: "실제≈0.65 / 기대≈0.23", error: "오차 0.42", car: "402 · 2호차", action: "미조치", inspection: "미검수" },
  { daysAgo: 2, time: "11:14", device: "CMSB", sensor: "베어링 진동 RMS", diag: "실제≈0.70 / 기대≈0.26", error: "오차 0.44", car: "403 · 3호차", action: "미조치", inspection: "미검수" },
  { daysAgo: 3, time: "12:15", device: "ECU", sensor: "베어링 온도", diag: "실제≈0.75 / 기대≈0.29", error: "오차 0.46", car: "404 · 4호차", action: "완료", inspection: "미검수" },
  { daysAgo: 4, time: "13:16", device: "MICOM_COOLER", sensor: "모터 권선온도", diag: "실제≈0.80 / 기대≈0.32", error: "오차 0.48", car: "405 · 5호차", action: "미조치", inspection: "미검수" },
  { daysAgo: 5, time: "14:17", device: "MICOM_AIRPURIFIER", sensor: "모터 전류 불균형", diag: "실제≈0.85 / 기대≈0.20", error: "오차 0.65", car: "406 · 6호차", action: "미조치", inspection: "완료" },
  { daysAgo: 6, time: "15:18", device: "DCU", sensor: "냉각수 유량", diag: "실제≈0.90 / 기대≈0.23", error: "오차 0.67", car: "407 · 7호차", action: "완료", inspection: "미검수" },
  { daysAgo: 6, time: "15:18", device: "DCU", sensor: "냉각수 유량", diag: "실제≈0.90 / 기대≈0.23", error: "오차 0.67", car: "407 · 7호차", action: "완료", inspection: "미검수" },
  { daysAgo: 7, time: "16:19", device: "VVVF", sensor: "오일 온도", diag: "실제≈0.60 / 기대≈0.26", error: "오차 0.34", car: "408 · 8호차", action: "미조치", inspection: "미검수" },
] as const;

const RANKS: readonly (readonly [string, string, number, number])[] = [
  ["압축기 토출압력", "AXLE_BEARING", 40, 16],
  ["압축기 흡입압력", "DRIVING_GEAR", 39, 15],
  ["베어링 진동 RMS", "TRACTION_MOTOR", 38, 13],
  ["베어링 온도", "CMSB", 34, 11],
  ["모터 권선온도", "ECU", 33, 9],
  ["모터 전류 불균형", "MICOM_COOLER", 32, 8],
  ["냉각수 유량", "MICOM_AIRPURIFIER", 28, 5],
  ["오일 온도", "DCU", 27, 4],
  ["축전지 셀전압", "VVVF", 26, 2],
  ["축전지 내부저항", "SIV", 22, 0],
];

const FIXED_COLUMNS = [56, 100, 110, 76, 90, 96, 86];
const FIXED_COLUMNS_SUM = FIXED_COLUMNS.reduce((sum, width) => sum + width, 0);

const FIXED_TODAY = new Date(2026, 8, 23, 12, 0, 0);

function rowTexts(item: (typeof MEASURES)[number]): string[] {
  const monthDay = isoDaysAgo(item.daysAgo).slice(5);
  return [
    "",
    `${monthDay}${item.time}`,
    `${item.device}${item.sensor}`,
    `${item.diag}${item.error}`,
    item.car,
    item.action,
    item.action === "완료" ? monthDay : "-",
    item.inspection,
    "처리",
  ];
}

async function openMeasures(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto("/dashboard/measures");
  await expect(page.locator(BODY_ROW).first()).toBeVisible();
}

async function numericVariant(page: Page, selector: string, index = 0): Promise<string> {
  return page.evaluate(
    ({ selector, index }) =>
      getComputedStyle(document.querySelectorAll(selector)[index] as Element).fontVariantNumeric,
    { selector, index },
  );
}

async function openPicker(page: Page): Promise<void> {
  await page.locator(TRIGGER).click();
  await expect(page.locator(CALENDAR)).toBeVisible();
}

for (const viewport of [
  { width: 1920, height: 1080, rankingWidth: 633.6 },
  { width: 1440, height: 900, rankingWidth: 475.2 },
]) {
  test(`조치 관리의 배치, 조건 Row, KPI Row (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await openMeasures(page, viewport.width, viewport.height);

    const root = await measure(page, ROOT);
    expect(root.style.rowGap).toBe("14px");
    expect(root.width).toBe(viewport.width - 72 - 28);
    expect(root.height).toBe(viewport.height - 58 - 14 - 32 - 28);

    const filter = await measure(page, FILTER);
    expect(filter.height).toBe(66);
    expect(filter.style.backgroundColor).toBe(await color(page, "var(--surface-low)"));
    expect(filter.style.borderTopWidth).toBe("1px");
    expect(filter.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(filter.style.borderTopLeftRadius).toBe("16px");
    expect(filter.style.paddingTop).toBe("16px");
    expect(filter.style.paddingLeft).toBe("16px");
    expect(filter.style.columnGap).toBe("10px");

    await expect(page.locator(SELECTS)).toHaveText(["장치 (전체)", "조치 (전체)", "검수 (전체)"]);
    for (const [index, width] of [180, 150, 150].entries()) {
      const trigger = await measure(page, SELECTS, index);
      expect(trigger.width).toBe(width);
      expect(trigger.height).toBe(32);
      expect(trigger.style.paddingLeft).toBe("12px");
      expect(trigger.style.paddingRight).toBe("10px");
      expect(trigger.style.borderTopLeftRadius).toBe("6px");
      expect(trigger.style.fontSize).toBe("14px");
      expect(trigger.style.backgroundColor).toBe(await color(page, "var(--card)"));
      expect(trigger.style.color).toBe(await color(page, "var(--fg)"));
    }

    await expect(page.locator(TRIGGER)).toHaveText(`${isoDaysAgo(7)} ~ ${isoDaysAgo(0)}`);
    const range = await measure(page, TRIGGER);
    expect(range.width).toBe(260);
    expect(range.height).toBe(32);
    expect(range.style.paddingLeft).toBe("12px");
    expect(range.style.paddingRight).toBe("12px");
    expect(range.style.borderTopLeftRadius).toBe("6px");
    expect(range.style.borderTopWidth).toBe("1px");
    expect(range.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(range.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(range.style.color).toBe(await color(page, "var(--fg)"));
    expect(range.style.fontSize).toBe("14px");
    expect(range.style.fontWeight).toBe("400");
    expect(range.style.columnGap).toBe("10px");
    expect(await numericVariant(page, TRIGGER)).toBe("tabular-nums");
    const rangeIcon = await measure(page, `${TRIGGER} svg`);
    expect(rangeIcon.width).toBe(18);
    expect(rangeIcon.style.color).toBe(await color(page, "var(--fg)"));
    expect(await shownIconShape(page, `${TRIGGER} svg`)).toBe(iconShape("CalendarToday"));
    const [rangeBox] = await boxes(page, TRIGGER);
    const [rangeIconBox] = await boxes(page, `${TRIGGER} svg`);
    expect(rangeIconBox.x - rangeBox.x).toBeCloseTo(13, 1);

    const reset = await measure(page, RESET);
    expect(reset.width).toBe(32);
    expect(reset.height).toBe(32);
    expect(reset.style.borderTopLeftRadius).toBe("6px");
    expect(reset.style.borderTopWidth).toBe("1px");
    expect(reset.style.backgroundColor).toBe(await color(page, "var(--card)"));
    await expect(page.locator(RESET)).toHaveAttribute("aria-label", "초기화");
    expect((await measure(page, `${RESET} svg`)).width).toBe(18);
    expect(await shownIconShape(page, `${RESET} svg`)).toBe(iconShape("Refresh"));

    await expect(page.locator(BUTTONS)).toHaveText(["검색", "조치 전·후 비교", "CSV 내보내기"]);
    const search = await measure(page, BUTTONS, 0);
    expect(search.height).toBe(32);
    expect(search.style.paddingLeft).toBe("16px");
    expect(search.style.paddingRight).toBe("16px");
    expect(search.style.borderTopLeftRadius).toBe("6px");
    expect(search.style.borderTopWidth).toBe("0px");
    expect(search.style.backgroundColor).toBe(await color(page, "var(--primary)"));
    expect(search.style.color).toBe(await color(page, "var(--on-primary)"));
    expect(search.style.fontSize).toBe("14px");
    expect(search.style.fontWeight).toBe("500");
    expect(search.style.columnGap).toBe("6px");
    const compare = await measure(page, BUTTONS, 1);
    expect(compare.height).toBe(32);
    expect(compare.style.paddingLeft).toBe("16px");
    expect(compare.style.borderTopWidth).toBe("1px");
    expect(compare.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(compare.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(compare.style.color).toBe(await color(page, "var(--fg)"));
    expect(compare.style.fontWeight).toBe("500");
    await expect(page.locator(BUTTONS).nth(1).locator("svg")).toHaveCount(0);
    const csv = await measure(page, BUTTONS, 2);
    expect(csv.height).toBe(32);
    expect(csv.style.paddingLeft).toBe("16px");
    expect(csv.style.borderTopWidth).toBe("1px");
    expect(csv.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(csv.style.color).toBe(await color(page, "var(--fg)"));
    expect(csv.style.fontSize).toBe("14px");
    expect(csv.style.fontWeight).toBe("600");
    expect(csv.style.columnGap).toBe("6px");
    expect((await measure(page, `${BUTTONS} svg`, 0)).width).toBe(18);
    expect((await measure(page, `${BUTTONS} svg`, 1)).width).toBe(18);
    expect(await shownIconShape(page, `${BUTTONS} svg`, 0)).toBe(iconShape("Search"));
    expect(await shownIconShape(page, `${BUTTONS} svg`, 1)).toBe(iconShape("Download"));

    const [filterBox] = await boxes(page, FILTER);
    const leftGroup = [
      ...(await boxes(page, SELECTS)),
      rangeBox,
      await box(page, RESET),
      await box(page, BUTTONS, 0),
    ];
    expect(leftGroup[0].x - filterBox.x).toBeCloseTo(17, 1);
    for (let index = 1; index < leftGroup.length; index += 1) {
      const previous = leftGroup[index - 1];
      expect(leftGroup[index].x - (previous.x + previous.width)).toBeCloseTo(10, 1);
    }
    const compareBox = await box(page, BUTTONS, 1);
    const csvBox = await box(page, BUTTONS, 2);
    expect(csvBox.x + csvBox.width).toBeCloseTo(filterBox.x + filterBox.width - 17, 1);
    expect(csvBox.x - (compareBox.x + compareBox.width)).toBeCloseTo(10, 1);

    const kpiRow = await measure(page, KPI_ROW);
    expect(kpiRow.height).toBe(112);
    expect(kpiRow.style.columnGap).toBe("16px");
    await expect(page.locator(KPI)).toHaveCount(4);
    for (const kpiBox of await boxes(page, KPI)) {
      expect(kpiBox.width).toBeCloseTo((root.width - 16 * 3) / 4, 1);
    }

    const card = await measure(page, KPI);
    expect(card.style.borderTopWidth).toBe("1px");
    expect(card.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(card.style.borderLeftWidth).toBe("4px");
    expect(card.style.borderTopLeftRadius).toBe("12px");
    expect(card.style.paddingTop).toBe("16px");
    expect(card.style.paddingLeft).toBe("20px");
    expect(card.style.rowGap).toBe("6px");
    expect(card.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(visibleShadow(card.style.boxShadow)).toBe("rgba(11, 31, 46, 0.06) 0px 1px 3px 0px");
    expect(card.height).toBe(118);
    for (const [index, token] of ["--brand-line4", "--danger", "--success", "--warning"].entries()) {
      const item = await measure(page, KPI, index);
      expect(item.style.borderLeftColor).toBe(await color(page, `var(${token})`));
    }
    await expect(page.locator(`${KPI} [data-slot="kpi-stat-label"]`)).toHaveText([
      "총 조치대상",
      "미조치",
      "조치완료",
      "미검수",
    ]);
    await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`)).toHaveText([
      "24",
      "16",
      "8",
      "19",
    ]);
    await expect(page.locator(`${KPI} [data-slot="kpi-stat-unit"]`)).toHaveText([
      "건",
      "건",
      "건",
      "건",
    ]);
    await expect(page.locator(`${KPI} [data-slot="kpi-stat-description"]`)).toHaveText([
      "이상 센서로 적재된 전체",
      "조치 여부 N",
      "조치 여부 Y",
      "검수 여부 N",
    ]);
    const label = await measure(page, `${KPI} [data-slot="kpi-stat-label"]`);
    expect(label.style.fontSize).toBe("16px");
    expect(label.style.lineHeight).toBe("22px");
    expect(label.style.fontWeight).toBe("700");
    const value = await measure(page, `${KPI} [data-slot="kpi-stat-value"]`);
    expect(value.style.fontSize).toBe("30px");
    expect(value.style.lineHeight).toBe("34px");
    const description = await measure(page, `${KPI} [data-slot="kpi-stat-description"]`);
    expect(description.style.fontSize).toBe("12px");
    expect(description.style.color).toBe(await color(page, "var(--muted-fg)"));

    const body = await measure(page, BODY);
    expect(body.style.columnGap).toBe("14px");
    expect(body.height).toBe(root.height - 66 - 14 - 112 - 14);
    const ranking = await measure(page, RANKING);
    expect(ranking.width).toBeCloseTo(viewport.rankingWidth, 1);
    expect(ranking.height).toBe(body.height);
    const worklist = await measure(page, WORKLIST);
    expect(worklist.style.minWidth).toBe("0px");
    expect(worklist.width).toBeCloseTo(root.width - 14 - viewport.rankingWidth, 1);
    expect(worklist.height).toBe(body.height);
    for (const cardStyle of [worklist, ranking]) {
      expect(cardStyle.style.borderTopLeftRadius).toBe("16px");
      expect(cardStyle.style.paddingTop).toBe("16px");
      expect(cardStyle.style.paddingLeft).toBe("18px");
      expect(cardStyle.style.rowGap).toBe("14px");
      expect(cardStyle.style.borderTopWidth).toBe("1px");
      expect(cardStyle.style.backgroundColor).toBe(await color(page, "var(--card)"));
      expect(visibleShadow(cardStyle.style.boxShadow)).toBe(
        "rgba(11, 31, 46, 0.06) 0px 1px 3px 0px",
      );
    }

    const table = await measure(page, `${WORKLIST} [data-slot="table"]`);
    expect(table.style.minWidth).toBe("980px");
    const [frameBox] = await boxes(page, `${WORKLIST} [data-slot="data-table"]`);
    const gridWidth = Math.max(980, frameBox.width - 2);
    const flexible = gridWidth - FIXED_COLUMNS_SUM;
    const second = Math.max(170, flexible / 2.3);
    const first = flexible - second;
    const expectedWidths = [56, 100, first, second, 110, 76, 90, 96, 86];
    const headBoxes = await boxes(page, HEAD);
    expect(headBoxes.map((head) => Math.round(head.width * 10) / 10)).toEqual(
      expectedWidths.map((width) => Math.round(width * 10) / 10),
    );
  });
}

test("조치 워크List Card", async ({ page }) => {
  await openMeasures(page, 1920, 1080);

  const header = await measure(page, `${WORKLIST} [data-slot="section-card-header"]`);
  expect(header.height).toBe(40);
  expect(header.style.minHeight).toBe("40px");
  expect(header.style.columnGap).toBe("12px");
  await expect(page.locator(`${WORKLIST} [data-slot="section-card-eyebrow"]`)).toHaveText(
    "ACTION WORKLIST",
  );
  const eyebrow = await measure(page, `${WORKLIST} [data-slot="section-card-eyebrow"]`);
  expect(eyebrow.style.fontSize).toBe("11px");
  expect(eyebrow.style.lineHeight).toBe("16px");
  expect(eyebrow.style.fontWeight).toBe("700");
  expect(eyebrow.style.letterSpacing).toBe("0.6px");
  expect(eyebrow.style.color).toBe(await color(page, "var(--brand-line4-text)"));
  await expect(page.locator(`${WORKLIST} [data-slot="section-card-title"]`)).toHaveText(
    "이상 센서 조치 워크리스트",
  );
  const title = await measure(page, `${WORKLIST} [data-slot="section-card-title"]`);
  expect(title.style.fontSize).toBe("16px");
  expect(title.style.lineHeight).toBe("22px");
  expect(title.style.fontWeight).toBe("700");
  await expect(page.locator(BULK_BAR)).toHaveCount(0);

  const frame = await measure(page, `${WORKLIST} [data-slot="data-table"]`);
  expect(frame.style.borderTopWidth).toBe("1px");
  expect(frame.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(frame.style.borderTopLeftRadius).toBe("10px");

  const headRow = await measure(page, `${WORKLIST} thead [data-slot="table-row"]`);
  expect(headRow.height).toBe(44);
  expect(headRow.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(headRow.style.borderBottomWidth).toBe("1px");
  expect(headRow.style.borderBottomColor).toBe(await color(page, "var(--border)"));
  await expect(page.locator(HEAD)).toHaveText([
    "",
    "발생시각",
    "장치 / 센서",
    "진단",
    "편성 / 호차",
    "조치",
    "조치일",
    "검수",
    "처리",
  ]);
  const headPaddings = [0, 8, 16, 16, 16, 0, 12, 0, 0];
  for (const [index, padding] of headPaddings.entries()) {
    const head = await measure(page, HEAD, index);
    expect(head.style.paddingLeft).toBe(`${padding}px`);
    expect(head.style.fontSize).toBe("14px");
    expect(head.style.fontWeight).toBe("400");
  }
  for (const index of [5, 7, 8]) {
    expect((await measure(page, HEAD, index)).style.textAlign).toBe("center");
  }

  await expect(page.locator(BODY_ROW)).toHaveCount(MEASURES.length);
  for (const [index, item] of MEASURES.entries()) {
    await expect(page.locator(BODY_ROW).nth(index).locator('[data-slot="table-cell"]')).toHaveText(
      rowTexts(item),
    );
  }
  const row = await measure(page, BODY_ROW);
  expect(row.height).toBe(58);
  expect(row.style.borderBottomWidth).toBe("1px");
  expect(row.style.borderBottomColor).toBe(await color(page, "var(--border)"));
  expect(row.style.fontSize).toBe("14px");
  expect(row.style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect((await measure(page, BODY_ROW, MEASURES.length - 1)).style.borderBottomWidth).toBe("1px");

  const cell = (rowIndex: number, cellIndex: number) =>
    `${BODY_ROW}:nth-child(${rowIndex + 1}) [data-slot="table-cell"]:nth-child(${cellIndex + 1})`;

  const checkbox = await measure(page, `${cell(0, 0)} [data-slot="checkbox"]`);
  expect(checkbox.width).toBe(16);
  expect(checkbox.height).toBe(16);
  expect(checkbox.style.borderTopLeftRadius).toBe("4px");
  expect(checkbox.style.borderTopWidth).toBe("1px");
  expect(checkbox.style.borderTopColor).toBe(await color(page, "var(--border-strong)"));
  expect(checkbox.style.backgroundColor).toBe(await color(page, "var(--card)"));
  const [checkboxCell] = await boxes(page, cell(0, 0));
  const [checkboxBox] = await boxes(page, `${cell(0, 0)} [data-slot="checkbox"]`);
  expect(checkboxBox.x + 8).toBeCloseTo(checkboxCell.x + checkboxCell.width / 2, 1);

  const dateCell = await measure(page, cell(0, 1));
  expect(dateCell.style.paddingLeft).toBe("8px");
  expect(dateCell.style.paddingRight).toBe("8px");
  expect(await numericVariant(page, cell(0, 1))).toBe("tabular-nums");
  const date = await measure(page, `${cell(0, 1)} > span`, 0);
  expect(date.style.fontWeight).toBe("700");
  expect(date.style.fontSize).toBe("14px");
  const time = await measure(page, `${cell(0, 1)} > span`, 1);
  expect(time.style.fontSize).toBe("12px");
  expect(time.style.color).toBe(await color(page, "var(--muted-fg)"));
  const [rowBox] = await boxes(page, `${BODY_ROW}:nth-child(1)`);
  const [dateBox, timeBox] = await boxes(page, `${cell(0, 1)} > span`);
  expect(dateBox.height).toBe(16);
  expect(timeBox.height).toBe(14);
  expect(dateBox.y - rowBox.y).toBeCloseTo((58 - 1 - 30) / 2, 0);

  const deviceCell = await measure(page, cell(0, 2));
  expect(deviceCell.style.paddingLeft).toBe("16px");
  const device = await measure(page, `${cell(0, 2)} > span`, 0);
  expect(device.style.fontWeight).toBe("700");
  const deviceOverflow = await page.evaluate(
    (selector) => getComputedStyle(document.querySelector(selector) as Element).textOverflow,
    `${cell(0, 2)} > span`,
  );
  expect(deviceOverflow).toBe("ellipsis");
  const sensor = await measure(page, `${cell(0, 2)} > span`, 1);
  expect(sensor.style.fontSize).toBe("12px");
  expect(sensor.style.color).toBe(await color(page, "var(--muted-fg)"));

  const diagnosisCell = await measure(page, cell(0, 3));
  expect(diagnosisCell.style.paddingLeft).toBe("16px");
  expect(await numericVariant(page, cell(0, 3))).toBe("tabular-nums");
  expect((await measure(page, `${cell(0, 3)} > span`, 0)).style.fontWeight).toBe("700");
  const errorText = await measure(page, `${cell(0, 3)} > span`, 1);
  expect(errorText.style.fontSize).toBe("12px");
  expect(errorText.style.color).toBe(await color(page, "var(--muted-fg)"));

  const carCell = await measure(page, cell(0, 4));
  expect(carCell.style.paddingLeft).toBe("16px");
  expect(carCell.style.fontWeight).toBe("400");

  const pillTones = {
    완료: ["--success-subtle", "--on-success-subtle"],
    미조치: ["--danger-subtle", "--on-danger-subtle"],
    미검수: ["--caution-subtle", "--on-caution-subtle"],
  } as const;
  for (const [rowIndex, item] of MEASURES.entries()) {
    for (const [cellIndex, labelText] of [
      [5, item.action],
      [7, item.inspection],
    ] as const) {
      const pill = await measure(page, `${cell(rowIndex, cellIndex)} [data-slot="state-pill"]`);
      expect(pill.style.backgroundColor).toBe(await color(page, `var(${pillTones[labelText][0]})`));
      expect(pill.style.color).toBe(await color(page, `var(${pillTones[labelText][1]})`));
    }
  }
  const pill = await measure(page, `${cell(0, 5)} [data-slot="state-pill"]`);
  expect(pill.height).toBe(24);
  expect(pill.style.paddingLeft).toBe("10px");
  expect(pill.style.borderTopLeftRadius).toBe("12px");
  expect(pill.style.fontSize).toBe("12px");
  expect(pill.style.fontWeight).toBe("600");
  const [pillCell] = await boxes(page, cell(0, 5));
  const [pillBox] = await boxes(page, `${cell(0, 5)} [data-slot="state-pill"]`);
  expect(pillBox.x + pillBox.width / 2).toBeCloseTo(pillCell.x + pillCell.width / 2, 0);

  const actionDateCell = await measure(page, cell(0, 6));
  expect(actionDateCell.style.paddingLeft).toBe("12px");
  const actionDate = `${cell(0, 6)} [data-slot="measure-action-date"]`;
  await expect(page.locator(actionDate)).toHaveAttribute("title", "이 편성·호차·조치일로 전·후 비교");
  const actionDateButton = await measure(page, actionDate);
  expect(actionDateButton.style.color).toBe(await color(page, "var(--brand-line4-text)"));
  expect(actionDateButton.style.fontSize).toBe("14px");
  expect(actionDateButton.style.fontWeight).toBe("500");
  expect(actionDateButton.style.borderTopWidth).toBe("0px");
  expect(actionDateButton.style.paddingLeft).toBe("0px");
  expect(actionDateButton.style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(await numericVariant(page, actionDate)).toBe("tabular-nums");
  await expect(page.locator(`${WORKLIST} [data-slot="measure-action-date"]`)).toHaveCount(4);
  const dash = await measure(page, `${cell(1, 6)} > span`);
  expect(dash.style.color).toBe(await color(page, "var(--muted-fg)"));

  const process = await measure(page, `${cell(0, 8)} [data-slot="action-button"]`);
  expect(process.height).toBe(30);
  expect(process.style.paddingLeft).toBe("12px");
  expect(process.style.borderTopLeftRadius).toBe("6px");
  expect(process.style.borderTopWidth).toBe("1px");
  expect(process.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(process.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(process.style.color).toBe(await color(page, "var(--fg)"));
  expect(process.style.fontWeight).toBe("500");

  const pagination = `${WORKLIST} [data-slot="pagination"]`;
  await expect(page.locator(`${pagination} [data-slot="pagination-page"]`)).toHaveText([
    "1",
    "2",
    "3",
    "10",
  ]);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
  const [cardBox] = await boxes(page, WORKLIST);
  const [listBox] = await boxes(page, `${pagination} [data-slot="pagination-content"]`);
  expect(listBox.x + listBox.width / 2).toBeCloseTo(cardBox.x + cardBox.width / 2, 0);
  expect(cardBox.y + cardBox.height - (listBox.y + listBox.height)).toBeCloseTo(17, 0);
  expect((await measure(page, `${pagination} [data-slot="pagination-content"]`)).style.columnGap).toBe(
    "6px",
  );
});

test("센서 빈발 이상 랭킹 Card", async ({ page }) => {
  await openMeasures(page, 1920, 1080);

  await expect(page.locator(`${RANKING} [data-slot="section-card-eyebrow"]`)).toHaveText(
    "CHRONIC SENSORS",
  );
  await expect(page.locator(`${RANKING} [data-slot="section-card-title"]`)).toHaveText(
    "센서 빈발 이상 랭킹",
  );
  const descriptionSelector = `${RANKING} [data-slot="section-card-description"]`;
  await expect(page.locator(descriptionSelector)).toHaveText(
    "이상으로 자주 지목된 센서 = 반복 고장 부품 후보",
  );
  const description = await measure(page, descriptionSelector);
  expect(description.style.fontSize).toBe("14px");
  expect(description.style.lineHeight).toBe("20px");
  expect(description.style.color).toBe(await color(page, "var(--muted-fg)"));
  const [titleBox] = await boxes(page, `${RANKING} [data-slot="section-card-title"]`);
  const [descriptionBox] = await boxes(page, descriptionSelector);
  expect(descriptionBox.y - (titleBox.y + titleBox.height)).toBeCloseTo(4, 1);

  const frame = await measure(page, `${RANKING} [data-slot="data-table"]`);
  expect(frame.style.borderTopLeftRadius).toBe("10px");
  const headRow = await measure(page, `${RANKING} thead [data-slot="table-row"]`);
  expect(headRow.height).toBe(44);
  expect(headRow.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  await expect(page.locator(RANK_HEAD)).toHaveText(["순위", "센서 / 장치", "발생 횟수", "미조치", "최근 발생"]);
  const [frameBox] = await boxes(page, `${RANKING} [data-slot="data-table"]`);
  const flexible = frameBox.width - 2 - 56 - 170 - 64 - 100;
  const headBoxes = await boxes(page, RANK_HEAD);
  expect(headBoxes.map((head) => Math.round(head.width * 10) / 10)).toEqual(
    [56, flexible, 170, 64, 100].map((width) => Math.round(width * 10) / 10),
  );
  for (let index = 0; index < 5; index += 1) {
    const head = await measure(page, RANK_HEAD, index);
    expect(head.style.paddingLeft).toBe("16px");
    expect(head.style.fontSize).toBe("14px");
  }
  expect((await measure(page, RANK_HEAD, 0)).style.textAlign).toBe("left");
  expect((await measure(page, RANK_HEAD, 3)).style.textAlign).toBe("right");

  await expect(page.locator(RANK_ROW)).toHaveCount(RANKS.length);
  for (const [index, [sensorName, deviceCode, count, unactioned]] of RANKS.entries()) {
    await expect(page.locator(RANK_ROW).nth(index).locator('[data-slot="table-cell"]')).toHaveText([
      String(index + 1),
      `${sensorName}${deviceCode}`,
      String(count),
      String(unactioned),
      "10:00",
    ]);
  }
  const row = await measure(page, RANK_ROW);
  expect(row.height).toBe(50);
  expect(row.style.borderBottomWidth).toBe("1px");
  expect(row.style.fontSize).toBe("14px");

  const cell = (rowIndex: number, cellIndex: number) =>
    `${RANK_ROW}:nth-child(${rowIndex + 1}) [data-slot="table-cell"]:nth-child(${cellIndex + 1})`;
  const rank = await measure(page, cell(0, 0));
  expect(rank.style.textAlign).toBe("center");
  expect(rank.style.paddingLeft).toBe("16px");
  expect((await measure(page, `${cell(0, 1)} > span`, 0)).style.fontWeight).toBe("700");
  const deviceText = await measure(page, `${cell(0, 1)} > span`, 1);
  expect(deviceText.style.fontSize).toBe("12px");
  expect(deviceText.style.color).toBe(await color(page, "var(--muted-fg)"));

  const barCell = await box(page, cell(0, 2));
  for (const [index, [, , count]] of RANKS.entries()) {
    const track = await measure(page, `${cell(index, 2)} [data-slot="ratio-bar-track"]`);
    expect(track.width).toBeCloseTo(barCell.width - 32 - 12 - 22, 1);
    expect(track.height).toBe(8);
    const fill = await measure(page, `${cell(index, 2)} [data-slot="ratio-bar-fill"]`);
    expect(fill.width).toBeCloseTo((track.width * count) / 40, 1);
  }
  const track = await measure(page, `${cell(0, 2)} [data-slot="ratio-bar-track"]`);
  expect(track.style.borderTopLeftRadius).toBe("4px");
  expect(track.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  const fill = await measure(page, `${cell(0, 2)} [data-slot="ratio-bar-fill"]`);
  expect(fill.height).toBe(8);
  expect(fill.style.borderTopLeftRadius).toBe("4px");
  const fillImage = await page.evaluate(
    (selector) => getComputedStyle(document.querySelector(selector) as Element).backgroundImage,
    `${cell(0, 2)} [data-slot="ratio-bar-fill"]`,
  );
  const brand = await color(page, "var(--brand-line4)");
  const brandMix = await color(page, "color-mix(in srgb, var(--brand-line4) 70%, var(--card))");
  expect(fillImage).toBe(`linear-gradient(90deg, ${brandMix}, ${brand})`);
  const count = await measure(page, `${cell(0, 2)} [data-slot="ratio-bar-label"]`);
  expect(count.width).toBe(22);
  expect(count.style.textAlign).toBe("right");
  expect(count.style.fontWeight).toBe("700");
  expect(count.style.color).toBe(await color(page, "var(--fg)"));
  const trackBox = await box(page, `${cell(0, 2)} [data-slot="ratio-bar-track"]`);
  const countBox = await box(page, `${cell(0, 2)} [data-slot="ratio-bar-label"]`);
  expect(countBox.x - (trackBox.x + trackBox.width)).toBeCloseTo(12, 1);

  for (const [index, [, , , unactioned]] of RANKS.entries()) {
    const unactionedCell = await measure(page, cell(index, 3));
    expect(unactionedCell.style.textAlign).toBe("right");
    expect(unactionedCell.style.fontWeight).toBe("700");
    expect(unactionedCell.style.color).toBe(
      await color(page, unactioned >= 10 ? "var(--danger)" : "var(--fg)"),
    );
  }

  expect((await measure(page, cell(0, 4))).style.color).toBe(await color(page, "var(--muted-fg)"));
  expect(await numericVariant(page, cell(0, 4))).toBe("tabular-nums");
});

test("기간 선택의 모양인 두 달짜리 Calendar와 기간의 양 끝과 사이", async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TODAY);
  await openMeasures(page, 1920, 1080);
  await expect(page.locator(TRIGGER)).toHaveText("2026-09-16 ~ 2026-09-23");
  await openPicker(page);
  await expect(page.locator(TRIGGER)).toHaveAttribute("aria-expanded", "true");
  const openTrigger = await measure(page, TRIGGER);
  expect(openTrigger.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(openTrigger.style.backgroundColor).toBe(await color(page, "var(--card)"));

  const triggerBox = await box(page, TRIGGER);
  const popup = await measure(page, PICKER);
  const popupBox = await box(page, PICKER);
  expect(popupBox.x).toBeCloseTo(triggerBox.x, 1);
  expect(popupBox.y).toBeCloseTo(triggerBox.y + triggerBox.height + 4, 1);
  expect(popup.width).toBe(546);
  expect(popup.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(popup.style.color).toBe(await color(page, "var(--fg)"));
  expect(popup.style.borderTopWidth).toBe("1px");
  expect(popup.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(popup.style.borderTopLeftRadius).toBe("10px");
  expect(popup.style.paddingTop).toBe("12px");
  expect(popup.style.paddingLeft).toBe("12px");
  expect(visibleShadow(popup.style.boxShadow)).toBe("rgba(11, 31, 46, 0.14) 0px 8px 24px 0px");

  const grids = await boxes(page, `${CALENDAR} table`);
  expect(grids).toHaveLength(2);
  expect(grids[0].width).toBe(252);
  expect(grids[1].x - (grids[0].x + grids[0].width)).toBeCloseTo(16, 1);
  expect(grids[0].x - popupBox.x).toBeCloseTo(13, 1);
  await expect(page.locator(`${CALENDAR} [role="status"]`)).toHaveText(["2026년 9월", "2026년 10월"]);
  const caption = await measure(page, `${CALENDAR} [role="status"]`);
  expect(caption.style.fontSize).toBe("14px");
  expect(caption.style.fontWeight).toBe("500");
  const captionBoxes = await boxes(page, `${CALENDAR} [role="status"]`);
  expect(captionBoxes[0].x + captionBoxes[0].width / 2).toBeCloseTo(grids[0].x + 126, 0);
  expect(grids[0].y - (popupBox.y + 13)).toBeCloseTo(32 + 4, 1);

  const previous = page.getByRole("button", { name: "이전 달" });
  const next = page.getByRole("button", { name: "다음 달" });
  const previousBox = await previous.boundingBox();
  const nextBox = await next.boundingBox();
  if (!previousBox || !nextBox) throw new Error("이전 · 다음 달 버튼 없음");
  expect(previousBox.width).toBe(28);
  expect(previousBox.height).toBe(28);
  expect(previousBox.x).toBeCloseTo(grids[0].x, 1);
  expect(previousBox.y - (popupBox.y + 13)).toBeCloseTo(2, 1);
  expect(nextBox.x + nextBox.width).toBeCloseTo(grids[1].x + grids[1].width, 1);
  expect(nextBox.y).toBeCloseTo(previousBox.y, 1);
  const navSelector = `${CALENDAR} button[aria-label="이전 달"]`;
  const nav = await measure(page, navSelector);
  expect(nav.style.borderTopLeftRadius).toBe("6px");
  expect(nav.style.borderTopWidth).toBe("1px");
  expect(nav.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(nav.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(nav.style.color).toBe(await color(page, "var(--fg)"));
  expect((await measure(page, `${navSelector} svg`)).width).toBe(18);
  expect(await shownIconShape(page, `${navSelector} svg`)).toBe(iconShape("KeyboardArrowLeft"));
  expect(await shownIconShape(page, `${CALENDAR} button[aria-label="다음 달"] svg`)).toBe(
    iconShape("KeyboardArrowRight"),
  );

  const weekdays = `${CALENDAR} thead th`;
  expect(await texts(page, weekdays)).toEqual([..."일월화수목금토", ..."일월화수목금토"]);
  const weekday = await measure(page, weekdays);
  expect(weekday.width).toBe(36);
  expect(weekday.height).toBe(32);
  expect(weekday.style.fontSize).toBe("12px");
  expect(weekday.style.color).toBe(await color(page, "var(--muted-fg)"));

  const septemberDays = await page.locator(`${CALENDAR} table`).first().locator("td").allTextContents();
  expect(septemberDays).toEqual([
    "30",
    "31",
    ...Array.from({ length: 30 }, (_, index) => String(index + 1)),
    "1",
    "2",
    "3",
  ]);
  const octoberDays = await page.locator(`${CALENDAR} table`).nth(1).locator("td").allTextContents();
  expect(octoberDays).toEqual([
    "27",
    "28",
    "29",
    "30",
    ...Array.from({ length: 31 }, (_, index) => String(index + 1)),
  ]);
  const septemberCells = await page.locator(`${CALENDAR} table`).first().locator("td").evaluateAll(
    (cells) => cells.map((cellElement) => cellElement.getBoundingClientRect().toJSON() as DOMRect),
  );
  expect(septemberCells[0].width).toBe(36);
  expect(septemberCells[0].height).toBe(40);
  expect(septemberCells[7].y - (septemberCells[0].y + 40)).toBeCloseTo(4, 1);
  const [weekdayBox] = await boxes(page, weekdays);
  expect(septemberCells[0].y - (weekdayBox.y + weekdayBox.height)).toBeCloseTo(4, 1);

  const outside = await measure(page, `${CALENDAR} td[data-day="2026-08-30"] button`);
  expect(outside.style.color).toBe(await color(page, "var(--disabled)"));
  expect(outside.style.fontWeight).toBe("400");

  for (const isoDate of ["2026-09-16", "2026-09-23"]) {
    const end = await measure(page, `${calendarDayCell(CALENDAR, isoDate)} button`);
    expect(end.width).toBe(36);
    expect(end.height).toBe(40);
    expect(end.style.backgroundColor).toBe(await color(page, "var(--primary)"));
    expect(end.style.color).toBe(await color(page, "var(--on-primary)"));
    expect(end.style.fontWeight).toBe("700");
    expect(end.style.fontSize).toBe("14px");
    expect(end.style.borderTopLeftRadius).toBe("4px");
  }
  const startCell = await measure(page, calendarDayCell(CALENDAR, "2026-09-16"));
  expect(startCell.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(startCell.style.borderTopLeftRadius).toBe("4px");
  const startCellRight = await page.evaluate(
    (selector) => getComputedStyle(document.querySelector(selector) as Element).borderTopRightRadius,
    calendarDayCell(CALENDAR, "2026-09-16"),
  );
  expect(startCellRight).toBe("0px");
  const endCellRadius = await page.evaluate(
    (selector) => {
      const style = getComputedStyle(document.querySelector(selector) as Element);
      return [style.borderTopLeftRadius, style.borderTopRightRadius, style.backgroundColor];
    },
    calendarDayCell(CALENDAR, "2026-09-23"),
  );
  expect(endCellRadius).toEqual(["0px", "4px", await color(page, "var(--brand-line4-subtle)")]);
  for (let day = 17; day <= 22; day += 1) {
    const middleCell = await measure(page, calendarDayCell(CALENDAR, `2026-09-${day}`));
    expect(middleCell.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
    expect(middleCell.style.borderTopLeftRadius).toBe("0px");
    const middle = await measure(page, `${calendarDayCell(CALENDAR, `2026-09-${day}`)} button`);
    expect(middle.style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(middle.style.color).toBe(await color(page, "var(--fg)"));
    expect(middle.style.fontWeight).toBe("400");
  }
  const outsideRange = await measure(page, calendarDayCell(CALENDAR, "2026-09-15"));
  expect(outsideRange.style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  const plain = await measure(page, `${calendarDayCell(CALENDAR, "2026-09-15")} button`);
  expect(plain.style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(plain.style.color).toBe(await color(page, "var(--fg)"));

  const hovered = await hoveredStyle(page, `${calendarDayCell(CALENDAR, "2026-09-10")} button`);
  expect(visibleShadow(hovered.shadow)).toBe(
    `${await color(page, "var(--border-strong)")} 0px 0px 0px 1px inset`,
  );
  expect(hovered.background).toBe("rgba(0, 0, 0, 0)");
  const hoveredEnd = await hoveredStyle(page, `${calendarDayCell(CALENDAR, "2026-09-16")} button`);
  expect(hoveredEnd.background).toBe(await color(page, "var(--primary)"));
  expect(hoveredEnd.text).toBe(await color(page, "var(--on-primary)"));
});

test("기간 선택에서 Click한 날로 시작일과 종료일을 차례로 정하고 List에 바로 반영함", async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TODAY);
  await openMeasures(page, 1920, 1080);
  const deviceOf = (index: number) =>
    page.locator(BODY_ROW).nth(index).locator('[data-slot="table-cell"]').nth(2);
  await expect(page.locator(BODY_ROW)).toHaveCount(9);
  await openPicker(page);

  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-20")} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText("2026-09-20");
  await expect(page.locator(CALENDAR)).toBeVisible();
  await expect(page.locator(BODY_ROW)).toHaveCount(4);
  const pickedOnly = await measure(page, `${calendarDayCell(CALENDAR, "2026-09-20")} button`);
  expect(pickedOnly.style.backgroundColor).toBe(await color(page, "var(--primary)"));
  expect((await measure(page, calendarDayCell(CALENDAR, "2026-09-20"))).style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect((await measure(page, calendarDayCell(CALENDAR, "2026-09-23"))).style.backgroundColor).toBe("rgba(0, 0, 0, 0)");

  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-18")} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText("2026-09-18");
  await expect(page.locator(BODY_ROW)).toHaveCount(6);

  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-21")} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText("2026-09-18 ~ 2026-09-21");
  await expect(page.locator(BODY_ROW)).toHaveCount(4);
  await expect(deviceOf(0)).toContainText("CMSB");
  await expect(deviceOf(3)).toContainText("MICOM_AIRPURIFIER");
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await openPicker(page);
  await expect(page.locator(`${calendarDayCell(CALENDAR, "2026-09-19")} button`)).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );

  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-21")} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText("2026-09-21");
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-21")} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText("2026-09-21 ~ 2026-09-21");
  await expect(page.locator(BODY_ROW)).toHaveCount(1);
  await expect(deviceOf(0)).toContainText("CMSB");
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await openPicker(page);
  const single = await page.evaluate((selector) => {
    const cellElement = document.querySelector(selector) as Element;
    const button = cellElement.querySelector("button") as Element;
    return [
      getComputedStyle(cellElement).backgroundColor,
      getComputedStyle(button).backgroundColor,
      getComputedStyle(button).borderTopLeftRadius,
    ];
  }, calendarDayCell(CALENDAR, "2026-09-21"));
  expect(single).toEqual(["rgba(0, 0, 0, 0)", await color(page, "var(--primary)"), "4px"]);

  await page.getByRole("button", { name: "다음 달" }).click();
  await expect(page.locator(`${CALENDAR} [role="status"]`)).toHaveText(["2026년 10월", "2026년 11월"]);
  await page.getByRole("button", { name: "이전 달" }).click();
  await page.getByRole("button", { name: "이전 달" }).click();
  await expect(page.locator(`${CALENDAR} [role="status"]`)).toHaveText(["2026년 8월", "2026년 9월"]);

  await page.locator(`${CALENDAR} table`).nth(1).locator('td[data-day="2026-08-31"] button').click();
  await expect(page.locator(TRIGGER)).toHaveText("2026-08-31");
  await expect(page.locator(BODY_ROW)).toHaveCount(9);

  await page.keyboard.press("Escape");
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await expect(page.locator(TRIGGER)).toBeFocused();

  await openPicker(page);
  await expect(page.locator(`${CALENDAR} [role="status"]`)).toHaveText(["2026년 8월", "2026년 9월"]);

  await page.getByRole("button", { name: "다음 달" }).click();
  await page.getByRole("button", { name: "다음 달" }).click();
  await page.locator(`${calendarDayCell(CALENDAR, "2026-10-01")} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText("2026-08-31 ~ 2026-10-01");
  await expect(page.locator(CALENDAR)).toHaveCount(0);

  await openPicker(page);
  await page.getByRole("button", { name: "다음 달" }).click();
  await page.getByRole("button", { name: "다음 달" }).click();
  await page.locator(`${calendarDayCell(CALENDAR, "2026-10-01")} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText("2026-10-01");
  await expect(page.locator(CALENDAR)).toBeVisible();
  await page.mouse.click(1000, 1000);
  await expect(page.locator(CALENDAR)).toHaveCount(0);

  await openPicker(page);
  await page.locator(`${calendarDayCell(CALENDAR, "2026-10-05")} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText("2026-10-01 ~ 2026-10-05");
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await expect(page.locator(BODY_ROW)).toHaveCount(0);
  await expect(page.locator(EMPTY_STATE)).toBeVisible();

  await page.locator(`${EMPTY_STATE} [data-slot="action-button"]`).click();
  await expect(page.locator(TRIGGER)).toHaveText("2026-09-16 ~ 2026-09-23");
  await expect(page.locator(BODY_ROW)).toHaveCount(9);
});

test("기간을 바꾸면 첫 Page로 돌아가고 선택한 Row는 남으며, 일괄 처리는 보이는 Row 가운데 선택한 건만 대상으로 함", async ({
  page,
}) => {
  await page.clock.setFixedTime(FIXED_TODAY);
  await openMeasures(page, 1920, 1080);
  const checkboxes = page.locator(`${WORKLIST} tbody [data-slot="checkbox"]`);
  await checkboxes.nth(0).click();
  await checkboxes.nth(8).click();
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 2건");
  await page.locator(`${WORKLIST} [data-slot="pagination-page"]`).nth(2).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");

  await openPicker(page);
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-20")} button`).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(BODY_ROW)).toHaveCount(4);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 1건");
  await expect(checkboxes.nth(0)).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(`${WORKLIST} [data-slot="checkbox-control-partial"]`)).toHaveCount(1);

  await page.locator(RESET).click();
  await expect(page.locator(BODY_ROW)).toHaveCount(9);
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 2건");
});

test("조건, 검색, 초기화, 빈 상태, Page 이동", async ({ page }) => {
  await openMeasures(page, 1920, 1080);
  const deviceOf = (index: number) =>
    page.locator(BODY_ROW).nth(index).locator('[data-slot="table-cell"]').nth(2);
  const search = page.locator(BUTTONS).first();
  const selects = page.locator(SELECTS);

  await selects.nth(0).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveCount(22);
  await expect(page.locator(OPEN_ITEMS).first()).toHaveText("장치 (전체)");
  await expect(page.locator(OPEN_ITEMS).nth(1)).toHaveText("ATC");
  await page.keyboard.press("Escape");
  await selects.nth(1).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText(["조치 (전체)", "완료", "미조치"]);
  await page.keyboard.press("Escape");
  await selects.nth(2).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText(["검수 (전체)", "완료", "미검수"]);
  await page.keyboard.press("Escape");

  await selects.nth(1).click();
  await pickOption(page, "미조치");
  await expect(selects.nth(1)).toHaveText("미조치");
  await expect(page.locator(BODY_ROW)).toHaveCount(9);

  await search.click();
  await expect(page.locator(BODY_ROW)).toHaveCount(5);
  await expect(deviceOf(0)).toContainText("TRACTION_MOTOR");
  await expect(deviceOf(4)).toContainText("VVVF");
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`)).toHaveText(["24", "16", "8", "19"]);

  await selects.nth(2).click();
  await pickOption(page, "완료");
  await search.click();
  await expect(page.locator(BODY_ROW)).toHaveCount(1);
  await expect(deviceOf(0)).toContainText("MICOM_AIRPURIFIER");

  await selects.nth(0).click();
  await pickOption(page, "DCU");
  await search.click();
  await expect(page.locator(BODY_ROW)).toHaveCount(0);
  await expect(page.locator(EMPTY_STATE)).toBeVisible();
  await expect(page.locator(`${EMPTY_STATE} [data-slot="empty-state-title"]`)).toHaveText(
    "조건에 맞는 조치 건이 없습니다",
  );
  await expect(page.locator(`${EMPTY_STATE} [data-slot="empty-state-description"]`)).toHaveText(
    "기간을 넓히거나 장치·조치·검수 필터를 전체로 바꿔 보세요.",
  );
  const empty = await measure(page, EMPTY_STATE);
  expect(empty.style.paddingTop).toBe("40px");
  expect(empty.style.paddingLeft).toBe("16px");
  expect(empty.style.rowGap).toBe("10px");
  const emptyIcon = await measure(page, `${EMPTY_STATE} [data-slot="empty-state-icon"]`);
  expect(emptyIcon.width).toBe(56);
  expect(emptyIcon.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(await shownIconShape(page, `${EMPTY_STATE} [data-slot="empty-state-icon"] svg`)).toBe(
    iconShape("FindInPage"),
  );
  const emptyButtonSelector = `${EMPTY_STATE} [data-slot="action-button"]`;
  await expect(page.locator(emptyButtonSelector)).toHaveText("필터 초기화");
  const emptyButton = await measure(page, emptyButtonSelector);
  expect(emptyButton.height).toBe(40);
  expect(emptyButton.style.fontWeight).toBe("600");
  const [frameBox] = await boxes(page, `${WORKLIST} [data-slot="data-table"]`);
  const [emptyButtonBox] = await boxes(page, emptyButtonSelector);
  expect(emptyButtonBox.x + emptyButtonBox.width / 2).toBeCloseTo(frameBox.x + frameBox.width / 2, 0);

  await page.locator(emptyButtonSelector).click();
  await expect(page.locator(BODY_ROW)).toHaveCount(9);
  await expect(selects).toHaveText(["장치 (전체)", "조치 (전체)", "검수 (전체)"]);
  await expect(page.locator(EMPTY_STATE)).toHaveCount(0);

  await selects.nth(0).click();
  await pickOption(page, "DCU");
  await search.click();
  await expect(page.locator(BODY_ROW)).toHaveCount(2);
  await page.locator(RESET).click();
  await expect(page.locator(BODY_ROW)).toHaveCount(9);
  await expect(selects.nth(0)).toHaveText("장치 (전체)");

  const pages = page.locator(`${WORKLIST} [data-slot="pagination-page"]`);
  await pages.nth(1).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await page.locator(`${WORKLIST} [data-slot="pagination-next"]`).click();
  await page.locator(`${WORKLIST} [data-slot="pagination-next"]`).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("4");
  await expect(pages).toHaveText(["1", "4", "10"]);
  await pages.last().click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("10");
  await expect(page.locator(`${WORKLIST} [data-slot="pagination-next"]`)).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.locator(`${WORKLIST} [data-slot="pagination-previous"]`).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("9");
  await page.locator(RESET).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
  await pages.nth(2).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await search.click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
});

test("Row를 선택하면 일괄 처리 Bar가 표시됨", async ({ page }) => {
  await openMeasures(page, 1920, 1080);
  const checkboxes = page.locator(`${WORKLIST} [data-slot="checkbox"]`);

  await checkboxes.nth(1).click();
  await expect(checkboxes.nth(1)).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(BODY_ROW).first()).toHaveAttribute("aria-selected", "true");
  await page.waitForTimeout(300);
  const checked = await measure(page, `${WORKLIST} [data-slot="checkbox"]`, 1);
  expect(checked.style.backgroundColor).toBe(await color(page, "var(--primary)"));
  expect(
    await shownIconShape(page, `${BODY_ROW}:nth-child(1) [data-slot="checkbox-indicator"] svg`),
  ).toBe(iconShape("Check"));
  expect(await shownIconShape(page, `${WORKLIST} [data-slot="checkbox-control-partial"]`)).toBe(
    iconShape("Remove"),
  );
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  expect((await measure(page, BODY_ROW)).style.backgroundColor).toBe("rgba(0, 0, 0, 0)");

  const bar = await measure(page, BULK_BAR);
  expect(bar.height).toBe(40);
  expect(bar.style.paddingLeft).toBe("14px");
  expect(bar.style.paddingRight).toBe("4px");
  expect(bar.style.borderTopLeftRadius).toBe("10px");
  expect(bar.style.borderTopWidth).toBe("1px");
  expect(bar.style.borderTopColor).toBe(await color(page, "var(--brand-line4)"));
  expect(bar.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(bar.style.columnGap).toBe("8px");
  const [barBox] = await boxes(page, BULK_BAR);
  const [headerBox] = await boxes(page, `${WORKLIST} [data-slot="section-card-header"]`);
  expect(barBox.x + barBox.width).toBeCloseTo(headerBox.x + headerBox.width, 1);
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 1건");
  const barLabel = await measure(page, `${BULK_BAR} [data-slot="bulk-bar-label"]`);
  expect(barLabel.style.fontSize).toBe("14px");
  expect(barLabel.style.fontWeight).toBe("700");
  expect(barLabel.style.color).toBe(await color(page, "var(--brand-line4-text)"));
  expect(barLabel.style.paddingRight).toBe("4px");
  await expect(page.locator(`${BULK_BAR} [data-slot="action-button"]`)).toHaveText([
    "일괄 확인",
    "담당자 지정",
  ]);
  const bulkButton = await measure(page, `${BULK_BAR} [data-slot="action-button"]`);
  expect(bulkButton.height).toBe(30);
  expect(bulkButton.style.paddingLeft).toBe("12px");
  expect(bulkButton.style.borderTopWidth).toBe("1px");
  expect(bulkButton.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(bulkButton.style.fontWeight).toBe("500");

  await checkboxes.nth(0).click();
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 9건");
  await expect(checkboxes.nth(0)).toHaveAttribute("aria-checked", "true");
  await checkboxes.nth(0).click();
  await expect(page.locator(BULK_BAR)).toHaveCount(0);
  await expect(checkboxes.nth(0)).toHaveAttribute("aria-checked", "false");

  await checkboxes.nth(2).click();
  await checkboxes.nth(3).click();
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 2건");
  await page.locator(RESET).click();
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 2건");
  await page.locator(BUTTONS).first().click();
  await expect(page.locator(BULK_BAR)).toHaveCount(0);
  await expect(page.locator(`${WORKLIST} tbody [data-slot="checkbox"][aria-checked="true"]`)).toHaveCount(0);
});

test("검색과 초기화는 조건이 그대로여도 다시 조회하고, 다시 받는 동안 Row 안의 처리를 막음", async ({
  page,
}) => {
  await openMeasures(page, 1920, 1080);
  const firstProcess = `${BODY_ROW}:nth-child(1) [data-slot="action-button"]`;
  await expect(page.locator(firstProcess)).toHaveAttribute("aria-disabled", "false");

  const watch = () =>
    page.evaluate((selector) => {
      const target = document.querySelector(selector) as Element;
      const changes: (string | null)[] = [];
      const observer = new MutationObserver((records) => {
        for (const record of records) changes.push(target.getAttribute(record.attributeName ?? ""));
      });
      observer.observe(target, { attributes: true, attributeFilter: ["aria-disabled"] });
      (window as unknown as { stopWatch: () => (string | null)[] }).stopWatch = () => {
        observer.disconnect();
        return changes;
      };
    }, firstProcess);
  const stop = () =>
    page.evaluate(() => (window as unknown as { stopWatch: () => (string | null)[] }).stopWatch());

  await delayMockResponses(page, RELOAD_MS);

  await watch();
  await page.locator(BUTTONS).first().click();
  await expect(page.locator(firstProcess)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(firstProcess)).toHaveAttribute("aria-disabled", "false");
  await page.waitForTimeout(200);
  const searchChanges = await stop();
  expect(searchChanges.length).toBeGreaterThanOrEqual(2);
  expect(searchChanges.filter((value) => value === "true").length).toBeGreaterThanOrEqual(1);
  expect(searchChanges[searchChanges.length - 1]).toBe("false");

  await watch();
  await page.locator(RESET).click();
  await expect(page.locator(firstProcess)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(firstProcess)).toHaveAttribute("aria-disabled", "false");
  await page.waitForTimeout(200);
  const resetChanges = await stop();
  expect(resetChanges.filter((value) => value === "true").length).toBeGreaterThanOrEqual(1);
  expect(resetChanges[resetChanges.length - 1]).toBe("false");

  await watch();
  await page.waitForTimeout(NO_RELOAD_WATCH_MS);
  expect(await stop()).toEqual([]);
  await expect(page.locator(BODY_ROW)).toHaveCount(9);
});

for (const theme of ["라이트", "다크"] as const) {
  test(`Hover한 Button과 Row의 Color (${theme} Theme)`, async ({ page }) => {
    await openMeasures(page, 1920, 1080);
    if (theme === "다크") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    const token = (name: string) => color(page, `var(--${name})`);

    expect((await hoveredStyle(page, BUTTONS, 0)).background).toBe(await token("primary-hover"));
    expect((await hoveredStyle(page, BUTTONS, 1)).background).toBe(await token("muted"));
    expect((await hoveredStyle(page, BUTTONS, 2)).background).toBe(await token("muted"));
    const range = await hoveredStyle(page, TRIGGER);
    expect(range.background).toBe(await token("card"));
    expect(range.text).toBe(await token("fg"));

    const rowHover = await hoveredStyle(page, BODY_ROW, 1);
    expect(rowHover.background).toBe(await token("brand-line4-subtle"));
    expect(
      (await hoveredStyle(page, `${BODY_ROW} [data-slot="action-button"]`, 1)).background,
    ).toBe(await token("muted"));
    const actionDate = await hoveredStyle(page, `${WORKLIST} [data-slot="measure-action-date"]`);
    expect(actionDate.decoration).toBe("underline");
    expect(actionDate.text).toBe(await token("brand-line4-text"));

    expect((await hoveredStyle(page, RANK_ROW, 2)).background).toBe("rgba(0, 0, 0, 0)");
  });
}

test("기본 Font 크기를 2배로 하면 조치 관리의 크기도 2배임", async ({ page }) => {
  await openMeasures(page, 1920, 1080);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page.waitForTimeout(400);

  const filter = await measure(page, FILTER);
  expect(filter.height).toBe(132);
  expect(filter.style.borderTopWidth).toBe("2px");
  expect((await measure(page, SELECTS)).width).toBe(360);
  const range = await measure(page, TRIGGER);
  expect(range.width).toBe(520);
  expect(range.height).toBe(64);
  expect(range.style.paddingLeft).toBe("24px");
  expect(range.style.columnGap).toBe("20px");
  expect((await measure(page, `${TRIGGER} svg`)).width).toBe(36);
  const search = await measure(page, BUTTONS);
  expect(search.height).toBe(64);
  expect(search.style.paddingLeft).toBe("32px");

  const kpiRow = await measure(page, KPI_ROW);
  expect(kpiRow.height).toBe(224);
  expect((await measure(page, KPI)).height).toBe(236);

  const table = await measure(page, `${WORKLIST} [data-slot="table"]`);
  expect(table.style.minWidth).toBe("1960px");
  expect((await measure(page, `${WORKLIST} thead [data-slot="table-row"]`)).height).toBe(88);
  expect((await measure(page, HEAD, 1)).width).toBe(200);
  const row = await measure(page, BODY_ROW);
  expect(row.height).toBe(116);
  expect(row.style.borderBottomWidth).toBe("2px");
  const pill = await measure(page, `${BODY_ROW} [data-slot="state-pill"]`);
  expect(pill.height).toBe(48);
  expect(pill.style.fontSize).toBe("24px");
  const [dateBox, timeBox] = await boxes(page, `${BODY_ROW}:nth-child(1) [data-slot="table-cell"]:nth-child(2) > span`);
  expect(dateBox.height).toBe(32);
  expect(timeBox.height).toBe(28);

  const rankRow = await measure(page, RANK_ROW);
  expect(rankRow.height).toBe(100);
  expect((await measure(page, `${RANKING} [data-slot="ratio-bar-track"]`)).height).toBe(16);
  expect((await measure(page, `${RANKING} [data-slot="ratio-bar-label"]`)).width).toBe(44);

  await openPicker(page);
  await page.waitForTimeout(300);
  const triggerBox = await box(page, TRIGGER);
  const popupBox = await box(page, PICKER);
  expect(popupBox.width).toBe(1092);
  expect(popupBox.y).toBeCloseTo(triggerBox.y + triggerBox.height + 8, 1);
  const dayButton = await measure(page, `${CALENDAR} td button`);
  expect(dayButton.width).toBe(72);
  expect(dayButton.height).toBe(80);
  expect(dayButton.style.fontSize).toBe("28px");
  const navBox = await page.getByRole("button", { name: "이전 달" }).boundingBox();
  expect(navBox?.width).toBe(56);
});

test("다크 Theme에서 조치 관리의 Color", async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TODAY);
  await openMeasures(page, 1920, 1080);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.waitForTimeout(300);
  const token = (name: string) => color(page, `var(--${name})`);

  const filter = await measure(page, FILTER);
  expect(filter.style.backgroundColor).toBe(await token("surface-low"));
  const select = await measure(page, SELECTS);
  expect(select.style.backgroundColor).toBe(await token("card"));
  expect(select.style.color).toBe(await token("fg"));
  const range = await measure(page, TRIGGER);
  expect(range.style.backgroundColor).toBe(await token("card"));
  expect(range.style.borderTopColor).toBe(await token("border"));
  expect(range.style.color).toBe(await token("fg"));
  const compare = await measure(page, BUTTONS, 1);
  expect(compare.style.backgroundColor).toBe(await token("card"));
  expect(compare.style.borderTopColor).toBe(await token("border"));
  expect((await measure(page, BUTTONS, 0)).style.backgroundColor).toBe(await token("primary"));

  const card = await measure(page, KPI, 3);
  expect(card.style.backgroundColor).toBe(await token("card"));
  expect(card.style.borderLeftColor).toBe(await token("warning"));

  const worklist = await measure(page, WORKLIST);
  expect(worklist.style.backgroundColor).toBe(await token("card"));
  const headRow = await measure(page, `${WORKLIST} thead [data-slot="table-row"]`);
  expect(headRow.style.backgroundColor).toBe(await token("muted"));
  const actionPill = await measure(page, `${BODY_ROW} [data-slot="state-pill"]`, 2);
  expect(actionPill.style.backgroundColor).toBe(await token("danger-subtle"));
  expect(actionPill.style.color).toBe(await token("on-danger-subtle"));
  const inspectionPill = await measure(page, `${BODY_ROW} [data-slot="state-pill"]`, 3);
  expect(inspectionPill.style.backgroundColor).toBe(await token("caution-subtle"));
  expect(
    (await measure(page, `${WORKLIST} [data-slot="measure-action-date"]`)).style.color,
  ).toBe(await token("brand-line4-text"));
  const process = await measure(page, `${BODY_ROW} [data-slot="action-button"]`);
  expect(process.style.backgroundColor).toBe(await token("card"));
  expect(process.style.borderTopColor).toBe(await token("border"));

  const rankTrack = await measure(page, `${RANKING} [data-slot="ratio-bar-track"]`);
  expect(rankTrack.style.backgroundColor).toBe(await token("brand-line4-subtle"));
  expect((await measure(page, `${RANK_ROW} [data-slot="table-cell"]`, 3)).style.color).toBe(
    await token("danger"),
  );

  await openPicker(page);
  const popup = await measure(page, PICKER);
  expect(popup.style.backgroundColor).toBe(await token("card"));
  expect(popup.style.borderTopColor).toBe(await token("border"));
  const nav = await measure(page, `${CALENDAR} button[aria-label="이전 달"]`);
  expect(nav.style.backgroundColor).toBe(await token("card"));
  expect(nav.style.borderTopColor).toBe(await token("border"));
  const end = await measure(page, `${calendarDayCell(CALENDAR, "2026-09-16")} button`);
  expect(end.style.backgroundColor).toBe(await token("primary"));
  expect(end.style.color).toBe(await token("on-primary"));
  expect((await measure(page, calendarDayCell(CALENDAR, "2026-09-18"))).style.backgroundColor).toBe(
    await token("brand-line4-subtle"),
  );
  expect((await measure(page, `${calendarDayCell(CALENDAR, "2026-09-18")} button`)).style.color).toBe(await token("fg"));
  expect((await measure(page, `${CALENDAR} td[data-day="2026-08-30"] button`)).style.color).toBe(
    await token("disabled"),
  );
  expect((await measure(page, `${CALENDAR} thead th`)).style.color).toBe(await token("muted-fg"));
});

test.describe("움직임 줄이기에 따른 Calendar 표시", () => {
  const firstFrameTransform = (page: Page) =>
    page.evaluate((selector) => {
      const popup = document.querySelector(selector) as HTMLElement;
      const animation = popup.getAnimations()[0];
      if (!animation) return "no-animation";
      animation.pause();
      animation.currentTime = 0;
      return getComputedStyle(popup).transform;
    }, PICKER);

  test("움직임 줄이기를 켜면 크기와 위치는 그대로 두고 Fade만 적용됨", async ({ page }) => {
    await openMeasures(page, 1920, 1080);
    await page.locator(TRIGGER).click();
    await page.waitForSelector(PICKER);
    const transform = await firstFrameTransform(page);
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
  });

  test.describe("움직임 줄이기를 끈 화면", () => {
    test.use({ contextOptions: { reducedMotion: "no-preference" } });

    test("기본 움직임 그대로 0.95 크기로, 8 위에서 나타남", async ({ page }) => {
      await openMeasures(page, 1920, 1080);
      await page.locator(TRIGGER).click();
      await page.waitForSelector(PICKER);
      const transform = await firstFrameTransform(page);
      expect(transform).toBe("matrix3d(0.95, 0, 0, 0, 0, 0.95, 0, 0, 0, 0, 0.95, 0, 0, -8, 0, 1)");
    });
  });
});

function fixedMonthDay(daysAgo: number): string {
  const date = new Date(FIXED_TODAY);
  date.setDate(date.getDate() - daysAgo);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function csvLine(item: (typeof MEASURES)[number]): string {
  const monthDay = fixedMonthDay(item.daysAgo);
  return [
    `${monthDay} ${item.time}`,
    `${item.device} / ${item.sensor}`,
    `${item.diag} · ${item.error}`,
    item.car,
    item.action,
    item.action === "완료" ? monthDay : "-",
    item.inspection,
  ].join(",");
}

test("CSV 내보내기는 적용된 조건과 기간에 맞는 Row 전부를 Table에 보이는 형태의 CSV 파일로 내려받음", async ({
  page,
}) => {
  await page.clock.setFixedTime(FIXED_TODAY);
  await openMeasures(page, 1920, 1080);
  const toast = page.locator('[data-slot="toast"]');
  const selects = page.locator(SELECTS);

  const all = await downloadCsv(page, BUTTONS, 2);
  expect(all.fileName).toBe("measures-worklist-20260923-120000.csv");
  expect(all.hasByteOrderMark).toBe(true);
  expect(all.endsWithLineEnd).toBe(true);
  expect(all.hasBareLineBreak).toBe(false);
  await expect(toast).toHaveText("CSV 파일을 내려받았습니다.");
  await expect(page.locator(BUTTONS).nth(2)).toHaveAttribute("aria-disabled", "false");
  const heads = await texts(page, HEAD);
  expect(all.lines[0]).toBe("발생시각,장치 / 센서,진단,편성 / 호차,조치,조치일,검수");
  expect(all.lines[0]).toBe(heads.slice(1, -1).join(","));
  await expect(page.locator(BODY_ROW)).toHaveCount(9);
  expect(all.lines.slice(1)).toEqual(MEASURES.map(csvLine));

  await selects.nth(1).click();
  await pickOption(page, "미조치");
  await page.locator(BUTTONS).first().click();
  await expect(page.locator(BODY_ROW)).toHaveCount(5);
  const unactioned = MEASURES.filter((item) => item.action === "미조치").map(csvLine);
  expect((await downloadCsv(page, BUTTONS, 2)).lines.slice(1)).toEqual(unactioned);

  await selects.nth(2).click();
  await pickOption(page, "완료");
  expect((await downloadCsv(page, BUTTONS, 2)).lines.slice(1)).toEqual(unactioned);

  await page.locator(TRIGGER).click();
  await expect(page.locator(CALENDAR)).toBeVisible();
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-20")} button`).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(BODY_ROW)).toHaveCount(2);
  const recent = MEASURES.filter((item) => item.action === "미조치" && item.daysAgo <= 3).map(csvLine);
  expect(recent).toHaveLength(2);
  expect((await downloadCsv(page, BUTTONS, 2)).lines.slice(1)).toEqual(recent);
});

test("고정 표기의 조치 여부, 검수 여부 이름과 순서", () => {
  expect(measureActionCodes).toEqual(["Y", "N"]);
  expect(measureInspectionCodes).toEqual(["Y", "N"]);
  expect(measureActionLabels).toEqual({
    Y: { label: "완료", stateLabel: "조치완료", codeLabel: "Y" },
    N: { label: "미조치", stateLabel: "미조치", codeLabel: "N" },
  });
  expect(measureInspectionLabels).toEqual({
    Y: { label: "완료", stateLabel: "검수완료", codeLabel: "Y" },
    N: { label: "미검수", stateLabel: "미검수", codeLabel: "N" },
  });
});

test("계산 함수의 요약, 미조치 강조, 조치 저장, 일괄 조치완료", () => {
  const base: Measure = {
    id: "x",
    occurredAt: "2026-09-20T10:00:00",
    deviceCode: "ECU",
    sensorName: "베어링 온도",
    actualValue: 0.5,
    expectedValue: 0.2,
    errorValue: 0.3,
    formation: "404",
    car: 4,
    actionYn: "N",
    inspectionYn: "N",
    actionDate: null,
    actionNote: "",
  };
  expect(
    summarizeMeasures([
      base,
      { ...base, id: "y", actionYn: "Y", actionDate: "2026-09-21" },
      { ...base, id: "z", inspectionYn: "Y" },
    ]),
  ).toEqual({ totalCount: 3, unactionedCount: 2, actionedCount: 1, uninspectedCount: 2 });
  expect(classifyUnactionedCount(10, 10)).toBe("high");
  expect(classifyUnactionedCount(9, 10)).toBe("normal");
  expect(
    applyMeasureAction(base, {
      actionYn: "N",
      inspectionYn: "Y",
      actionDate: "2026-09-22",
      actionNote: "점검",
    }),
  ).toMatchObject({ actionYn: "N", inspectionYn: "Y", actionDate: null, actionNote: "점검" });
  expect(
    applyMeasureAction(base, {
      actionYn: "Y",
      inspectionYn: "N",
      actionDate: "2026-09-22",
      actionNote: "",
    }),
  ).toMatchObject({ actionYn: "Y", actionDate: "2026-09-22" });
  expect(markMeasureActioned({ ...base, actionNote: "메모" }, "2026-09-20")).toMatchObject({
    actionYn: "Y",
    actionDate: "2026-09-20",
    inspectionYn: "N",
    actionNote: "메모",
  });
  expect(
    markMeasureActioned({ ...base, actionYn: "Y", actionDate: "2026-09-21" }, "2026-09-20")
      .actionDate,
  ).toBe("2026-09-21");
});

test("Mock 조회와 실행 함수는 조건과 기간으로 거르고 바꾼 값은 다시 조회한 값에 반영함", async () => {
  const options = await fetchMeasureFilterOptions();
  expect(options.actionStates).toEqual(["Y", "N"]);
  expect(options.inspectionStates).toEqual(["Y", "N"]);
  expect(options.defaultPeriod).toEqual({ from: isoDaysAgo(7), to: isoDaysAgo(0) });
  expect(options.selectablePeriod).toEqual({ from: null, to: null });

  const all = { deviceCode: null, actionYn: null, inspectionYn: null };
  const everything = await fetchMeasureWorklist({ ...all, period: { from: null, to: null }, page: 1 });
  expect(everything.rows.map((row) => row.id)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  expect(everything.pageCount).toBe(10);
  expect(everything.rows[0]).toEqual({
    id: "1",
    occurredAt: `${isoDaysAgo(0)}T09:12:07`,
    deviceCode: "DRIVING_GEAR",
    sensorName: "압축기 토출압력",
    actualValue: 0.6,
    expectedValue: 0.2,
    errorValue: 0.4,
    formation: "401",
    car: 1,
    actionYn: "Y",
    inspectionYn: "Y",
    actionDate: isoDaysAgo(0),
    actionNote: null,
  });
  const between = await fetchMeasureWorklist({
    ...all,
    period: { from: isoDaysAgo(5), to: isoDaysAgo(2) },
    page: 1,
  });
  expect(between.rows.map((row) => row.id)).toEqual(["3", "4", "5", "6"]);
  const since = await fetchMeasureWorklist({ ...all, period: { from: isoDaysAgo(1), to: null }, page: 1 });
  expect(since.rows.map((row) => row.id)).toEqual(["1", "2"]);
  const filtered = await fetchMeasureWorklist({
    deviceCode: "DCU",
    actionYn: "Y",
    inspectionYn: "N",
    period: { from: null, to: null },
    page: 1,
  });
  expect(filtered.rows.map((row) => row.id)).toEqual(["7", "8"]);

  expect(await fetchMeasureSummary()).toEqual({
    totalCount: 24,
    unactionedCount: 16,
    actionedCount: 8,
    uninspectedCount: 19,
  });
  const ranking = await fetchSensorFrequencyRanking();
  expect(ranking.map((row) => row.unactionedLevel)).toEqual([
    "high",
    "high",
    "high",
    "high",
    "normal",
    "normal",
    "normal",
    "normal",
    "normal",
    "normal",
  ]);
  expect(ranking[0].lastOccurredAt).toBe(`${isoDaysAgo(0)}T10:00:00`);
  expect(ranking[8].lastOccurredAt).toBe(`${isoDaysAgo(0)}T10:00:00`);

  await saveMeasureAction("2", {
    actionYn: "Y",
    inspectionYn: "Y",
    actionDate: isoDaysAgo(0),
    actionNote: "센서 교체",
  });
  const afterSave = await fetchMeasureWorklist({ ...all, period: { from: null, to: null }, page: 1 });
  expect(afterSave.rows[1]).toMatchObject({
    actionYn: "Y",
    inspectionYn: "Y",
    actionDate: isoDaysAgo(0),
    actionNote: "센서 교체",
  });
  expect(await fetchMeasureSummary()).toEqual({
    totalCount: 24,
    unactionedCount: 15,
    actionedCount: 9,
    uninspectedCount: 18,
  });

  await completeMeasures(["3", "9"]);
  const afterBulk = await fetchMeasureWorklist({ ...all, period: { from: null, to: null }, page: 1 });
  expect(afterBulk.rows[2]).toMatchObject({ actionYn: "Y", actionDate: isoDaysAgo(2), inspectionYn: "N" });
  expect(afterBulk.rows[8]).toMatchObject({ actionYn: "Y", actionDate: isoDaysAgo(7), inspectionYn: "N" });
  expect((await fetchMeasureSummary()).unactionedCount).toBe(13);

  await assignMeasures(["1"], { assignee: "박기술", comment: "" });
  await exportMeasureCsv({ ...all, period: { from: null, to: null } });
  expect(await fetchMeasureWorklist({ ...all, period: { from: null, to: null }, page: 1 })).toEqual(
    afterBulk,
  );
});
