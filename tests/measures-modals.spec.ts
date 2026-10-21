import { expect, test, type Page } from "@playwright/test";
import {
  compareWindowCounts,
  compareWindowRates,
  createMeasureActionDraft,
  rateMeasureEffectComparison,
  toMeasureActionInput,
  windowRatePercent,
  type Measure,
} from "../src/domain/measures";
import { measureEffectAppearedLabel } from "../src/domain/labels/measureEffectChange";
import {
  measureEffectSortKeys,
  measureEffectSortLabels,
} from "../src/domain/labels/measureEffectSort";
import {
  fetchMeasureActionOptions,
  fetchMeasureAssignees,
  fetchMeasureEffectComparison,
  fetchMeasureEffectOptions,
} from "../src/services/measures";
import { calendarDayCell, color, isoDaysAgo, measure, visibleShadow } from "./helpers/measure";
import {
  SECTION_PADDING_X,
  SECTION_PADDING_Y,
  box,
  boxes,
  collectSlotRects,
  confirmDialog,
  doubledMismatches,
  enterMotion,
  enterTranslate,
  expectButton,
  expectModalFrame,
  expectSection,
  expectSentenceLines,
  focusIsInside,
  focusedSlot,
  iconShape,
  modal,
  pressTab,
  shownIconShape,
  styleOf,
  textWhileClosing,
  texts,
} from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const FILTER = '[data-slot="measure-filter-bar"]';
const KPI = '[data-slot="measure-kpi-row"] [data-slot="kpi-stat"]';
const WORKLIST = '[data-slot="measure-worklist-card"]';
const BODY_ROW = `${WORKLIST} tbody [data-slot="table-row"]`;
const BULK_BAR = `${WORKLIST} [data-slot="bulk-bar"]`;
const TOAST = '[data-slot="toast"]';
const OPEN_ITEMS = '[data-slot="select-content"][data-open] [data-slot="select-item"]';
const PICKER = '[data-slot="popover-content"][data-picker="single"]';
const CALENDAR = `${PICKER} [data-slot="calendar"]`;
const RANGE_CALENDAR = '[data-slot="popover-content"][data-picker="range"] [data-slot="calendar"]';

const ACTION = modal("measure-action");
const COMPARE = modal("action-effect-compare");
const ASSIGN = modal("assignee-bulk");
const BULK = confirmDialog("measure-bulk-complete");

const ACTION_WIDTH = 880;
const COMPARE_WIDTH = 1000;
const ASSIGN_WIDTH = 760;
const CONFIRM_WIDTH = 520;

const LABEL_WIDTH = 136;
const ROW_HEIGHT = 36;
const CONTROL_HEIGHT = 32;
const FIELD_ERROR_HEIGHT = 23;
const textAreaHeight = (rows: number) => rows * 20 + 20 + 2;
const KEY_VALUE_HEIGHT = 38;
const ACTION_TARGET_HEIGHT = KEY_VALUE_HEIGHT * 4 + SECTION_PADDING_Y * 2 + 2;
const ACTION_FORM_HEIGHT = 36 + 32 + textAreaHeight(3) + 36 + 12 * 3 + SECTION_PADDING_Y * 2 + 2;
const frameHeight = (bodyHeight: number) => 36 + 14 + bodyHeight + 14 + 32 + 34;
const ACTION_HEIGHT = frameHeight(ACTION_TARGET_HEIGHT + 14 + ACTION_FORM_HEIGHT);
const COMPARE_TABLE_HEAD = 44 + 2;
const COMPARE_EMPTY_HEIGHT = frameHeight(16 + 14 + 32 + 14 + COMPARE_TABLE_HEAD + 14 + 300);
const COMPARE_FIXED_COLUMNS = [150, 230, 230, 110];
const SEGMENT_SHADOW = "rgba(11, 31, 46, 0.12) 0px 1px 2px 0px";
const POPUP_SHADOW = "rgba(11, 31, 46, 0.14) 0px 8px 24px 0px";

const FIXED_TODAY = new Date(2026, 8, 23, 12, 0, 0);

async function openMeasures(page: Page, width = 1920, height = 1080): Promise<void> {
  await page.clock.setFixedTime(FIXED_TODAY);
  await page.setViewportSize({ width, height });
  await page.goto("/dashboard/measures");
  await expect(page.locator(BODY_ROW).first()).toBeVisible();
}

const rowCheckbox = (page: Page, row: number) =>
  page.locator(BODY_ROW).nth(row).locator('[data-slot="checkbox"]');
const processButton = (page: Page, row: number) =>
  page.locator(BODY_ROW).nth(row).locator('[data-slot="action-button"]');
const actionDateButton = (page: Page, index: number) =>
  page.locator(`${BODY_ROW} [data-slot="measure-action-date"]`).nth(index);
const bulkButton = (page: Page, index: number) =>
  page.locator(`${BULK_BAR} [data-slot="action-button"]`).nth(index);
const footerButton = (page: Page, root: string, label: string) =>
  page.locator(`${root} [data-slot="dialog-footer"]`).getByRole("button", { name: label, exact: true });
const compareButton = (page: Page) =>
  page.locator(`${COMPARE} [data-slot="measure-effect-conditions"]`).getByRole("button", {
    name: "비교",
    exact: true,
  });

async function openAction(page: Page, row: number): Promise<void> {
  await processButton(page, row).click();
  await expect(page.locator(ACTION)).toBeVisible();
}

async function openCompare(page: Page): Promise<void> {
  await page.locator(FILTER).getByRole("button", { name: "조치 전·후 비교" }).click();
  await expect(page.locator(COMPARE)).toBeVisible();
}

async function selectRows(page: Page, rows: number[]): Promise<void> {
  for (const row of rows) await rowCheckbox(page, row).click();
  await expect(page.locator(BULK_BAR)).toBeVisible();
}

async function selectOption(page: Page, trigger: string, label: string, index = 0): Promise<void> {
  await page.locator(trigger).nth(index).click();
  await page.locator(OPEN_ITEMS).filter({ hasText: label }).first().click();
  await expect(page.locator(OPEN_ITEMS)).toHaveCount(0);
}

async function rowCells(page: Page, row: number): Promise<string[]> {
  return page.locator(BODY_ROW).nth(row).locator('[data-slot="table-cell"]').allTextContents();
}

async function kpiValues(page: Page): Promise<string[]> {
  return texts(page, `${KPI} [data-slot="kpi-stat-value"]`);
}

