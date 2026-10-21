import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { createAlarmRuleEditorState } from "../src/components/pages/alarms/alarmModalState";
import { screenPath } from "../src/config/navigation";
import {
  buildAlarmRuleMatrix,
  checkAlarmRuleDraft,
  createAlarmRuleDraft,
  isClosedAlarmStatus,
  isOpenAlarmStatus,
  recordsAcknowledgedAt,
  toAlarmRuleDraft,
  type AlarmRule,
} from "../src/domain/alarms";
import { alarmRuleScopeKinds, alarmRuleScopeLabels } from "../src/domain/labels/alarmRuleScope";
import { alarmSeverityKeys } from "../src/domain/labels/alarmSeverity";
import { alarmStatusKeys, alarmStatusLabels } from "../src/domain/labels/alarmStatus";
import {
  acknowledgeAlarms,
  assignAlarms,
  createAlarm,
  deleteAlarm,
  deleteAlarmRule,
  fetchAlarmAssignees,
  fetchAlarmRules,
  fetchAlarmSummary,
  fetchAlarmWorklist,
  processAlarm,
  saveAlarmRule,
} from "../src/services/alarms";
import { color, isoDaysAgo, measure, visibleShadow } from "./helpers/measure";
import { confirmDialog, modal } from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const ROOT = '[data-slot="alarm-events"]';
const FILTER = '[data-slot="alarm-filter-bar"]';
const KPI_ROW = '[data-slot="alarm-kpi-row"]';
const KPI = `${KPI_ROW} [data-slot="kpi-stat"]`;
const WORKLIST = '[data-slot="alarm-worklist-card"]';
const SIDE = '[data-slot="alarm-events-side"]';
const TREND = '[data-slot="alarm-trend-card"]';
const RANKING = '[data-slot="alarm-car-ranking-card"]';
const CHART = '[data-slot="alarm-daily-stack-chart"]';
const PLOT = `${CHART} [data-slot="chart-stack-plot"]`;
const SEGMENT = `${CHART} [data-slot="chart-stack-segment"]`;
const TOOLTIP = `${CHART} [data-slot="chart-hover-tooltip"]`;
const TOOLTIP_WRAPPER = `${CHART} .recharts-tooltip-wrapper`;
const BUBBLE = `${TOOLTIP} [data-slot="chart-tooltip-bubble"]`;
const HOVERED_COLUMN = `${CHART} [data-slot="chart-hovered-column"]`;
const HEAD = `${WORKLIST} [data-slot="table-head"]`;
const BODY_ROW = `${WORKLIST} tbody [data-slot="table-row"]`;
const BULK_BAR = `${WORKLIST} [data-slot="bulk-bar"]`;
const RANK_ROW = `${RANKING} tbody [data-slot="table-row"]`;
const OPEN_ITEMS = '[data-slot="select-content"][data-open] [data-slot="select-item"]';

const ALARMS = [
  { daysAgo: 0, time: "08:05:00", auto: true, device: "CMSB", model: "IF", car: "편성 401 · 1호차", severity: "MID", window: "12개 · 최장 6.2분", ratio: "8.0%", status: "신규", assignee: "-" },
  { daysAgo: 1, time: "09:06:07", auto: false, device: "ECU", model: "SVM", car: "편성 402 · 2호차", severity: "LOW", window: "-", ratio: "13.0%", status: "확인", assignee: "이현장" },
  { daysAgo: 2, time: "10:07:14", auto: true, device: "MICOM_COOLER", model: "VAE", car: "편성 403 · 3호차", severity: "CRIT", window: "8개 · 최장 4.5분", ratio: "18.0%", status: "조치중", assignee: "박기술" },
  { daysAgo: 3, time: "11:08:21", auto: false, device: "MICOM_AIRPURIFIER", model: "PCA", car: "편성 404 · 4호차", severity: "HIGH", window: "-", ratio: "23.0%", status: "해소", assignee: "김정비" },
  { daysAgo: 4, time: "12:09:28", auto: true, device: "DCU", model: "IF", car: "편성 405 · 5호차", severity: "MID", window: "15개 · 최장 7.0분", ratio: "28.0%", status: "오탐", assignee: "이현장" },
  { daysAgo: 5, time: "13:10:35", auto: false, device: "VVVF", model: "SVM", car: "편성 406 · 6호차", severity: "LOW", window: "-", ratio: "8.0%", status: "신규", assignee: "-" },
  { daysAgo: 6, time: "14:11:42", auto: true, device: "SIV", model: "VAE", car: "편성 407 · 7호차", severity: "CRIT", window: "6개 · 최장 3.0분", ratio: "13.0%", status: "확인", assignee: "김정비" },
  { daysAgo: 7, time: "15:12:49", auto: false, device: "TCMS", model: "PCA", car: "편성 408 · 8호차", severity: "HIGH", window: "-", ratio: "18.0%", status: "조치중", assignee: "이현장" },
  { daysAgo: 7, time: "15:12:49", auto: true, device: "TCMS", model: "PCA", car: "편성 408 · 8호차", severity: "HIGH", window: "9개 · 최장 5.5분", ratio: "18.0%", status: "조치중", assignee: "이현장" },
  { daysAgo: 8, time: "16:13:56", auto: false, device: "PAC", model: "IF", car: "편성 409 · 1호차", severity: "MID", window: "-", ratio: "23.0%", status: "해소", assignee: "박기술" },
];

const DAYS = [
  [1, 0, 1, 0],
  [0, 1, 0, 1],
  [1, 0, 1, 0],
  [0, 1, 0, 1],
  [1, 0, 1, 0],
  [0, 1, 0, 1],
  [1, 0, 1, 0],
  [0, 1, 0, 1],
  [2, 0, 1, 0],
  [0, 2, 0, 1],
];
const SEVERITIES = ["LOW", "MID", "HIGH", "CRIT"] as const;
const SEVERITY_FILLS = ["--border-strong", "--caution", "--warning-strong", "--danger"];
const CARS: [string, number, string][] = [
  ["403", 3, "CRIT"],
  ["404", 4, "HIGH"],
  ["407", 7, "CRIT"],
  ["408", 8, "HIGH"],
  ["411", 3, "CRIT"],
  ["412", 4, "HIGH"],
  ["415", 7, "CRIT"],
  ["416", 8, "HIGH"],
  ["419", 3, "CRIT"],
  ["420", 4, "HIGH"],
];

const AXIS_LABEL_WIDTH = 20;
const AXIS_WIDTH = 28;
const BARS_BOX_HEIGHT = 116;
const BASELINE_WIDTH = 1;
const FULL_BAR_HEIGHT = 96;
const AXIS_MAX = 3;
const BAND_GAP = 10;
const BAR_MAX_WIDTH = 26;
const TOTAL_LABEL_GAP = 2;
const DATE_ROW_GAP = 6;
const CURSOR_GAP = 12;
const HOVERED_COLUMN_HEIGHT = 115;

function iconShape(name: string): string {
  const source = readFileSync(
    join(process.cwd(), "node_modules", "@mui", "icons-material", `${name}Rounded.js`),
    "utf8",
  );
  const shape = /d: "([^"]+)"/.exec(source)?.[1];
  if (!shape) throw new Error(`아이콘 모양 없음: ${name}`);
  return shape;
}