async function expectSelectLike(page: Page, selector: string, index = 0): Promise<void> {
  const trigger = await measure(page, selector, index);
  expect(trigger.height).toBe(CONTROL_HEIGHT);
  expect(trigger.style.borderTopWidth).toBe("1px");
  expect(trigger.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(trigger.style.borderTopLeftRadius).toBe("6px");
  expect(trigger.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(trigger.style.paddingLeft).toBe("12px");
  expect(trigger.style.paddingRight).toBe("10px");
  expect(trigger.style.columnGap).toBe("8px");
  expect(trigger.style.fontSize).toBe("14px");
  expect(trigger.style.color).toBe(await color(page, "var(--fg)"));
  const arrow = await measure(page, `${selector} svg`, index);
  expect(arrow.width).toBe(18);
  expect(arrow.style.color).toBe(await color(page, "var(--muted-fg)"));
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`이상 센서 조치 Modal의 크기, 배치, Text, Color (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await openMeasures(page, viewport.width, viewport.height);
    await openAction(page, 1);
    const { header, contentWidth } = await expectModalFrame(page, "measure-action", {
      width: ACTION_WIDTH,
      height: ACTION_HEIGHT,
      title: "이상 센서 조치",
    });

    const BODY = `${ACTION} [data-slot="modal-body-scroll"]`;
    const body = await measure(page, BODY);
    const bodyBox = await box(page, BODY);
    expect(bodyBox.y).toBeCloseTo(header.y + header.height + 14, 1);
    expect(bodyBox.x).toBeCloseTo(header.x - 4, 1);
    expect(body.width).toBeCloseTo(contentWidth + 8, 1);
    expect(body.style.paddingLeft).toBe("4px");
    expect(body.style.rowGap).toBe("14px");

    const TARGET = `${ACTION} [data-slot="measure-action-target"]`;
    const target = await box(page, TARGET);
    expect(target.y).toBeCloseTo(bodyBox.y, 1);
    expect(target.x).toBeCloseTo(header.x, 1);
    expect(target.width).toBeCloseTo(contentWidth, 1);
    expect(target.height).toBeCloseTo(ACTION_TARGET_HEIGHT, 1);
    await expectSection(page, TARGET);
    const ROW = `${TARGET} [data-slot="key-value-row"]`;
    await expect(page.locator(`${ROW} [data-slot="key-value-row-label"]`)).toHaveText([
      "발생시각",
      "장치 / 센서",
      "진단",
      "편성 / 호차",
    ]);
    await expect(page.locator(`${ROW} [data-slot="key-value-row-value"]`)).toHaveText([
      "2026-09-22 10:13:07",
      "TRACTION_MOTOR · 압축기 흡입압력",
      "실제≈0.65 / 기대≈0.23 / 오차 0.42",
      "402 · 2호차",
    ]);
    const rows = await boxes(page, ROW);
    rows.forEach((row, index) => {
      expect(row.height).toBe(KEY_VALUE_HEIGHT);
      expect(row.y).toBeCloseTo(target.y + 1 + SECTION_PADDING_Y + KEY_VALUE_HEIGHT * index, 1);
      expect(row.x).toBeCloseTo(target.x + 1 + SECTION_PADDING_X, 1);
      expect(row.width).toBeCloseTo(contentWidth - 2 - SECTION_PADDING_X * 2, 1);
    });
    const row = await measure(page, ROW);
    expect(row.style.borderBottomWidth).toBe("1px");
    expect(await styleOf(page, ROW, "border-bottom-style")).toBe("dashed");
    expect(row.style.borderBottomColor).toBe(await color(page, "var(--border)"));
    expect(row.style.columnGap).toBe("normal");
    const rowLabel = (await measure(page, `${ROW} [data-slot="key-value-row-label"]`)).style;
    expect(rowLabel.fontSize).toBe("14px");
    expect(rowLabel.fontWeight).toBe("400");
    expect(rowLabel.color).toBe(await color(page, "var(--muted-fg)"));
    const rowValue = (await measure(page, `${ROW} [data-slot="key-value-row-value"]`)).style;
    expect(rowValue.fontSize).toBe("14px");
    expect(rowValue.fontWeight).toBe("700");
    expect(rowValue.color).toBe(await color(page, "var(--fg)"));
    expect(await styleOf(page, `${ROW} [data-slot="key-value-row-value"]`, "font-variant-numeric")).toBe(
      "tabular-nums",
    );
    const value = await box(page, `${ROW} [data-slot="key-value-row-value"]`);
    expect(value.x + value.width).toBeCloseTo(rows[0].x + rows[0].width, 1);
    expect(value.y + value.height / 2).toBeCloseTo(rows[0].y + KEY_VALUE_HEIGHT / 2 - 0.5, 1);

    const FORM = `${ACTION} [data-slot="measure-action-form"]`;
    const form = await box(page, FORM);
    expect(form.y).toBeCloseTo(target.y + target.height + 14, 1);
    expect(form.height).toBeCloseTo(ACTION_FORM_HEIGHT, 1);
    await expectSection(page, FORM);
    expect((await measure(page, FORM)).style.rowGap).toBe("12px");
    const FORM_ROW = `${FORM} [data-slot="form-row"]`;
    const formRows = await boxes(page, FORM_ROW);
    expect(formRows.map((formRow) => formRow.height)).toEqual([
      ROW_HEIGHT,
      CONTROL_HEIGHT,
      textAreaHeight(3),
      ROW_HEIGHT,
    ]);
    expect(formRows[0].y).toBeCloseTo(form.y + 1 + SECTION_PADDING_Y, 1);
    for (let index = 1; index < 4; index += 1) {
      expect(formRows[index].y).toBeCloseTo(
        formRows[index - 1].y + formRows[index - 1].height + 12,
        1,
      );
    }
    const LABEL = `${FORM} [data-slot="field-label"]`;
    await expect(page.locator(LABEL)).toHaveText(["조치 여부*", "조치일", "조치 내용", "검수 여부*"]);
    const labels = await boxes(page, LABEL);
    for (const index of [0, 2, 3]) {
      expect(labels[index].height).toBe(40);
      expect(labels[index].y).toBeCloseTo(formRows[index].y - 4, 1);
    }
    expect(labels[1].y + labels[1].height / 2).toBeCloseTo(formRows[1].y + CONTROL_HEIGHT / 2, 1);
    const label = (await measure(page, LABEL)).style;
    expect(label.fontSize).toBe("14px");
    expect(label.fontWeight).toBe("700");
    expect((await measure(page, `${LABEL} > span`)).style.color).toBe(
      await color(page, "var(--danger)"),
    );
    const controlX = formRows[0].x + LABEL_WIDTH;

    const SEGMENTED = `${FORM} [data-slot="segmented"]`;
    await expect(page.locator(`${SEGMENTED} [data-slot="toggle-group-item"]`)).toHaveText([
      "미조치 (N)",
      "조치완료 (Y)",
      "미검수 (N)",
      "검수완료 (Y)",
    ]);
    for (const index of [0, 1]) {
      const segmented = await measure(page, SEGMENTED, index);
      const segmentedBox = await box(page, SEGMENTED, index);
      expect(segmented.height).toBe(32);
      expect(segmentedBox.x).toBeCloseTo(controlX, 1);
      expect(segmentedBox.y).toBeCloseTo(formRows[index === 0 ? 0 : 3].y, 1);
      expect(segmented.style.paddingTop).toBe("2px");
      expect(segmented.style.paddingLeft).toBe("2px");
      expect(segmented.style.columnGap).toBe("2px");
      expect(segmented.style.borderTopLeftRadius).toBe("8px");
      expect(segmented.style.backgroundColor).toBe(await color(page, "var(--muted)"));
    }
    const ITEM = `${SEGMENTED} [data-slot="toggle-group-item"]`;
    const items = await boxes(page, ITEM);
    const firstSegmented = await box(page, SEGMENTED);
    expect(firstSegmented.width).toBeCloseTo(items[0].width + items[1].width + 2 + 4, 1);
    const picked = await measure(page, ITEM, 0);
    expect(picked.height).toBe(28);
    expect(picked.style.paddingLeft).toBe("12px");
    expect(picked.style.borderTopLeftRadius).toBe("6px");
    expect(picked.style.fontSize).toBe("14px");
    expect(picked.style.fontWeight).toBe("600");
    expect(picked.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(picked.style.color).toBe(await color(page, "var(--fg)"));
    expect(visibleShadow(picked.style.boxShadow)).toBe(SEGMENT_SHADOW);
    const other = await measure(page, ITEM, 1);
    expect(other.style.fontWeight).toBe("400");
    expect(other.style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(other.style.color).toBe(await color(page, "var(--muted-fg)"));
    expect(
      await page.locator(ITEM).evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("aria-pressed")),
      ),
    ).toEqual(["true", "false", "true", "false"]);

    const TRIGGER = `${FORM} [data-slot="date-range-trigger"]`;
    await expect(page.locator(TRIGGER)).toHaveText("2026-09-23");
    const trigger = await measure(page, TRIGGER);
    const triggerBox = await box(page, TRIGGER);
    expect(trigger.width).toBe(220);
    expect(trigger.height).toBe(CONTROL_HEIGHT);
    expect(triggerBox.x).toBeCloseTo(controlX, 1);
    expect(triggerBox.y).toBeCloseTo(formRows[1].y, 1);
    expect(trigger.style.paddingLeft).toBe("12px");
    expect(trigger.style.paddingRight).toBe("12px");
    expect(trigger.style.columnGap).toBe("8px");
    expect(trigger.style.borderTopWidth).toBe("1px");
    expect(trigger.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(trigger.style.borderTopLeftRadius).toBe("6px");
    expect(trigger.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(trigger.style.fontSize).toBe("14px");
    expect(trigger.style.fontWeight).toBe("400");
    expect(trigger.style.color).toBe(await color(page, "var(--fg)"));
    expect(await styleOf(page, TRIGGER, "font-variant-numeric")).toBe("normal");
    const triggerIcon = await measure(page, `${TRIGGER} svg`);
    expect(triggerIcon.width).toBe(18);
    expect(triggerIcon.style.color).toBe(await color(page, "var(--fg)"));
    expect(await shownIconShape(page, TRIGGER)).toBe(iconShape("CalendarToday"));
    await expect(page.locator(`${FORM} [data-slot="measure-action-date-row"]`)).toHaveAttribute(
      "title",
      "실제로 조치한 날 — 조치 완료일 때만 저장됩니다",
    );

    const AREA = `${FORM} [data-slot="text-area-input"]`;
    await expect(page.locator(AREA)).toHaveAttribute("placeholder", "선택 입력");
    await expect(page.locator(AREA)).toHaveValue("");
    const area = await measure(page, AREA);
    expect(area.height).toBe(textAreaHeight(3));
    expect(area.width).toBeCloseTo(contentWidth - 2 - SECTION_PADDING_X * 2 - LABEL_WIDTH, 1);

    const BUTTON = `${ACTION} [data-slot="dialog-footer"] [data-slot="action-button"]`;
    await expect(page.locator(BUTTON)).toHaveText(["취소", "저장"]);
    await expectButton(page, BUTTON, {
      height: 32,
      paddingX: 16,
      weight: "600",
      background: "var(--card)",
      text: "var(--fg)",
      border: "var(--border)",
    });
    await expectButton(
      page,
      BUTTON,
      { height: 32, paddingX: 16, weight: "600", background: "var(--primary)", text: "var(--on-primary)" },
      1,
    );
    expect((await measure(page, BUTTON, 1)).style.columnGap).toBe("6px");
    expect((await box(page, `${BUTTON} svg`)).width).toBe(18);
    expect(await shownIconShape(page, BUTTON, 1)).toBe(iconShape("Check"));
    const buttons = await boxes(page, BUTTON);
    expect(buttons[1].x + buttons[1].width).toBeCloseTo(header.x + contentWidth, 1);
    expect(buttons[1].x - (buttons[0].x + buttons[0].width)).toBeCloseTo(8, 1);
  });
}

test("이상 센서 조치에서 조치일은 하루를 고르면 닫히고 저장하면 List와 KPI에 반영됨", async ({ page }) => {
  await openMeasures(page);
  expect(await kpiValues(page)).toEqual(["24", "16", "8", "19"]);
  await openAction(page, 1);
  const FORM = `${ACTION} [data-slot="measure-action-form"]`;
  const ITEM = `${FORM} [data-slot="toggle-group-item"]`;
  const TRIGGER = `${FORM} [data-slot="date-range-trigger"]`;
  const AREA = `${FORM} [data-slot="text-area-input"]`;

  await page.locator(TRIGGER).click();
  await expect(page.locator(CALENDAR)).toBeVisible();
  await page.waitForTimeout(300);
  expect((await measure(page, TRIGGER)).style.borderTopColor).toBe(
    await color(page, "var(--brand-line4)"),
  );
  await expect(page.locator(`${CALENDAR} [data-slot="calendar-caption-label"], ${CALENDAR} .rdp-caption_label`)).toHaveText([
    "2026년 9월",
    "2026년 10월",
  ]);
  const popup = await measure(page, PICKER);
  const popupBox = await box(page, PICKER);
  const triggerBox = await box(page, TRIGGER);
  expect(popupBox.y).toBeCloseTo(triggerBox.y + triggerBox.height + 4, 1);
  expect(popupBox.x).toBeCloseTo(triggerBox.x, 1);
  expect(popup.style.paddingTop).toBe("12px");
  expect(popup.style.borderTopLeftRadius).toBe("10px");
  expect(popup.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(visibleShadow(popup.style.boxShadow)).toBe(POPUP_SHADOW);
  const pickedDay = await measure(page, `${calendarDayCell(CALENDAR, "2026-09-23")} button`);
  expect(pickedDay.style.backgroundColor).toBe(await color(page, "var(--primary)"));
  expect(pickedDay.style.color).toBe(await color(page, "var(--on-primary)"));
  expect(pickedDay.style.fontWeight).toBe("700");
  expect((await measure(page, calendarDayCell(CALENDAR, "2026-09-23"))).style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect((await measure(page, `${calendarDayCell(CALENDAR, "2026-09-22")} button`)).style.fontWeight).toBe("400");
  await page.keyboard.press("Escape");
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await expect(page.locator(ACTION)).toBeVisible();
  await expect(page.locator(TRIGGER)).toBeFocused();
  await expect(page.locator(TRIGGER)).toHaveAttribute("aria-expanded", "false");
  await page.locator(TRIGGER).click();
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-21")} button`).click();
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await expect(page.locator(TRIGGER)).toHaveText("2026-09-21");

  await page.locator(ITEM).nth(1).click();
  await page.locator(ITEM).nth(3).click();
  await page.locator(AREA).fill("  센서 교체  ");
  expect(
    await page.locator(ITEM).evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("aria-pressed")),
    ),
  ).toEqual(["false", "true", "false", "true"]);
  await footerButton(page, ACTION, "저장").click();
  await expect(page.locator(ACTION)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("저장되었습니다.");
  expect(await rowCells(page, 1)).toEqual([
    "",
    "09-2210:13",
    "TRACTION_MOTOR압축기 흡입압력",
    "실제≈0.65 / 기대≈0.23오차 0.42",
    "402 · 2호차",
    "완료",
    "09-21",
    "완료",
    "처리",
  ]);
  expect(await kpiValues(page)).toEqual(["24", "15", "9", "18"]);

  await openAction(page, 1);
  await expect(page.locator(TRIGGER)).toHaveText("2026-09-21");
  await expect(page.locator(AREA)).toHaveValue("센서 교체");
  expect(
    await page.locator(ITEM).evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("aria-pressed")),
    ),
  ).toEqual(["false", "true", "false", "true"]);

  await page.locator(ITEM).nth(0).click();
  await page.locator(AREA).fill("   ");
  await footerButton(page, ACTION, "저장").click();
  await expect(page.locator(ACTION)).toHaveCount(0);
  const cells = await rowCells(page, 1);
  expect([cells[5], cells[6], cells[7]]).toEqual(["미조치", "-", "완료"]);
  expect(await kpiValues(page)).toEqual(["24", "16", "8", "18"]);
  await openAction(page, 1);
  await expect(page.locator(TRIGGER)).toHaveText("2026-09-23");
  await expect(page.locator(AREA)).toHaveValue("");

  await page.locator(ITEM).nth(1).click();
  await footerButton(page, ACTION, "취소").click();
  await expect(page.locator(ACTION)).toHaveCount(0);
  expect((await rowCells(page, 1))[5]).toBe("미조치");

  await openAction(page, 0);
  await expect(page.locator(TRIGGER)).toHaveText("2026-09-23");
  await page.keyboard.press("Escape");
  await openAction(page, 3);
  await expect(page.locator(TRIGGER)).toHaveText("2026-09-20");
  await expect(page.locator(`${ACTION} [data-slot="key-value-row-value"]`)).toHaveText([
    "2026-09-20 12:15:07",
    "ECU · 베어링 온도",
    "실제≈0.75 / 기대≈0.29 / 오차 0.46",
    "404 · 4호차",
  ]);
});

const COMPARE_BODY = `${COMPARE} [data-slot="measure-effect-body"]`;
const CONDITIONS = `${COMPARE} [data-slot="measure-effect-conditions"]`;
const COMPARE_SELECT = `${CONDITIONS} [data-slot="select-trigger"]`;
const BASE_DATE = `${CONDITIONS} [data-slot="date-range-trigger"]`;
const COMPARE_TABLE = `${COMPARE} [data-slot="data-table"]`;
const COMPARE_ROW = `${COMPARE} tbody [data-slot="table-row"]`;
const TILE = `${COMPARE} [data-slot="measure-effect-tile"]`;
const COMPARE_EMPTY = `${COMPARE} [data-slot="empty-state"]`;
const COMPARE_FOOT = `${COMPARE} [data-slot="measure-effect-foot"]`;

async function compareRows(page: Page): Promise<string[][]> {
  return page
    .locator(COMPARE_ROW)
    .evaluateAll((rows) =>
      rows.map((row) =>
        [...row.querySelectorAll(":scope > td")].map((cell) => cell.textContent ?? ""),
      ),
    );
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`조치 효과 비교에서 조건을 고르기 전의 크기, 배치, Text, Color (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await openMeasures(page, viewport.width, viewport.height);
    await openCompare(page);
    const { header, contentWidth } = await expectModalFrame(page, "action-effect-compare", {
      width: COMPARE_WIDTH,
      height: COMPARE_EMPTY_HEIGHT,
      title: "조치 전·후 비교",
    });

    const body = await measure(page, COMPARE_BODY);
    const bodyBox = await box(page, COMPARE_BODY);
    expect(bodyBox.x).toBeCloseTo(header.x, 1);
    expect(bodyBox.y).toBeCloseTo(header.y + header.height + 14, 1);
    expect(body.width).toBeCloseTo(contentWidth, 1);
    expect(body.style.paddingLeft).toBe("0px");
    expect(body.style.rowGap).toBe("14px");
    expect(await styleOf(page, COMPARE_BODY, "overflow-y")).toBe("auto");

    const DESCRIPTION = `${COMPARE} [data-slot="measure-effect-description"]`;
    await expect(page.locator(DESCRIPTION)).toHaveText(
      "기준일 전·후 며칠의 이상 비율을 베어링 위치별로 비교합니다. 기준일 당일은 어느 쪽에도 넣지 않습니다.",
    );
    const description = await measure(page, DESCRIPTION);
    expect(description.height).toBe(16);
    expect(description.style.fontSize).toBe("12px");
    expect(description.style.lineHeight).toBe("16px");
    expect(description.style.color).toBe(await color(page, "var(--muted-fg)"));

    const conditions = await measure(page, CONDITIONS);
    const conditionsBox = await box(page, CONDITIONS);
    expect(conditionsBox.y).toBeCloseTo(bodyBox.y + 16 + 14, 1);
    expect(conditions.height).toBe(CONTROL_HEIGHT);
    expect(conditions.style.columnGap).toBe("8px");
    await expect(page.locator(COMPARE_SELECT)).toHaveText([
      "차축 베어링",
      "VAE",
      "편성 (전체)",
      "호차 (전체)",
      "전·후 5일",
      "변화 큰 순",
    ]);
    const selects = await boxes(page, COMPARE_SELECT);
    expect(selects.map((select) => select.width)).toEqual([136, 84, 120, 120, 120, 128]);
    for (let index = 0; index < 6; index += 1) await expectSelectLike(page, COMPARE_SELECT, index);
    await expect(page.locator(BASE_DATE)).toHaveText("2026-09-17");
    await expectSelectLike(page, BASE_DATE);
    expect(await shownIconShape(page, BASE_DATE)).toBe(iconShape("KeyboardArrowDown"));
    const baseDate = await box(page, BASE_DATE);
    expect(baseDate.width).toBe(128);
    expect(await styleOf(page, BASE_DATE, "font-variant-numeric")).toBe("normal");
    const RUN = `${CONDITIONS} [data-slot="action-button"]`;
    await expect(page.locator(RUN)).toHaveText("비교");
    await expectButton(page, RUN, {
      height: 32,
      paddingX: 16,
      weight: "500",
      background: "var(--primary)",
      text: "var(--on-primary)",
    });
    const run = await box(page, RUN);
    const lefts = [selects[0], selects[1], selects[2], selects[3], baseDate, selects[4], run];
    expect(lefts[0].x).toBeCloseTo(conditionsBox.x, 1);
    for (let index = 1; index < lefts.length; index += 1) {
      expect(lefts[index].x).toBeCloseTo(lefts[index - 1].x + lefts[index - 1].width + 8, 1);
    }
    expect(selects[5].x + selects[5].width).toBeCloseTo(conditionsBox.x + contentWidth, 1);

    const table = await measure(page, COMPARE_TABLE);
    const tableBox = await box(page, COMPARE_TABLE);
    expect(tableBox.y).toBeCloseTo(conditionsBox.y + 32 + 14, 1);
    expect(table.width).toBeCloseTo(contentWidth, 1);
    expect(table.height).toBe(COMPARE_TABLE_HEAD);
    expect(table.style.borderTopWidth).toBe("1px");
    expect(table.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(table.style.borderTopLeftRadius).toBe("10px");
    expect(table.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(await styleOf(page, `${COMPARE_TABLE} table`, "min-width")).toBe("880px");
    const HEAD = `${COMPARE_TABLE} [data-slot="table-head"]`;
    await expect(page.locator(HEAD)).toHaveText(["편성 · 호차", "위치", "전 이상 비율", "후 이상 비율", "변화"]);
    const headRow = await measure(page, `${COMPARE_TABLE} thead [data-slot="table-row"]`);
    expect(headRow.height).toBe(44);
    expect(headRow.style.backgroundColor).toBe(await color(page, "var(--muted)"));
    expect(headRow.style.borderBottomWidth).toBe("1px");
    const heads = await boxes(page, HEAD);
    const flexible = contentWidth - 2 - COMPARE_FIXED_COLUMNS.reduce((sum, width) => sum + width, 0);
    expect(heads.map((head) => head.width)).toEqual([150, flexible, 230, 230, 110].map((width) => expect.closeTo(width, 1)));
    for (const [index, padding] of [16, 16, 12, 12, 16].entries()) {
      const head = await measure(page, HEAD, index);
      expect(head.style.paddingLeft).toBe(`${padding}px`);
      expect(head.style.fontSize).toBe("14px");
      expect(head.style.fontWeight).toBe("400");
    }
    expect((await measure(page, HEAD, 4)).style.textAlign).toBe("right");

    const empty = await measure(page, COMPARE_EMPTY);
    const emptyBox = await box(page, COMPARE_EMPTY);
    expect(emptyBox.y).toBeCloseTo(tableBox.y + COMPARE_TABLE_HEAD + 14, 1);
    expect(empty.width).toBeCloseTo(contentWidth, 1);
    expect(empty.height).toBe(300);
    expect(empty.style.minHeight).toBe("300px");
    expect(empty.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(empty.style.borderTopWidth).toBe("1px");
    expect(await styleOf(page, COMPARE_EMPTY, "border-top-style")).toBe("solid");
    expect(empty.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(empty.style.borderTopLeftRadius).toBe("10px");
    expect(empty.style.paddingTop).toBe("24px");
    expect(empty.style.paddingLeft).toBe("24px");
    expect(empty.style.rowGap).toBe("10px");
    const ICON = `${COMPARE_EMPTY} [data-slot="empty-state-icon"]`;
    const icon = await measure(page, ICON);
    expect(icon.width).toBe(56);
    expect(icon.height).toBe(56);
    expect(icon.style.borderTopLeftRadius).toBe("50%");
    expect(icon.style.backgroundColor).toBe(await color(page, "var(--brand-line4-muted)"));
    expect(icon.style.color).toBe(await color(page, "var(--brand-on-line4-subtle)"));
    expect((await box(page, `${ICON} svg`)).width).toBe(26);
    expect(await shownIconShape(page, ICON)).toBe(iconShape("PlayArrow"));
    const TITLE = `${COMPARE_EMPTY} [data-slot="empty-state-title"]`;
    await expect(page.locator(TITLE)).toHaveText("조건을 고르고 [비교]를 누르세요.");
    const title = (await measure(page, TITLE)).style;
    expect(title.fontSize).toBe("16px");
    expect(title.fontWeight).toBe("700");
    const DESC = `${COMPARE_EMPTY} [data-slot="empty-state-description"]`;
    await expect(page.locator(DESC)).toHaveText(
      "장치·모델·기준일을 고른 뒤 비교합니다. 기준일 당일은 전·후 어느 쪽에도 넣지 않습니다.",
    );
    const desc = await measure(page, DESC);
    expect(desc.style.fontSize).toBe("14px");
    expect(desc.style.lineHeight).toBe("20px");
    expect(desc.style.color).toBe(await color(page, "var(--muted-fg)"));
    expect(desc.width).toBeLessThanOrEqual(340);
    expect(await styleOf(page, DESC, "max-width")).toBe("340px");
    const iconBox = await box(page, ICON);
    const descBox = await box(page, DESC);
    const contentTop = iconBox.y - (emptyBox.y + 1);
    const contentBottom = emptyBox.y + emptyBox.height - 1 - (descBox.y + descBox.height);
    expect(contentTop).toBeCloseTo(contentBottom, 0);
    expect(iconBox.x + iconBox.width / 2).toBeCloseTo(emptyBox.x + emptyBox.width / 2, 1);
    await expect(page.locator(TILE)).toHaveCount(0);
    await expect(page.locator(COMPARE_FOOT)).toHaveCount(0);

    const CLOSE = `${COMPARE} [data-slot="dialog-footer"] [data-slot="action-button"]`;
    await expect(page.locator(CLOSE)).toHaveText("닫기");
    await expectButton(page, CLOSE, {
      height: 32,
      paddingX: 14,
      weight: "500",
      background: "var(--card)",
      text: "var(--fg)",
      border: "var(--border)",
    });
    const close = await box(page, CLOSE);
    expect(close.x + close.width).toBeCloseTo(header.x + contentWidth, 1);
  });
}

for (const viewport of [
  { width: 1920, height: 1080, scale: 1 },
  { width: 1440, height: 900, scale: 1 },
  { width: 3840, height: 2160, scale: 2 },
]) {
  test(`조치 효과 비교에서 조건 Row의 Select는 어느 선택지를 골라도 Text가 잘리지 않고 Row는 한 줄임 (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await openMeasures(page, viewport.width, viewport.height);
    await openCompare(page);
    const isCut = (selector: string, index: number) =>
      page.locator(selector).nth(index).evaluate((element) => element.scrollWidth > element.clientWidth);
    const VALUE = `${COMPARE_SELECT} [data-slot="select-value"]`;
    expect(await isCut(`${BASE_DATE} [data-slot="dropdown-trigger-text"]`, 0)).toBe(false);
    await expect(page.locator(COMPARE_SELECT)).toHaveCount(6);
    const cut: string[] = [];
    for (let index = 0; index < 6; index += 1) {
      const trigger = page.locator(COMPARE_SELECT).nth(index);
      const initialText = (await trigger.textContent()) ?? "";
      await trigger.click();
      await expect(page.locator(OPEN_ITEMS).first()).toBeVisible();
      const labels = await page.locator(OPEN_ITEMS).allTextContents();
      const initial = labels.indexOf(initialText);
      expect(initial).toBeGreaterThanOrEqual(0);
      for (const order of [...labels.keys(), initial]) {
        if ((await page.locator(OPEN_ITEMS).count()) === 0) await trigger.click();
        await page.locator(OPEN_ITEMS).nth(order).click();
        await expect(page.locator(OPEN_ITEMS)).toHaveCount(0);
        await expect(trigger).toHaveText(labels[order]);
        if (await isCut(VALUE, index)) cut.push(labels[order]);
      }
    }
    expect(cut).toEqual([]);
    expect((await box(page, CONDITIONS)).height).toBe(CONTROL_HEIGHT * viewport.scale);
    expect(await page.locator(CONDITIONS).evaluate((row) => row.scrollWidth <= row.clientWidth)).toBe(true);
    const fields = await boxes(
      page,
      `${CONDITIONS} > :is([data-slot="select-trigger"], [data-slot="date-range-trigger"], [data-slot="action-button"])`,
    );
    expect(fields).toHaveLength(8);
    expect(new Set(fields.map((field) => field.y)).size).toBe(1);
  });
}

const LOCATION_ROWS: Record<string, string[]> = {
  "401·0": ["401 · 0호차", "4010-H-1-False", "14.20%284/2000", "3.10%62/2000", "▼ 78%"],
  "402·4": ["402 · 4호차", "4024-T-2-True", "13.50%270/2000", "2.60%52/2000", "▼ 81%"],
  "402·3": ["402 · 3호차", "4023-H-1-False", "11.80%236/2000", "3.40%68/2000", "▼ 71%"],
  "401·1": ["401 · 1호차", "4011-T-2-True", "2.30%46/2000", "4.80%96/2000", "▲ 109%"],
  "403·6": ["403 · 6호차", "4036-H-1-False", "6.00%120/2000", "1.50%30/2000", "▼ 75%"],
  "403·7": ["403 · 7호차", "4037-T-2-True", "8.10%162/2000", "6.90%138/2000", "▼ 15%"],
};
const locationRows = (...keys: string[]) => keys.map((key) => LOCATION_ROWS[key]);