async function shownIconShape(page: Page, selector: string, index = 0): Promise<string> {
  return page.evaluate(
    ({ selector, index }) =>
      document.querySelectorAll(selector)[index]?.querySelector("path")?.getAttribute("d") ?? "",
    { selector, index },
  );
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function openAlarms(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto("/dashboard/alarms");
  await expect(page.locator(SEGMENT).first()).toBeVisible();
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

async function barsArea(page: Page, scale = 1) {
  const [plot] = await boxes(page, PLOT);
  const x = plot.x + AXIS_WIDTH * scale;
  const width = plot.width - AXIS_WIDTH * scale;
  const band = (width - BAND_GAP * scale * (DAYS.length - 1)) / DAYS.length;
  const bottom = plot.y + (BARS_BOX_HEIGHT - BASELINE_WIDTH) * scale;
  return {
    plot,
    x,
    width,
    band,
    bottom,
    barWidth: Math.min(BAR_MAX_WIDTH * scale, band),
    center: (index: number) => x + (band + BAND_GAP * scale) * index + band / 2,
    barHeight: (index: number) =>
      (DAYS[index].reduce((sum, count) => sum + count, 0) / AXIS_MAX) * FULL_BAR_HEIGHT * scale,
  };
}

function rowTexts(alarm: (typeof ALARMS)[number]): string[] {
  return [
    "",
    `${isoDaysAgo(alarm.daysAgo)}${alarm.time}${alarm.auto ? "자동" : ""}`,
    `${alarm.device}${alarm.model} 모델`,
    alarm.car,
    alarm.severity,
    alarm.window,
    alarm.ratio,
    alarm.status,
    alarm.assignee,
    "처리삭제",
  ];
}

for (const viewport of [
  { width: 1920, height: 1080, sideWidth: 560 },
  { width: 1440, height: 900, sideWidth: 440 },
]) {
  test(`알람/이벤트 Layout, 조건 Row, KPI Row 확인 (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await openAlarms(page, viewport.width, viewport.height);

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

    const triggers = `${FILTER} [data-slot="select-trigger"]`;
    await expect(page.locator(triggers)).toHaveText(["상태 (전체)", "심각도 (전체)", "장치 (전체)"]);
    for (const [index, width] of [160, 160, 200].entries()) {
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
    expect(reset.style.backgroundColor).toBe(await color(page, "var(--card)"));
    await expect(page.locator(`${FILTER} [data-slot="icon-button"]`)).toHaveAttribute(
      "aria-label",
      "초기화",
    );
    const resetIcon = await measure(page, `${FILTER} [data-slot="icon-button"] svg`);
    expect(resetIcon.width).toBe(18);
    expect(await shownIconShape(page, `${FILTER} [data-slot="icon-button"] svg`)).toBe(
      iconShape("Refresh"),
    );

    const buttons = `${FILTER} [data-slot="action-button"]`;
    await expect(page.locator(buttons)).toHaveText(["검색", "알람 규칙", "알람 등록"]);
    const search = await measure(page, buttons, 0);
    expect(search.height).toBe(32);
    expect(search.style.paddingLeft).toBe("14px");
    expect(search.style.paddingRight).toBe("14px");
    expect(search.style.borderTopLeftRadius).toBe("6px");
    expect(search.style.borderTopWidth).toBe("0px");
    expect(search.style.borderRightWidth).toBe("0px");
    expect(search.style.backgroundColor).toBe(await color(page, "var(--primary)"));
    expect(search.style.color).toBe(await color(page, "var(--on-primary)"));
    expect(search.style.fontSize).toBe("14px");
    expect(search.style.fontWeight).toBe("500");
    expect(search.style.columnGap).toBe("6px");
    const rules = await measure(page, buttons, 1);
    expect(rules.height).toBe(32);
    expect(rules.style.paddingLeft).toBe("16px");
    expect(rules.style.borderTopLeftRadius).toBe("6px");
    expect(rules.style.borderTopWidth).toBe("1px");
    expect(rules.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(rules.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(rules.style.color).toBe(await color(page, "var(--fg)"));
    expect(rules.style.fontSize).toBe("14px");
    expect(rules.style.fontWeight).toBe("500");
    expect(rules.style.columnGap).toBe("6px");
    await expect(page.locator(buttons).nth(1)).toHaveAttribute(
      "title",
      "추론이 끝나면 이 규칙으로 알람을 자동 생성합니다",
    );
    const rulesIcon = await measure(page, `${buttons} svg`, 1);
    expect(rulesIcon.width).toBe(18);
    expect(rulesIcon.style.color).toBe(await color(page, "var(--muted-fg)"));
    for (const [index, name] of ["Search", "Tune", "Add"].entries()) {
      expect(await shownIconShape(page, `${buttons} svg`, index)).toBe(iconShape(name));
    }
    const create = await measure(page, buttons, 2);
    expect(create.height).toBe(32);
    expect(create.style.paddingLeft).toBe("16px");
    expect(create.style.borderTopWidth).toBe("0px");
    expect(create.style.borderRightWidth).toBe("0px");
    expect(create.style.backgroundColor).toBe(await color(page, "var(--primary)"));
    expect(create.style.color).toBe(await color(page, "var(--on-primary)"));
    expect(create.style.fontWeight).toBe("500");
    const [filterBox] = await boxes(page, FILTER);
    const buttonBoxes = await boxes(page, buttons);
    expect(buttonBoxes[2].x + buttonBoxes[2].width).toBeCloseTo(filterBox.x + filterBox.width - 17, 1);
    expect(buttonBoxes[2].x - (buttonBoxes[1].x + buttonBoxes[1].width)).toBeCloseTo(10, 1);

    const kpiRow = await measure(page, KPI_ROW);
    expect(kpiRow.height).toBe(112);
    expect(kpiRow.style.columnGap).toBe("16px");
    await expect(page.locator(KPI)).toHaveCount(5);
    const kpiBoxes = await boxes(page, KPI);
    for (const box of kpiBoxes) {
      expect(box.width).toBeCloseTo((root.width - 16 * 4) / 5, 1);
    }

    const card = await measure(page, KPI);
    expect(card.style.borderTopWidth).toBe("1px");
    expect(card.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(card.style.borderLeftWidth).toBe("4px");
    expect(card.style.borderTopLeftRadius).toBe("12px");
    expect(card.style.paddingTop).toBe("16px");
    expect(card.style.paddingBottom).toBe("16px");
    expect(card.style.paddingLeft).toBe("20px");
    expect(card.style.paddingRight).toBe("20px");
    expect(card.style.rowGap).toBe("6px");
    expect(card.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(visibleShadow(card.style.boxShadow)).toBe("rgba(11, 31, 46, 0.06) 0px 1px 3px 0px");
    expect(card.height).toBe(118);

    const accents = ["--brand-line4", "--danger", "--warning", "--success", "--border-strong"];
    for (const [index, token] of accents.entries()) {
      const item = await measure(page, KPI, index);
      expect(item.style.borderLeftColor).toBe(await color(page, `var(${token})`));
    }

    await expect(page.locator(`${KPI} [data-slot="kpi-stat-label"]`)).toHaveText([
      "미처리 (open)",
      "신규",
      "조치중",
      "해소",
      "오탐",
    ]);
    await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`)).toHaveText([
      "14",
      "5",
      "4",
      "4",
      "4",
    ]);
    await expect(page.locator(`${KPI} [data-slot="kpi-stat-unit"]`)).toHaveText([
      "건",
      "건",
      "건",
      "건",
      "건",
    ]);
    await expect(page.locator(`${KPI} [data-slot="kpi-stat-description"]`)).toHaveText([
      "신규 + 확인 + 조치중",
      "NEW",
      "IN_PROGRESS",
      "RESOLVED",
      "FALSE_POSITIVE",
    ]);
    const label = await measure(page, `${KPI} [data-slot="kpi-stat-label"]`);
    expect(label.style.fontSize).toBe("16px");
    expect(label.style.lineHeight).toBe("22px");
    expect(label.style.fontWeight).toBe("700");
    const value = await measure(page, `${KPI} [data-slot="kpi-stat-value"]`);
    expect(value.style.fontSize).toBe("30px");
    expect(value.style.lineHeight).toBe("34px");
    expect(value.style.fontWeight).toBe("700");
    const unit = await measure(page, `${KPI} [data-slot="kpi-stat-unit"]`);
    expect(unit.style.fontSize).toBe("13px");
    expect(unit.style.color).toBe(await color(page, "var(--muted-fg)"));
    const description = await measure(page, `${KPI} [data-slot="kpi-stat-description"]`);
    expect(description.style.fontSize).toBe("12px");
    expect(description.style.lineHeight).toBe("16px");
    expect(description.style.color).toBe(await color(page, "var(--muted-fg)"));

    const body = await measure(page, '[data-slot="alarm-events-body"]');
    expect(body.style.columnGap).toBe("14px");
    expect(body.height).toBe(root.height - 66 - 14 - 112 - 14);
    const side = await measure(page, SIDE);
    expect(side.width).toBeCloseTo(viewport.sideWidth, 1);
    expect(side.style.rowGap).toBe("14px");
    const worklist = await measure(page, WORKLIST);
    expect(worklist.style.minWidth).toBe("860px");
    expect(worklist.width).toBeCloseTo(root.width - 14 - viewport.sideWidth, 1);
    expect(worklist.height).toBe(body.height);
    expect(worklist.style.borderTopLeftRadius).toBe("16px");
    expect(worklist.style.paddingTop).toBe("16px");
    expect(worklist.style.paddingLeft).toBe("18px");
    expect(worklist.style.rowGap).toBe("14px");
    expect(worklist.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(visibleShadow(worklist.style.boxShadow)).toBe("rgba(11, 31, 46, 0.06) 0px 1px 3px 0px");

    const trend = await measure(page, TREND);
    expect(trend.width).toBeCloseTo(viewport.sideWidth, 1);
    expect(trend.style.paddingLeft).toBe("18px");
    expect(trend.style.rowGap).toBe("14px");
    const ranking = await measure(page, RANKING);
    expect(ranking.style.minHeight).toBe("200px");
    expect(ranking.height).toBeCloseTo(Math.max(200, body.height - trend.height - 14), 1);
  });

  test(`누적 Bar Chart의 배치 확인 (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await openAlarms(page, viewport.width, viewport.height);
    const area = await barsArea(page);

    const panel = await measure(page, '[data-slot="alarm-trend-panel"]');
    expect(panel.style.borderTopWidth).toBe("1px");
    expect(panel.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(panel.style.borderTopLeftRadius).toBe("10px");
    expect(panel.style.paddingTop).toBe("14px");
    expect(panel.style.paddingLeft).toBe("14px");
    expect(panel.style.paddingBottom).toBe("12px");
    expect(panel.style.rowGap).toBe("10px");
    expect(area.plot.width).toBeCloseTo(viewport.sideWidth - 2 - 36 - 2 - 28, 1);
    expect(area.plot.height).toBe(BARS_BOX_HEIGHT);

    for (const [severityIndex, severity] of SEVERITIES.entries()) {
      const segments = await boxes(page, `${SEGMENT}[data-severity="${severity}"]`);
      const dayIndexes = DAYS.map((_, index) => index).filter(
        (index) => DAYS[index][severityIndex] > 0,
      );
      expect(segments).toHaveLength(dayIndexes.length);
      segments.forEach((segment, position) => {
        const dayIndex = dayIndexes[position];
        const below = DAYS[dayIndex].slice(0, severityIndex).reduce((sum, count) => sum + count, 0);
        const unit = FULL_BAR_HEIGHT / AXIS_MAX;
        expect(segment.x + segment.width / 2).toBeCloseTo(area.center(dayIndex), 1);
        expect(segment.width).toBeCloseTo(area.barWidth, 1);
        expect(segment.height).toBeCloseTo(DAYS[dayIndex][severityIndex] * unit, 1);
        expect(segment.y + segment.height).toBeCloseTo(area.bottom - below * unit, 1);
      });
    }

    const [baseline] = await boxes(page, `${CHART} [data-slot="chart-baseline"]`);
    expect(baseline.x).toBeCloseTo(area.x, 1);
    expect(baseline.width).toBeCloseTo(area.width, 1);
    expect(baseline.y).toBeCloseTo(area.bottom + BASELINE_WIDTH / 2, 1);

    const ticks = await boxes(page, `${CHART} [data-slot="chart-count-tick"]`);
    expect(ticks).toHaveLength(AXIS_MAX + 1);
    ticks.forEach((tick, value) => {
      expect(tick.x + tick.width).toBeCloseTo(area.plot.x + AXIS_LABEL_WIDTH, 0);
      const expectedCenter = area.bottom - (FULL_BAR_HEIGHT * value) / AXIS_MAX;
      expect(Math.abs(tick.y + tick.height / 2 - expectedCenter)).toBeLessThan(1);
    });

    const totals = await boxes(page, `${CHART} [data-slot="chart-total-label"]`);
    expect(totals).toHaveLength(DAYS.length);
    totals.forEach((total, index) => {
      expect(total.x + total.width / 2).toBeCloseTo(area.center(index), 1);
      expect(total.height).toBe(16);
      expect(total.y + total.height).toBeCloseTo(
        area.bottom - area.barHeight(index) - TOTAL_LABEL_GAP,
        1,
      );
    });

    const dates = await boxes(page, `${CHART} [data-slot="chart-date-label"]`);
    expect(dates).toHaveLength(DAYS.length);
    dates.forEach((date, index) => {
      expect(date.x + date.width / 2).toBeCloseTo(area.center(index), 1);
      expect(date.width).toBeCloseTo(area.band, 1);
      expect(date.y).toBeCloseTo(area.plot.y + BARS_BOX_HEIGHT + DATE_ROW_GAP, 1);
    });

    await expect(page.locator(TOOLTIP)).toHaveCount(0);
    const cursorY = area.plot.y + 100;
    await page.mouse.move(area.center(2), cursorY);
    await expect(page.locator(TOOLTIP)).toHaveCount(1);
    await expect.poll(() => tooltipEdge(page, "left")).toBeCloseTo(area.center(2) + CURSOR_GAP, 0);
    await expect.poll(() => tooltipEdge(page, "bottom")).toBeCloseTo(cursorY - CURSOR_GAP, 0);

    const [hovered] = await boxes(page, HOVERED_COLUMN);
    expect(hovered.x).toBeCloseTo(area.center(2) - area.band / 2, 1);
    expect(hovered.width).toBeCloseTo(area.band, 1);
    expect(hovered.y).toBeCloseTo(area.plot.y, 1);
    expect(hovered.height).toBeCloseTo(HOVERED_COLUMN_HEIGHT, 1);
  });
}

test("Alarm 워크List Card 확인", async ({ page }) => {
  await openAlarms(page, 1920, 1080);

  await expect(page.locator(`${WORKLIST} [data-slot="section-card-eyebrow"]`)).toHaveText(
    "ALARM WORKLIST",
  );
  await expect(page.locator(`${WORKLIST} [data-slot="section-card-title"]`)).toHaveText(
    "알람 / 이벤트 워크리스트",
  );
  const header = await measure(page, `${WORKLIST} [data-slot="section-card-header"]`);
  expect(header.style.minHeight).toBe("40px");
  expect(header.style.columnGap).toBe("12px");
  expect(header.height).toBe(40);
  const [headerBox] = await boxes(page, `${WORKLIST} [data-slot="section-card-header"]`);
  const [orderBox] = await boxes(page, '[data-slot="alarm-worklist-order"]');
  expect(orderBox.y + orderBox.height / 2).toBeCloseTo(headerBox.y + headerBox.height / 2, 0);
  await expect(page.locator('[data-slot="alarm-worklist-order"]')).toHaveText("최신순 · 20건");
  const order = await measure(page, '[data-slot="alarm-worklist-order"]');
  expect(order.style.fontSize).toBe("14px");
  expect(order.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator(BULK_BAR)).toHaveCount(0);

  const frame = await measure(page, `${WORKLIST} [data-slot="data-table"]`);
  expect(frame.style.borderTopWidth).toBe("1px");
  expect(frame.style.borderTopLeftRadius).toBe("10px");
  const table = await measure(page, `${WORKLIST} [data-slot="table"]`);
  expect(table.style.minWidth).toBe("1133px");

  const headRow = await measure(page, `${WORKLIST} thead [data-slot="table-row"]`);
  expect(headRow.height).toBe(44);
  expect(headRow.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(headRow.style.borderBottomWidth).toBe("1px");
  await expect(page.locator(HEAD)).toHaveText([
    "",
    "발생시각",
    "장치 · 모델",
    "편성 / 호차",
    "심각도",
    "이상 window",
    "이상비율",
    "상태",
    "담당",
    "관리",
  ]);
  const flexibleWidth = table.width - (48 + 170 + 125 + 95 + 130 + 95 + 85 + 85 + 140);
  for (const [index, width] of [48, 170, flexibleWidth, 125, 95, 130, 95, 85, 85, 140].entries()) {
    const head = await measure(page, HEAD, index);
    expect(head.width).toBeCloseTo(width, 1);
    expect(head.style.fontSize).toBe("14px");
    expect(head.style.color).toBe(await color(page, "var(--fg)"));
    if (index > 0) {
      expect(head.style.paddingLeft).toBe("16px");
      expect(head.style.paddingRight).toBe("16px");
    }
  }
  expect(flexibleWidth).toBeGreaterThanOrEqual(160);
  for (const [index, align] of [
    [4, "center"],
    [6, "right"],
    [7, "center"],
    [9, "center"],
  ] as const) {
    const head = await measure(page, HEAD, index);
    expect(head.style.textAlign).toBe(align);
  }

  const sortButtons = `${WORKLIST} [data-slot="column-sort-button"]`;
  await expect(page.locator(sortButtons)).toHaveText(["발생시각", "심각도", "이상비율"]);
  const sortButton = await measure(page, sortButtons);
  expect(sortButton.style.borderTopWidth).toBe("0px");
  expect(sortButton.style.paddingLeft).toBe("0px");
  expect(sortButton.style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(sortButton.style.fontSize).toBe("14px");
  expect(sortButton.style.color).toBe(await color(page, "var(--fg)"));
  expect(sortButton.style.columnGap).toBe("4px");
  const directions = await page
    .locator(sortButtons)
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-direction")));
  expect(directions).toEqual(["desc", "none", "none"]);
  expect(await shownIconShape(page, `${sortButtons} svg`, 0)).toBe(iconShape("ArrowDownward"));
  expect(await shownIconShape(page, `${sortButtons} svg`, 1)).toBe(iconShape("SwapVert"));
  expect(await shownIconShape(page, `${sortButtons} svg`, 2)).toBe(iconShape("SwapVert"));
  const activeIcon = await measure(page, `${sortButtons} svg`, 0);
  expect(activeIcon.width).toBe(16);
  expect(activeIcon.style.color).toBe(await color(page, "var(--fg)"));
  const idleIcon = await measure(page, `${sortButtons} svg`, 1);
  expect(idleIcon.width).toBe(16);
  expect(idleIcon.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator(HEAD).nth(1)).toHaveAttribute("aria-sort", "descending");
  await expect(page.locator(HEAD).nth(4)).toHaveAttribute("aria-sort", "none");

  const checkboxes = `${WORKLIST} [data-slot="checkbox"]`;
  await expect(page.locator(checkboxes)).toHaveCount(11);
  await expect(page.locator(checkboxes).first()).toHaveAttribute("aria-label", "전체 선택");
  await expect(page.locator(checkboxes).nth(1)).toHaveAttribute("aria-label", "선택");
  const checkbox = await measure(page, checkboxes, 1);
  expect(checkbox.width).toBe(16);
  expect(checkbox.height).toBe(16);
  expect(checkbox.style.borderTopLeftRadius).toBe("4px");
  expect(checkbox.style.borderTopWidth).toBe("1px");
  expect(checkbox.style.borderTopColor).toBe(await color(page, "var(--border-strong)"));
  expect(checkbox.style.backgroundColor).toBe(await color(page, "var(--card)"));
  const [checkboxBox] = await boxes(page, checkboxes);
  const [firstHead] = await boxes(page, HEAD);
  expect(checkboxBox.x + checkboxBox.width / 2).toBeCloseTo(firstHead.x + 24, 1);

  await expect(page.locator(BODY_ROW)).toHaveCount(10);
  const row = await measure(page, BODY_ROW);
  expect(row.height).toBe(54);
  expect(row.style.borderBottomWidth).toBe("1px");
  expect(row.style.borderBottomColor).toBe(await color(page, "var(--border)"));
  expect(row.style.fontSize).toBe("14px");
  for (const [index, alarm] of ALARMS.entries()) {
    await expect(page.locator(BODY_ROW).nth(index).locator('[data-slot="table-cell"]')).toHaveText(
      rowTexts(alarm),
    );
  }

  const cells = `${BODY_ROW}:nth-child(1) [data-slot="table-cell"]`;
  const timeCell = await measure(page, cells, 1);
  expect(timeCell.style.paddingLeft).toBe("16px");
  expect(timeCell.style.paddingRight).toBe("8px");
  expect(timeCell.style.columnGap).toBe("10px");
  const dateText = await measure(page, `${cells}:nth-child(2) > span > span`, 0);
  expect(dateText.style.fontWeight).toBe("700");
  const timeText = await measure(page, `${cells}:nth-child(2) > span > span`, 1);
  expect(timeText.style.fontSize).toBe("12px");
  expect(timeText.style.color).toBe(await color(page, "var(--muted-fg)"));
  expect(dateText.height).toBe(16);
  expect(timeText.height).toBe(14);
  await expect(page.locator(cells).nth(1)).toHaveAttribute(
    "title",
    `마지막 발생 ${isoDaysAgo(0)} 08:05:00`,
  );
  await expect(page.locator(`${BODY_ROW}:nth-child(2) [data-slot="table-cell"]`).nth(1)).not.toHaveAttribute(
    "title",
    /.*/,
  );

  const autoPill = await measure(page, `${cells} [data-slot="state-pill"][data-tone="neutral"]`);
  expect(autoPill.height).toBe(22);
  expect(autoPill.style.paddingLeft).toBe("9px");
  expect(autoPill.style.borderTopLeftRadius).toBe("11px");
  expect(autoPill.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(autoPill.style.color).toBe(await color(page, "var(--fg)"));
  expect(autoPill.style.fontSize).toBe("12px");
  expect(autoPill.style.fontWeight).toBe("500");
  await expect(
    page.locator(`${cells} [data-slot="state-pill"][data-tone="neutral"]`),
  ).toHaveAttribute("title", "추론 후 알람 규칙으로 자동 생성");
  await expect(page.locator(`${WORKLIST} [data-slot="state-pill"][data-tone="neutral"]`)).toHaveCount(5);

  const deviceCell = await measure(page, cells, 2);
  expect(deviceCell.style.paddingLeft).toBe("16px");
  const deviceText = await measure(page, `${cells}:nth-child(3) > span`, 0);
  expect(deviceText.style.fontWeight).toBe("700");
  const modelText = await measure(page, `${cells}:nth-child(3) > span`, 1);
  expect(modelText.style.fontSize).toBe("12px");
  expect(modelText.style.color).toBe(await color(page, "var(--muted-fg)"));
  expect(deviceText.height).toBe(16);
  expect(modelText.height).toBe(17);

  const severities = `${WORKLIST} [data-slot="alarm-severity"]`;
  const severity = await measure(page, severities);
  expect(severity.width).toBe(52);
  expect(severity.height).toBe(24);
  expect(severity.style.borderTopLeftRadius).toBe("4px");
  expect(severity.style.fontSize).toBe("12px");
  expect(severity.style.fontWeight).toBe("700");
  expect(severity.style.letterSpacing).toBe("0.4px");
  for (const [index, [background, foreground]] of [
    ["--caution", "--caution-fg"],
    ["--border-strong", "--on-primary"],
    ["--danger", "--danger-fg"],
    ["--warning-strong", "--warning-fg"],
  ].entries()) {
    const badge = await measure(page, severities, index);
    expect(badge.style.backgroundColor).toBe(await color(page, `var(${background})`));
    expect(badge.style.color).toBe(await color(page, `var(${foreground})`));
  }
  const [severityBox] = await boxes(page, severities);
  const headBoxes = await boxes(page, HEAD);
  expect(severityBox.x + severityBox.width / 2).toBeCloseTo(headBoxes[4].x + headBoxes[4].width / 2, 1);

  const windowCell = await measure(page, cells, 5);
  expect(windowCell.style.paddingLeft).toBe("12px");
  for (const [rowIndex, token] of [
    [1, "--on-caution-subtle"],
    [2, "--on-warning-subtle"],
    [4, "--danger"],
  ] as const) {
    const ratio = await measure(page, `${BODY_ROW}:nth-child(${rowIndex}) [data-slot="table-cell"]`, 6);
    expect(ratio.style.textAlign).toBe("right");
    expect(ratio.style.fontWeight).toBe("700");
    expect(ratio.style.paddingRight).toBe("16px");
    expect(ratio.style.color).toBe(await color(page, `var(${token})`));
  }

  const statuses = `${BODY_ROW} [data-slot="table-cell"]:nth-child(8) [data-slot="state-pill"]`;
  const status = await measure(page, statuses);
  expect(status.height).toBe(24);
  expect(status.style.paddingLeft).toBe("10px");
  expect(status.style.borderTopLeftRadius).toBe("12px");
  expect(status.style.fontSize).toBe("12px");
  expect(status.style.fontWeight).toBe("600");
  for (const [index, [background, foreground]] of [
    ["--danger-subtle", "--on-danger-subtle"],
    ["--brand-line4-subtle", "--brand-on-line4-subtle"],
    ["--caution-subtle", "--on-caution-subtle"],
    ["--success-subtle", "--on-success-subtle"],
    ["--muted", "--muted-fg"],
  ].entries()) {
    const pill = await measure(page, statuses, index);
    expect(pill.style.backgroundColor).toBe(await color(page, `var(${background})`));
    expect(pill.style.color).toBe(await color(page, `var(${foreground})`));
  }
  const statusCell = await measure(page, cells, 7);
  expect(statusCell.style.paddingLeft).toBe("8px");
  const assigneeCell = await measure(page, cells, 8);
  expect(assigneeCell.style.paddingLeft).toBe("12px");

  const rowButtons = `${cells} [data-slot="action-button"]`;
  const actionCell = await measure(page, cells, 9);
  expect(actionCell.style.paddingLeft).toBe("8px");
  expect(actionCell.style.columnGap).toBe("6px");
  for (const [index, token] of ["--fg", "--danger"].entries()) {
    const button = await measure(page, rowButtons, index);
    expect(button.height).toBe(30);
    expect(button.style.paddingLeft).toBe("12px");
    expect(button.style.paddingRight).toBe("12px");
    expect(button.style.borderTopLeftRadius).toBe("6px");
    expect(button.style.borderTopWidth).toBe("1px");
    expect(button.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(button.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(button.style.fontSize).toBe("14px");
    expect(button.style.fontWeight).toBe("500");
    expect(button.style.color).toBe(await color(page, `var(${token})`));
  }

  const pagination = await measure(page, `${WORKLIST} [data-slot="pagination"]`);
  const paginationList = await measure(page, `${WORKLIST} [data-slot="pagination-content"]`);
  expect(paginationList.style.columnGap).toBe("6px");
  expect(pagination.style.fontSize).toBe("14px");
  const [cardBox] = await boxes(page, WORKLIST);
  const [paginationBox] = await boxes(page, `${WORKLIST} [data-slot="pagination"]`);
  expect(paginationBox.y + paginationBox.height).toBeCloseTo(cardBox.y + cardBox.height - 17, 1);
  const pages = `${WORKLIST} [data-slot="pagination-page"]`;
  await expect(page.locator(pages)).toHaveText(["1", "2", "3", "10"]);
  await expect(page.locator(`${WORKLIST} [data-slot="pagination-ellipsis"]`)).toHaveText("…");
  const pageBoxes = await boxes(page, pages);
  const [ellipsisBox] = await boxes(page, `${WORKLIST} [data-slot="pagination-ellipsis"]`);
  expect(ellipsisBox.x).toBeGreaterThan(pageBoxes[2].x);
  expect(ellipsisBox.x).toBeLessThan(pageBoxes[3].x);
  const ellipsis = await measure(page, `${WORKLIST} [data-slot="pagination-ellipsis"]`);
  expect(ellipsis.height).toBe(32);
  expect(ellipsis.style.minWidth).toBe("32px");
  expect(ellipsis.style.paddingLeft).toBe("6px");
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
  const previous = await measure(page, `${WORKLIST} [data-slot="pagination-previous"]`);
  expect(previous.height).toBe(32);
  expect(previous.style.paddingLeft).toBe("10px");
  expect(previous.style.color).toBe(await color(page, "var(--disabled)"));
  const next = await measure(page, `${WORKLIST} [data-slot="pagination-next"]`);
  expect(next.style.color).toBe(await color(page, "var(--fg)"));
  expect(previous.style.borderRightWidth).toBe("0px");
  expect(next.style.borderRightWidth).toBe("0px");
  expect(current.style.borderRightWidth).toBe("1px");
});

test("추이 Card의 헤더, 범례, Chart의 Text와 Color, 집계 확인", async ({ page }) => {
  await openAlarms(page, 1920, 1080);

  await expect(page.locator(`${TREND} [data-slot="section-card-eyebrow"]`)).toHaveText("ALARM TREND");
  await expect(page.locator(`${TREND} [data-slot="section-card-title"]`)).toHaveText("날짜별 알람 수");

  const legend = await measure(page, '[data-slot="alarm-trend-legend"]');
  expect(legend.style.columnGap).toBe("12px");
  expect(legend.style.fontSize).toBe("11px");
  expect(legend.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator(`${TREND} [data-slot="legend-dot"]`)).toHaveText([...SEVERITIES]);
  for (const [index, token] of SEVERITY_FILLS.entries()) {
    const mark = await measure(page, `${TREND} [data-slot="legend-dot-mark"]`, index);
    expect(mark.width).toBe(8);
    expect(mark.height).toBe(8);
    expect(mark.style.borderTopLeftRadius).toBe("2px");
    expect(mark.style.backgroundColor).toBe(await color(page, `var(${token})`));
  }
  const legendItem = await measure(page, `${TREND} [data-slot="legend-dot"]`);
  expect(legendItem.style.columnGap).toBe("4px");
  expect(legendItem.height).toBe(13);

  const ticks = page.locator(`${CHART} [data-slot="chart-count-tick"]`);
  await expect(ticks).toHaveText(["0", "1", "2", "3"]);
  await expect(ticks.first()).toHaveAttribute("font-size", "11");
  await expect(ticks.first()).toHaveAttribute("font-weight", "600");
  await expect(ticks.first()).toHaveAttribute("fill", "var(--muted-fg)");

  for (const [index, severity] of SEVERITIES.entries()) {
    const fills = await page
      .locator(`${SEGMENT}[data-severity="${severity}"]`)
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("fill")));
    expect(fills.length).toBeGreaterThan(0);
    for (const fill of fills) {
      expect(fill).toBe(`var(${SEVERITY_FILLS[index]})`);
    }
  }
  const firstDayPaths = await page.evaluate((selector) => {
    const pathOf = (severity: string) =>
      document.querySelector(`${selector}[data-severity="${severity}"]`)?.getAttribute("d") ?? "";
    return { low: pathOf("LOW"), high: pathOf("HIGH") };
  }, SEGMENT);
  expect(firstDayPaths.high.match(/A 2,2,/g)).toHaveLength(2);
  expect(firstDayPaths.low).not.toContain("A");

  const baseline = page.locator(`${CHART} [data-slot="chart-baseline"]`);
  await expect(baseline).toHaveAttribute("stroke", "var(--muted-strong)");
  await expect(baseline).toHaveAttribute("stroke-width", "1");

  await expect(page.locator(`${CHART} [data-slot="chart-total-label"]`)).toHaveText(
    DAYS.map((day) => String(day.reduce((sum, count) => sum + count, 0))),
  );
  const total = await measure(page, `${CHART} [data-slot="chart-total-label"]`);
  expect(total.style.fontSize).toBe("11px");
  expect(total.style.fontWeight).toBe("700");
  expect(total.style.lineHeight).toBe("16px");
  expect(total.style.color).toBe(await color(page, "var(--fg)"));

  await expect(page.locator(`${CHART} [data-slot="chart-date-label"]`)).toHaveText(
    DAYS.map((_, index) => isoDaysAgo(DAYS.length - 1 - index).slice(5)),
  );
  const dateRow = await measure(page, `${CHART} [data-slot="chart-date-row"]`);
  expect(dateRow.style.fontSize).toBe("11px");
  expect(dateRow.style.fontWeight).toBe("600");
  expect(dateRow.style.color).toBe(await color(page, "var(--muted-fg)"));
  expect(dateRow.style.columnGap).toBe("10px");
  expect(dateRow.style.marginLeft).toBe("28px");
  const dateLabel = await measure(page, `${CHART} [data-slot="chart-date-label"]`);
  expect(dateLabel.style.textAlign).toBe("center");
  expect(dateLabel.height).toBe(13);
  const chart = await measure(page, CHART);
  expect(chart.style.rowGap).toBe("6px");

  const tallies = await measure(page, '[data-slot="alarm-trend-tallies"]');
  expect(tallies.style.rowGap).toBe("6px");
  const tallyRows = '[data-slot="alarm-trend-tally-row"]';
  await expect(page.locator(tallyRows)).toHaveCount(3);
  const tallyRow = await measure(page, tallyRows);
  expect(tallyRow.style.columnGap).toBe("6px");
  expect(tallyRow.style.fontSize).toBe("11px");
  expect(tallyRow.height).toBe(20);
  await expect(page.locator(`${tallyRows} > span:first-child`)).toHaveText(["심각도", "출처", "모델"]);
  const tallyLabel = await measure(page, `${tallyRows} > span:first-child`);
  expect(tallyLabel.width).toBe(48);
  expect(tallyLabel.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator(tallyRows).nth(0).locator('[data-slot="tally-chip"]')).toHaveText([
    "LOW 6",
    "MID 6",
    "HIGH 5",
    "CRIT 5",
  ]);
  await expect(page.locator(tallyRows).nth(1).locator('[data-slot="tally-chip"]')).toHaveText([
    "자동 11",
    "수동 11",
  ]);
  await expect(page.locator(tallyRows).nth(2).locator('[data-slot="tally-chip"]')).toHaveText([
    "IF 6",
    "SVM 6",
    "VAE 5",
    "PCA 5",
  ]);

  const chip = await measure(page, `${TREND} [data-slot="tally-chip"]`);
  expect(chip.height).toBe(20);
  expect(chip.style.paddingLeft).toBe("8px");
  expect(chip.style.borderTopLeftRadius).toBe("10px");
  expect(chip.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(chip.style.color).toBe(await color(page, "var(--fg)"));
  expect(chip.style.fontWeight).toBe("600");
  expect(chip.style.columnGap).toBe("4px");
  const chipCount = await measure(page, `${TREND} [data-slot="tally-chip-count"]`);
  expect(Number(chipCount.style.fontWeight)).toBeGreaterThan(600);

  await expect(page.locator('[data-slot="alarm-trend-note"]')).toHaveText(
    "알람 22건 기준 · 날짜 = 알람이 난 데이터 날짜 · 막대에 마우스를 올리면 심각도별 수",
  );
  const note = await measure(page, '[data-slot="alarm-trend-note"]');
  expect(note.style.fontSize).toBe("12px");
  expect(note.style.lineHeight).toBe("16px");
  expect(note.style.color).toBe(await color(page, "var(--muted-fg)"));
});

test("Tooltip은 Hover했을 때만 표시되고 Mouse Cursor를 따라감", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  const area = await barsArea(page);
  const low = area.plot.y + 100;

  await expect(page.locator(TOOLTIP)).toHaveCount(0);
  await expect(page.locator('[data-slot="chart-tooltip-bubble"]')).toHaveCount(0);

  await page.mouse.move(area.center(2), low);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  await expect(page.locator(`${BUBBLE} > b`)).toHaveText(`${isoDaysAgo(7).slice(5)} · 2건`);
  await expect(page.locator(`${BUBBLE} > span`)).toHaveText("LOW 1 · MID 0 · HIGH 1 · CRIT 0");

  await expect.poll(() => tooltipEdge(page, "left")).toBeCloseTo(area.center(2) + CURSOR_GAP, 0);
  await expect.poll(() => tooltipEdge(page, "bottom")).toBeCloseTo(low - CURSOR_GAP, 0);

  const bubble = await measure(page, BUBBLE);
  expect(bubble.style.backgroundColor).toBe(await color(page, "var(--fg)"));
  expect(bubble.style.color).toBe(await color(page, "var(--card)"));
  expect(bubble.style.paddingTop).toBe("6px");
  expect(bubble.style.paddingLeft).toBe("10px");
  expect(bubble.style.borderTopLeftRadius).toBe("6px");
  expect(bubble.style.fontSize).toBe("12px");
  expect(bubble.style.lineHeight).toBe("16px");
  expect(bubble.height).toBe(44);
  expect(visibleShadow(bubble.style.boxShadow)).toBe("rgba(0, 0, 0, 0.2) 0px 4px 12px 0px");
  const title = await measure(page, `${BUBBLE} > b`);
  expect(title.style.fontWeight).toBe("700");
  const detail = await measure(page, `${BUBBLE} > span`);
  expect(detail.style.fontWeight).toBe("400");
  expect(detail.style.opacity).toBe("1");

  await page.mouse.move(area.center(2) + 8, low + 10);
  await expect.poll(() => tooltipEdge(page, "bottom")).toBeCloseTo(low + 10 - CURSOR_GAP, 0);
  await expect.poll(() => tooltipEdge(page, "left")).toBeCloseTo(area.center(2) + CURSOR_GAP, 0);

  const high = area.plot.y + 30;
  await page.mouse.move(area.center(2), high);
  await expect.poll(() => tooltipEdge(page, "top")).toBeCloseTo(high + CURSOR_GAP, 0);

  await page.mouse.move(area.center(5), low);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  await expect(page.locator(`${BUBBLE} > b`)).toHaveText(`${isoDaysAgo(4).slice(5)} · 2건`);
  await expect(page.locator(`${BUBBLE} > span`)).toHaveText("LOW 0 · MID 1 · HIGH 0 · CRIT 1");
  await expect.poll(() => tooltipEdge(page, "left")).toBeCloseTo(area.center(5) + CURSOR_GAP, 0);

  await page.mouse.move(area.center(5) + area.band / 2 + 3, low);
  await expect(page.locator(`${BUBBLE} > b`)).toHaveText(`${isoDaysAgo(4).slice(5)} · 2건`);
  await page.mouse.move(area.center(6) - area.band / 2 - 3, low);
  await expect(page.locator(`${BUBBLE} > b`)).toHaveText(`${isoDaysAgo(3).slice(5)} · 2건`);

  await page.mouse.move(area.center(9), low);
  await expect(page.locator(`${BUBBLE} > b`)).toHaveText(`${isoDaysAgo(0).slice(5)} · 3건`);
  await expect(page.locator(`${BUBBLE} > span`)).toHaveText("LOW 0 · MID 2 · HIGH 0 · CRIT 1");
  await expect.poll(() => tooltipEdge(page, "right")).toBeCloseTo(area.center(9) - CURSOR_GAP, 0);
  await page.mouse.move(area.center(0), low);
  await expect(page.locator(`${BUBBLE} > b`)).toHaveText(`${isoDaysAgo(9).slice(5)} · 2건`);
  await expect.poll(() => tooltipEdge(page, "left")).toBeCloseTo(area.center(0) + CURSOR_GAP, 0);
  for (const index of [0, 3, 6, 7, 8, 9]) {
    await page.mouse.move(area.center(index), low);
    await expect(page.locator(`${BUBBLE} > b`)).toContainText(isoDaysAgo(9 - index).slice(5));
    await expect
      .poll(async () => {
        const [box] = await boxes(page, TOOLTIP);
        return box.x >= area.plot.x && box.x + box.width <= area.plot.x + area.plot.width;
      })
      .toBe(true);
  }

  const wrapperTransition = await page
    .locator(TOOLTIP_WRAPPER)
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(wrapperTransition).toBe("0s");

  await page.mouse.move(area.plot.x + 10, low);
  await expect(page.locator(TOOLTIP)).toHaveCount(0);
  await page.mouse.move(area.center(2), low);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  await page.mouse.move(area.center(2), area.plot.y + BARS_BOX_HEIGHT + 12);
  await expect(page.locator(TOOLTIP)).toHaveCount(0);
  for (const index of [2, 7, 4]) {
    await page.mouse.move(area.center(index), low);
    await page.mouse.move(area.x - 200, low);
    await expect(page.locator(TOOLTIP)).toHaveCount(0);
  }

  await page.evaluate((selector) => {
    (window as unknown as { keptSegments: Element[] }).keptSegments = [
      ...document.querySelectorAll(selector),
    ];
  }, SEGMENT);
  await page.mouse.move(area.center(3), low);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  await page.mouse.move(area.center(6), low);
  await expect(page.locator(`${BUBBLE} > b`)).toHaveText(`${isoDaysAgo(3).slice(5)} · 2건`);
  const replacedCount = await page.evaluate(
    () =>
      (window as unknown as { keptSegments: Element[] }).keptSegments.filter(
        (element) => !element.isConnected,
      ).length,
  );
  expect(replacedCount).toBe(0);
});

test("Hover한 날짜는 연한 회색 Bar로 표시됨", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  const area = await barsArea(page);
  const low = area.plot.y + 100;
  const hoveredCenter = async () => {
    const [box] = await boxes(page, HOVERED_COLUMN);
    return box ? box.x + box.width / 2 : null;
  };

  await expect(page.locator(HOVERED_COLUMN)).toHaveCount(0);

  await page.mouse.move(area.center(4), low);
  await expect(page.locator(HOVERED_COLUMN)).toHaveCount(1);
  await expect(page.locator(HOVERED_COLUMN)).toHaveAttribute("fill", "var(--muted)");
  const [hovered] = await boxes(page, HOVERED_COLUMN);
  expect(hovered.width).toBeCloseTo(area.band, 1);
  expect(hovered.x + hovered.width / 2).toBeCloseTo(area.center(4), 1);
  expect(hovered.y).toBeCloseTo(area.plot.y, 1);
  expect(hovered.y + hovered.height).toBeCloseTo(area.bottom, 1);
  const fill = await page
    .locator(HOVERED_COLUMN)
    .evaluate((element) => getComputedStyle(element).fill);
  expect(fill).toBe(await color(page, "var(--muted)"));
  const shape = await page.locator(HOVERED_COLUMN).getAttribute("d");
  expect(shape?.match(/A 4,4,/g)).toHaveLength(2);

  const isBehindBars = await page.evaluate(
    ({ column, segment }) => {
      const columnElement = document.querySelector(column);
      const segmentElement = document.querySelector(segment);
      if (!columnElement || !segmentElement) return null;
      return Boolean(
        columnElement.compareDocumentPosition(segmentElement) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    },
    { column: HOVERED_COLUMN, segment: SEGMENT },
  );
  expect(isBehindBars).toBe(true);

  await page.mouse.move(area.center(5), low);
  await expect.poll(hoveredCenter).toBeCloseTo(area.center(5), 1);
  await expect(page.locator(HOVERED_COLUMN)).toHaveCount(1);

  await page.mouse.move(area.x - 200, low);
  await expect(page.locator(HOVERED_COLUMN)).toHaveCount(0);
  await page.mouse.move(area.center(8), low);
  await expect.poll(hoveredCenter).toBeCloseTo(area.center(8), 1);
  await page.mouse.move(area.x - 200, low);
  await expect(page.locator(HOVERED_COLUMN)).toHaveCount(0);
});

test("호차별 Alarm 순위 Card 확인", async ({ page }) => {
  await openAlarms(page, 1920, 1080);

  await expect(page.locator(`${RANKING} [data-slot="section-card-eyebrow"]`)).toHaveText("CAR RANKING");
  await expect(page.locator(`${RANKING} [data-slot="section-card-title"]`)).toHaveText(
    "호차별 알람 순위 · 상위 10",
  );
  await expect(page.locator('[data-slot="alarm-car-ranking-hint"]')).toHaveText(
    "행을 누르면 그 편성의 이상 감지 내역",
  );
  const hint = await measure(page, '[data-slot="alarm-car-ranking-hint"]');
  expect(hint.style.fontSize).toBe("12px");
  expect(hint.style.lineHeight).toBe("16px");
  expect(hint.style.color).toBe(await color(page, "var(--muted-fg)"));

  const frame = await measure(page, `${RANKING} [data-slot="data-table"]`);
  expect(frame.style.borderTopWidth).toBe("1px");
  expect(frame.style.borderTopLeftRadius).toBe("10px");
  const headRow = await measure(page, `${RANKING} thead [data-slot="table-row"]`);
  expect(headRow.height).toBe(32);
  expect(headRow.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(headRow.style.borderBottomWidth).toBe("1px");
  const heads = `${RANKING} [data-slot="table-head"]`;
  await expect(page.locator(heads)).toHaveText(["#", "편성 · 호차", "알람", "최고 심각도"]);
  const flexibleWidth = (headRow.width - 56 - 120) / 2;
  for (const [index, width] of [56, flexibleWidth, flexibleWidth, 120].entries()) {
    const head = await measure(page, heads, index);
    expect(head.width).toBeCloseTo(width, 1);
    expect(head.style.fontSize).toBe("14px");
    expect(head.style.textAlign).toBe(index === 0 || index === 3 ? "center" : "left");
    expect(head.style.paddingLeft).toBe(index === 0 || index === 3 ? "0px" : "16px");
  }

  await expect(page.locator(RANK_ROW)).toHaveCount(10);
  const row = await measure(page, RANK_ROW);
  expect(row.height).toBe(27);
  expect(row.style.borderBottomWidth).toBe("1px");
  expect(row.style.fontSize).toBe("14px");
  for (const [index, [formation, car, severity]] of CARS.entries()) {
    const line = page.locator(RANK_ROW).nth(index);
    await expect(line.locator('[data-slot="table-cell"]')).toHaveText([
      String(index + 1),
      `편성 ${formation} · ${car}호차`,
      "1L0/M0/H1",
      severity,
    ]);
    await expect(line).toHaveAttribute("title", `누르면 이상 감지 내역 (${isoDaysAgo(index % 4)})`);
  }

  const cells = `${RANK_ROW}:nth-child(1) [data-slot="table-cell"]`;
  const rank = await measure(page, cells, 0);
  expect(rank.style.textAlign).toBe("center");
  expect(rank.style.color).toBe(await color(page, "var(--muted-fg)"));
  const label = await measure(page, cells, 1);
  expect(label.style.paddingLeft).toBe("16px");
  const count = await measure(page, cells, 2);
  expect(count.style.paddingLeft).toBe("16px");
  expect(count.style.columnGap).toBe("8px");
  const countNumber = await measure(page, `${cells}:nth-child(3) > b`);
  expect(countNumber.style.fontWeight).toBe("700");
  const counts = await measure(page, `${cells}:nth-child(3) > span`);
  expect(counts.height).toBe(13);
  expect(counts.style.fontSize).toBe("11px");
  expect(counts.style.letterSpacing).toBe("0.3px");
  expect(counts.style.color).toBe(await color(page, "var(--muted-fg)"));

  const severities = `${RANKING} [data-slot="alarm-severity"]`;
  const critical = await measure(page, severities, 0);
  expect(critical.width).toBe(52);
  expect(critical.height).toBe(20);
  expect(critical.style.borderTopLeftRadius).toBe("4px");
  expect(critical.style.fontSize).toBe("12px");
  expect(critical.style.fontWeight).toBe("700");
  expect(critical.style.letterSpacing).toBe("0.4px");
  expect(critical.style.backgroundColor).toBe(await color(page, "var(--danger)"));
  expect(critical.style.color).toBe(await color(page, "var(--danger-fg)"));
  const high = await measure(page, severities, 1);
  expect(high.style.backgroundColor).toBe(await color(page, "var(--warning-strong)"));
  expect(high.style.color).toBe(await color(page, "var(--warning-fg)"));

  await page.locator(RANK_ROW).first().click();
  await expect(page).toHaveURL(/\/info\/anomaly$/);
});

test("순위의 Row는 Keyboard로도 Click할 수 있음", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await page.locator(RANK_ROW).nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/info\/anomaly$/);
});

test("Sort, 조건, 빈 상태, Page 이동 확인", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  const sortButtons = page.locator(`${WORKLIST} [data-slot="column-sort-button"]`);
  const sortIcons = `${WORKLIST} [data-slot="column-sort-button"] svg`;
  const deviceOf = (index: number) =>
    page.locator(BODY_ROW).nth(index).locator('[data-slot="table-cell"]').nth(2);
  const severityTexts = () => page.locator(`${WORKLIST} [data-slot="alarm-severity"]`);

  await sortButtons.nth(1).click();
  await expect(severityTexts()).toHaveText([
    "CRIT",
    "CRIT",
    "HIGH",
    "HIGH",
    "HIGH",
    "MID",
    "MID",
    "MID",
    "LOW",
    "LOW",
  ]);
  await expect(deviceOf(0)).toContainText("MICOM_COOLER");
  await expect(deviceOf(1)).toContainText("SIV");
  await expect(sortButtons.nth(1)).toHaveAttribute("data-direction", "desc");
  await expect(sortButtons.nth(0)).toHaveAttribute("data-direction", "none");
  expect(await shownIconShape(page, sortIcons, 1)).toBe(iconShape("ArrowDownward"));
  expect(await shownIconShape(page, sortIcons, 0)).toBe(iconShape("SwapVert"));
  await expect(page.locator(HEAD).nth(4)).toHaveAttribute("aria-sort", "descending");
  await expect(page.locator(HEAD).nth(1)).toHaveAttribute("aria-sort", "none");

  await sortButtons.nth(1).click();
  await expect(severityTexts().first()).toHaveText("LOW");
  await expect(deviceOf(0)).toContainText("ECU");
  await expect(sortButtons.nth(1)).toHaveAttribute("data-direction", "asc");
  expect(await shownIconShape(page, sortIcons, 1)).toBe(iconShape("ArrowUpward"));
  await expect(page.locator(HEAD).nth(4)).toHaveAttribute("aria-sort", "ascending");

  await sortButtons.nth(2).click();
  await expect(deviceOf(0)).toContainText("DCU");
  await expect(page.locator(BODY_ROW).first().locator('[data-slot="table-cell"]').nth(6)).toHaveText(
    "28.0%",
  );

  await sortButtons.nth(0).click();
  await expect(deviceOf(0)).toContainText("CMSB");

  const triggers = page.locator(`${FILTER} [data-slot="select-trigger"]`);
  await triggers.nth(1).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText(["심각도 (전체)", "LOW", "MID", "HIGH", "CRIT"]);
  await page.keyboard.press("Escape");
  await triggers.nth(2).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveCount(22);
  await expect(page.locator(OPEN_ITEMS).first()).toHaveText("장치 (전체)");
  await expect(page.locator(OPEN_ITEMS).nth(1)).toHaveText("ATC");
  await page.keyboard.press("Escape");
  await triggers.nth(0).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText([
    "상태 (전체)",
    "신규",
    "확인",
    "조치중",
    "해소",
    "오탐",
  ]);

  await page.getByRole("option", { name: "신규" }).click();
  await expect(triggers.nth(0)).toHaveText("신규");
  await expect(page.locator(BODY_ROW)).toHaveCount(10);

  await page.locator(`${FILTER} [data-slot="action-button"]`).first().click();
  await expect(page.locator(BODY_ROW)).toHaveCount(2);
  await expect(deviceOf(0)).toContainText("CMSB");
  await expect(deviceOf(1)).toContainText("VVVF");
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`).first()).toHaveText("14");

  await triggers.nth(1).click();
  await page.getByRole("option", { name: "CRIT" }).click();
  await page.locator(`${FILTER} [data-slot="action-button"]`).first().click();
  await expect(page.locator(BODY_ROW)).toHaveCount(0);
  const emptyState = `${WORKLIST} [data-slot="empty-state"]`;
  await expect(page.locator(emptyState)).toBeVisible();
  await expect(page.locator(`${emptyState} [data-slot="empty-state-title"]`)).toHaveText(
    "조건에 맞는 알람이 없습니다",
  );
  await expect(page.locator(`${emptyState} [data-slot="empty-state-description"]`)).toHaveText(
    "상태·심각도·장치 필터를 전체로 바꿔 보세요.",
  );

  const empty = await measure(page, emptyState);
  expect(empty.style.paddingTop).toBe("40px");
  expect(empty.style.paddingLeft).toBe("16px");
  expect(empty.style.rowGap).toBe("10px");
  expect(empty.style.textAlign).toBe("center");
  const emptyIcon = await measure(page, `${emptyState} [data-slot="empty-state-icon"]`);
  expect(emptyIcon.width).toBe(56);
  expect(emptyIcon.height).toBe(56);
  expect(emptyIcon.style.borderTopLeftRadius).toBe("50%");
  expect(emptyIcon.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(emptyIcon.style.color).toBe(await color(page, "var(--muted-fg)"));
  const emptyGlyph = await measure(page, `${emptyState} [data-slot="empty-state-icon"] svg`);
  expect(emptyGlyph.width).toBe(26);
  expect(await shownIconShape(page, `${emptyState} [data-slot="empty-state-icon"] svg`)).toBe(
    iconShape("FindInPage"),
  );
  const emptyTitle = await measure(page, `${emptyState} [data-slot="empty-state-title"]`);
  expect(emptyTitle.style.fontSize).toBe("16px");
  expect(emptyTitle.style.fontWeight).toBe("700");
  const emptyDescription = await measure(page, `${emptyState} [data-slot="empty-state-description"]`);
  expect(emptyDescription.style.fontSize).toBe("14px");
  expect(emptyDescription.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator(`${emptyState} > [data-slot="empty-header"] > [data-slot]`)).toHaveCount(3);
  await expect(
    page.locator(`${emptyState} > [data-slot="empty-content"] > [data-slot="action-button"]`),
  ).toHaveCount(1);
  const emptyButtonSelector = `${emptyState} [data-slot="action-button"]`;
  await expect(page.locator(emptyButtonSelector)).toHaveText("필터 초기화");
  const emptyButton = await measure(page, emptyButtonSelector);
  expect(emptyButton.height).toBe(40);
  expect(emptyButton.style.paddingLeft).toBe("16px");
  expect(emptyButton.style.borderTopLeftRadius).toBe("6px");
  expect(emptyButton.style.borderTopWidth).toBe("1px");
  expect(emptyButton.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(emptyButton.style.fontSize).toBe("14px");
  expect(emptyButton.style.fontWeight).toBe("600");
  const [descriptionBox] = await boxes(page, `${emptyState} [data-slot="empty-state-description"]`);
  const [emptyButtonBox] = await boxes(page, emptyButtonSelector);
  expect(emptyButtonBox.y - (descriptionBox.y + descriptionBox.height)).toBeCloseTo(20, 1);
  const [frameBox] = await boxes(page, `${WORKLIST} [data-slot="data-table"]`);
  expect(emptyButtonBox.x + emptyButtonBox.width / 2).toBeCloseTo(frameBox.x + frameBox.width / 2, 0);

  await page.locator(emptyButtonSelector).click();
  await expect(page.locator(BODY_ROW)).toHaveCount(10);
  await expect(triggers).toHaveText(["상태 (전체)", "심각도 (전체)", "장치 (전체)"]);
  await expect(page.locator(emptyState)).toHaveCount(0);

  await triggers.nth(2).click();
  await page.getByRole("option", { name: "TCMS" }).click();
  await page.locator(`${FILTER} [data-slot="action-button"]`).first().click();
  await expect(page.locator(BODY_ROW)).toHaveCount(2);
  await page.locator(`${FILTER} [data-slot="icon-button"]`).click();
  await expect(page.locator(BODY_ROW)).toHaveCount(10);
  await expect(triggers.nth(2)).toHaveText("장치 (전체)");

  const pages = page.locator(`${WORKLIST} [data-slot="pagination-page"]`);
  const currentPage = page.locator(`${WORKLIST} [data-slot="pagination-page"][aria-current="page"]`);
  await pages.nth(1).click();
  await expect(currentPage).toHaveText("2");
  await expect(pages).toHaveText(["1", "2", "3", "10"]);
  await expect(page.locator(`${WORKLIST} [data-slot="pagination-previous"]`)).toBeEnabled();
  await page.locator(`${WORKLIST} [data-slot="pagination-next"]`).click();
  await page.locator(`${WORKLIST} [data-slot="pagination-next"]`).click();
  await expect(currentPage).toHaveText("4");
  await expect(pages).toHaveText(["1", "4", "10"]);
  await expect(page.locator(`${WORKLIST} [data-slot="pagination-ellipsis"]`)).toHaveCount(2);
  await pages.last().click();
  await expect(currentPage).toHaveText("10");
  await expect(pages).toHaveText(["1", "8", "9", "10"]);
  await expect(page.locator(`${WORKLIST} [data-slot="pagination-next"]`)).toBeDisabled();
  await page.locator(`${WORKLIST} [data-slot="pagination-previous"]`).click();
  await expect(currentPage).toHaveText("9");
  await page.locator(`${FILTER} [data-slot="action-button"]`).first().click();
  await expect(currentPage).toHaveText("1");
});