test("조치 효과 비교에서 비교하면 요약, 위치 Table, 안내 Row를 표시하고 Sort하며 조건을 바꾸면 다시 조회함", async ({
  page,
}) => {
  await openMeasures(page);
  await openCompare(page);
  await compareButton(page).click();
  await expect(page.locator(`${COMPARE} [data-slot="dialog-title"]`)).toHaveText(
    "조치 전·후 비교 — 편성 전체 · 기준일 2026-09-17",
  );
  await expect(page.locator(COMPARE_EMPTY)).toHaveCount(0);

  await expect(page.locator(`${TILE} [data-slot="measure-effect-tile-label"]`)).toHaveText([
    "전 · 09-12~09-16 (5일)",
    "후 · 09-18~09-22 (5일)",
    "변화",
  ]);
  await expect(page.locator(`${TILE} [data-slot="measure-effect-tile-value"]`)).toHaveText([
    "12.40%",
    "3.20%",
    "▼74%",
  ]);
  await expect(page.locator(`${TILE} [data-slot="measure-effect-tile-detail"]`)).toHaveText([
    "248 / 2,000",
    "64 / 2,000",
    "편성 전체 · VAE · 기준일 2026-09-17 (제외)",
  ]);
  const SUMMARY = `${COMPARE} [data-slot="measure-effect-summary"]`;
  const summary = await measure(page, SUMMARY);
  const summaryBox = await box(page, SUMMARY);
  const conditionsBox = await box(page, CONDITIONS);
  expect(summaryBox.y).toBeCloseTo(conditionsBox.y + 32 + 14, 1);
  expect(summary.style.columnGap).toBe("12px");
  const tiles = await boxes(page, TILE);
  expect(tiles.map((tile) => tile.height)).toEqual([97, 97, 100]);
  expect(summary.height).toBe(100);
  const ARROW = `${COMPARE} [data-slot="measure-effect-summary-arrow"]`;
  await expect(page.locator(ARROW)).toHaveText("→");
  const arrow = await measure(page, ARROW);
  const arrowBox = await box(page, ARROW);
  expect(arrow.style.fontSize).toBe("18px");
  expect(arrow.style.color).toBe(await color(page, "var(--muted-fg)"));
  const summaryBody = await box(page, COMPARE_BODY);
  const tileWidth = (summaryBody.width - arrowBox.width - 12 * 3) / 3;
  expect(tiles.map((tile) => tile.width)).toEqual(tiles.map(() => expect.closeTo(tileWidth, 1)));
  expect(tiles[0].x).toBeCloseTo(summaryBody.x, 1);
  expect(arrowBox.x).toBeCloseTo(tiles[0].x + tiles[0].width + 12, 1);
  expect(tiles[1].x).toBeCloseTo(arrowBox.x + arrowBox.width + 12, 1);
  expect(tiles[2].x).toBeCloseTo(tiles[1].x + tiles[1].width + 12, 1);
  expect(tiles[2].x + tiles[2].width).toBeCloseTo(summaryBody.x + summaryBody.width, 1);
  const tile = (await measure(page, TILE)).style;
  expect(tile.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(tile.borderTopWidth).toBe("1px");
  expect(tile.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(tile.borderTopLeftRadius).toBe("10px");
  expect(tile.paddingTop).toBe("12px");
  expect(tile.paddingLeft).toBe("14px");
  expect(tile.rowGap).toBe("4px");
  const tileLabel = (await measure(page, `${TILE} [data-slot="measure-effect-tile-label"]`)).style;
  expect(tileLabel.fontSize).toBe("11px");
  expect(tileLabel.color).toBe(await color(page, "var(--muted-fg)"));
  const tileValue = (await measure(page, `${TILE} [data-slot="measure-effect-tile-value"]`)).style;
  expect(tileValue.fontSize).toBe("28px");
  expect(tileValue.lineHeight).toBe("34px");
  expect(tileValue.fontWeight).toBe("700");
  expect(tileValue.color).toBe(await color(page, "var(--fg)"));
  const tileDetail = (await measure(page, `${TILE} [data-slot="measure-effect-tile-detail"]`)).style;
  expect(tileDetail.fontSize).toBe("11px");
  expect(tileDetail.color).toBe(await color(page, "var(--muted-fg)"));
  const change = (await measure(page, `${TILE} [data-slot="measure-effect-tile-value"]`, 2)).style;
  expect(change.color).toBe(await color(page, "var(--success)"));
  expect(change.columnGap).toBe("6px");
  expect(
    await styleOf(page, `${TILE} [data-slot="measure-effect-tile-value"] > span`, "font-size", 0),
  ).toBe("24px");

  expect(await compareRows(page)).toEqual(
    locationRows("401·0", "402·4", "402·3", "401·1", "403·6", "403·7"),
  );
  const tableBox = await box(page, COMPARE_TABLE);
  expect(tableBox.y).toBeCloseTo(summaryBox.y + 100 + 14, 1);
  expect(tableBox.height).toBe(COMPARE_TABLE_HEAD + 44 * 6);
  const row = await measure(page, COMPARE_ROW);
  expect(row.height).toBe(44);
  expect(row.style.borderBottomWidth).toBe("1px");
  expect(row.style.fontSize).toBe("14px");
  await page.locator(COMPARE_ROW).first().hover();
  await page.waitForTimeout(300);
  expect((await measure(page, COMPARE_ROW)).style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  const CELL = `${COMPARE_ROW} [data-slot="table-cell"]`;
  expect((await measure(page, CELL, 1)).style.color).toBe(await color(page, "var(--muted-fg)"));
  const BAR = `${COMPARE_ROW} [data-slot="ratio-bar"]`;
  const TRACK = `${COMPARE_ROW} [data-slot="ratio-bar-track"]`;
  const FILL = `${COMPARE_ROW} [data-slot="ratio-bar-fill"]`;
  const LABEL = `${COMPARE_ROW} [data-slot="ratio-bar-label"]`;
  const track = await measure(page, TRACK);
  expect(track.width).toBe(90);
  expect(track.height).toBe(6);
  expect(track.style.borderTopLeftRadius).toBe("3px");
  expect(track.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect((await measure(page, TRACK, 1)).style.backgroundColor).toBe(
    await color(page, "var(--warning-subtle)"),
  );
  expect((await measure(page, FILL, 0)).width).toBeCloseTo((90 * 14.2) / 15, 1);
  expect((await measure(page, FILL, 1)).width).toBeCloseTo((90 * 3.1) / 15, 1);
  expect(await styleOf(page, FILL, "background-image", 0)).toContain("linear-gradient");
  expect(await styleOf(page, FILL, "background-image", 1)).toContain("linear-gradient");
  expect((await measure(page, BAR)).style.columnGap).toBe("10px");
  const label = await measure(page, LABEL);
  expect(label.width).toBe(52);
  expect(label.style.fontSize).toBe("12px");
  expect(label.style.fontWeight).toBe("700");
  expect(label.style.textAlign).toBe("right");
  expect(label.style.color).toBe(await color(page, "var(--fg)"));
  const COUNT = `${COMPARE_ROW} [data-slot="measure-effect-count"]`;
  const count = (await measure(page, COUNT)).style;
  expect(count.fontSize).toBe("11px");
  expect(count.color).toBe(await color(page, "var(--muted-fg)"));
  const rateCell = await box(page, CELL, 2);
  const trackBox = await box(page, TRACK);
  expect(trackBox.x).toBeCloseTo(rateCell.x, 1);
  expect((await box(page, COUNT)).x).toBeCloseTo(trackBox.x + 90 + 10 + 52 + 10, 1);
  const CHANGE = `${COMPARE_ROW} [data-slot="measure-effect-change"]`;
  const changes = await page.locator(CHANGE).evaluateAll((cells) =>
    cells.map((cell) => getComputedStyle(cell).color),
  );
  const success = await color(page, "var(--success)");
  const danger = await color(page, "var(--danger)");
  const fg = await color(page, "var(--fg)");
  expect(changes).toEqual([success, success, success, danger, success, fg]);
  const changeCell = (await measure(page, CHANGE)).style;
  expect(changeCell.fontWeight).toBe("700");
  expect(changeCell.textAlign).toBe("right");
  expect(changeCell.paddingRight).toBe("16px");

  await expect(page.locator(COMPARE_FOOT)).toHaveText(
    "위치 12곳 중 6곳 · 정렬: 변화가 큰 순(비율 크기 반영) · 전·후 각 5일 · 변화: 30% 이상 줄면 초록, 늘면 빨강",
  );
  const foot = await measure(page, COMPARE_FOOT);
  expect(foot.style.fontSize).toBe("12px");
  expect(foot.style.color).toBe(await color(page, "var(--muted-fg)"));
  expect((await box(page, COMPARE_FOOT)).y).toBeCloseTo(tableBox.y + tableBox.height + 14, 1);
  expect((await box(page, COMPARE)).height).toBe(frameHeight(16 + 14 + 32 + 14 + 100 + 14 + 310 + 14 + 17));

  await selectOption(page, COMPARE_SELECT, "전 비율 순", 5);
  expect(await compareRows(page)).toEqual(
    locationRows("401·0", "402·4", "402·3", "403·7", "403·6", "401·1"),
  );
  await expect(page.locator(COMPARE_FOOT)).toContainText("정렬: 전 비율 높은 순");
  await selectOption(page, COMPARE_SELECT, "후 비율 순", 5);
  expect(await compareRows(page)).toEqual(
    locationRows("403·7", "401·1", "402·3", "401·0", "402·4", "403·6"),
  );
  await selectOption(page, COMPARE_SELECT, "편성·호차 순", 5);
  expect(await compareRows(page)).toEqual(
    locationRows("401·0", "401·1", "402·3", "402·4", "403·6", "403·7"),
  );
  await expect(page.locator(COMPARE_FOOT)).toContainText("정렬: 편성·호차 순");

  await selectOption(page, COMPARE_SELECT, "3호차", 3);
  await expect(page.locator(COMPARE_SELECT).nth(3)).toHaveText("3호차");
  await selectOption(page, COMPARE_SELECT, "편성 402", 2);
  await expect(page.locator(COMPARE_SELECT).nth(3)).toHaveText("호차 (전체)");
  await expect(page.locator(COMPARE_ROW)).toHaveCount(6);
  await selectOption(page, COMPARE_SELECT, "SVM", 1);
  await expect(page.locator(`${TILE} [data-slot="measure-effect-tile-detail"]`).nth(2)).toHaveText(
    "편성 전체 · VAE · 기준일 2026-09-17 (제외)",
  );
  await selectOption(page, COMPARE_SELECT, "VAE", 1);
  await compareButton(page).click();
  await expect(page.locator(`${COMPARE} [data-slot="dialog-title"]`)).toHaveText(
    "조치 전·후 비교 — 편성 402 · 기준일 2026-09-17",
  );
  expect(await compareRows(page)).toEqual(locationRows("402·3", "402·4"));
  await expect(page.locator(`${TILE} [data-slot="measure-effect-tile-value"]`)).toHaveText([
    "12.65%",
    "3.00%",
    "▼76%",
  ]);
  await expect(page.locator(`${TILE} [data-slot="measure-effect-tile-detail"]`)).toHaveText([
    "506 / 4,000",
    "120 / 4,000",
    "편성 402 · VAE · 기준일 2026-09-17 (제외)",
  ]);
  await expect(page.locator(COMPARE_FOOT)).toContainText("위치 12곳 중 2곳");

  await selectOption(page, COMPARE_SELECT, "4호차", 3);
  await selectOption(page, COMPARE_SELECT, "전·후 3일", 4);
  await compareButton(page).click();
  await expect(page.locator(`${COMPARE} [data-slot="dialog-title"]`)).toHaveText(
    "조치 전·후 비교 — 편성 402 · 4호차 · 기준일 2026-09-17",
  );
  expect(await compareRows(page)).toEqual([
    ["402 · 4호차", "4024-T-2-True", "13.50%162/1200", "2.58%31/1200", "▼ 81%"],
  ]);
  await expect(page.locator(`${TILE} [data-slot="measure-effect-tile-label"]`)).toHaveText([
    "전 · 09-14~09-16 (3일)",
    "후 · 09-18~09-20 (3일)",
    "변화",
  ]);
  await expect(page.locator(COMPARE_FOOT)).toHaveText(
    "위치 12곳 중 1곳 · 정렬: 편성·호차 순 · 전·후 각 3일 · 변화: 30% 이상 줄면 초록, 늘면 빨강",
  );

  await page.locator(COMPARE_SELECT).nth(0).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText(["차축 베어링", "주공기 압축기", "출입문장치"]);
  await page.keyboard.press("Escape");
  await expect(page.locator(OPEN_ITEMS)).toHaveCount(0);
  await page.locator(COMPARE_SELECT).nth(1).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText(["IF", "SVM", "VAE", "PCA"]);
  await page.keyboard.press("Escape");
  await page.locator(COMPARE_SELECT).nth(2).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText([
    "편성 (전체)",
    "편성 401",
    "편성 402",
    "편성 403",
    "편성 404",
    "편성 405",
  ]);
  await page.keyboard.press("Escape");
  await page.locator(COMPARE_SELECT).nth(4).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText(["전·후 3일", "전·후 5일", "전·후 7일", "전·후 14일"]);
  await page.keyboard.press("Escape");
  await expect(page.locator(COMPARE)).toBeVisible();
});

test("조치 효과 비교에서 조건이 그대로여도 비교를 Click할 때마다 다시 조회함", async ({ page }) => {
  await openMeasures(page);
  await openCompare(page);
  await compareButton(page).click();
  await expect(page.locator(COMPARE_ROW)).toHaveCount(6);
  await page.evaluate((selector) => {
    const target = document.querySelector(selector) as HTMLElement;
    const record = { removed: 0 };
    (window as unknown as { effectReloads: typeof record }).effectReloads = record;
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.removedNodes) {
          if (node instanceof HTMLElement && node.dataset.slot === "table-row") record.removed += 1;
        }
      }
    }).observe(target, { childList: true, subtree: true });
  }, COMPARE);
  const removedRows = () =>
    page.evaluate(() => (window as unknown as { effectReloads: { removed: number } }).effectReloads.removed);
  await page.waitForTimeout(200);
  expect(await removedRows()).toBe(0);
  await compareButton(page).click();
  await expect.poll(removedRows).toBe(6);
  await expect(page.locator(COMPARE_ROW)).toHaveCount(6);
  await compareButton(page).click();
  await expect.poll(removedRows).toBe(12);
  await expect(page.locator(COMPARE_ROW)).toHaveCount(6);
});

test("조치 효과 비교에서 Row의 조치일에서 열면 그 편성, 호차, 조치일로 바로 비교함", async ({ page }) => {
  await openMeasures(page);
  await actionDateButton(page, 0).click();
  await expect(page.locator(COMPARE)).toBeVisible();
  await expect(page.locator(`${COMPARE} [data-slot="dialog-title"]`)).toHaveText(
    "조치 전·후 비교 — 편성 401 · 1호차 · 조치일 2026-09-23",
  );
  await expect(page.locator(COMPARE_SELECT)).toHaveText([
    "차축 베어링",
    "VAE",
    "편성 401",
    "1호차",
    "전·후 5일",
    "변화 큰 순",
  ]);
  await expect(page.locator(BASE_DATE)).toHaveText("2026-09-23");
  expect(await compareRows(page)).toEqual(locationRows("401·1"));
  await expect(page.locator(`${TILE} [data-slot="measure-effect-tile-label"]`)).toHaveText([
    "전 · 09-18~09-22 (5일)",
    "후 · 09-24~09-28 (5일)",
    "변화",
  ]);
  await expect(page.locator(`${TILE} [data-slot="measure-effect-tile-value"]`)).toHaveText([
    "2.30%",
    "4.80%",
    "▲109%",
  ]);
  await expect(page.locator(`${TILE} [data-slot="measure-effect-tile-detail"]`)).toHaveText([
    "46 / 2,000",
    "96 / 2,000",
    "편성 401 · 1호차 · VAE · 기준일 2026-09-23 (제외)",
  ]);
  const presetTiles = await boxes(page, TILE);
  expect(presetTiles.map((tile) => tile.height)).toEqual([97, 97, 100]);
  expect((await box(page, `${TILE} [data-slot="measure-effect-tile-detail"]`, 2)).height).toBe(16);
  const presetSummary = await box(page, `${COMPARE} [data-slot="measure-effect-summary"]`);
  expect(presetSummary.height).toBe(100);
  expect(presetTiles[0].y).toBeCloseTo(presetSummary.y + (100 - 97) / 2, 1);
  expect(presetTiles[2].y).toBeCloseTo(presetSummary.y, 1);
  expect((await measure(page, `${TILE} [data-slot="measure-effect-tile-value"]`, 2)).style.color).toBe(
    await color(page, "var(--danger)"),
  );
  await expect(page.locator(COMPARE_FOOT)).toContainText("위치 12곳 중 1곳");
  await compareButton(page).click();
  await expect(page.locator(`${COMPARE} [data-slot="dialog-title"]`)).toHaveText(
    "조치 전·후 비교 — 편성 401 · 1호차 · 기준일 2026-09-23",
  );
  await footerButton(page, COMPARE, "닫기").click();
  await expect(page.locator(COMPARE)).toHaveCount(0);

  await actionDateButton(page, 1).click();
  await expect(page.locator(`${COMPARE} [data-slot="dialog-title"]`)).toHaveText(
    "조치 전·후 비교 — 편성 404 · 4호차 · 조치일 2026-09-20",
  );
  await expect(page.locator(COMPARE_ROW)).toHaveCount(0);
  await expect(page.locator(TILE)).toHaveCount(0);
  await expect(page.locator(COMPARE_FOOT)).toHaveCount(0);
  await expect(page.locator(`${COMPARE_EMPTY} [data-slot="empty-state-title"]`)).toHaveText(
    "이 조건으로 저장된 window 점수가 없습니다.",
  );
  await expect(page.locator(`${COMPARE_EMPTY} [data-slot="empty-state-description"]`)).toHaveText(
    "편성·호차 또는 기준일을 바꿔 다시 비교하세요.",
  );
  expect(await shownIconShape(page, `${COMPARE_EMPTY} [data-slot="empty-state-icon"]`)).toBe(
    iconShape("SearchOff"),
  );
  expect((await box(page, COMPARE)).height).toBe(COMPARE_EMPTY_HEIGHT);

  await page.keyboard.press("Escape");
  await expect(page.locator(COMPARE)).toHaveCount(0);
  await openCompare(page);
  await expect(page.locator(`${COMPARE} [data-slot="dialog-title"]`)).toHaveText("조치 전·후 비교");
  await expect(page.locator(COMPARE_SELECT).nth(2)).toHaveText("편성 (전체)");
  await expect(page.locator(BASE_DATE)).toHaveText("2026-09-17");
  await expect(page.locator(`${COMPARE_EMPTY} [data-slot="empty-state-title"]`)).toHaveText(
    "조건을 고르고 [비교]를 누르세요.",
  );
});

test("조치 효과 비교에서 기준일은 하루를 고르면 Calendar가 닫히고 비교를 Click해야 반영됨", async ({ page }) => {
  await openMeasures(page);
  await openCompare(page);
  await page.locator(BASE_DATE).click();
  await expect(page.locator(CALENDAR)).toBeVisible();
  await page.waitForTimeout(300);
  expect((await measure(page, BASE_DATE)).style.borderTopColor).toBe(
    await color(page, "var(--brand-line4)"),
  );
  expect((await measure(page, `${calendarDayCell(CALENDAR, "2026-09-17")} button`)).style.backgroundColor).toBe(
    await color(page, "var(--primary)"),
  );
  const popupBox = await box(page, PICKER);
  const triggerBox = await box(page, BASE_DATE);
  expect(popupBox.y).toBeCloseTo(triggerBox.y + triggerBox.height + 4, 1);
  expect(popupBox.x).toBeCloseTo(triggerBox.x, 1);
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-20")} button`).click();
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await expect(page.locator(BASE_DATE)).toHaveText("2026-09-20");
  await expect(page.locator(`${COMPARE} [data-slot="dialog-title"]`)).toHaveText("조치 전·후 비교");
  await compareButton(page).click();
  await expect(page.locator(`${COMPARE} [data-slot="dialog-title"]`)).toHaveText(
    "조치 전·후 비교 — 편성 전체 · 기준일 2026-09-20",
  );
  await expect(page.locator(`${TILE} [data-slot="measure-effect-tile-label"]`)).toHaveText([
    "전 · 09-15~09-19 (5일)",
    "후 · 09-21~09-25 (5일)",
    "변화",
  ]);
});