test("Row를 골라 일괄 확인함", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  const checkboxes = page.locator(`${WORKLIST} [data-slot="checkbox"]`);
  const statusOf = (index: number) =>
    page.locator(BODY_ROW).nth(index).locator('[data-slot="table-cell"]').nth(7);

  await checkboxes.nth(1).click();
  await expect(checkboxes.nth(1)).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(BODY_ROW).first()).toHaveAttribute("aria-selected", "true");
  await page.waitForTimeout(300);
  const checked = await measure(page, `${WORKLIST} [data-slot="checkbox"]`, 1);
  expect(checked.style.backgroundColor).toBe(await color(page, "var(--primary)"));
  expect(checked.style.borderTopColor).toBe(await color(page, "var(--primary)"));
  const checkSelector = `${BODY_ROW}:nth-child(1) [data-slot="checkbox-indicator"] svg`;
  expect(await shownIconShape(page, checkSelector)).toBe(iconShape("Check"));
  expect(await shownIconShape(page, `${WORKLIST} [data-slot="checkbox-control-partial"]`)).toBe(
    iconShape("Remove"),
  );
  const checkIcon = await measure(page, checkSelector);
  expect(checkIcon.width).toBe(14);
  expect(checkIcon.height).toBe(14);
  expect(checkIcon.style.color).toBe(await color(page, "var(--on-primary)"));
  await expect(checkboxes.first()).toHaveAttribute("aria-checked", "mixed");
  const partial = await measure(page, `${WORKLIST} [data-slot="checkbox"]`, 0);
  expect(partial.style.backgroundColor).toBe(await color(page, "var(--primary)"));
  const partialIcon = await measure(page, `${WORKLIST} [data-slot="checkbox-control-partial"]`);
  expect(partialIcon.width).toBe(14);
  expect(partialIcon.style.color).toBe(await color(page, "var(--on-primary)"));
  await expect(
    page.locator(`${WORKLIST} thead [data-slot="checkbox-indicator"] svg`),
  ).toBeHidden();

  await expect(page.locator(BULK_BAR)).toHaveCount(1);
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 1건");
  const bulkBar = await measure(page, BULK_BAR);
  expect(bulkBar.height).toBe(40);
  expect(bulkBar.style.paddingLeft).toBe("14px");
  expect(bulkBar.style.paddingRight).toBe("4px");
  expect(bulkBar.style.borderTopLeftRadius).toBe("10px");
  expect(bulkBar.style.borderTopWidth).toBe("1px");
  expect(bulkBar.style.borderTopColor).toBe(await color(page, "var(--brand-line4)"));
  expect(bulkBar.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(bulkBar.style.columnGap).toBe("8px");
  expect(bulkBar.style.opacity).toBe("1");
  const bulkLabel = await measure(page, `${BULK_BAR} [data-slot="bulk-bar-label"]`);
  expect(bulkLabel.style.fontSize).toBe("14px");
  expect(bulkLabel.style.fontWeight).toBe("700");
  expect(bulkLabel.style.color).toBe(await color(page, "var(--brand-line4-text)"));
  expect(bulkLabel.style.paddingRight).toBe("4px");
  const bulkButtons = `${BULK_BAR} [data-slot="action-button"]`;
  await expect(page.locator(bulkButtons)).toHaveText(["일괄 확인", "담당자 지정"]);
  const bulkButton = await measure(page, bulkButtons);
  expect(bulkButton.height).toBe(30);
  expect(bulkButton.style.paddingLeft).toBe("12px");
  expect(bulkButton.style.borderTopLeftRadius).toBe("6px");
  expect(bulkButton.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(bulkButton.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(bulkButton.style.fontWeight).toBe("500");
  const header = await measure(page, `${WORKLIST} [data-slot="section-card-header"]`);
  expect(header.height).toBe(40);
  const [orderBox] = await boxes(page, '[data-slot="alarm-worklist-order"]');
  const [bulkBox] = await boxes(page, BULK_BAR);
  expect(bulkBox.x - (orderBox.x + orderBox.width)).toBeCloseTo(12, 1);

  await checkboxes.first().click();
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 10건");
  await expect(checkboxes.first()).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(`${WORKLIST} [data-slot="checkbox"][aria-checked="true"]`)).toHaveCount(11);
  await checkboxes.first().click();
  await expect(page.locator(BULK_BAR)).toHaveCount(0);
  await expect(page.locator(`${WORKLIST} [data-slot="checkbox"][aria-checked="true"]`)).toHaveCount(0);

  await expect(statusOf(0)).toHaveText("신규");
  await expect(statusOf(1)).toHaveText("확인");
  await checkboxes.nth(1).click();
  await checkboxes.nth(2).click();
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 2건");
  await page.locator(bulkButtons).first().click();
  await expect(statusOf(0)).toHaveText("확인");
  await expect(statusOf(1)).toHaveText("확인");
  await expect(statusOf(5)).toHaveText("신규");
  await expect(page.locator(BULK_BAR)).toHaveCount(0);
  await expect(page.locator(`${WORKLIST} [data-slot="checkbox"][aria-checked="true"]`)).toHaveCount(0);
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`)).toHaveText([
    "14",
    "4",
    "4",
    "4",
    "4",
  ]);

  await checkboxes.nth(3).click();
  await page.locator(`${FILTER} [data-slot="icon-button"]`).click();
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 1건");
  await page.locator(`${FILTER} [data-slot="action-button"]`).first().click();
  await expect(page.locator(BULK_BAR)).toHaveCount(0);
});

test("Button과 Row 안의 동작은 그 종류의 Modal이나 확인 Dialog를 띄움", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  const filterButtons = page.locator(`${FILTER} [data-slot="action-button"]`);
  const rowButtons = page.locator(BODY_ROW).nth(2).locator('[data-slot="action-button"]');
  const opened = page.locator("[data-modal], [data-dialog]");

  await expect(opened).toHaveCount(0);
  await filterButtons.nth(2).click();
  await expect(page.locator(modal("alarm-create"))).toBeVisible();
  await expect(opened).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(opened).toHaveCount(0);
  await filterButtons.nth(1).click();
  await expect(page.locator(modal("alarm-rules"))).toBeVisible();
  await expect(opened).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(opened).toHaveCount(0);
  await rowButtons.nth(0).click();
  await expect(page.locator(modal("alarm-process"))).toBeVisible();
  await expect(opened).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(opened).toHaveCount(0);
  await rowButtons.nth(1).click();
  await expect(page.locator(confirmDialog("alarm-delete"))).toBeVisible();
  await expect(opened).toHaveCount(1);
  await expect(page.locator(BODY_ROW)).toHaveCount(10);
  await page.keyboard.press("Escape");
  await expect(opened).toHaveCount(0);
  await page.locator(`${WORKLIST} [data-slot="checkbox"]`).nth(1).click();
  await page.locator(`${BULK_BAR} [data-slot="action-button"]`).nth(1).click();
  await expect(page.locator(modal("assignee-bulk"))).toBeVisible();
  await expect(opened).toHaveCount(1);
});

test("검색과 초기화는 조건이 그대로여도 다시 조회함", async ({ page }) => {
  const lastDate = page.locator(`${CHART} [data-slot="chart-date-label"]`).last();
  const search = page.locator(`${FILTER} [data-slot="action-button"]`).first();
  const reset = page.locator(`${FILTER} [data-slot="icon-button"]`);
  const topRankRow = page.locator(RANK_ROW).first();

  await page.clock.setFixedTime(new Date(2026, 4, 10, 23, 59, 0));
  await openAlarms(page, 1920, 1080);
  await expect(lastDate).toHaveText("05-10");
  await expect(topRankRow).toHaveAttribute("title", "누르면 이상 감지 내역 (2026-05-10)");

  await page.clock.setFixedTime(new Date(2026, 4, 11, 0, 1, 0));
  await search.click();
  await expect(lastDate).toHaveText("05-11");
  await expect(topRankRow).toHaveAttribute("title", "누르면 이상 감지 내역 (2026-05-11)");

  await page.clock.setFixedTime(new Date(2026, 4, 11, 23, 59, 0));
  await openAlarms(page, 1920, 1080);
  await expect(lastDate).toHaveText("05-11");
  await page.clock.setFixedTime(new Date(2026, 4, 12, 0, 1, 0));
  await reset.click();
  await expect(lastDate).toHaveText("05-12");
  await expect(topRankRow).toHaveAttribute("title", "누르면 이상 감지 내역 (2026-05-12)");
  await expect(page.locator(BODY_ROW)).toHaveCount(10);
});

test("일괄 처리 Bar는 사라지는 동안 Click할 수 없음", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  const rowCheckbox = `${BODY_ROW}:nth-child(1) [data-slot="checkbox"]`;
  const bulkButtons = `${BULK_BAR} [data-slot="action-button"]`;
  const assignModal = page.locator(modal("assignee-bulk"));
  const clickCenter = (box: Box) =>
    page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await page.locator(rowCheckbox).click();
  await expect(page.locator(BULK_BAR)).toHaveCount(1);
  expect(await page.locator(BULK_BAR).evaluate((bar) => (bar as HTMLElement).inert)).toBe(false);
  const leavingBar = await page.evaluate(
    async ({ checkbox, bar }) => {
      document.querySelector<HTMLElement>(checkbox)?.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const element = document.querySelector<HTMLElement>(bar);
      if (element === null) return "gone";
      return element.inert ? "inert" : "active";
    },
    { checkbox: rowCheckbox, bar: BULK_BAR },
  );
  expect(leavingBar).toBe("inert");
  await expect(page.locator(BULK_BAR)).toHaveCount(0);

  await page.locator(rowCheckbox).click();
  await expect(page.locator(bulkButtons)).toHaveCount(2);
  const [checkboxBox] = await boxes(page, rowCheckbox);
  const [, assignBox] = await boxes(page, bulkButtons);
  await clickCenter(checkboxBox);
  await clickCenter(assignBox);
  await expect(page.locator(BULK_BAR)).toHaveCount(0);
  await expect(assignModal).toHaveCount(0);

  await page.locator(rowCheckbox).click();
  await expect(page.locator(bulkButtons)).toHaveCount(2);
  const [acknowledgeBox, assignBoxAgain] = await boxes(page, bulkButtons);
  await clickCenter(acknowledgeBox);
  await clickCenter(assignBoxAgain);
  await expect(page.locator(BULK_BAR)).toHaveCount(0);
  await expect(assignModal).toHaveCount(0);
  await expect(
    page.locator(BODY_ROW).first().locator('[data-slot="table-cell"]').nth(7),
  ).toHaveText("확인");
});

async function hoveredColors(
  page: Page,
  selector: string,
  index = 0,
  position?: { x: number; y: number },
): Promise<{ background: string; text: string }> {
  await page.locator(selector).nth(index).hover({ position });
  await page.waitForTimeout(300);
  const { style } = await measure(page, selector, index);
  return { background: style.backgroundColor, text: style.color };
}

interface BulkBarMotion {
  frames: { count: number; opacity: number; shiftY: number }[];
  shifts: number[];
}

function recordBulkBar(page: Page, frameCount: number): Promise<BulkBarMotion> {
  return page.evaluate(
    async ({ card, bar, frameCount }) => {
      const shiftOf = (element: Element) => {
        const { transform } = getComputedStyle(element);
        return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
      };
      const motion: BulkBarMotion = { frames: [], shifts: [] };
      const observer = new MutationObserver(() => {
        const element = document.querySelector(bar);
        if (element) motion.shifts.push(shiftOf(element));
      });
      const root = document.querySelector(card);
      if (root) {
        observer.observe(root, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["style"],
        });
      }
      for (let index = 0; index < frameCount; index += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const element = document.querySelector(bar);
        motion.frames.push(
          element
            ? { count: 1, opacity: Number(getComputedStyle(element).opacity), shiftY: shiftOf(element) }
            : { count: 0, opacity: -1, shiftY: 0 },
        );
      }
      observer.disconnect();
      return motion;
    },
    { card: WORKLIST, bar: BULK_BAR, frameCount },
  );
}

test("움직임 줄이기를 켜면 일괄 처리 Bar는 제자리에서 Fade로 나타나고 사라짐", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  const rowCheckbox = page.locator(`${BODY_ROW}:nth-child(1) [data-slot="checkbox"]`);

  const enteringMotion = recordBulkBar(page, 40);
  await rowCheckbox.click();
  const entering = await enteringMotion;
  const shown = entering.frames.filter((frame) => frame.count > 0);
  expect(shown.length).toBeGreaterThan(10);
  expect(shown[shown.length - 1].opacity).toBe(1);
  for (const frame of shown) expect(frame.shiftY).toBe(0);
  for (const shift of entering.shifts) expect(shift).toBe(0);

  const leavingMotion = recordBulkBar(page, 40);
  await rowCheckbox.click();
  const leaving = await leavingMotion;
  const fading = leaving.frames.filter((frame) => frame.count > 0 && frame.opacity < 1);
  expect(fading.length).toBeGreaterThan(2);
  expect(leaving.frames[leaving.frames.length - 1].count).toBe(0);
  for (const frame of leaving.frames) expect(frame.shiftY).toBe(0);
  for (const shift of leaving.shifts) expect(shift).toBe(0);
});

test.describe("움직임 줄이기를 끈 화면", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  for (const scale of [1, 2]) {
    const travel = 4 * scale;
    test(`일괄 처리 Bar는 Fade하며 ${travel} 아래에서 올라오고 같은 경로로 사라짐 (기본 Font 크기 ${scale}배)`, async ({
      page,
    }) => {
      await openAlarms(page, 1920, 1080);
      if (scale !== 1) {
        await page.evaluate((fontSize) => {
          document.documentElement.style.fontSize = fontSize;
        }, `${16 * scale}px`);
        await page.waitForTimeout(400);
      }
      const rowCheckbox = page.locator(`${BODY_ROW}:nth-child(1) [data-slot="checkbox"]`);

      const enteringMotion = recordBulkBar(page, 40);
      await rowCheckbox.click();
      const entering = await enteringMotion;
      expect(entering.shifts.length).toBeGreaterThan(3);
      expect(entering.shifts[0]).toBeCloseTo(travel, 1);
      expect(entering.shifts[entering.shifts.length - 1]).toBe(0);
      for (const [index, shift] of entering.shifts.entries()) {
        if (index > 0) expect(shift).toBeLessThanOrEqual(entering.shifts[index - 1]);
      }
      const shown = entering.frames.filter((frame) => frame.count > 0);
      expect(shown.filter((frame) => frame.opacity > 0 && frame.opacity < 1).length).toBeGreaterThan(2);
      expect(shown[shown.length - 1].opacity).toBe(1);

      const leavingMotion = recordBulkBar(page, 40);
      await rowCheckbox.click();
      const leaving = await leavingMotion;
      expect(leaving.shifts.length).toBeGreaterThan(3);
      expect(Math.max(...leaving.shifts)).toBeGreaterThan(travel * 0.75);
      expect(Math.max(...leaving.shifts)).toBeLessThanOrEqual(travel + 0.05);
      for (const [index, shift] of leaving.shifts.entries()) {
        if (index > 0) expect(shift).toBeGreaterThanOrEqual(leaving.shifts[index - 1]);
      }
      const fading = leaving.frames.filter((frame) => frame.count > 0 && frame.opacity < 1);
      expect(fading.length).toBeGreaterThan(2);
      expect(leaving.frames[leaving.frames.length - 1].count).toBe(0);
    });
  }
});

for (const theme of ["라이트", "다크"] as const) {
  test(`Hover한 Button과 Row의 Color 확인 (${theme} Theme)`, async ({ page }) => {
    await openAlarms(page, 1920, 1080);
    if (theme === "다크") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    const token = (name: string) => color(page, `var(--${name})`);
    const background = async (selector: string, index = 0) =>
      (await measure(page, selector, index)).style.backgroundColor;
    const buttons = `${FILTER} [data-slot="action-button"]`;
    const rowButtons = `${BODY_ROW}:nth-child(1) [data-slot="action-button"]`;

    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    expect(await background(buttons, 0)).toBe(await token("primary"));
    expect(await background(buttons, 1)).toBe(await token("card"));
    expect(await background(buttons, 2)).toBe(await token("primary"));
    expect(await background(rowButtons, 0)).toBe(await token("card"));
    expect(await background(rowButtons, 1)).toBe(await token("card"));
    expect(await background(BODY_ROW)).toBe("rgba(0, 0, 0, 0)");
    expect(await background(RANK_ROW)).toBe("rgba(0, 0, 0, 0)");

    for (const index of [0, 2]) {
      const filled = await hoveredColors(page, buttons, index);
      expect(filled.background).toBe(await token("primary-hover"));
      expect(filled.text).toBe(await token("on-primary"));
    }
    const rules = await hoveredColors(page, buttons, 1);
    expect(rules.background).toBe(await token("muted"));
    expect(rules.text).toBe(await token("fg"));

    const row = await hoveredColors(page, BODY_ROW, 0, { x: 300, y: 27 });
    expect(row.background).toBe(await token("brand-line4-subtle"));
    expect(await background(BODY_ROW, 1)).toBe("rgba(0, 0, 0, 0)");
    const process = await hoveredColors(page, rowButtons, 0);
    expect(process.background).toBe(await token("muted"));
    expect(process.text).toBe(await token("fg"));
    expect(await background(BODY_ROW)).toBe(await token("brand-line4-subtle"));
    const remove = await hoveredColors(page, rowButtons, 1);
    expect(remove.background).toBe(await token("danger-subtle"));
    expect(remove.text).toBe(await token("danger"));
    expect(await background(rowButtons, 0)).toBe(await token("card"));

    const rankRow = await hoveredColors(page, RANK_ROW, 0);
    expect(rankRow.background).toBe(await token("brand-line4-subtle"));
    expect(await background(BODY_ROW)).toBe("rgba(0, 0, 0, 0)");

    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    expect(await background(RANK_ROW)).toBe("rgba(0, 0, 0, 0)");
    expect(await background(buttons, 0)).toBe(await token("primary"));
  });
}

test("기본 Font 크기를 2배로 하면 알람/이벤트의 크기도 2배가 됨", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page.waitForTimeout(400);

  const filter = await measure(page, FILTER);
  expect(filter.height).toBe(132);
  expect(filter.style.borderTopWidth).toBe("2px");
  const trigger = await measure(page, `${FILTER} [data-slot="select-trigger"]`);
  expect(trigger.width).toBe(320);
  const search = await measure(page, `${FILTER} [data-slot="action-button"]`);
  expect(search.height).toBe(64);
  expect(search.style.paddingLeft).toBe("28px");

  const kpiRow = await measure(page, KPI_ROW);
  expect(kpiRow.height).toBe(224);
  const card = await measure(page, KPI);
  expect(card.height).toBe(236);
  expect(card.style.borderLeftWidth).toBe("8px");
  expect(card.style.borderTopWidth).toBe("2px");
  expect(card.style.paddingLeft).toBe("40px");
  const value = await measure(page, `${KPI} [data-slot="kpi-stat-value"]`);
  expect(value.style.fontSize).toBe("60px");

  const worklist = await measure(page, WORKLIST);
  expect(worklist.style.minWidth).toBe("1720px");
  const table = await measure(page, `${WORKLIST} [data-slot="table"]`);
  expect(table.style.minWidth).toBe("2266px");
  const headRow = await measure(page, `${WORKLIST} thead [data-slot="table-row"]`);
  expect(headRow.height).toBe(88);
  const head = await measure(page, HEAD, 1);
  expect(head.width).toBe(340);
  const row = await measure(page, BODY_ROW);
  expect(row.height).toBe(108);
  expect(row.style.borderBottomWidth).toBe("2px");
  const checkbox = await measure(page, `${WORKLIST} [data-slot="checkbox"]`);
  expect(checkbox.width).toBe(32);
  expect(checkbox.style.borderTopLeftRadius).toBe("8px");
  expect(checkbox.style.borderTopWidth).toBe("2px");
  const severity = await measure(page, `${WORKLIST} [data-slot="alarm-severity"]`);
  expect(severity.width).toBe(104);
  expect(severity.height).toBe(48);
  expect(severity.style.letterSpacing).toBe("0.8px");
  const autoPill = await measure(page, `${WORKLIST} [data-slot="state-pill"][data-tone="neutral"]`);
  expect(autoPill.height).toBe(44);
  const status = await measure(
    page,
    `${BODY_ROW} [data-slot="table-cell"]:nth-child(8) [data-slot="state-pill"]`,
  );
  expect(status.height).toBe(48);
  const rowButton = await measure(page, `${BODY_ROW} [data-slot="action-button"]`);
  expect(rowButton.height).toBe(60);
  const sortIcon = await measure(page, `${WORKLIST} [data-slot="column-sort-button"] svg`);
  expect(sortIcon.width).toBe(32);
  const current = await measure(page, `${WORKLIST} [data-slot="pagination-page"]`);
  expect(current.height).toBe(64);

  const side = await measure(page, SIDE);
  expect(side.width).toBe(880);
  const area = await barsArea(page, 2);
  expect(area.plot.height).toBe(232);
  const segments = await boxes(page, `${SEGMENT}[data-severity="LOW"]`);
  expect(segments[0].width).toBeCloseTo(area.barWidth, 1);
  expect(segments[0].height).toBeCloseTo(64, 1);
  expect(segments[0].x + segments[0].width / 2).toBeCloseTo(area.center(0), 1);
  expect(segments[0].y + segments[0].height).toBeCloseTo(area.bottom, 1);
  await expect(page.locator(`${CHART} [data-slot="chart-count-tick"]`).first()).toHaveAttribute(
    "font-size",
    "22",
  );
  await expect(page.locator(`${CHART} [data-slot="chart-baseline"]`)).toHaveAttribute(
    "stroke-width",
    "2",
  );
  const [total] = await boxes(page, `${CHART} [data-slot="chart-total-label"]`);
  expect(total.height).toBe(32);
  expect(total.y + total.height).toBeCloseTo(area.bottom - area.barHeight(0) - 4, 1);
  const [date] = await boxes(page, `${CHART} [data-slot="chart-date-label"]`);
  expect(date.y).toBeCloseTo(area.plot.y + 232 + 12, 1);
  const mark = await measure(page, `${TREND} [data-slot="legend-dot-mark"]`);
  expect(mark.width).toBe(16);
  const chip = await measure(page, `${TREND} [data-slot="tally-chip"]`);
  expect(chip.height).toBe(40);

  const rankRow = await measure(page, RANK_ROW);
  expect(rankRow.height).toBe(54);
  const rankSeverity = await measure(page, `${RANKING} [data-slot="alarm-severity"]`);
  expect(rankSeverity.height).toBe(40);

  await page.setViewportSize({ width: 2880, height: 1620 });
  await page.waitForTimeout(400);
  const wide = await barsArea(page, 2);
  const cursorY = wide.plot.y + 200;
  await page.mouse.move(wide.center(1), cursorY);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  await expect.poll(() => tooltipEdge(page, "bottom")).toBeCloseTo(cursorY - CURSOR_GAP * 2, 0);
  await expect.poll(() => tooltipEdge(page, "left")).toBeCloseTo(wide.center(1) + CURSOR_GAP * 2, 0);
  const [hovered] = await boxes(page, HOVERED_COLUMN);
  expect(hovered.width).toBeCloseTo(wide.band, 1);
  expect(hovered.height).toBeCloseTo(HOVERED_COLUMN_HEIGHT * 2, 1);
  const bubble = await measure(page, BUBBLE);
  expect(bubble.style.paddingTop).toBe("12px");
  expect(bubble.style.paddingLeft).toBe("20px");
  expect(bubble.style.fontSize).toBe("24px");
});

test("다크 Theme에서 알람/이벤트의 Color 확인", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  const filter = await measure(page, FILTER);
  expect(filter.style.backgroundColor).toBe(await color(page, "var(--surface-low)"));
  const trigger = await measure(page, `${FILTER} [data-slot="select-trigger"]`);
  expect(trigger.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(trigger.style.color).toBe(await color(page, "var(--fg)"));
  const buttons = `${FILTER} [data-slot="action-button"]`;
  const rules = await measure(page, buttons, 1);
  expect(rules.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(rules.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(rules.style.color).toBe(await color(page, "var(--fg)"));
  const create = await measure(page, buttons, 2);
  expect(create.style.backgroundColor).toBe(await color(page, "var(--primary)"));

  const card = await measure(page, KPI, 1);
  expect(card.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(card.style.borderLeftColor).toBe(await color(page, "var(--danger)"));
  expect(card.style.borderTopColor).toBe(await color(page, "var(--border)"));

  const worklist = await measure(page, WORKLIST);
  expect(worklist.style.backgroundColor).toBe(await color(page, "var(--card)"));
  const headRow = await measure(page, `${WORKLIST} thead [data-slot="table-row"]`);
  expect(headRow.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  const checkbox = await measure(page, `${WORKLIST} [data-slot="checkbox"]`, 1);
  expect(checkbox.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(checkbox.style.borderTopColor).toBe(await color(page, "var(--border-strong)"));
  const severity = await measure(page, `${WORKLIST} [data-slot="alarm-severity"]`, 2);
  expect(severity.style.backgroundColor).toBe(await color(page, "var(--danger)"));
  expect(severity.style.color).toBe(await color(page, "var(--danger-fg)"));
  const statuses = `${BODY_ROW} [data-slot="table-cell"]:nth-child(8) [data-slot="state-pill"]`;
  const newStatus = await measure(page, statuses, 0);
  expect(newStatus.style.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect(newStatus.style.color).toBe(await color(page, "var(--on-danger-subtle)"));
  const acknowledged = await measure(page, statuses, 1);
  expect(acknowledged.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(acknowledged.style.color).toBe(await color(page, "var(--brand-on-line4-subtle)"));
  const ratio = await measure(page, `${BODY_ROW}:nth-child(4) [data-slot="table-cell"]`, 6);
  expect(ratio.style.color).toBe(await color(page, "var(--danger)"));
  const rowButtons = `${BODY_ROW}:nth-child(1) [data-slot="action-button"]`;
  const process = await measure(page, rowButtons, 0);
  expect(process.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(process.style.borderTopColor).toBe(await color(page, "var(--border)"));
  const remove = await measure(page, rowButtons, 1);
  expect(remove.style.color).toBe(await color(page, "var(--danger)"));

  await page.locator(`${WORKLIST} [data-slot="checkbox"]`).nth(1).click();
  await page.waitForTimeout(300);
  const checked = await measure(page, `${WORKLIST} [data-slot="checkbox"]`, 1);
  expect(checked.style.backgroundColor).toBe(await color(page, "var(--primary)"));
  const bulkBar = await measure(page, BULK_BAR);
  expect(bulkBar.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(bulkBar.style.borderTopColor).toBe(await color(page, "var(--brand-line4)"));

  const segmentFill = await page
    .locator(`${SEGMENT}[data-severity="CRIT"]`)
    .first()
    .evaluate((element) => getComputedStyle(element).fill);
  expect(segmentFill).toBe(await color(page, "var(--danger)"));
  const chip = await measure(page, `${TREND} [data-slot="tally-chip"]`);
  expect(chip.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  const area = await barsArea(page);
  await page.mouse.move(area.center(4), area.plot.y + 100);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  const bubble = await measure(page, BUBBLE);
  expect(bubble.style.backgroundColor).toBe(await color(page, "var(--fg)"));
  expect(bubble.style.color).toBe(await color(page, "var(--card)"));
  const hoveredFill = await page
    .locator(HOVERED_COLUMN)
    .evaluate((element) => getComputedStyle(element).fill);
  expect(hoveredFill).toBe(await color(page, "var(--muted)"));

  const rankHead = await measure(page, `${RANKING} thead [data-slot="table-row"]`);
  expect(rankHead.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  const rankSeverity = await measure(page, `${RANKING} [data-slot="alarm-severity"]`, 1);
  expect(rankSeverity.style.backgroundColor).toBe(await color(page, "var(--warning-strong)"));
  expect(rankSeverity.style.color).toBe(await color(page, "var(--warning-fg)"));
});

test("Mock 실행 함수가 바꾼 Alarm과 규칙은 다시 조회한 값에 반영됨", async () => {
  const everything = {
    status: null,
    severity: null,
    deviceCode: null,
    sort: { key: "occurredAt", direction: "desc" },
    page: 1,
  } as const;
  const listAlarms = async () => (await fetchAlarmWorklist(everything)).rows;
  const findAlarm = async (alarmId: string) => {
    const alarm = (await listAlarms()).find((row) => row.id === alarmId);
    if (!alarm) throw new Error(`알람 없음: ${alarmId}`);
    return alarm;
  };

  expect(await listAlarms()).toHaveLength(10);
  expect(await fetchAlarmSummary()).toEqual({
    openCount: 14,
    countsByStatus: { NEW: 5, ACK: 5, IN_PROGRESS: 4, RESOLVED: 4, FALSE_POSITIVE: 4 },
  });

  const newOnly = await fetchAlarmWorklist({ ...everything, status: "NEW" });
  expect(newOnly.rows.map((row) => row.id)).toEqual(["1", "6"]);
  const bySeverity = await fetchAlarmWorklist({
    ...everything,
    sort: { key: "severity", direction: "asc" },
  });
  expect(bySeverity.rows.map((row) => row.id)).toEqual(["2", "6", "1", "5", "10", "4", "8", "9", "3", "7"]);
  const byRate = await fetchAlarmWorklist({
    ...everything,
    sort: { key: "anomalyRate", direction: "desc" },
  });
  expect(byRate.rows[0].anomalyRatePercent).toBe(28);
  expect(byRate.pageSize).toBe(20);
  expect(byRate.pageCount).toBe(10);

  const created = await createAlarm({
    deviceCode: "ATC",
    modelCode: "IF",
    segment: "default",
    formation: "401",
    car: 1,
    severity: "MID",
    anomalyRatePercent: 21.5,
    occurredAt: "2099-01-01T00:00:00",
    assignee: null,
    comment: "",
  });
  expect(created.status).toBe("NEW");
  expect(created.source).toBe("manual");
  expect(created.anomalyWindow).toBeNull();
  expect(created.anomalyRateLevel).toBe("danger");
  expect((await listAlarms()).map((row) => row.id)).toEqual([
    created.id,
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
  ]);
  expect((await fetchAlarmSummary()).countsByStatus.NEW).toBe(6);
  expect((await fetchAlarmSummary()).openCount).toBe(15);

  await processAlarm("1", { status: "RESOLVED", assignee: "박기술", comment: "점검 완료" });
  const resolved = await findAlarm("1");
  expect(resolved.status).toBe("RESOLVED");
  expect(resolved.assignee).toBe("박기술");
  expect(resolved.comment).toBe("점검 완료");
  expect(resolved.acknowledgedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  expect(resolved.resolvedAt).toBe(resolved.acknowledgedAt);
  await processAlarm("1", { status: "IN_PROGRESS", assignee: "박기술", comment: "점검 완료" });
  const reopened = await findAlarm("1");
  expect(reopened.resolvedAt).toBeNull();
  expect(reopened.acknowledgedAt).toBe(resolved.acknowledgedAt);
  const resolvedBefore = (await findAlarm("4")).resolvedAt;
  await processAlarm("4", { status: "FALSE_POSITIVE", assignee: "김정비", comment: "" });
  expect((await findAlarm("4")).resolvedAt).toBe(resolvedBefore);

  const acknowledgedBefore = (await findAlarm("3")).acknowledgedAt;
  const commentBefore = (await findAlarm("3")).comment;
  await assignAlarms(["6", "3"], { assignee: "김정비", comment: "" });
  const assignedNew = await findAlarm("6");
  expect(assignedNew.status).toBe("ACK");
  expect(assignedNew.assignee).toBe("김정비");
  expect(assignedNew.acknowledgedAt).not.toBeNull();
  const assignedOther = await findAlarm("3");
  expect(assignedOther.status).toBe("IN_PROGRESS");
  expect(assignedOther.assignee).toBe("김정비");
  expect(assignedOther.acknowledgedAt).toBe(acknowledgedBefore);
  expect(assignedOther.comment).toBe(commentBefore);
  expect(commentBefore).not.toBe("");

  await acknowledgeAlarms([created.id, "2", "8"]);
  expect((await findAlarm(created.id)).status).toBe("ACK");
  expect((await findAlarm("2")).status).toBe("ACK");
  expect((await findAlarm("8")).status).toBe("IN_PROGRESS");
  expect((await fetchAlarmSummary()).countsByStatus.NEW).toBe(3);

  await deleteAlarm("10");
  expect((await listAlarms()).some((row) => row.id === "10")).toBe(false);
  expect(await listAlarms()).toHaveLength(10);

  const rules = await fetchAlarmRules();
  expect(rules).toHaveLength(9);
  expect(rules[0]).toMatchObject({
    deviceCode: null,
    modelCode: null,
    isEnabled: true,
    consecutiveMinutes: 3,
    anomalyWindowCount: 5,
    mergeGapSeconds: 120,
    midMinMinutes: 10,
    highMinMinutes: 30,
  });
  const updated = await saveAlarmRule(rules[0].id, { ...rules[0], consecutiveMinutes: 7 });
  expect(updated.id).toBe(rules[0].id);
  expect((await fetchAlarmRules())[0].consecutiveMinutes).toBe(7);
  expect(await fetchAlarmRules()).toHaveLength(9);
  const added = await saveAlarmRule(null, {
    deviceCode: "DCU",
    modelCode: "VAE",
    isEnabled: true,
    consecutiveMinutes: 2,
    anomalyWindowCount: 4,
    mergeGapSeconds: 120,
    midMinMinutes: 5,
    highMinMinutes: 20,
    description: "",
  });
  expect(await fetchAlarmRules()).toHaveLength(10);
  const overwritten = await saveAlarmRule(null, { ...added, consecutiveMinutes: 9 });
  expect(overwritten.id).toBe(added.id);
  expect(overwritten.consecutiveMinutes).toBe(9);
  expect(await fetchAlarmRules()).toHaveLength(10);
  await deleteAlarmRule(added.id);
  expect((await fetchAlarmRules()).some((rule) => rule.id === added.id)).toBe(false);

  expect(await fetchAlarmAssignees()).toEqual(["박기술", "이현장", "김정비"]);
});

test("규칙이 하나도 없으면 Cell마다 적용되는 규칙이 없고 새 규칙 폼은 숫자 Input이 빈 채로 시작함", () => {
  const matrix = buildAlarmRuleMatrix([], ["ATC", "CMSB"], ["IF", "SVM"]);
  expect(matrix.globalRule).toBeNull();
  expect(matrix.models).toEqual([
    { modelCode: "IF", hasModelRule: false },
    { modelCode: "SVM", hasModelRule: false },
  ]);
  expect(matrix.rows.map((row) => [row.deviceCode, row.hasDeviceRule])).toEqual([
    ["ATC", false],
    ["CMSB", false],
  ]);
  expect(matrix.rows.flatMap((row) => row.cells)).toEqual([
    { modelCode: "IF", rule: null, scopeKind: null },
    { modelCode: "SVM", rule: null, scopeKind: null },
    { modelCode: "IF", rule: null, scopeKind: null },
    { modelCode: "SVM", rule: null, scopeKind: null },
  ]);

  const blank = createAlarmRuleDraft({ deviceCode: "ATC", modelCode: null }, true, null);
  expect(blank).toEqual({
    deviceCode: "ATC",
    modelCode: null,
    isEnabled: true,
    description: "",
    consecutiveMinutes: "",
    anomalyWindowCount: "",
    mergeGapSeconds: "",
    midMinMinutes: "",
    highMinMinutes: "",
  });
  expect(checkAlarmRuleDraft(blank)).toEqual({
    emptyFields: [
      "consecutiveMinutes",
      "anomalyWindowCount",
      "mergeGapSeconds",
      "midMinMinutes",
      "highMinMinutes",
    ],
    negativeFields: [],
  });
  expect(createAlarmRuleDraft({ deviceCode: null, modelCode: null }, true, null)).toMatchObject({
    deviceCode: null,
    modelCode: null,
  });

  const applied: AlarmRule = {
    id: "1",
    deviceCode: null,
    modelCode: null,
    isEnabled: false,
    consecutiveMinutes: 3,
    anomalyWindowCount: 5,
    mergeGapSeconds: 120,
    midMinMinutes: 10,
    highMinMinutes: 30,
    description: "기본 규칙",
  };
  const prefilled = {
    deviceCode: "ATC",
    modelCode: "IF",
    description: "",
    consecutiveMinutes: "3",
    anomalyWindowCount: "5",
    mergeGapSeconds: "120",
    midMinMinutes: "10",
    highMinMinutes: "30",
  };
  const scope = { deviceCode: "ATC", modelCode: "IF" };
  expect(createAlarmRuleDraft(scope, true, applied)).toEqual({ ...prefilled, isEnabled: true });
  expect(createAlarmRuleDraft(scope, false, applied)).toEqual({ ...prefilled, isEnabled: false });
  expect(toAlarmRuleDraft(applied)).toMatchObject({
    deviceCode: null,
    modelCode: null,
    isEnabled: false,
    description: "기본 규칙",
    consecutiveMinutes: "3",
  });
});

test("규칙 추가와 수정 Modal을 여는 상태는 그 범위에 규칙이 없으면 추가이고, 적용되는 규칙도 없으면 숫자 Input이 빈 추가임", () => {
  const ruleOf = (id: string, deviceCode: string | null, modelCode: string | null): AlarmRule => ({
    id,
    deviceCode,
    modelCode,
    isEnabled: true,
    consecutiveMinutes: 3,
    anomalyWindowCount: 5,
    mergeGapSeconds: 120,
    midMinMinutes: 10,
    highMinMinutes: 30,
    description: "설명",
  });
  const blankNumbers = {
    consecutiveMinutes: "",
    anomalyWindowCount: "",
    mergeGapSeconds: "",
    midMinMinutes: "",
    highMinMinutes: "",
  };
  const filledNumbers = {
    consecutiveMinutes: "3",
    anomalyWindowCount: "5",
    mergeGapSeconds: "120",
    midMinMinutes: "10",
    highMinMinutes: "30",
  };
  const pair = { deviceCode: "ATC", modelCode: "IF" };
  const everywhere = { deviceCode: null, modelCode: null };

  for (const scope of [
    pair,
    { deviceCode: "ATC", modelCode: null },
    { deviceCode: null, modelCode: "IF" },
    everywhere,
  ]) {
    expect(createAlarmRuleEditorState([], scope, true)).toEqual({
      mode: "add",
      ruleId: null,
      prefilledScope: null,
      draft: { ...scope, isEnabled: true, description: "", ...blankNumbers },
      hasTried: false,
    });
  }
  expect(createAlarmRuleEditorState([ruleOf("2", "CMSB", null)], pair, true)).toEqual({
    mode: "add",
    ruleId: null,
    prefilledScope: null,
    draft: { ...pair, isEnabled: true, description: "", ...blankNumbers },
    hasTried: false,
  });

  const globalRule = ruleOf("1", null, null);
  expect(createAlarmRuleEditorState([globalRule], pair, true)).toEqual({
    mode: "add",
    ruleId: null,
    prefilledScope: pair,
    draft: { ...pair, isEnabled: true, description: "", ...filledNumbers },
    hasTried: false,
  });
  expect(
    createAlarmRuleEditorState([globalRule], { deviceCode: "ATC", modelCode: null }, false),
  ).toEqual({
    mode: "add",
    ruleId: null,
    prefilledScope: null,
    draft: { deviceCode: "ATC", modelCode: null, isEnabled: false, description: "", ...filledNumbers },
    hasTried: false,
  });

  expect(createAlarmRuleEditorState([globalRule, ruleOf("2", "ATC", "IF")], pair, true)).toEqual({
    mode: "edit",
    ruleId: "2",
    prefilledScope: null,
    draft: { ...pair, isEnabled: true, description: "설명", ...filledNumbers },
    hasTried: false,
  });
  expect(createAlarmRuleEditorState([globalRule], everywhere, true)).toMatchObject({
    mode: "global",
    ruleId: "1",
    prefilledScope: null,
  });
});

test("이상 감지 내역의 주소는 Menu List의 화면 key로 읽음", () => {
  expect(screenPath("anomaly")).toBe("/info/anomaly");
  // @ts-expect-error 메뉴 List에 없는 key를 넘기면 Type 오류가 나는지 확인
  expect(() => screenPath("anomly")).toThrow("메뉴 목록에 없는 화면: anomly");
});

test("상태의 판정과 고정 표기의 순서 List 확인", () => {
  expect(alarmStatusKeys).toEqual(["NEW", "ACK", "IN_PROGRESS", "RESOLVED", "FALSE_POSITIVE"]);
  expect(alarmSeverityKeys).toEqual(["LOW", "MID", "HIGH", "CRIT"]);
  expect(alarmRuleScopeKinds).toEqual(["pair", "device", "model", "global"]);

  expect(alarmStatusKeys.map((status) => alarmStatusLabels[status].label)).toEqual([
    "신규",
    "확인",
    "조치중",
    "해소",
    "오탐",
  ]);
  expect(alarmStatusKeys.map((status) => alarmStatusLabels[status].codeLabel)).toEqual([
    "NEW",
    "ACK",
    "IN_PROGRESS",
    "RESOLVED",
    "FALSE_POSITIVE",
  ]);
  expect(alarmRuleScopeKinds.map((kind) => alarmRuleScopeLabels[kind])).toEqual([
    { label: "전용", legendLabel: "이 칸 전용 규칙" },
    { label: "장치 규칙", legendLabel: "장치 규칙" },
    { label: "모델 규칙", legendLabel: "모델 규칙" },
    { label: "전체 규칙", legendLabel: "전체 규칙" },
  ]);

  expect(alarmStatusKeys.filter(isOpenAlarmStatus)).toEqual(["NEW", "ACK", "IN_PROGRESS"]);
  expect(alarmStatusKeys.filter(isClosedAlarmStatus)).toEqual(["RESOLVED", "FALSE_POSITIVE"]);
  expect(alarmStatusKeys.filter(recordsAcknowledgedAt)).toEqual([
    "ACK",
    "IN_PROGRESS",
    "RESOLVED",
    "FALSE_POSITIVE",
  ]);
});