test("일괄 조치 확인의 크기, Text, Color와 확인하면 조치완료로 바뀌고 선택이 비워짐", async ({ page }) => {
  await openMeasures(page);
  await selectRows(page, [1, 2]);
  await bulkButton(page, 0).click();
  await expect(page.locator(BULK)).toBeVisible();
  await expect(page.locator(BULK)).toHaveAttribute("role", "alertdialog");
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("창 크기 없음");
  const overlay = await measure(page, '[data-slot="alert-dialog-overlay"]');
  expect(overlay.width).toBe(viewport.width);
  expect(overlay.style.backgroundColor).toBe(await color(page, "var(--scrim)"));

  const TITLE = `${BULK} [data-slot="alert-dialog-title"]`;
  const DESCRIPTION = `${BULK} [data-slot="alert-dialog-description"]`;
  await expect(page.locator(TITLE)).toHaveText("선택한 2건을 조치완료로 바꿀까요?");
  await expect(page.locator(DESCRIPTION)).toHaveText(
    "TRACTION_MOTOR · CMSB 이상 센서 2건의 조치 여부가 Y로 바뀝니다.\n조치 내용은 비어 있으니 필요하면 건별 처리에서 입력하세요.\n검수 여부는 바뀌지 않습니다.",
  );
  await expectSentenceLines(page, DESCRIPTION, { sentences: 3, lineHeight: 20 });
  const descriptionHeight = (await box(page, DESCRIPTION)).height;
  expect(descriptionHeight % 20).toBe(0);
  const height = 50 + 44 + 4 + 10 + 28 + 10 + descriptionHeight + 10 + 48;
  const frame = await box(page, BULK);
  expect(frame.width).toBe(CONFIRM_WIDTH);
  expect(frame.height).toBe(height);
  expect(frame.x).toBeCloseTo((viewport.width - CONFIRM_WIDTH) / 2, 1);
  expect(frame.y).toBeCloseTo((viewport.height - height) / 2, 1);
  const style = (await measure(page, BULK)).style;
  expect(style.backgroundColor).toBe(await color(page, "var(--surface-low)"));
  expect(style.borderTopWidth).toBe("1px");
  expect(style.borderTopLeftRadius).toBe("16px");
  expect(style.paddingTop).toBe("24px");
  expect(visibleShadow(style.boxShadow)).toBe("rgba(0, 0, 0, 0.3) 0px 24px 64px 0px");
  const MEDIA = `${BULK} [data-slot="alert-dialog-media"]`;
  const media = await measure(page, MEDIA);
  expect(media.width).toBe(44);
  expect(media.style.borderTopLeftRadius).toBe("50%");
  expect(media.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(media.style.color).toBe(await color(page, "var(--primary)"));
  expect((await box(page, `${MEDIA} svg`)).width).toBe(22);
  expect(await shownIconShape(page, MEDIA)).toBe(iconShape("Schedule"));
  const title = (await measure(page, TITLE)).style;
  expect(title.fontSize).toBe("22px");
  expect(title.lineHeight).toBe("28px");
  expect(title.fontWeight).toBe("500");
  const description = (await measure(page, DESCRIPTION)).style;
  expect(description.fontSize).toBe("14px");
  expect(description.lineHeight).toBe("20px");
  expect(description.color).toBe(await color(page, "var(--muted-fg)"));
  const CANCEL = `${BULK} [data-slot="alert-dialog-cancel"]`;
  const ACTION_BUTTON = `${BULK} [data-slot="alert-dialog-action"]`;
  await expect(page.locator(CANCEL)).toHaveText("취소");
  await expect(page.locator(ACTION_BUTTON)).toHaveText("확인");
  await expectButton(page, CANCEL, {
    height: 40,
    paddingX: 16,
    weight: "600",
    background: "var(--card)",
    text: "var(--fg)",
    border: "var(--border)",
  });
  await expectButton(page, ACTION_BUTTON, {
    height: 40,
    paddingX: 16,
    weight: "600",
    background: "var(--primary)",
    text: "var(--on-primary)",
  });
  const action = await box(page, ACTION_BUTTON);
  expect(action.x + action.width).toBeCloseTo(frame.x + CONFIRM_WIDTH - 25, 1);

  await page.locator(CANCEL).click();
  await expect(page.locator(BULK)).toHaveCount(0);
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 2건");
  expect(await kpiValues(page)).toEqual(["24", "16", "8", "19"]);

  await bulkButton(page, 0).click();
  await page.locator(ACTION_BUTTON).click();
  await expect(page.locator(BULK)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("저장되었습니다.");
  const second = await rowCells(page, 1);
  const third = await rowCells(page, 2);
  expect([second[5], second[6], second[7]]).toEqual(["완료", "09-22", "미검수"]);
  expect([third[5], third[6], third[7]]).toEqual(["완료", "09-21", "미검수"]);
  await expect(page.locator(BULK_BAR)).toHaveCount(0);
  expect(await kpiValues(page)).toEqual(["24", "14", "10", "19"]);

  await selectRows(page, [6, 7]);
  await bulkButton(page, 0).click();
  await expect(page.locator(DESCRIPTION)).toHaveText(
    "DCU 이상 센서 2건의 조치 여부가 Y로 바뀝니다.\n조치 내용은 비어 있으니 필요하면 건별 처리에서 입력하세요.\n검수 여부는 바뀌지 않습니다.",
  );
  await expectSentenceLines(page, DESCRIPTION, { sentences: 3, lineHeight: 20 });
  await page.keyboard.press("Escape");
  await expect(page.locator(BULK)).toHaveCount(0);
});

test("담당자 지정 Modal의 크기, 배치, Text, Color와 지정하면 선택이 비워짐", async ({ page }) => {
  await openMeasures(page);
  await selectRows(page, [1, 6]);
  const rowsBefore = [await rowCells(page, 1), await rowCells(page, 6)];
  await bulkButton(page, 1).click();
  await expect(page.locator(ASSIGN)).toBeVisible();

  const targetsHeight = 21 + 52 * 2 + 4 * 2 + SECTION_PADDING_Y * 2 + 2;
  const formHeight = ROW_HEIGHT + 12 + textAreaHeight(3) + SECTION_PADDING_Y * 2 + 2;
  const { header, contentWidth } = await expectModalFrame(page, "assignee-bulk", {
    width: ASSIGN_WIDTH,
    height: frameHeight(targetsHeight + 14 + formHeight),
    title: "담당자 지정 · 선택 2건",
  });
  const TARGETS = `${ASSIGN} [data-slot="assignee-bulk-targets"]`;
  const targets = await box(page, TARGETS);
  expect(targets.y).toBeCloseTo(header.y + header.height + 14, 1);
  expect(targets.height).toBeCloseTo(targetsHeight, 1);
  await expectSection(page, TARGETS);
  await expect(page.locator(`${TARGETS} [data-slot="assignee-bulk-list-title"]`)).toHaveText(
    "선택한 조치 건",
  );
  const ITEM = `${TARGETS} [data-slot="assignee-bulk-item"]`;
  const items = await boxes(page, ITEM);
  expect(items).toHaveLength(2);
  expect(items[0].y).toBeCloseTo(targets.y + 1 + SECTION_PADDING_Y + 21 + 4, 1);
  expect(items[1].y).toBeCloseTo(items[0].y + 52 + 4, 1);
  await expect(page.locator(`${ITEM} [data-slot="alarm-severity"]`)).toHaveCount(0);
  const BLANK = `${ITEM} > :first-child`;
  const blank = await box(page, BLANK);
  expect([blank.width, blank.height]).toEqual([52, 24]);
  expect(blank.x).toBeCloseTo(items[0].x, 1);
  await expect(page.locator(BLANK).first()).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(BLANK).first()).toHaveText("");
  const TITLE = `${ITEM} [data-slot="assignee-bulk-item-title"]`;
  await expect(page.locator(TITLE)).toHaveText(["TRACTION_MOTOR", "DCU"]);
  const itemTitle = await box(page, TITLE);
  expect(itemTitle.x).toBeCloseTo(items[0].x + 52 + 12, 1);
  expect(itemTitle.width).toBe(140);
  const META = `${ITEM} [data-slot="assignee-bulk-item-meta"]`;
  await expect(page.locator(META)).toHaveText([
    "2026-09-22 10:13:07 · 압축기 흡입압력 · 편성 402 · 2호차 · 미조치",
    "2026-09-17 15:18:07 · 냉각수 유량 · 편성 407 · 7호차 · 조치완료",
  ]);
  expect((await box(page, META)).x).toBeCloseTo(itemTitle.x + 140 + 12, 1);
  expect((await box(page, META)).height).toBe(20);
  await expect(page.locator(`${ASSIGN} [data-slot="alert-banner"]`)).toHaveCount(0);

  const FORM = `${ASSIGN} [data-slot="assignee-bulk-form"]`;
  const form = await box(page, FORM);
  expect(form.y).toBeCloseTo(targets.y + targets.height + 14, 1);
  expect(form.height).toBeCloseTo(formHeight, 1);
  const TRIGGER = `${FORM} [data-slot="select-trigger"]`;
  await expect(page.locator(TRIGGER)).toHaveText("정비사 선택");
  expect((await measure(page, TRIGGER)).width).toBeCloseTo(
    contentWidth - 2 - SECTION_PADDING_X * 2 - LABEL_WIDTH,
    1,
  );
  const AREA = `${FORM} [data-slot="text-area-input"]`;
  await expect(page.locator(AREA)).toHaveAttribute(
    "placeholder",
    "선택 입력 · 두 건에 같은 코멘트가 남습니다",
  );
  const BUTTON = `${ASSIGN} [data-slot="dialog-footer"] [data-slot="action-button"]`;
  await expect(page.locator(BUTTON)).toHaveText(["취소", "지정"]);

  await footerButton(page, ASSIGN, "지정").click();
  const ERROR = `${FORM} [data-slot="field-error"]`;
  await expect(page.locator(ERROR)).toHaveText("담당자를 선택하세요");
  expect((await measure(page, ERROR)).height).toBe(FIELD_ERROR_HEIGHT);
  await expect(page.locator(ASSIGN)).toBeVisible();
  await page.locator(TRIGGER).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText([
    "정비사 선택 (박기술)",
    "정비사 선택 (이현장)",
    "정비사 선택 (김정비)",
  ]);
  await page.locator(OPEN_ITEMS).nth(1).click();
  await expect(page.locator(TRIGGER)).toHaveText("정비사 선택 (이현장)");
  await expect(page.locator(ERROR)).toHaveCount(0);
  await page.locator(AREA).fill("  ");

  await footerButton(page, ASSIGN, "지정").click();
  await expect(page.locator(ASSIGN)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("2건에 담당자를 지정했습니다.");
  await expect(page.locator(BULK_BAR)).toHaveCount(0);
  expect([await rowCells(page, 1), await rowCells(page, 6)]).toEqual(rowsBefore);
  expect(await kpiValues(page)).toEqual(["24", "16", "8", "19"]);

  await selectRows(page, [0]);
  await bulkButton(page, 1).click();
  await expect(page.locator(`${ASSIGN} [data-slot="dialog-title"]`)).toHaveText("담당자 지정 · 선택 1건");
  await expect(page.locator(TRIGGER)).toHaveText("정비사 선택");
  await expect(page.locator(AREA)).toHaveValue("");
  await expect(page.locator(AREA)).toHaveAttribute(
    "placeholder",
    "선택 입력 · 한 건에 같은 코멘트가 남습니다",
  );
});

test("일괄 확인과 담당자 지정은 지금 보이는 Row 가운데 선택한 건만 대상으로 함", async ({ page }) => {
  await openMeasures(page);
  await selectRows(page, [0, 8]);
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 2건");
  await page.locator(`${FILTER} [data-slot="date-range-trigger"]`).click();
  await page.locator(`${calendarDayCell(RANGE_CALENDAR, "2026-09-17")} button`).click();
  await page.locator(`${calendarDayCell(RANGE_CALENDAR, "2026-09-23")} button`).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(RANGE_CALENDAR)).toHaveCount(0);
  await expect(page.locator(BODY_ROW)).toHaveCount(8);
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 1건");

  await bulkButton(page, 1).click();
  await expect(page.locator(`${ASSIGN} [data-slot="dialog-title"]`)).toHaveText("담당자 지정 · 선택 1건");
  await expect(page.locator(`${ASSIGN} [data-slot="assignee-bulk-item-title"]`)).toHaveText([
    "DRIVING_GEAR",
  ]);
  await page.keyboard.press("Escape");
  await expect(page.locator(ASSIGN)).toHaveCount(0);

  await bulkButton(page, 0).click();
  await expect(page.locator(`${BULK} [data-slot="alert-dialog-title"]`)).toHaveText(
    "선택한 1건을 조치완료로 바꿀까요?",
  );
  await expect(page.locator(`${BULK} [data-slot="alert-dialog-description"]`)).toContainText(
    "DRIVING_GEAR 이상 센서 1건의",
  );
});

test("Modal은 닫기 Button, 취소, Esc로 닫히고 Focus가 Modal 안에 머물다가 연 Button으로 돌아옴", async ({
  page,
}) => {
  await openMeasures(page);

  await openAction(page, 1);
  await expect(page.locator(ACTION)).toHaveAttribute("role", "dialog");
  const titleId = await page.locator(`${ACTION} [data-slot="dialog-title"]`).getAttribute("id");
  await expect(page.locator(ACTION)).toHaveAttribute("aria-labelledby", titleId ?? "");
  expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("닫기");
  const order: string[] = [];
  for (let step = 0; step < 7; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, ACTION)).toBe(true);
    order.push(await focusedSlot(page));
  }
  expect(order).toEqual([
    "toggle-group-item",
    "date-range-trigger",
    "text-area-input",
    "toggle-group-item",
    "action-button",
    "action-button",
    "dialog-close",
  ]);
  for (let step = 0; step < 7; step += 1) {
    await pressTab(page, "Shift+Tab");
    expect(await focusIsInside(page, ACTION)).toBe(true);
  }
  await page.mouse.click(10, 1070);
  await page.waitForTimeout(200);
  await expect(page.locator(ACTION)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(ACTION)).toHaveCount(0);
  await expect(processButton(page, 1)).toBeFocused();
  await openAction(page, 2);
  await page.locator(`${ACTION} [data-slot="dialog-close"]`).click();
  await expect(page.locator(ACTION)).toHaveCount(0);
  await expect(processButton(page, 2)).toBeFocused();
  await openAction(page, 2);
  await footerButton(page, ACTION, "취소").click();
  await expect(page.locator(ACTION)).toHaveCount(0);

  const openButton = page.locator(FILTER).getByRole("button", { name: "조치 전·후 비교" });
  await openCompare(page);
  await expect.poll(() => focusIsInside(page, COMPARE)).toBe(true);
  await page.mouse.click(10, 1070);
  await expect(page.locator(COMPARE)).toHaveCount(0);
  await openCompare(page);
  await footerButton(page, COMPARE, "닫기").click();
  await expect(page.locator(COMPARE)).toHaveCount(0);
  await expect(openButton).toBeFocused();
  await actionDateButton(page, 0).click();
  await expect(page.locator(COMPARE)).toBeVisible();
  await expect.poll(() => focusIsInside(page, COMPARE)).toBe(true);
  for (let step = 0; step < 12; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, COMPARE)).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(COMPARE)).toHaveCount(0);
  await expect(actionDateButton(page, 0)).toBeFocused();

  await selectRows(page, [1]);
  await bulkButton(page, 0).click();
  await expect(page.locator(BULK)).toBeVisible();
  await expect.poll(() => focusIsInside(page, BULK)).toBe(true);
  await page.mouse.click(10, 1070);
  await page.waitForTimeout(200);
  await expect(page.locator(BULK)).toBeVisible();
  await page.locator(`${BULK} [data-slot="alert-dialog-cancel"]`).click();
  await expect(page.locator(BULK)).toHaveCount(0);
  await expect(bulkButton(page, 0)).toBeFocused();

  await bulkButton(page, 1).click();
  await expect(page.locator(ASSIGN)).toBeVisible();
  await page.mouse.click(10, 1070);
  await page.waitForTimeout(200);
  await expect(page.locator(ASSIGN)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(ASSIGN)).toHaveCount(0);
  await expect(bulkButton(page, 1)).toBeFocused();
});

test("닫힌 Modal이 사라지는 동안 다른 종류의 Modal을 열어도 앞 Modal의 대상은 그대로임", async ({ page }) => {
  await openMeasures(page);

  await selectRows(page, [1, 2]);
  await bulkButton(page, 0).click();
  await expect(page.locator(BULK)).toBeVisible();
  const BULK_TEXT = `${BULK} [data-slot="alert-dialog-title"], ${BULK} [data-slot="alert-dialog-description"]`;
  const openedBulk = await texts(page, BULK_TEXT);
  expect(openedBulk[0]).toBe("선택한 2건을 조치완료로 바꿀까요?");
  const closingBulk = await textWhileClosing(page, {
    close: { selector: `${BULK} button`, label: "취소" },
    open: { selector: `${BULK_BAR} button`, label: "담당자 지정" },
    read: BULK_TEXT,
  });
  expect(closingBulk).toEqual(openedBulk);
  await expect(page.locator(ASSIGN)).toBeVisible();
  await expect(page.locator(BULK)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator(ASSIGN)).toHaveCount(0);

  await openAction(page, 1);
  const TARGET_VALUES = `${ACTION} [data-slot="measure-action-target"] [data-slot="key-value-row-value"]`;
  const openedTarget = await texts(page, TARGET_VALUES);
  expect(openedTarget).toHaveLength(4);
  const closingTarget = await textWhileClosing(page, {
    close: { selector: `${ACTION} [data-slot="dialog-footer"] button`, label: "취소" },
    open: { selector: `${FILTER} button`, label: "조치 전·후 비교" },
    read: TARGET_VALUES,
  });
  expect(closingTarget).toEqual(openedTarget);
  await expect(page.locator(COMPARE)).toBeVisible();
  await expect(page.locator(ACTION)).toHaveCount(0);
});

test("다크 Theme에서 Modal과 확인 Dialog의 Color", async ({ page }) => {
  await openMeasures(page);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const token = (name: string) => color(page, `var(--${name})`);
  const background = async (selector: string, index = 0) =>
    (await measure(page, selector, index)).style.backgroundColor;
  const textColor = async (selector: string, index = 0) =>
    (await measure(page, selector, index)).style.color;
  const borderColor = async (selector: string, index = 0) =>
    (await measure(page, selector, index)).style.borderTopColor;

  await openAction(page, 1);
  await page.waitForTimeout(300);
  expect(await background('[data-slot="dialog-overlay"]')).toBe(await token("scrim"));
  expect(await background(ACTION)).toBe(await token("dialog"));
  expect(await borderColor(ACTION)).toBe(await token("border"));
  expect(await background(`${ACTION} [data-slot="measure-action-target"]`)).toBe(await token("surface-low"));
  expect(await borderColor(`${ACTION} [data-slot="measure-action-target"]`)).toBe(await token("border"));
  expect(await textColor(`${ACTION} [data-slot="key-value-row-label"]`)).toBe(await token("muted-fg"));
  expect(await textColor(`${ACTION} [data-slot="key-value-row-value"]`)).toBe(await token("fg"));
  expect((await measure(page, `${ACTION} [data-slot="key-value-row"]`)).style.borderBottomColor).toBe(
    await token("border"),
  );
  const ITEM = `${ACTION} [data-slot="toggle-group-item"]`;
  expect(await background(`${ACTION} [data-slot="segmented"]`)).toBe(await token("muted"));
  expect(await background(ITEM, 0)).toBe(await token("card"));
  expect(await textColor(ITEM, 0)).toBe(await token("fg"));
  expect(await textColor(ITEM, 1)).toBe(await token("muted-fg"));
  const TRIGGER = `${ACTION} [data-slot="date-range-trigger"]`;
  expect(await background(TRIGGER)).toBe(await token("card"));
  expect(await borderColor(TRIGGER)).toBe(await token("border"));
  expect(await textColor(TRIGGER)).toBe(await token("fg"));
  expect(await background(`${ACTION} [data-slot="text-area-input"]`)).toBe(await token("card"));
  const BUTTON = `${ACTION} [data-slot="dialog-footer"] [data-slot="action-button"]`;
  expect(await background(BUTTON, 0)).toBe(await token("card"));
  expect(await borderColor(BUTTON, 0)).toBe(await token("border"));
  expect(await background(BUTTON, 1)).toBe(await token("primary"));
  expect(await textColor(BUTTON, 1)).toBe(await token("on-primary"));
  await page.locator(TRIGGER).click();
  await expect(page.locator(CALENDAR)).toBeVisible();
  await page.waitForTimeout(300);
  expect(await background(PICKER)).toBe(await token("card"));
  expect(await borderColor(PICKER)).toBe(await token("border"));
  expect(await borderColor(TRIGGER)).toBe(await token("brand-line4"));
  expect(await background(`${calendarDayCell(CALENDAR, "2026-09-23")} button`)).toBe(await token("primary"));
  expect(await textColor(`${calendarDayCell(CALENDAR, "2026-09-23")} button`)).toBe(await token("on-primary"));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.locator(ACTION)).toHaveCount(0);

  await openCompare(page);
  await page.waitForTimeout(300);
  expect(await background(COMPARE)).toBe(await token("dialog"));
  expect(await background(`${COMPARE_SELECT}`, 0)).toBe(await token("card"));
  expect(await borderColor(`${COMPARE_SELECT}`, 0)).toBe(await token("border"));
  expect(await textColor(`${COMPARE_SELECT}`, 2)).toBe(await token("fg"));
  expect(await background(BASE_DATE)).toBe(await token("card"));
  expect(await borderColor(BASE_DATE)).toBe(await token("border"));
  expect(await textColor(BASE_DATE)).toBe(await token("fg"));
  expect(await textColor(`${COMPARE} [data-slot="measure-effect-description"]`)).toBe(await token("muted-fg"));
  expect(await background(COMPARE_TABLE)).toBe(await token("card"));
  expect(await background(`${COMPARE_TABLE} thead [data-slot="table-row"]`)).toBe(await token("muted"));
  expect(await background(COMPARE_EMPTY)).toBe(await token("card"));
  expect(await borderColor(COMPARE_EMPTY)).toBe(await token("border"));
  expect(await background(`${COMPARE_EMPTY} [data-slot="empty-state-icon"]`)).toBe(
    await token("brand-line4-muted"),
  );
  expect(await textColor(`${COMPARE_EMPTY} [data-slot="empty-state-icon"]`)).toBe(
    await token("brand-on-line4-subtle"),
  );
  expect(await textColor(`${COMPARE_EMPTY} [data-slot="empty-state-description"]`)).toBe(
    await token("muted-fg"),
  );
  await compareButton(page).click();
  await expect(page.locator(COMPARE_ROW)).toHaveCount(6);
  expect(await background(TILE, 0)).toBe(await token("card"));
  expect(await borderColor(TILE, 0)).toBe(await token("border"));
  expect(await textColor(`${TILE} [data-slot="measure-effect-tile-value"]`, 0)).toBe(await token("fg"));
  expect(await textColor(`${TILE} [data-slot="measure-effect-tile-value"]`, 2)).toBe(await token("success"));
  expect(await background(`${COMPARE_ROW} [data-slot="ratio-bar-track"]`, 0)).toBe(
    await token("brand-line4-subtle"),
  );
  expect(await background(`${COMPARE_ROW} [data-slot="ratio-bar-track"]`, 1)).toBe(
    await token("warning-subtle"),
  );
  expect(await textColor(`${COMPARE_ROW} [data-slot="ratio-bar-label"]`, 0)).toBe(await token("fg"));
  const CHANGE = `${COMPARE_ROW} [data-slot="measure-effect-change"]`;
  expect(await textColor(CHANGE, 0)).toBe(await token("success"));
  expect(await textColor(CHANGE, 3)).toBe(await token("danger"));
  expect(await textColor(CHANGE, 5)).toBe(await token("fg"));
  expect(await textColor(COMPARE_FOOT)).toBe(await token("muted-fg"));
  await page.keyboard.press("Escape");
  await expect(page.locator(COMPARE)).toHaveCount(0);

  await selectRows(page, [1]);
  await bulkButton(page, 0).click();
  await expect(page.locator(BULK)).toBeVisible();
  await page.waitForTimeout(300);
  expect(await background(BULK)).toBe(await token("surface-low"));
  expect(await background(`${BULK} [data-slot="alert-dialog-media"]`)).toBe(await token("brand-line4-subtle"));
  expect(await textColor(`${BULK} [data-slot="alert-dialog-media"]`)).toBe(await token("primary"));
  expect(await background(`${BULK} [data-slot="alert-dialog-cancel"]`)).toBe(await token("card"));
  expect(await borderColor(`${BULK} [data-slot="alert-dialog-cancel"]`)).toBe(await token("border"));
  expect(await background(`${BULK} [data-slot="alert-dialog-action"]`)).toBe(await token("primary"));
  expect(await textColor(`${BULK} [data-slot="alert-dialog-action"]`)).toBe(await token("on-primary"));
  await page.keyboard.press("Escape");

  await bulkButton(page, 1).click();
  await expect(page.locator(ASSIGN)).toBeVisible();
  await page.waitForTimeout(300);
  expect(await background(`${ASSIGN} [data-slot="assignee-bulk-targets"]`)).toBe(await token("surface-low"));
  expect(await textColor(`${ASSIGN} [data-slot="assignee-bulk-list-title"]`)).toBe(
    await token("brand-line4-text"),
  );
  expect(await textColor(`${ASSIGN} [data-slot="assignee-bulk-item-meta"]`)).toBe(await token("muted-fg"));
});

test("기본 Font 크기를 2배로 하면 Modal과 확인 Dialog의 크기도 2배임", async ({ page }) => {
  await openMeasures(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page.waitForTimeout(400);

  await openAction(page, 1);
  await page.waitForTimeout(400);
  const frame = await box(page, ACTION);
  expect(frame.width).toBe(ACTION_WIDTH * 2);
  expect(frame.height).toBe(1080 - 128);
  const frameStyle = (await measure(page, ACTION)).style;
  expect(frameStyle.paddingTop).toBe("32px");
  expect(frameStyle.borderTopWidth).toBe("2px");
  expect(frameStyle.borderTopLeftRadius).toBe("32px");
  const BODY = `${ACTION} [data-slot="modal-body-scroll"]`;
  const scroll = await page.evaluate((selector) => {
    const body = document.querySelector(selector) as HTMLElement;
    return [body.scrollHeight, body.clientHeight];
  }, BODY);
  expect(scroll[0]).toBe((ACTION_TARGET_HEIGHT + 14 + ACTION_FORM_HEIGHT) * 2);
  expect(scroll[1]).toBe(1080 - 128 - (34 + 36 + 14 + 14 + 32) * 2);
  expect((await measure(page, `${ACTION} [data-slot="key-value-row"]`)).height).toBe(KEY_VALUE_HEIGHT * 2);
  const row = (await measure(page, `${ACTION} [data-slot="key-value-row"]`)).style;
  expect(row.fontSize).toBe("28px");
  expect(row.borderBottomWidth).toBe("2px");
  const segmented = await measure(page, `${ACTION} [data-slot="segmented"]`);
  expect(segmented.height).toBe(64);
  expect(segmented.style.paddingTop).toBe("4px");
  expect((await measure(page, `${ACTION} [data-slot="toggle-group-item"]`)).height).toBe(56);
  const TRIGGER = `${ACTION} [data-slot="date-range-trigger"]`;
  const trigger = await measure(page, TRIGGER);
  expect(trigger.width).toBe(440);
  expect(trigger.height).toBe(64);
  expect(trigger.style.columnGap).toBe("16px");
  expect(trigger.style.borderTopWidth).toBe("2px");
  expect((await box(page, `${TRIGGER} svg`)).width).toBe(36);
  await page.locator(TRIGGER).click();
  await expect(page.locator(CALENDAR)).toBeVisible();
  await page.waitForTimeout(400);
  const popupBox = await box(page, PICKER);
  expect(popupBox.y).toBeGreaterThanOrEqual(0);
  expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(1080);
  await expect(page.locator(PICKER)).toHaveAttribute("data-side", "top");
  expect(await enterTranslate(page, PICKER)).toEqual(["0", "calc(0*100%)"]);
  const day = await box(page, `${calendarDayCell(CALENDAR, "2026-09-23")} button`);
  expect(day.width).toBe(72);
  expect(day.height).toBe(80);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.locator(ACTION)).toHaveCount(0);

  await openCompare(page);
  await page.waitForTimeout(400);
  expect((await box(page, COMPARE)).width).toBe(1920 - 128);
  expect((await boxes(page, COMPARE_SELECT)).map((select) => select.width)).toEqual([
    272, 168, 240, 240, 240, 256,
  ]);
  expect((await box(page, BASE_DATE)).width).toBe(256);
  expect((await measure(page, COMPARE_EMPTY)).height).toBe(600);
  expect((await measure(page, `${COMPARE_EMPTY} [data-slot="empty-state-icon"]`)).width).toBe(112);
  await compareButton(page).click();
  await expect(page.locator(COMPARE_ROW)).toHaveCount(6);
  await page.waitForTimeout(400);
  expect((await boxes(page, TILE)).map((tile) => tile.height)).toEqual([194, 194, 200]);
  expect((await measure(page, COMPARE_ROW)).height).toBe(88);
  expect((await measure(page, `${COMPARE_ROW} [data-slot="ratio-bar-track"]`)).width).toBe(180);
  expect((await measure(page, `${COMPARE_ROW} [data-slot="ratio-bar-label"]`)).width).toBe(104);
  expect((await measure(page, `${COMPARE_TABLE} thead [data-slot="table-row"]`)).height).toBe(88);
  await page.keyboard.press("Escape");
  await expect(page.locator(COMPARE)).toHaveCount(0);

  await selectRows(page, [1]);
  await bulkButton(page, 0).click();
  await expect(page.locator(BULK)).toBeVisible();
  await page.waitForTimeout(400);
  expect((await box(page, BULK)).width).toBe(CONFIRM_WIDTH * 2);
  expect((await measure(page, `${BULK} [data-slot="alert-dialog-media"]`)).width).toBe(88);
  expect((await measure(page, `${BULK} [data-slot="alert-dialog-action"]`)).height).toBe(80);
});

const SCALE_SCENES: { name: string; modalSlots: number; open: (page: Page) => Promise<void> }[] = [
  {
    name: "이상 센서 조치 · 조치일 달력",
    modalSlots: 116,
    open: async (page) => {
      await openAction(page, 1);
      await page.locator(`${ACTION} [data-slot="date-range-trigger"]`).click();
      await expect(page.locator(CALENDAR)).toBeVisible();
    },
  },
  {
    name: "조치 효과 비교 결과",
    modalSlots: 147,
    open: async (page) => {
      await openCompare(page);
      await compareButton(page).click();
      await expect(page.locator(COMPARE_ROW)).toHaveCount(6);
    },
  },
];

for (const scene of SCALE_SCENES) {
  test(`3840×2160 화면의 Modal은 1920×1080 화면의 2배임 (${scene.name})`, async ({ page }) => {
    const openScene = async (width: number, height: number) => {
      await openMeasures(page, width, height);
      await expect(page.locator('[data-slot="session-chip-remaining"]')).not.toHaveText("--:--");
      await scene.open(page);
      await page.waitForTimeout(500);
    };
    await openScene(1920, 1080);
    const base = await collectSlotRects(page);
    await openScene(3840, 2160);
    const doubled = await collectSlotRects(page);

    expect(doubled.map((rect) => rect.slot)).toEqual(base.map((rect) => rect.slot));
    const firstOverlay = base.findIndex((rect) => rect.slot.endsWith("dialog-overlay"));
    expect(firstOverlay).toBeGreaterThan(0);
    expect(base.length - firstOverlay).toBeGreaterThanOrEqual(scene.modalSlots);
    expect(doubledMismatches(base, doubled)).toEqual([]);
  });
}

test("움직임 줄이기를 켜면 Modal, 확인 Dialog, Calendar는 크기와 위치 변화 없이 Fade만 적용됨", async ({
  page,
}) => {
  await openMeasures(page);
  await openAction(page, 1);
  expect(await enterMotion(page, ACTION)).toEqual(["enter", "0.1s", "1", "0"]);
  await page.locator(`${ACTION} [data-slot="date-range-trigger"]`).click();
  await expect(page.locator(PICKER)).toBeVisible();
  const [, reducedTranslateY] = await enterTranslate(page, PICKER);
  expect([...(await enterMotion(page, PICKER)), reducedTranslateY]).toEqual(["enter", "0.1s", "1", "0", "calc(0*-100%)"]);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.locator(ACTION)).toHaveCount(0);
  await openCompare(page);
  expect(await enterMotion(page, COMPARE)).toEqual(["enter", "0.1s", "1", "0"]);
  await page.keyboard.press("Escape");
  await expect(page.locator(COMPARE)).toHaveCount(0);
  await selectRows(page, [1]);
  await bulkButton(page, 0).click();
  await expect(page.locator(BULK)).toBeVisible();
  expect(await enterMotion(page, BULK)).toEqual(["enter", "0.1s", "1", "0"]);
});

test.describe("움직임 줄이기를 끈 화면", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("Modal, 확인 Dialog, Calendar가 기본 움직임으로 표시되고 끝난 위치는 같음", async ({ page }) => {
    await openMeasures(page);
    await openAction(page, 1);
    expect(await enterMotion(page, ACTION)).toEqual(["enter", "0.1s", ".95", "0"]);
    await page.waitForTimeout(400);
    const frame = await box(page, ACTION);
    expect(frame.width).toBe(ACTION_WIDTH);
    expect(frame.x).toBe((1920 - ACTION_WIDTH) / 2);
    expect(frame.y).toBe((1080 - ACTION_HEIGHT) / 2);
    await page.locator(`${ACTION} [data-slot="date-range-trigger"]`).click();
    await expect(page.locator(PICKER)).toBeVisible();
    const [, translateY] = await enterTranslate(page, PICKER);
    expect([...(await enterMotion(page, PICKER)), translateY]).toEqual(["enter", "0.1s", ".95", "0", "calc(2*.25rem*-1)"]);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(page.locator(ACTION)).toHaveCount(0);

    await selectRows(page, [1]);
    await bulkButton(page, 0).click();
    await expect(page.locator(BULK)).toBeVisible();
    expect(await enterMotion(page, BULK)).toEqual(["enter", "0.1s", ".95", "0"]);
  });
});

test("계산 함수의 조치 Modal 처음 값, 저장할 값, 이상 비율과 변화 판정", () => {
  const base: Measure = {
    id: "1",
    occurredAt: "2026-09-20T12:15:07",
    deviceCode: "ECU",
    sensorName: "베어링 온도",
    actualValue: 0.75,
    expectedValue: 0.29,
    errorValue: 0.46,
    formation: "404",
    car: 4,
    actionYn: "Y",
    inspectionYn: "N",
    actionDate: "2026-09-21",
    actionNote: null,
  };
  expect(createMeasureActionDraft(base, "2026-09-23")).toEqual({
    actionYn: "Y",
    inspectionYn: "N",
    actionDate: "2026-09-21",
    actionNote: "",
  });
  expect(
    createMeasureActionDraft({ ...base, actionYn: "N", actionDate: null, actionNote: "점검" }, "2026-09-23"),
  ).toEqual({ actionYn: "N", inspectionYn: "N", actionDate: "2026-09-23", actionNote: "점검" });
  expect(
    toMeasureActionInput({ actionYn: "Y", inspectionYn: "Y", actionDate: "2026-09-22", actionNote: "  교체 " }),
  ).toEqual({ actionYn: "Y", inspectionYn: "Y", actionDate: "2026-09-22", actionNote: "교체" });
  expect(
    toMeasureActionInput({ actionYn: "N", inspectionYn: "N", actionDate: "2026-09-22", actionNote: "   " }),
  ).toEqual({ actionYn: "N", inspectionYn: "N", actionDate: null, actionNote: null });

  expect(windowRatePercent({ anomalyCount: 284, windowCount: 2000 })).toBeCloseTo(14.2, 10);
  expect(windowRatePercent({ anomalyCount: 3, windowCount: 0 })).toBe(0);
  const at = (anomalyCount: number) => ({ anomalyCount, windowCount: 2000 });
  const decreased = compareWindowCounts(at(100), at(70), 30);
  expect(decreased).toMatchObject({ kind: "rate", level: "improved" });
  expect((decreased as { percent: number }).percent).toBe(((70 - 100) / 100) * 100);
  expect(compareWindowCounts(at(100), at(71), 30)).toMatchObject({ level: "steady" });
  const increased = compareWindowCounts(at(100), at(130), 30);
  expect(increased).toMatchObject({ kind: "rate", level: "worsened" });
  expect((increased as { percent: number }).percent).toBe(((130 - 100) / 100) * 100);
  expect(compareWindowCounts(at(100), at(129), 30)).toMatchObject({ level: "steady" });
  expect(compareWindowCounts(at(0), at(5), 30)).toEqual({ kind: "appeared" });
  expect(compareWindowCounts(at(0), at(0), 30)).toEqual({ kind: "rate", percent: 0, level: "steady" });
  expect(
    compareWindowCounts({ anomalyCount: 100, windowCount: 1000 }, { anomalyCount: 100, windowCount: 2000 }, 30),
  ).toMatchObject({ kind: "rate", level: "improved" });

  const rated = rateMeasureEffectComparison({
    beforePeriod: { from: "2026-09-12", to: "2026-09-16" },
    afterPeriod: { from: "2026-09-18", to: "2026-09-22" },
    before: at(248),
    after: at(64),
    rows: [{ formation: "401", car: 1, locationCode: "4011-T-2-True", before: at(46), after: at(96) }],
    locationCount: 12,
    changeThresholdPercent: 30,
    rateScaleMaxPercent: 15,
  });
  expect(rated.before).toEqual({ anomalyCount: 248, windowCount: 2000, ratePercent: 12.4 });
  expect(rated.change).toMatchObject({ kind: "rate", level: "improved" });
  expect(rated.rows[0].after.ratePercent).toBeCloseTo(4.8, 10);
  expect(rated.rows[0].change).toMatchObject({ kind: "rate", level: "worsened" });
  expect(Math.round((rated.rows[0].change as { percent: number }).percent)).toBe(109);
});

test("계산 함수에서 window가 없는 기간이 있으면 변화는 자료 없음으로 판정함", () => {
  const counted = (anomalyCount: number) => ({ anomalyCount, windowCount: 2000 });
  const empty = { anomalyCount: 0, windowCount: 0 };
  expect(compareWindowCounts(counted(46), empty, 30)).toEqual({ kind: "noData" });
  expect(compareWindowCounts(empty, counted(5), 30)).toEqual({ kind: "noData" });
  expect(compareWindowCounts(empty, empty, 30)).toEqual({ kind: "noData" });
  const rated = rateMeasureEffectComparison({
    beforePeriod: { from: "2026-09-18", to: "2026-09-22" },
    afterPeriod: { from: "2026-09-24", to: "2026-09-28" },
    before: counted(248),
    after: empty,
    rows: [{ formation: "401", car: 1, locationCode: "4011-T-2-True", before: counted(46), after: empty }],
    locationCount: 12,
    changeThresholdPercent: 30,
    rateScaleMaxPercent: 15,
  });
  expect(rated.change).toEqual({ kind: "noData" });
  expect(rated.rows[0].change).toEqual({ kind: "noData" });
  expect(rated.after).toEqual({ anomalyCount: 0, windowCount: 0, ratePercent: 0 });
});

test("계산 함수에서 조치일이 없는 완료 건은 이상 센서 조치의 조치일을 발생일로 채움", () => {
  const completed: Measure = {
    id: "1",
    occurredAt: "2026-09-20T12:15:07",
    deviceCode: "ECU",
    sensorName: "베어링 온도",
    actualValue: 0.75,
    expectedValue: 0.29,
    errorValue: 0.46,
    formation: "404",
    car: 4,
    actionYn: "Y",
    inspectionYn: "N",
    actionDate: null,
    actionNote: null,
  };
  expect(createMeasureActionDraft(completed, "2026-09-23").actionDate).toBe("2026-09-20");
  expect(createMeasureActionDraft({ ...completed, actionYn: "N" }, "2026-09-23").actionDate).toBe(
    "2026-09-23",
  );
  expect(
    createMeasureActionDraft({ ...completed, actionDate: "2026-09-21" }, "2026-09-23").actionDate,
  ).toBe("2026-09-21");
});

test("계산 함수에서 전후 비율 순 Sort는 이상 수가 아니라 이상 비율로 비교함", () => {
  const higherRate = { anomalyCount: 100, windowCount: 1000 };
  const moreAnomalies = { anomalyCount: 150, windowCount: 2000 };
  expect(compareWindowRates(higherRate, moreAnomalies)).toBeGreaterThan(0);
  expect(compareWindowRates(moreAnomalies, higherRate)).toBeLessThan(0);
  expect(compareWindowRates(higherRate, { anomalyCount: 200, windowCount: 2000 })).toBe(0);
  expect(
    compareWindowRates({ anomalyCount: 284, windowCount: 2000 }, { anomalyCount: 270, windowCount: 2000 }),
  ).toBeGreaterThan(0);
  const empty = { anomalyCount: 0, windowCount: 0 };
  expect(compareWindowRates(empty, { anomalyCount: 5, windowCount: 2000 })).toBeLessThan(0);
  expect(compareWindowRates(empty, { anomalyCount: 0, windowCount: 2000 })).toBe(0);
});

test("고정 표기의 조치 효과 비교 변화 이름", () => {
  expect(measureEffectAppearedLabel).toBe("새로 생김");
});

test("고정 표기의 조치 효과 비교 Sort 이름과 순서", () => {
  expect(measureEffectSortKeys).toEqual(["change", "before", "after", "formation"]);
  expect(measureEffectSortKeys.map((key) => measureEffectSortLabels[key].label)).toEqual([
    "변화 큰 순",
    "전 비율 순",
    "후 비율 순",
    "편성·호차 순",
  ]);
  expect(measureEffectSortKeys.map((key) => measureEffectSortLabels[key].description)).toEqual([
    "변화가 큰 순(비율 크기 반영)",
    "전 비율 높은 순",
    "후 비율 높은 순",
    "편성·호차 순",
  ]);
});

test("Mock 조회 함수의 Modal 선택지, 처음 값, 조치 효과 비교", async () => {
  expect(await fetchMeasureActionOptions()).toEqual({
    actionStates: ["N", "Y"],
    inspectionStates: ["N", "Y"],
    defaultActionDate: isoDaysAgo(0),
    selectableActionDates: { from: null, to: null },
  });
  expect(await fetchMeasureAssignees()).toEqual(["박기술", "이현장", "김정비"]);
  const options = await fetchMeasureEffectOptions();
  expect(options).toEqual({
    deviceCodes: ["AXLE_BEARING", "CMSB", "DCU"],
    modelCodes: ["IF", "SVM", "VAE", "PCA"],
    formations: ["401", "402", "403", "404", "405"],
    cars: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    dayCounts: [3, 5, 7, 14],
    sortKeys: ["change", "before", "after", "formation"],
    defaultConditions: {
      deviceCode: "AXLE_BEARING",
      modelCode: "VAE",
      formation: null,
      car: null,
      baseDate: isoDaysAgo(6),
      dayCount: 5,
    },
    defaultSort: "change",
    selectableBaseDates: { from: null, to: null },
  });

  const base = { ...options.defaultConditions, baseDate: "2026-09-17", sort: "change" as const };
  const fleet = await fetchMeasureEffectComparison(base);
  expect(fleet.beforePeriod).toEqual({ from: "2026-09-12", to: "2026-09-16" });
  expect(fleet.afterPeriod).toEqual({ from: "2026-09-18", to: "2026-09-22" });
  expect(fleet.before).toEqual({ anomalyCount: 248, windowCount: 2000 });
  expect(fleet.after).toEqual({ anomalyCount: 64, windowCount: 2000 });
  expect(fleet.rows.map((row) => row.locationCode)).toEqual([
    "4010-H-1-False",
    "4024-T-2-True",
    "4023-H-1-False",
    "4011-T-2-True",
    "4036-H-1-False",
    "4037-T-2-True",
  ]);
  expect(fleet.locationCount).toBe(12);
  expect(fleet.changeThresholdPercent).toBe(30);
  expect(fleet.rateScaleMaxPercent).toBe(15);
  const order = async (sort: "before" | "after" | "formation") =>
    (await fetchMeasureEffectComparison({ ...base, sort })).rows.map((row) => `${row.formation}·${row.car}`);
  expect(await order("before")).toEqual(["401·0", "402·4", "402·3", "403·7", "403·6", "401·1"]);
  expect(await order("after")).toEqual(["403·7", "401·1", "402·3", "401·0", "402·4", "403·6"]);
  expect(await order("formation")).toEqual(["401·0", "401·1", "402·3", "402·4", "403·6", "403·7"]);
  const formation = await fetchMeasureEffectComparison({ ...base, formation: "402" });
  expect(formation.before).toEqual({ anomalyCount: 506, windowCount: 4000 });
  expect(formation.after).toEqual({ anomalyCount: 120, windowCount: 4000 });
  const short = await fetchMeasureEffectComparison({ ...base, formation: "402", car: 4, dayCount: 3 });
  expect(short.rows).toEqual([
    {
      formation: "402",
      car: 4,
      locationCode: "4024-T-2-True",
      before: { anomalyCount: 162, windowCount: 1200 },
      after: { anomalyCount: 31, windowCount: 1200 },
    },
  ]);
  expect(short.beforePeriod).toEqual({ from: "2026-09-14", to: "2026-09-16" });
  const none = await fetchMeasureEffectComparison({ ...base, formation: "404" });
  expect(none.rows).toEqual([]);
  expect(none.before).toEqual({ anomalyCount: 0, windowCount: 2000 });
});
