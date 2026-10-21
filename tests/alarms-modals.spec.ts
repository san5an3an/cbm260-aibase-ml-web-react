import { expect, test, type Page } from "@playwright/test";
import { color, isoDaysAgo, measure, visibleShadow } from "./helpers/measure";
import { requestedActions, setMockActions } from "./helpers/mockActions";
import {
  MODAL_BORDER,
  MODAL_GAP,
  MODAL_HEADER_HEIGHT,
  MODAL_PADDING,
  SECTION_PADDING_X,
  SECTION_PADDING_Y,
  box,
  boxes,
  collectSlotRects,
  confirmDialog,
  doubledMismatches,
  enterMotion,
  expectButton,
  expectModalFrame,
  expectSection,
  expectSentenceLines,
  focusIsInside,
  iconShape,
  modal,
  pressTab,
  shownIconShape,
  styleOf,
  texts,
} from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const FILTER = '[data-slot="alarm-filter-bar"]';
const KPI = '[data-slot="alarm-kpi-row"] [data-slot="kpi-stat"]';
const WORKLIST = '[data-slot="alarm-worklist-card"]';
const BODY_ROW = `${WORKLIST} tbody [data-slot="table-row"]`;
const BULK_BAR = `${WORKLIST} [data-slot="bulk-bar"]`;
const SEGMENT = '[data-slot="chart-stack-segment"]';
const TOAST = '[data-slot="toast"]';
const OPEN_ITEMS = '[data-slot="select-content"][data-open] [data-slot="select-item"]';

const CREATE = modal("alarm-create");
const PROCESS = modal("alarm-process");
const ASSIGN = modal("assignee-bulk");
const RULES = modal("alarm-rules");
const RULE_EDIT = modal("alarm-rule-edit");
const ALARM_DELETE = confirmDialog("alarm-delete");
const RULE_DELETE = confirmDialog("alarm-rule-delete");

const CREATE_WIDTH = 1080;
const PROCESS_WIDTH = 1000;
const ASSIGN_WIDTH = 760;
const RULES_WIDTH = 1000;
const RULE_EDIT_WIDTH = 720;
const CONFIRM_WIDTH = 520;

const LABEL_WIDTH_MD = 110;
const LABEL_GAP_MD = 4;
const LABEL_WIDTH_LG = 136;
const ROW_HEIGHT = 36;
const CONTROL_HEIGHT = 32;
const FIELD_ERROR_HEIGHT = 23;
const textAreaHeight = (rows: number) => rows * 20 + 20 + 2;
const BANNER_HEIGHT = 44;
const INPUT_FOCUS_SHADOW = "rgb(0, 164, 227) 0px 0px 0px 1px, rgb(229, 246, 253) 0px 0px 0px 4px";
const SOFT_OVERLAY = "rgba(7, 21, 31, 0.55)";
const TOAST_SHADOW = "rgba(7, 21, 31, 0.16) 0px 8px 24px 0px";
const TOAST_TIMEOUT = 2600;

const DEVICE_NAMES = [
  "차상신호장치",
  "차축 베어링",
  "축전지",
  "주공기 압축기",
  "출입문장치",
  "드라이빙 기어",
  "제동장치",
  "엔코더",
  "이더넷스위치",
  "화재감지장치",
  "배전반",
  "주간제어기",
  "공기질개선장치",
  "냉방장치",
  "방송장치",
  "표시기장치",
  "보조전원장치",
  "열차 종합 제어 장치",
  "견인 전동기",
  "무정전장치",
  "추진제어장치",
];
const MODEL_CODES = ["IF", "SVM", "VAE", "PCA"];

async function openAlarms(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto("/dashboard/alarms");
  await expect(page.locator(SEGMENT).first()).toBeVisible();
}

const filterButton = (page: Page, index: number) =>
  page.locator(`${FILTER} [data-slot="action-button"]`).nth(index);
const rowButton = (page: Page, row: number, index: number) =>
  page.locator(BODY_ROW).nth(row).locator('[data-slot="action-button"]').nth(index);
const footerButton = (page: Page, root: string, label: string) =>
  page.locator(`${root} [data-slot="dialog-footer"]`).getByRole("button", { name: label, exact: true });

async function openCreate(page: Page): Promise<void> {
  await filterButton(page, 2).click();
  await expect(page.locator(CREATE)).toBeVisible();
}

async function openRules(page: Page): Promise<void> {
  await filterButton(page, 1).click();
  await expect(page.locator(RULES)).toBeVisible();
}

async function openProcess(page: Page, row: number): Promise<void> {
  await rowButton(page, row, 0).click();
  await expect(page.locator(PROCESS)).toBeVisible();
}

async function openAssign(page: Page, rows: number[]): Promise<void> {
  for (const row of rows) {
    await page.locator(BODY_ROW).nth(row).locator('[data-slot="checkbox"]').click();
  }
  await page.locator(`${BULK_BAR} [data-slot="action-button"]`).nth(1).click();
  await expect(page.locator(ASSIGN)).toBeVisible();
}

const ruleCellIndex = (deviceIndex: number, modelIndex: number) =>
  1 + deviceIndex * MODEL_CODES.length + modelIndex;
const ruleCell = (page: Page, deviceIndex: number, modelIndex: number) =>
  page.locator(`${RULES} [data-slot="rule-cell"]`).nth(ruleCellIndex(deviceIndex, modelIndex));

async function selectOption(page: Page, trigger: string, label: string): Promise<void> {
  await page.locator(trigger).click();
  await page.locator(OPEN_ITEMS).filter({ hasText: label }).first().click();
  await expect(page.locator(OPEN_ITEMS)).toHaveCount(0);
}

async function rowTexts(page: Page, row: number): Promise<string[]> {
  return page
    .locator(BODY_ROW)
    .nth(row)
    .locator('[data-slot="table-cell"]')
    .allTextContents();
}

async function kpiValues(page: Page): Promise<string[]> {
  return texts(page, `${KPI} [data-slot="kpi-stat-value"]`);
}

async function expectInput(
  page: Page,
  selector: string,
  index = 0,
  textColor = "var(--fg)",
): Promise<void> {
  const input = await measure(page, selector, index);
  expect(input.height).toBe(CONTROL_HEIGHT);
  expect(input.style.borderTopWidth).toBe("1px");
  expect(input.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(input.style.borderTopLeftRadius).toBe("6px");
  expect(input.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(input.style.fontSize).toBe("14px");
  expect(input.style.color).toBe(await color(page, textColor));
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`Alarm 등록 Modal의 크기, 배치, Text, Color 확인 (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await openAlarms(page, viewport.width, viewport.height);
    await openCreate(page);

    const rightColumnHeight = ROW_HEIGHT * 4 + textAreaHeight(3) + 12 * 4;
    const sectionHeight = rightColumnHeight + SECTION_PADDING_Y * 2 + 2;
    const { header, contentWidth } = await expectModalFrame(page, "alarm-create", {
      width: CREATE_WIDTH,
      height: 36 + 14 + sectionHeight + 14 + 32 + 34,
      title: "알람 등록",
    });

    const body = await box(page, `${CREATE} [data-slot="modal-body-scroll"]`);
    expect(body.x).toBeCloseTo(header.x - 4, 1);
    expect(body.width).toBeCloseTo(contentWidth + 8, 1);
    expect(body.y).toBeCloseTo(header.y + header.height + 14, 1);
    const bodyStyle = (await measure(page, `${CREATE} [data-slot="modal-body-scroll"]`)).style;
    expect(bodyStyle.paddingLeft).toBe("4px");
    expect(bodyStyle.marginLeft).toBe("-4px");
    expect(bodyStyle.rowGap).toBe("14px");
    await expect(page.locator(`${CREATE} [data-slot="alert-banner"]`)).toHaveCount(0);

    const FORM = `${CREATE} [data-slot="alarm-create-form"]`;
    const form = await box(page, FORM);
    expect(form.x).toBeCloseTo(header.x, 1);
    expect(form.width).toBeCloseTo(contentWidth, 1);
    expect(form.height).toBeCloseTo(sectionHeight, 1);
    await expectSection(page, FORM);
    expect((await measure(page, FORM)).style.columnGap).toBe("24px");

    const columnsWidth = contentWidth - 2 - SECTION_PADDING_X * 2 - 24;
    const leftWidth = (columnsWidth * 1.95) / 2.95;
    const rightWidth = columnsWidth / 2.95;
    const rows = await boxes(page, `${FORM} [data-slot="form-row"]`);
    expect(rows).toHaveLength(10);
    const leftX = form.x + 1 + SECTION_PADDING_X;
    const rightX = leftX + leftWidth + 24;
    const top = form.y + 1 + SECTION_PADDING_Y;
    rows.forEach((row, index) => {
      const isLeft = index < 5;
      const order = isLeft ? index : index - 5;
      expect(row.x).toBeCloseTo(isLeft ? leftX : rightX, 1);
      expect(row.width).toBeCloseTo(isLeft ? leftWidth : rightWidth, 1);
      expect(row.y).toBeCloseTo(top + order * (ROW_HEIGHT + 12), 1);
      expect(row.height).toBeCloseTo(index === 9 ? textAreaHeight(3) : ROW_HEIGHT, 1);
    });

    const LABEL = `${FORM} [data-slot="field-label"]`;
    await expect(page.locator(LABEL)).toHaveText([
      "장치*",
      "모델*",
      "세그먼트",
      "편성*",
      "호차*",
      "심각도*",
      "이상비율*",
      "발생시각*",
      "담당자",
      "코멘트",
    ]);
    const labels = await boxes(page, LABEL);
    const contents = await boxes(page, `${FORM} [data-slot="field-content"]`);
    labels.forEach((label, index) => {
      expect(label.height).toBe(40);
      expect(label.y).toBeCloseTo(rows[index].y - 4, 1);
      expect(label.x).toBeCloseTo(rows[index].x, 1);
      expect(contents[index].x).toBeCloseTo(rows[index].x + LABEL_WIDTH_MD + LABEL_GAP_MD, 1);
      expect(contents[index].width).toBeCloseTo(
        rows[index].width - LABEL_WIDTH_MD - LABEL_GAP_MD,
        1,
      );
    });
    const label = (await measure(page, LABEL)).style;
    expect(label.fontSize).toBe("14px");
    expect(label.fontWeight).toBe("700");
    expect(label.color).toBe(await color(page, "var(--fg)"));
    const mark = (await measure(page, `${LABEL} > span`)).style;
    expect(mark.color).toBe(await color(page, "var(--danger)"));
    expect(mark.paddingLeft).toBe("2px");
    await expect(page.locator(`${LABEL} > span`)).toHaveCount(7);

    const TRIGGER = `${FORM} [data-slot="select-trigger"]`;
    await expect(page.locator(TRIGGER)).toHaveText(["ATC", "IF"]);
    for (const index of [0, 1]) {
      await expectInput(page, TRIGGER, index);
      const trigger = await measure(page, TRIGGER, index);
      expect(trigger.width).toBeCloseTo(leftWidth - LABEL_WIDTH_MD - LABEL_GAP_MD, 1);
      expect(trigger.style.paddingLeft).toBe("12px");
      expect(trigger.style.paddingRight).toBe("10px");
      expect(trigger.style.columnGap).toBe("8px");
    }
    const arrow = await measure(page, `${TRIGGER} svg`);
    expect(arrow.width).toBe(18);
    expect(arrow.style.color).toBe(await color(page, "var(--muted-fg)"));
    expect(await shownIconShape(page, TRIGGER)).toBe(iconShape("KeyboardArrowDown"));

    const INPUT = `${FORM} [data-slot="text-input"]`;
    await expect(page.locator(INPUT)).toHaveCount(6);
    for (let index = 0; index < 6; index += 1) await expectInput(page, INPUT, index);
    const plainInputs = page.locator(`${FORM} input[data-slot="text-input"]`);
    await expect(plainInputs).toHaveCount(5);
    expect(
      await plainInputs.evaluateAll((inputs) =>
        inputs.map((input) => [
          (input as HTMLInputElement).placeholder,
          (input as HTMLInputElement).value,
        ]),
      ),
    ).toEqual([
      ["default", "default"],
      ["401 ~ 426", ""],
      ["1 ~ 10", ""],
      ["YYYY-MM-DD HH:MM:SS", ""],
      ["정비사 ID", ""],
    ]);
    const plainInput = (await measure(page, `${FORM} input[data-slot="text-input"]`)).style;
    expect(plainInput.paddingLeft).toBe("12px");
    expect(plainInput.paddingRight).toBe("12px");
    expect(await styleOf(page, `${FORM} input[data-slot="text-input"]`, "color", 1)).toBe(
      await color(page, "var(--fg)"),
    );
    expect(
      await page.evaluate(
        (selector) =>
          getComputedStyle(document.querySelectorAll(selector)[1], "::placeholder").color,
        `${FORM} input[data-slot="text-input"]`,
      ),
    ).toBe(await color(page, "darkgray"));

    const RATE = `${FORM} div[data-slot="text-input"]`;
    const rate = await box(page, RATE);
    const rateInput = page.locator(`${RATE} input`);
    await expect(rateInput).toHaveAttribute("placeholder", "0 ~ 100");
    const unit = await measure(page, `${RATE} [data-slot="text-input-unit"]`);
    const unitBox = await box(page, `${RATE} [data-slot="text-input-unit"]`);
    await expect(page.locator(`${RATE} [data-slot="text-input-unit"]`)).toHaveText("%");
    expect(unit.style.fontSize).toBe("14px");
    expect(unit.style.color).toBe(await color(page, "var(--muted-fg)"));
    expect(rate.x + rate.width - (unitBox.x + unitBox.width)).toBeCloseTo(12, 1);
    expect((await box(page, `${RATE} input`)).x).toBeCloseTo(rate.x + 1, 1);
    expect((await measure(page, `${RATE} input`)).style.paddingLeft).toBe("12px");

    const SEGMENTED = `${FORM} [data-slot="segmented"]`;
    const segmented = await measure(page, SEGMENTED);
    const segmentedBox = await box(page, SEGMENTED);
    expect(segmented.height).toBe(32);
    expect(segmented.width).toBeCloseTo(rightWidth - LABEL_WIDTH_MD - LABEL_GAP_MD, 1);
    expect(segmented.style.paddingTop).toBe("2px");
    expect(segmented.style.paddingLeft).toBe("2px");
    expect(segmented.style.columnGap).toBe("2px");
    expect(segmented.style.borderTopLeftRadius).toBe("8px");
    expect(segmented.style.backgroundColor).toBe(await color(page, "var(--muted)"));
    const ITEM = `${SEGMENTED} [data-slot="toggle-group-item"]`;
    await expect(page.locator(ITEM)).toHaveText(["LOW", "MID", "HIGH", "CRIT"]);
    const items = await boxes(page, ITEM);
    const itemWidth = (segmentedBox.width - 4 - 2 * 3) / 4;
    for (const [index, item] of items.entries()) {
      expect(item.width).toBeCloseTo(itemWidth, 1);
      expect(item.height).toBe(28);
      expect(item.x).toBeCloseTo(segmentedBox.x + 2 + index * (itemWidth + 2), 1);
      const style = (await measure(page, ITEM, index)).style;
      const isSelected = index === 1;
      expect(style.borderTopLeftRadius).toBe("6px");
      expect(style.fontSize).toBe("14px");
      expect(style.fontWeight).toBe(isSelected ? "600" : "400");
      expect(style.color).toBe(await color(page, isSelected ? "var(--fg)" : "var(--muted-fg)"));
      expect(style.backgroundColor).toBe(
        isSelected ? await color(page, "var(--card)") : "rgba(0, 0, 0, 0)",
      );
      expect(visibleShadow(style.boxShadow)).toBe(
        isSelected ? "rgba(11, 31, 46, 0.12) 0px 1px 2px 0px" : "none",
      );
      await expect(page.locator(ITEM).nth(index)).toHaveAttribute(
        "aria-pressed",
        String(isSelected),
      );
    }

    const AREA = `${FORM} [data-slot="text-area-input"]`;
    const area = await measure(page, AREA);
    expect(area.height).toBe(textAreaHeight(3));
    expect(area.style.paddingTop).toBe("10px");
    expect(area.style.paddingLeft).toBe("14px");
    expect(area.style.lineHeight).toBe("20px");
    expect(area.style.fontSize).toBe("14px");
    expect(area.style.borderTopLeftRadius).toBe("6px");
    expect(area.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(area.style.backgroundColor).toBe(await color(page, "var(--card)"));
    await expect(page.locator(AREA)).toHaveAttribute("placeholder", "선택 입력");
    expect(await styleOf(page, AREA, "resize")).toBe("none");

    const note = await measure(page, `${CREATE} [data-slot="modal-footnote"]`);
    await expect(page.locator(`${CREATE} [data-slot="modal-footnote"]`)).toHaveText(
      "상태는 신규(NEW)로 등록됩니다",
    );
    expect(note.style.fontSize).toBe("12px");
    expect(note.style.color).toBe(await color(page, "var(--muted-fg)"));
    const BUTTON = `${CREATE} [data-slot="dialog-footer"] [data-slot="action-button"]`;
    await expect(page.locator(BUTTON)).toHaveText(["취소", "등록"]);
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
    const buttons = await boxes(page, BUTTON);
    expect(buttons[1].x + buttons[1].width).toBeCloseTo(header.x + contentWidth, 1);
    expect(buttons[1].x - (buttons[0].x + buttons[0].width)).toBeCloseTo(8, 1);
    expect((await measure(page, BUTTON, 1)).style.columnGap).toBe("6px");
    expect((await box(page, `${BUTTON} svg`)).width).toBe(18);
    expect(await shownIconShape(page, BUTTON, 1)).toBe(iconShape("Check"));
  });
}

test("Alarm 등록의 Input 검증과, 등록하면 List와 KPI에 반영됨", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await openCreate(page);
  const FORM = `${CREATE} [data-slot="alarm-create-form"]`;
  const BANNER = `${CREATE} [data-slot="alert-banner"]`;
  const ERROR = `${FORM} [data-slot="field-error"]`;
  const formation = page.locator(`${FORM} input[data-slot="text-input"]`).nth(1);
  const car = page.locator(`${FORM} input[data-slot="text-input"]`).nth(2);
  const rate = page.locator(`${FORM} div[data-slot="text-input"] input`);
  const occurredAt = page.locator(`${FORM} input[data-slot="text-input"]`).nth(3);
  const assignee = page.locator(`${FORM} input[data-slot="text-input"]`).nth(4);
  const submit = footerButton(page, CREATE, "등록");

  await submit.click();
  await expect(page.locator(BANNER)).toHaveText(
    "입력값 3개를 확인하세요. 표시된 칸을 수정하면 등록할 수 있습니다.",
  );
  await expect(page.locator(BANNER)).toHaveAttribute("role", "alert");
  const banner = await measure(page, BANNER);
  expect(banner.height).toBe(BANNER_HEIGHT);
  expect(banner.style.minHeight).toBe("44px");
  expect(banner.style.paddingTop).toBe("10px");
  expect(banner.style.paddingLeft).toBe("16px");
  expect(banner.style.columnGap).toBe("10px");
  expect(banner.style.borderTopLeftRadius).toBe("8px");
  expect(banner.style.borderTopWidth).toBe("0px");
  expect(banner.style.fontSize).toBe("14px");
  expect(banner.style.fontWeight).toBe("500");
  expect(banner.style.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect(banner.style.color).toBe(await color(page, "var(--on-danger-subtle)"));
  const bannerIcon = await measure(page, `${BANNER} svg`);
  expect(bannerIcon.width).toBe(20);
  expect(bannerIcon.style.color).toBe(await color(page, "var(--on-danger-subtle)"));
  expect(await shownIconShape(page, BANNER)).toBe(iconShape("WarningAmber"));
  const bannerBox = await box(page, BANNER);
  const formBox = await box(page, FORM);
  expect(formBox.y - (bannerBox.y + bannerBox.height)).toBeCloseTo(14, 1);

  await expect(page.locator(ERROR)).toHaveText([
    "편성 번호는 401 ~ 426 사이 3자리입니다",
    "0 ~ 100 사이로 입력하세요",
    "발생시각을 입력하세요",
  ]);
  const error = await measure(page, ERROR);
  expect(error.height).toBe(FIELD_ERROR_HEIGHT);
  expect(error.style.paddingTop).toBe("6px");
  expect(error.style.fontSize).toBe("12px");
  expect(error.style.fontWeight).toBe("700");
  expect(error.style.columnGap).toBe("4px");
  expect(error.style.color).toBe(await color(page, "var(--danger)"));
  expect((await box(page, `${ERROR} svg`)).width).toBe(14);
  expect(await shownIconShape(page, ERROR)).toBe(iconShape("WarningAmber"));
  const rows = await boxes(page, `${FORM} [data-slot="form-row"]`);
  expect(rows[3].height).toBe(CONTROL_HEIGHT + FIELD_ERROR_HEIGHT);
  expect(rows[6].height).toBe(CONTROL_HEIGHT + FIELD_ERROR_HEIGHT);
  expect(rows[7].height).toBe(CONTROL_HEIGHT + FIELD_ERROR_HEIGHT);
  expect(rows[2].height).toBe(ROW_HEIGHT);
  expect((await box(page, CREATE)).height).toBe(438 + BANNER_HEIGHT + 14 + (55 - 36) * 2);

  await page.waitForTimeout(300);
  const dangerColor = await color(page, "var(--danger)");
  for (const selector of [
    `${FORM} input[data-slot="text-input"][aria-invalid="true"]`,
    `${FORM} div[data-slot="text-input"]`,
  ]) {
    const invalid = (await measure(page, selector)).style;
    expect(invalid.borderTopWidth).toBe("2px");
    expect(invalid.borderTopColor).toBe(dangerColor);
  }
  await expect(page.locator(`${FORM} input[aria-invalid="true"]`)).toHaveCount(3);
  await formation.focus();
  await page.waitForTimeout(300);
  const focused = await formation.evaluate((input) => {
    const style = getComputedStyle(input);
    return [style.borderTopWidth, style.borderTopColor, style.boxShadow];
  });
  expect(focused[0]).toBe("1px");
  expect(focused[1]).toBe(await color(page, "var(--brand-line4)"));
  expect(visibleShadow(focused[2])).toBe(INPUT_FOCUS_SHADOW);
  await rate.focus();
  await page.waitForTimeout(300);
  const focusedGroup = (await measure(page, `${FORM} div[data-slot="text-input"]`)).style;
  expect(focusedGroup.borderTopWidth).toBe("1px");
  expect(focusedGroup.borderTopColor).toBe(await color(page, "var(--brand-line4)"));
  expect(visibleShadow(focusedGroup.boxShadow)).toBe(INPUT_FOCUS_SHADOW);

  for (const value of ["400", "427", "40a", "4010", "41"]) {
    await formation.fill(value);
    await expect(page.locator(ERROR).first()).toHaveText("편성 번호는 401 ~ 426 사이 3자리입니다");
  }
  await formation.fill("426");
  await expect(page.locator(ERROR)).toHaveCount(2);
  await expect(page.locator(BANNER)).toHaveText(
    "입력값 2개를 확인하세요. 표시된 칸을 수정하면 등록할 수 있습니다.",
  );
  for (const value of ["101", "-1", "abc"]) {
    await rate.fill(value);
    await expect(page.locator(ERROR).first()).toHaveText("0 ~ 100 사이로 입력하세요");
  }
  await rate.fill("12.5");
  await expect(page.locator(ERROR)).toHaveText(["발생시각을 입력하세요"]);
  await occurredAt.fill("   ");
  await expect(page.locator(ERROR)).toHaveCount(1);
  const occurredText = `${isoDaysAgo(0)} 23:59:59`;
  await occurredAt.fill(occurredText);
  await expect(page.locator(ERROR)).toHaveCount(0);
  await expect(page.locator(BANNER)).toHaveCount(0);

  await page.locator(`${FORM} [data-slot="select-trigger"]`).first().click();
  await expect(page.locator(OPEN_ITEMS)).toHaveCount(21);
  await expect(page.locator(OPEN_ITEMS).first()).toHaveText("ATC");
  await page.locator(OPEN_ITEMS).filter({ hasText: "CMSB" }).click();
  await page.locator(`${FORM} [data-slot="select-trigger"]`).nth(1).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText(["IF", "SVM", "VAE", "PCA"]);
  await page.locator(OPEN_ITEMS).filter({ hasText: "VAE" }).click();
  await expect(page.locator(`${FORM} [data-slot="select-trigger"]`)).toHaveText(["CMSB", "VAE"]);
  const severity = page.locator(`${FORM} [data-slot="toggle-group-item"]`);
  await severity.nth(2).click();
  await expect(severity.nth(2)).toHaveAttribute("aria-pressed", "true");
  await expect(severity.nth(1)).toHaveAttribute("aria-pressed", "false");
  await severity.nth(2).click();
  await expect(severity.nth(2)).toHaveAttribute("aria-pressed", "true");
  await car.fill("3");
  await assignee.fill(" 최점검 ");
  await page.locator(`${FORM} [data-slot="text-area-input"]`).fill("현장 확인 요청");

  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`)).toHaveText([
    "14",
    "5",
    "4",
    "4",
    "4",
  ]);
  await submit.click();
  await expect(page.locator(CREATE)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("알람을 등록했습니다.");
  await expect(page.locator(BODY_ROW)).toHaveCount(11);
  expect(await rowTexts(page, 0)).toEqual([
    "",
    `${isoDaysAgo(0)}23:59:59`,
    "CMSBVAE 모델",
    "편성 426 · 3호차",
    "HIGH",
    "-",
    "12.5%",
    "신규",
    "최점검",
    "처리삭제",
  ]);
  expect(await kpiValues(page)).toEqual(["15", "6", "4", "4", "4"]);

  await openCreate(page);
  await expect(page.locator(BANNER)).toHaveCount(0);
  await expect(page.locator(`${FORM} [data-slot="select-trigger"]`)).toHaveText(["ATC", "IF"]);
  await expect(formation).toHaveValue("");
  await expect(severity.nth(1)).toHaveAttribute("aria-pressed", "true");
  await formation.fill("401");
  await rate.fill("0");
  await occurredAt.fill(`${isoDaysAgo(0)} 23:59:58`);
  await submit.click();
  await expect(page.locator(CREATE)).toHaveCount(0);
  await expect(page.locator(BODY_ROW)).toHaveCount(12);
  expect(await rowTexts(page, 1)).toEqual([
    "",
    `${isoDaysAgo(0)}23:59:58`,
    "ATCIF 모델",
    "편성 401 · 1호차",
    "MID",
    "-",
    "0.0%",
    "신규",
    "-",
    "처리삭제",
  ]);
});

test("Alarm 처리 Modal의 크기, 배치, Text, Color 확인", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await openProcess(page, 2);

  const targetHeight = 24 + SECTION_PADDING_Y * 2 + 2;
  const formHeight = 48 + 12 + ROW_HEIGHT + 12 + textAreaHeight(4) + SECTION_PADDING_Y * 2 + 2;
  const stampHeight = 2 + 24 + 17 + 4 + 20;
  const stampsHeight = stampHeight + SECTION_PADDING_Y * 2 + 2;
  const { header, contentWidth } = await expectModalFrame(page, "alarm-process", {
    width: PROCESS_WIDTH,
    height: 36 + 14 + targetHeight + 14 + formHeight + 14 + stampsHeight + 14 + 32 + 34,
    title: "알람 처리",
  });

  const TARGET = `${PROCESS} [data-slot="alarm-process-target"]`;
  const target = await box(page, TARGET);
  expect(target.x).toBeCloseTo(header.x, 1);
  expect(target.y).toBeCloseTo(header.y + header.height + 14, 1);
  expect(target.width).toBeCloseTo(contentWidth, 1);
  expect(target.height).toBeCloseTo(targetHeight, 1);
  await expectSection(page, TARGET);
  expect((await measure(page, TARGET)).style.columnGap).toBe("12px");
  const severity = await measure(page, `${TARGET} [data-slot="alarm-severity"]`);
  await expect(page.locator(`${TARGET} [data-slot="alarm-severity"]`)).toHaveText("CRIT");
  expect(severity.width).toBe(52);
  expect(severity.height).toBe(24);
  expect(severity.style.borderTopLeftRadius).toBe("4px");
  expect(severity.style.fontSize).toBe("12px");
  expect(severity.style.fontWeight).toBe("700");
  expect(severity.style.letterSpacing).toBe("0.4px");
  expect(severity.style.backgroundColor).toBe(await color(page, "var(--danger)"));
  expect(severity.style.color).toBe(await color(page, "var(--danger-fg)"));
  const targetTitle = await measure(page, `${TARGET} [data-slot="alarm-process-target-title"]`);
  await expect(page.locator(`${TARGET} [data-slot="alarm-process-target-title"]`)).toHaveText(
    "MICOM_COOLER · VAE",
  );
  expect(targetTitle.style.fontSize).toBe("16px");
  expect(targetTitle.style.fontWeight).toBe("700");
  const meta = await measure(page, `${TARGET} [data-slot="alarm-process-target-meta"]`);
  await expect(page.locator(`${TARGET} [data-slot="alarm-process-target-meta"]`)).toHaveText(
    `편성 403 · 3호차 · 이상비율 18.0% · 발생 ${isoDaysAgo(2)} 10:07:14`,
  );
  expect(meta.style.fontSize).toBe("14px");
  expect(meta.style.color).toBe(await color(page, "var(--muted-fg)"));

  const FORM = `${PROCESS} [data-slot="alarm-process-form"]`;
  const form = await box(page, FORM);
  expect(form.y).toBeCloseTo(target.y + target.height + 14, 1);
  expect(form.height).toBeCloseTo(formHeight, 1);
  await expectSection(page, FORM);
  await expect(page.locator(`${FORM} [data-slot="field-label"]`)).toHaveText([
    "상태*",
    "담당자",
    "코멘트",
  ]);
  const rows = await boxes(page, `${FORM} [data-slot="form-row"]`);
  const formTop = form.y + 1 + SECTION_PADDING_Y;
  expect(rows[0].y).toBeCloseTo(formTop, 1);
  expect(rows[0].height).toBe(48);
  expect(rows[1].y).toBeCloseTo(formTop + 48 + 12, 1);
  expect(rows[1].height).toBe(ROW_HEIGHT);
  expect(rows[2].y).toBeCloseTo(formTop + 48 + 12 + ROW_HEIGHT + 12, 1);
  expect(rows[2].height).toBe(textAreaHeight(4));
  const contents = await boxes(page, `${FORM} [data-slot="field-content"]`);
  for (const content of contents) {
    expect(content.x).toBeCloseTo(rows[0].x + LABEL_WIDTH_LG, 1);
    expect(content.width).toBeCloseTo(rows[0].width - LABEL_WIDTH_LG, 1);
  }

  const OPTION = `${FORM} [data-slot="state-option"]`;
  await expect(page.locator(OPTION)).toHaveText(["신규", "확인", "조치중", "해소", "오탐"]);
  const options = await boxes(page, OPTION);
  const ARROW = `${FORM} [data-slot="state-option-arrow"]`;
  const arrows = await boxes(page, ARROW);
  expect(arrows).toHaveLength(3);
  const OR = `${FORM} [role="group"] > span`;
  await expect(page.locator(OR)).toHaveText("또는");
  const or = await box(page, OR);
  const optionWidth = (contents[0].width - 22 * 3 - or.width - 10 * 8) / 5;
  for (const option of options) {
    expect(option.width).toBeCloseTo(optionWidth, 1);
    expect(option.height).toBe(48);
  }
  expect(options[0].x).toBeCloseTo(contents[0].x, 1);
  arrows.forEach((arrow, index) => {
    expect(arrow.width).toBe(22);
    expect(arrow.x).toBeCloseTo(options[index].x + options[index].width + 10, 1);
    expect(options[index + 1].x).toBeCloseTo(arrow.x + arrow.width + 10, 1);
  });
  expect(or.x).toBeCloseTo(options[3].x + options[3].width + 10, 1);
  expect(options[4].x).toBeCloseTo(or.x + or.width + 10, 1);
  expect(options[4].x + options[4].width).toBeCloseTo(contents[0].x + contents[0].width, 1);
  expect((await measure(page, ARROW)).style.color).toBe(await color(page, "var(--border-strong)"));
  expect(await shownIconShape(page, `${FORM} [role="group"]`, 0)).toBe(iconShape("Check"));
  expect(
    await page.evaluate(
      (selector) => document.querySelector(selector)?.querySelector("path")?.getAttribute("d"),
      ARROW,
    ),
  ).toBe(iconShape("ArrowForward"));
  const orStyle = (await measure(page, OR)).style;
  expect(orStyle.fontSize).toBe("12px");
  expect(orStyle.color).toBe(await color(page, "var(--muted-fg)"));
  const optionColors = [
    ["var(--brand-line4-subtle)", "var(--brand-line4-text)", "var(--brand-line4)"],
    ["var(--brand-line4-subtle)", "var(--brand-line4-text)", "var(--brand-line4)"],
    ["var(--primary)", "var(--on-primary)", "var(--primary)"],
    ["var(--card)", "var(--fg)", "var(--border)"],
    ["var(--card)", "var(--fg)", "var(--border)"],
  ];
  for (const [index, [background, text, border]] of optionColors.entries()) {
    const option = (await measure(page, OPTION, index)).style;
    expect(option.backgroundColor).toBe(await color(page, background));
    expect(option.color).toBe(await color(page, text));
    expect(option.borderTopWidth).toBe("1px");
    expect(option.borderTopColor).toBe(await color(page, border));
    expect(option.borderTopLeftRadius).toBe("8px");
    expect(option.fontSize).toBe("14px");
    expect(option.fontWeight).toBe("700");
    expect(option.columnGap).toBe("6px");
    await expect(page.locator(OPTION).nth(index)).toHaveAttribute(
      "aria-pressed",
      String(index === 2),
    );
    await expect(page.locator(OPTION).nth(index).locator("svg")).toHaveCount(index < 2 ? 1 : 0);
  }
  expect((await box(page, `${OPTION} svg`)).width).toBe(16);

  const assignee = page.locator(`${FORM} input[data-slot="text-input"]`);
  await expect(assignee).toHaveValue("박기술");
  await expect(assignee).toHaveAttribute("placeholder", "정비사 ID");
  await expectInput(page, `${FORM} input[data-slot="text-input"]`);
  const AREA = `${FORM} [data-slot="text-area-input"]`;
  await expect(page.locator(AREA)).toHaveValue(
    `냉매 압력 센서 점검 예정. ${isoDaysAgo(-1).slice(5)} 입고 시 교체 여부 판단.`,
  );
  expect((await measure(page, AREA)).height).toBe(textAreaHeight(4));

  const STAMPS = `${PROCESS} [data-slot="alarm-process-stamps"]`;
  const stamps = await box(page, STAMPS);
  expect(stamps.y).toBeCloseTo(form.y + form.height + 14, 1);
  expect(stamps.height).toBeCloseTo(stampsHeight, 1);
  await expectSection(page, STAMPS);
  expect((await measure(page, STAMPS)).style.columnGap).toBe("12px");
  const STAMP = `${STAMPS} [data-slot="alarm-process-stamp"]`;
  const stampBoxes = await boxes(page, STAMP);
  const stampWidth = (contentWidth - 2 - SECTION_PADDING_X * 2 - 12) / 2;
  stampBoxes.forEach((stamp, index) => {
    expect(stamp.width).toBeCloseTo(stampWidth, 1);
    expect(stamp.height).toBe(stampHeight);
    expect(stamp.x).toBeCloseTo(header.x + 1 + SECTION_PADDING_X + index * (stampWidth + 12), 1);
  });
  await expect(page.locator(`${STAMP} > span:first-child`)).toHaveText([
    "확인 시각 · 자동 기록",
    "해소 시각 · 자동 기록",
  ]);
  await expect(page.locator(`${STAMP} [data-slot="alarm-process-stamp-value"]`)).toHaveText([
    `${isoDaysAgo(1)} 09:40:12`,
    "해소 또는 오탐으로 저장하면 기록됩니다",
  ]);
  for (const [index, isRecorded] of [true, false].entries()) {
    const stamp = (await measure(page, STAMP, index)).style;
    expect(stamp.borderTopStyle).toBe(isRecorded ? "solid" : "dashed");
    expect(stamp.borderTopWidth).toBe("1px");
    expect(stamp.borderTopColor).toBe(await color(page, "var(--border-strong)"));
    expect(stamp.borderTopLeftRadius).toBe("10px");
    expect(stamp.paddingTop).toBe("12px");
    expect(stamp.paddingLeft).toBe("14px");
    expect(stamp.rowGap).toBe("4px");
    expect(stamp.backgroundColor).toBe(await color(page, "var(--card)"));
    const value = (
      await measure(page, `${STAMP} [data-slot="alarm-process-stamp-value"]`, index)
    ).style;
    expect(value.fontSize).toBe("14px");
    expect(value.fontWeight).toBe(isRecorded ? "700" : "400");
    expect(value.color).toBe(await color(page, isRecorded ? "var(--fg)" : "var(--muted-fg)"));
  }
  const stampLabel = (await measure(page, `${STAMP} > span:first-child`)).style;
  expect(stampLabel.fontSize).toBe("12px");
  expect(stampLabel.color).toBe(await color(page, "var(--muted-fg)"));

  const BUTTON = `${PROCESS} [data-slot="dialog-footer"] [data-slot="action-button"]`;
  await expect(page.locator(BUTTON)).toHaveText(["삭제", "취소", "저장"]);
  await expectButton(page, BUTTON, {
    height: 32,
    paddingX: 16,
    weight: "600",
    background: "var(--danger)",
    text: "var(--danger-fg)",
  });
  await expectButton(
    page,
    BUTTON,
    { height: 32, paddingX: 16, weight: "600", background: "var(--card)", text: "var(--fg)", border: "var(--border)" },
    1,
  );
  await expectButton(
    page,
    BUTTON,
    { height: 32, paddingX: 16, weight: "600", background: "var(--primary)", text: "var(--on-primary)" },
    2,
  );
  const buttons = await boxes(page, BUTTON);
  expect(buttons[0].x).toBeCloseTo(header.x, 1);
  expect(buttons[2].x + buttons[2].width).toBeCloseTo(header.x + contentWidth, 1);
  expect(buttons[2].x - (buttons[1].x + buttons[1].width)).toBeCloseTo(8, 1);
  expect(await shownIconShape(page, BUTTON, 2)).toBe(iconShape("Check"));
});

test("Alarm 처리에서 상태를 바꿔 저장하면 List와 KPI에 반영됨", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await openProcess(page, 0);
  const OPTION = `${PROCESS} [data-slot="state-option"]`;
  const VALUE = `${PROCESS} [data-slot="alarm-process-stamp-value"]`;
  const STAMP = `${PROCESS} [data-slot="alarm-process-stamp"]`;
  const pressed = () =>
    page.locator(OPTION).evaluateAll((options) =>
      options.map((option) => (option as HTMLElement).dataset.progress),
    );

  expect(await pressed()).toEqual(["current", "idle", "idle", "idle", "idle"]);
  await expect(page.locator(VALUE)).toHaveText([
    "확인으로 저장하면 기록됩니다",
    "해소 또는 오탐으로 저장하면 기록됩니다",
  ]);
  expect((await measure(page, STAMP, 0)).style.borderTopStyle).toBe("dashed");
  await expect(page.locator(`${PROCESS} input[data-slot="text-input"]`)).toHaveValue("");

  await page.locator(OPTION).nth(1).click();
  expect(await pressed()).toEqual(["past", "current", "idle", "idle", "idle"]);
  await expect(page.locator(VALUE)).toHaveText([
    "저장하면 기록됩니다",
    "해소 또는 오탐으로 저장하면 기록됩니다",
  ]);
  await page.locator(OPTION).nth(4).click();
  expect(await pressed()).toEqual(["past", "past", "past", "idle", "current"]);
  await expect(page.locator(VALUE)).toHaveText(["저장하면 기록됩니다", "저장하면 기록됩니다"]);
  await page.locator(OPTION).nth(4).click();
  expect(await pressed()).toEqual(["past", "past", "past", "idle", "current"]);
  await page.locator(OPTION).nth(3).click();
  expect(await pressed()).toEqual(["past", "past", "past", "current", "idle"]);

  await page.locator(`${PROCESS} input[data-slot="text-input"]`).fill("김정비");
  await page.locator(`${PROCESS} [data-slot="text-area-input"]`).fill("필터 교체 완료");
  expect(await kpiValues(page)).toEqual(["14", "5", "4", "4", "4"]);
  await footerButton(page, PROCESS, "저장").click();
  await expect(page.locator(PROCESS)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("알람을 저장했습니다.");
  const saved = await rowTexts(page, 0);
  expect(saved[7]).toBe("해소");
  expect(saved[8]).toBe("김정비");
  expect(await kpiValues(page)).toEqual(["13", "4", "4", "5", "4"]);

  await openProcess(page, 0);
  expect(await pressed()).toEqual(["past", "past", "past", "current", "idle"]);
  await expect(page.locator(`${PROCESS} input[data-slot="text-input"]`)).toHaveValue("김정비");
  await expect(page.locator(`${PROCESS} [data-slot="text-area-input"]`)).toHaveValue(
    "필터 교체 완료",
  );
  const stamped = await texts(page, VALUE);
  for (const [index, value] of stamped.entries()) {
    expect(value).toMatch(new RegExp(`^${isoDaysAgo(0)} \\d{2}:\\d{2}:\\d{2}$`));
    expect((await measure(page, STAMP, index)).style.borderTopStyle).toBe("solid");
  }
  await page.locator(OPTION).nth(0).click();
  await footerButton(page, PROCESS, "취소").click();
  await expect(page.locator(PROCESS)).toHaveCount(0);
  expect((await rowTexts(page, 0))[7]).toBe("해소");
});

test("Alarm 처리에서 담당자는 앞뒤 공백을 빼고 저장하고 공백뿐이면 담당자 없음으로 저장됨", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  const input = page.locator(`${PROCESS} input[data-slot="text-input"]`);
  const assigneeText = async () => (await rowTexts(page, 1))[8];

  await openProcess(page, 1);
  await expect(input).toHaveValue("이현장");
  await input.fill("   ");
  await footerButton(page, PROCESS, "저장").click();
  await expect(page.locator(PROCESS)).toHaveCount(0);
  await expect.poll(assigneeText).toBe("-");
  await openProcess(page, 1);
  await expect(input).toHaveValue("");

  await input.fill("  최점검  ");
  await footerButton(page, PROCESS, "저장").click();
  await expect(page.locator(PROCESS)).toHaveCount(0);
  await expect.poll(assigneeText).toBe("최점검");
  await openProcess(page, 1);
  await expect(input).toHaveValue("최점검");
});

test("담당자 지정에서 Comment는 앞뒤 공백을 빼고 저장하고 공백뿐이면 기존 Comment가 유지됨", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  const FORM = `${ASSIGN} [data-slot="assignee-bulk-form"]`;
  const comment = page.locator(`${PROCESS} [data-slot="text-area-input"]`);
  await openProcess(page, 2);
  const seeded = `냉매 압력 센서 점검 예정. ${isoDaysAgo(-1).slice(5)} 입고 시 교체 여부 판단.`;
  await expect(comment).toHaveValue(seeded);
  await page.keyboard.press("Escape");
  await expect(page.locator(PROCESS)).toHaveCount(0);

  await openAssign(page, [2]);
  await selectOption(page, `${FORM} [data-slot="select-trigger"]`, "김정비");
  await page.locator(`${FORM} [data-slot="text-area-input"]`).fill("   ");
  await footerButton(page, ASSIGN, "지정").click();
  await expect(page.locator(ASSIGN)).toHaveCount(0);
  await expect.poll(async () => (await rowTexts(page, 2))[8]).toBe("김정비");
  await openProcess(page, 2);
  await expect(comment).toHaveValue(seeded);
  await page.keyboard.press("Escape");
  await expect(page.locator(PROCESS)).toHaveCount(0);

  await openAssign(page, [2]);
  await selectOption(page, `${FORM} [data-slot="select-trigger"]`, "박기술");
  await page.locator(`${FORM} [data-slot="text-area-input"]`).fill("  입고 후 교체  ");
  await footerButton(page, ASSIGN, "지정").click();
  await expect(page.locator(ASSIGN)).toHaveCount(0);
  await expect.poll(async () => (await rowTexts(page, 2))[8]).toBe("박기술");
  await openProcess(page, 2);
  await expect(comment).toHaveValue("입고 후 교체");
});

async function expectDeleteLines(page: Page): Promise<void> {
  const description = page.locator(`${ALARM_DELETE} [data-slot="alert-dialog-description"]`);
  expect((await description.evaluate((element) => element.textContent ?? "")).split("\n")).toHaveLength(3);
  expect((await description.boundingBox())?.height).toBe(60);
}

async function expectConfirmDialog(
  page: Page,
  selector: string,
  expected: { title: string; description: string },
): Promise<void> {
  await expect(page.locator(selector)).toBeVisible();
  await expect(page.locator(selector)).toHaveAttribute("role", "alertdialog");
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("창 크기 없음");

  const overlay = await measure(page, '[data-slot="alert-dialog-overlay"]');
  expect(overlay.width).toBe(viewport.width);
  expect(overlay.height).toBe(viewport.height);
  expect(overlay.style.backgroundColor).toBe(await color(page, "var(--scrim)"));
  expect(await styleOf(page, '[data-slot="alert-dialog-overlay"]', "backdrop-filter")).toBe("none");

  const descriptionHeight = (await box(page, `${selector} [data-slot="alert-dialog-description"]`))
    .height;
  expect(descriptionHeight % 20).toBe(0);
  const height = 50 + 44 + 4 + 10 + 28 + 10 + descriptionHeight + 10 + 48;
  const frame = await box(page, selector);
  expect(frame.width).toBe(CONFIRM_WIDTH);
  expect(frame.height).toBe(height);
  expect(frame.x).toBeCloseTo((viewport.width - CONFIRM_WIDTH) / 2, 1);
  expect(frame.y).toBeCloseTo((viewport.height - height) / 2, 1);
  const style = (await measure(page, selector)).style;
  expect(style.backgroundColor).toBe(await color(page, "var(--surface-low)"));
  expect(style.borderTopWidth).toBe("1px");
  expect(style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(style.borderTopLeftRadius).toBe("16px");
  expect(style.paddingTop).toBe("24px");
  expect(style.paddingLeft).toBe("24px");
  expect(visibleShadow(style.boxShadow)).toBe("rgba(0, 0, 0, 0.3) 0px 24px 64px 0px");

  const MEDIA = `${selector} [data-slot="alert-dialog-media"]`;
  const media = await measure(page, MEDIA);
  const mediaBox = await box(page, MEDIA);
  expect(media.width).toBe(44);
  expect(media.height).toBe(44);
  expect(mediaBox.x).toBeCloseTo(frame.x + 25, 1);
  expect(mediaBox.y).toBeCloseTo(frame.y + 25, 1);
  expect(media.style.borderTopLeftRadius).toBe("50%");
  expect(media.style.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect(media.style.color).toBe(await color(page, "var(--danger)"));
  expect((await box(page, `${MEDIA} svg`)).width).toBe(22);
  expect(await shownIconShape(page, MEDIA)).toBe(iconShape("DeleteForever"));

  const TITLE = `${selector} [data-slot="alert-dialog-title"]`;
  await expect(page.locator(TITLE)).toHaveText(expected.title);
  const title = await measure(page, TITLE);
  const titleBox = await box(page, TITLE);
  expect(titleBox.y).toBeCloseTo(mediaBox.y + 44 + 4 + 10, 1);
  expect(titleBox.x).toBeCloseTo(frame.x + 25, 1);
  expect(title.style.fontSize).toBe("22px");
  expect(title.style.lineHeight).toBe("28px");
  expect(title.style.fontWeight).toBe("500");
  expect(title.style.textAlign).toBe("left");

  const DESCRIPTION = `${selector} [data-slot="alert-dialog-description"]`;
  await expect(page.locator(DESCRIPTION)).toHaveText(expected.description);
  const description = await measure(page, DESCRIPTION);
  const descriptionBox = await box(page, DESCRIPTION);
  expect(descriptionBox.y).toBeCloseTo(titleBox.y + 28 + 10, 1);
  expect(description.style.fontSize).toBe("14px");
  expect(description.style.lineHeight).toBe("20px");
  expect(description.style.color).toBe(await color(page, "var(--muted-fg)"));

  const CANCEL = `${selector} [data-slot="alert-dialog-cancel"]`;
  const ACTION = `${selector} [data-slot="alert-dialog-action"]`;
  await expect(page.locator(CANCEL)).toHaveText("취소");
  await expect(page.locator(ACTION)).toHaveText("삭제");
  await expectButton(page, CANCEL, {
    height: 40,
    paddingX: 16,
    weight: "600",
    background: "var(--card)",
    text: "var(--fg)",
    border: "var(--border)",
  });
  await expectButton(page, ACTION, {
    height: 40,
    paddingX: 16,
    weight: "600",
    background: "var(--danger)",
    text: "var(--on-primary)",
  });
  const cancel = await box(page, CANCEL);
  const action = await box(page, ACTION);
  expect(cancel.y).toBeCloseTo(descriptionBox.y + descriptionBox.height + 10 + 8, 1);
  expect(action.x + action.width).toBeCloseTo(frame.x + CONFIRM_WIDTH - 25, 1);
  expect(action.x - (cancel.x + cancel.width)).toBeCloseTo(8, 1);
  expect(action.y + action.height).toBeCloseTo(frame.y + height - 25, 1);
}

test("Alarm 삭제에서 Row의 삭제는 확인 Dialog를 거쳐 실행됨", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await page.locator(BODY_ROW).nth(1).locator('[data-slot="checkbox"]').click();
  await page.locator(BODY_ROW).nth(3).locator('[data-slot="checkbox"]').click();
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 2건");
  await rowButton(page, 1, 1).click();

  await expectConfirmDialog(page, ALARM_DELETE, {
    title: "알람을 삭제할까요?",
    description: `ECU · SVM · ${isoDaysAgo(1)} 09:06:07 알람이 삭제됩니다.\n삭제한 알람은 되돌릴 수 없습니다.\n오탐이라면 삭제 대신 상태를 오탐으로 바꾸세요.`,
  });
  await expectDeleteLines(page);
  await expect(page.locator(BODY_ROW)).toHaveCount(10);
  await page.mouse.click(40, 40);
  await expect(page.locator(ALARM_DELETE)).toBeVisible();
  await page.locator(`${ALARM_DELETE} [data-slot="alert-dialog-cancel"]`).click();
  await expect(page.locator(ALARM_DELETE)).toHaveCount(0);
  await expect(page.locator(BODY_ROW)).toHaveCount(10);
  await expect(page.locator(TOAST)).toHaveCount(0);
  await rowButton(page, 1, 1).click();
  await expect(page.locator(ALARM_DELETE)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(ALARM_DELETE)).toHaveCount(0);
  await expect(page.locator(BODY_ROW)).toHaveCount(10);

  expect(await kpiValues(page)).toEqual(["14", "5", "4", "4", "4"]);
  await rowButton(page, 1, 1).click();
  await page.locator(`${ALARM_DELETE} [data-slot="alert-dialog-action"]`).click();
  await expect(page.locator(ALARM_DELETE)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("알람을 삭제했습니다.");
  await expect(page.locator(BODY_ROW)).toHaveCount(9);
  expect((await rowTexts(page, 1))[2]).toBe("MICOM_COOLERVAE 모델");
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 1건");
  expect(await kpiValues(page)).toEqual(["13", "5", "4", "4", "4"]);
});

test("Alarm 삭제에서 처리 Modal의 삭제는 Modal 위에 확인을 띄우고 삭제하면 Modal도 닫힘", async ({
  page,
}) => {
  await openAlarms(page, 1920, 1080);
  await openProcess(page, 2);
  await footerButton(page, PROCESS, "삭제").click();
  await expectConfirmDialog(page, ALARM_DELETE, {
    title: "알람을 삭제할까요?",
    description: `MICOM_COOLER · VAE · ${isoDaysAgo(2)} 10:07:14 알람이 삭제됩니다.\n삭제한 알람은 되돌릴 수 없습니다.\n오탐이라면 삭제 대신 상태를 오탐으로 바꾸세요.`,
  });
  await expectDeleteLines(page);
  await expect(page.locator(PROCESS)).toBeVisible();
  expect(
    await page.evaluate(() => {
      const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      return top?.closest("[data-dialog]")?.getAttribute("data-dialog") ?? null;
    }),
  ).toBe("alarm-delete");
  expect(
    await page.evaluate(() => {
      const top = document.elementFromPoint(innerWidth / 2 - 400, innerHeight / 2);
      return (top as HTMLElement | null)?.dataset.slot ?? null;
    }),
  ).toBe("alert-dialog-overlay");

  await page.keyboard.press("Escape");
  await expect(page.locator(ALARM_DELETE)).toHaveCount(0);
  await expect(page.locator(PROCESS)).toBeVisible();
  await expect(page.locator(BODY_ROW)).toHaveCount(10);

  await footerButton(page, PROCESS, "삭제").click();
  await page.locator(`${ALARM_DELETE} [data-slot="alert-dialog-action"]`).click();
  await expect(page.locator(ALARM_DELETE)).toHaveCount(0);
  await expect(page.locator(PROCESS)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("알람을 삭제했습니다.");
  await expect(page.locator(BODY_ROW)).toHaveCount(9);
  expect((await rowTexts(page, 2))[2]).toBe("MICOM_AIRPURIFIERPCA 모델");
  expect(await kpiValues(page)).toEqual(["13", "5", "3", "4", "4"]);
});

test("Alarm 삭제에서 확인을 겹쳐 Click해도 Request는 한 번만 호출되고(바로 응답할 때, 기다리는 동안 모두), 취소와 Esc는 Request가 0건임", async ({
  page,
}) => {
  await openAlarms(page, 1920, 1080);
  const action = page.locator(`${ALARM_DELETE} [data-slot="alert-dialog-action"]`);
  await rowButton(page, 1, 1).click();
  await page.locator(`${ALARM_DELETE} [data-slot="alert-dialog-cancel"]`).click();
  await expect(page.locator(ALARM_DELETE)).toHaveCount(0);
  await rowButton(page, 1, 1).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(ALARM_DELETE)).toHaveCount(0);
  expect(await requestedActions(page)).toEqual([]);

  await rowButton(page, 1, 1).click();
  await action.dblclick();
  await expect(page.locator(ALARM_DELETE)).toHaveCount(0);
  await expect(page.locator(BODY_ROW)).toHaveCount(9);
  await page.waitForTimeout(300);
  expect(await requestedActions(page)).toEqual([{ name: "deleteAlarm", target: "2" }]);
  await expect(page.locator(TOAST)).toHaveCount(1);
  await expect(page.locator(TOAST)).toHaveText("알람을 삭제했습니다.");

  await setMockActions(page, { delayMs: 1500 });
  await rowButton(page, 1, 1).click();
  await action.dblclick();
  await expect(action).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  await action.click({ force: true });
  await expect(page.locator(ALARM_DELETE)).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator(BODY_ROW)).toHaveCount(8);
  await page.waitForTimeout(300);
  expect(await requestedActions(page)).toEqual([
    { name: "deleteAlarm", target: "2" },
    { name: "deleteAlarm", target: "3" },
  ]);
});

test("담당자 지정 Modal의 크기, 배치, Text, Color 확인과 지정하면 List에 반영됨", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await openAssign(page, [0, 2]);

  const targetsHeight = 21 + 52 * 2 + 4 * 2 + SECTION_PADDING_Y * 2 + 2;
  const formHeight = ROW_HEIGHT + 12 + textAreaHeight(3) + SECTION_PADDING_Y * 2 + 2;
  const { header, contentWidth } = await expectModalFrame(page, "assignee-bulk", {
    width: ASSIGN_WIDTH,
    height: 36 + 14 + targetsHeight + 14 + formHeight + 14 + BANNER_HEIGHT + 14 + 32 + 34,
    title: "담당자 지정 · 선택 2건",
  });

  const TARGETS = `${ASSIGN} [data-slot="assignee-bulk-targets"]`;
  const targets = await box(page, TARGETS);
  expect(targets.y).toBeCloseTo(header.y + header.height + 14, 1);
  expect(targets.height).toBeCloseTo(targetsHeight, 1);
  await expectSection(page, TARGETS);
  expect((await measure(page, TARGETS)).style.rowGap).toBe("4px");
  const LIST_TITLE = `${TARGETS} [data-slot="assignee-bulk-list-title"]`;
  await expect(page.locator(LIST_TITLE)).toHaveText("선택한 알람");
  const listTitle = await measure(page, LIST_TITLE);
  expect(listTitle.height).toBe(21);
  expect(listTitle.style.paddingBottom).toBe("4px");
  expect(listTitle.style.fontSize).toBe("12px");
  expect(listTitle.style.fontWeight).toBe("700");
  expect(listTitle.style.color).toBe(await color(page, "var(--brand-line4-text)"));

  const ITEM = `${TARGETS} [data-slot="assignee-bulk-item"]`;
  const items = await boxes(page, ITEM);
  expect(items).toHaveLength(2);
  expect(items[0].y).toBeCloseTo(targets.y + 1 + SECTION_PADDING_Y + 21 + 4, 1);
  expect(items[1].y).toBeCloseTo(items[0].y + 52 + 4, 1);
  const item = await measure(page, ITEM);
  expect(item.height).toBe(52);
  expect(item.style.columnGap).toBe("12px");
  expect(item.style.borderBottomWidth).toBe("1px");
  expect(await styleOf(page, ITEM, "border-bottom-style")).toBe("dashed");
  expect(item.style.borderBottomColor).toBe(await color(page, "var(--border)"));
  await expect(page.locator(`${ITEM} [data-slot="alarm-severity"]`)).toHaveText(["MID", "CRIT"]);
  const badge = await measure(page, `${ITEM} [data-slot="alarm-severity"]`);
  expect(badge.width).toBe(52);
  expect(badge.height).toBe(24);
  expect(badge.style.backgroundColor).toBe(await color(page, "var(--caution)"));
  expect(badge.style.color).toBe(await color(page, "var(--caution-fg)"));
  await expect(page.locator(`${ITEM} [data-slot="assignee-bulk-item-title"]`)).toHaveText([
    "CMSB · IF",
    "MICOM_COOLER · VAE",
  ]);
  const itemTitle = await measure(page, `${ITEM} [data-slot="assignee-bulk-item-title"]`, 1);
  expect(itemTitle.width).toBe(140);
  expect(itemTitle.style.fontSize).toBe("14px");
  expect(itemTitle.style.fontWeight).toBe("700");
  expect(
    await styleOf(page, `${ITEM} [data-slot="assignee-bulk-item-title"]`, "text-overflow", 1),
  ).toBe("ellipsis");
  await expect(page.locator(`${ITEM} [data-slot="assignee-bulk-item-meta"]`)).toHaveText([
    `${isoDaysAgo(0)} 08:05:00 · 편성 401 · 1호차 · 신규`,
    `${isoDaysAgo(2)} 10:07:14 · 편성 403 · 3호차 · 조치중`,
  ]);
  const itemMeta = (await measure(page, `${ITEM} [data-slot="assignee-bulk-item-meta"]`)).style;
  expect(itemMeta.fontSize).toBe("14px");
  expect(itemMeta.color).toBe(await color(page, "var(--muted-fg)"));

  const FORM = `${ASSIGN} [data-slot="assignee-bulk-form"]`;
  const form = await box(page, FORM);
  expect(form.y).toBeCloseTo(targets.y + targets.height + 14, 1);
  expect(form.height).toBeCloseTo(formHeight, 1);
  await expectSection(page, FORM);
  await expect(page.locator(`${FORM} [data-slot="field-label"]`)).toHaveText(["담당자*", "코멘트"]);
  const TRIGGER = `${FORM} [data-slot="select-trigger"]`;
  await expect(page.locator(TRIGGER)).toHaveText("정비사 선택");
  await expectInput(page, TRIGGER, 0, "var(--muted-fg)");
  const trigger = await measure(page, TRIGGER);
  expect(trigger.width).toBeCloseTo(contentWidth - 2 - SECTION_PADDING_X * 2 - LABEL_WIDTH_LG, 1);
  const AREA = `${FORM} [data-slot="text-area-input"]`;
  await expect(page.locator(AREA)).toHaveAttribute(
    "placeholder",
    "선택 입력 · 두 건에 같은 코멘트가 남습니다",
  );
  expect((await measure(page, AREA)).height).toBe(textAreaHeight(3));

  const BANNER = `${ASSIGN} [data-slot="alert-banner"]`;
  await expect(page.locator(BANNER)).toHaveText(
    "신규 상태인 알람은 담당자를 지정하면 확인(ACK)으로 바뀌고 확인 시각이 자동 기록됩니다.",
  );
  const banner = await measure(page, BANNER);
  const bannerBox = await box(page, BANNER);
  expect(bannerBox.y).toBeCloseTo(form.y + form.height + 14, 1);
  expect(banner.height).toBe(BANNER_HEIGHT);
  expect(banner.style.paddingTop).toBe("10px");
  expect(banner.style.paddingLeft).toBe("14px");
  expect(banner.style.columnGap).toBe("10px");
  expect(banner.style.borderTopLeftRadius).toBe("8px");
  expect(banner.style.fontSize).toBe("14px");
  expect(banner.style.fontWeight).toBe("400");
  expect(banner.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(banner.style.color).toBe(await color(page, "var(--fg)"));
  const bannerIcon = await measure(page, `${BANNER} svg`);
  expect(bannerIcon.width).toBe(20);
  expect(bannerIcon.style.color).toBe(await color(page, "var(--primary)"));
  expect(await shownIconShape(page, BANNER)).toBe(iconShape("Info"));

  const BUTTON = `${ASSIGN} [data-slot="dialog-footer"] [data-slot="action-button"]`;
  await expect(page.locator(BUTTON)).toHaveText(["취소", "지정"]);
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
  const buttons = await boxes(page, BUTTON);
  expect(buttons[1].x + buttons[1].width).toBeCloseTo(header.x + contentWidth, 1);

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
  await page.locator(OPEN_ITEMS).nth(2).click();
  await expect(page.locator(TRIGGER)).toHaveText("정비사 선택 (김정비)");
  await expect(page.locator(ERROR)).toHaveCount(0);
  await page.waitForTimeout(300);
  expect((await measure(page, TRIGGER)).style.color).toBe(await color(page, "var(--fg)"));
  await page.locator(AREA).fill("주간 점검 때 같이 확인");

  await footerButton(page, ASSIGN, "지정").click();
  await expect(page.locator(ASSIGN)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("2건에 담당자를 지정했습니다.");
  const first = await rowTexts(page, 0);
  const third = await rowTexts(page, 2);
  expect([first[7], first[8]]).toEqual(["확인", "김정비"]);
  expect([third[7], third[8]]).toEqual(["조치중", "김정비"]);
  await expect(page.locator(BULK_BAR)).toHaveCount(0);
  expect(await kpiValues(page)).toEqual(["14", "4", "4", "4", "4"]);
  await openProcess(page, 0);
  await expect(page.locator(`${PROCESS} [data-slot="text-area-input"]`)).toHaveValue(
    "주간 점검 때 같이 확인",
  );
  expect((await texts(page, `${PROCESS} [data-slot="alarm-process-stamp-value"]`))[0]).toMatch(
    new RegExp(`^${isoDaysAgo(0)} \\d{2}:\\d{2}:\\d{2}$`),
  );
});

async function searchNewAlarms(page: Page): Promise<void> {
  await selectOption(page, `${FILTER} [data-slot="select-trigger"] >> nth=0`, "신규");
  await filterButton(page, 0).click();
  await expect(page.locator(BODY_ROW)).toHaveCount(2);
}

async function saveStatus(page: Page, row: number, optionIndex: number): Promise<void> {
  await openProcess(page, row);
  await page.locator(`${PROCESS} [data-slot="state-option"]`).nth(optionIndex).click();
  await footerButton(page, PROCESS, "저장").click();
  await expect(page.locator(PROCESS)).toHaveCount(0);
}

const rowCheckbox = (page: Page, row: number) =>
  page.locator(BODY_ROW).nth(row).locator('[data-slot="checkbox"]');
const bulkLabel = (page: Page) => page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`);

test("고른 Row가 List에서 빠지면 일괄 처리 Bar의 건수에서 빠지고 다시 보이면 고른 상태로 돌아옴", async ({
  page,
}) => {
  await openAlarms(page, 1920, 1080);
  await searchNewAlarms(page);
  await rowCheckbox(page, 0).click();
  await expect(bulkLabel(page)).toHaveText("선택 1건");
  await saveStatus(page, 0, 1);
  await expect(page.locator(BODY_ROW)).toHaveCount(1);
  await expect(page.locator(BULK_BAR)).toHaveCount(0);
  await expect(page.locator(`${WORKLIST} [data-slot="checkbox"][aria-checked="true"]`)).toHaveCount(0);
  await page.locator(`${FILTER} [data-slot="icon-button"]`).click();
  await expect(page.locator(BODY_ROW)).toHaveCount(10);
  await expect(bulkLabel(page)).toHaveText("선택 1건");
  await expect(page.locator(BODY_ROW).first()).toHaveAttribute("aria-selected", "true");
  expect((await rowTexts(page, 0))[7]).toBe("확인");
});

test("일괄 확인은 지금 보이는 Row 가운데 고른 Alarm만 처리함", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await searchNewAlarms(page);
  await rowCheckbox(page, 0).click();
  await rowCheckbox(page, 1).click();
  await expect(bulkLabel(page)).toHaveText("선택 2건");
  await saveStatus(page, 0, 2);
  await expect(page.locator(BODY_ROW)).toHaveCount(1);
  await expect(bulkLabel(page)).toHaveText("선택 1건");
  await page.locator(`${BULK_BAR} [data-slot="action-button"]`).nth(0).click();
  await expect(page.locator(`${TOAST}:not([data-ending-style])`)).toHaveText(
    "1건을 확인 처리했습니다.",
  );
  await expect(page.locator(BODY_ROW)).toHaveCount(0);
  await page.locator(`${FILTER} [data-slot="icon-button"]`).click();
  await expect(page.locator(BODY_ROW)).toHaveCount(10);
  expect((await rowTexts(page, 0))[7]).toBe("조치중");
  expect((await rowTexts(page, 5))[7]).toBe("확인");
});

test("담당자 지정은 지금 보이는 Row 가운데 고른 Alarm만 대상으로 함", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await searchNewAlarms(page);
  await rowCheckbox(page, 0).click();
  await rowCheckbox(page, 1).click();
  await saveStatus(page, 0, 3);
  await expect(page.locator(BODY_ROW)).toHaveCount(1);
  await expect(bulkLabel(page)).toHaveText("선택 1건");

  await page.locator(`${BULK_BAR} [data-slot="action-button"]`).nth(1).click();
  await expect(page.locator(`${ASSIGN} [data-slot="dialog-title"]`)).toHaveText(
    "담당자 지정 · 선택 1건",
  );
  await expect(page.locator(`${ASSIGN} [data-slot="assignee-bulk-item-title"]`)).toHaveText([
    "VVVF · SVM",
  ]);
  await expect(page.locator(`${ASSIGN} [data-slot="text-area-input"]`)).toHaveAttribute(
    "placeholder",
    "선택 입력 · 한 건에 같은 코멘트가 남습니다",
  );
  await selectOption(page, `${ASSIGN} [data-slot="select-trigger"]`, "김정비");
  await footerButton(page, ASSIGN, "지정").click();
  await expect(page.locator(ASSIGN)).toHaveCount(0);
  await expect(page.locator(`${TOAST}:not([data-ending-style])`)).toHaveText(
    "1건에 담당자를 지정했습니다.",
  );

  await page.locator(`${FILTER} [data-slot="icon-button"]`).click();
  await expect(page.locator(BODY_ROW)).toHaveCount(10);
  expect((await rowTexts(page, 0)).slice(7, 9)).toEqual(["해소", "-"]);
  expect((await rowTexts(page, 5)).slice(7, 9)).toEqual(["확인", "김정비"]);
});

test("담당자 지정 Modal이 닫히는 동안 List의 Row가 빠지지 않음", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await searchNewAlarms(page);
  await openAssign(page, [0, 1]);
  const ITEM = '[data-slot="assignee-bulk-item"]';
  await expect(page.locator(`${ASSIGN} ${ITEM}`)).toHaveCount(2);
  await selectOption(page, `${ASSIGN} [data-slot="select-trigger"]`, "박기술");

  const removedWhileClosing = page.evaluate(
    ({ modalSelector, itemSelector }) =>
      new Promise<number>((resolve) => {
        let removedItemCount = 0;
        const observer = new MutationObserver((records) => {
          for (const record of records) {
            for (const node of record.removedNodes) {
              if (node instanceof Element && node.matches(itemSelector)) removedItemCount += 1;
            }
          }
          if (document.querySelector(modalSelector) === null) {
            observer.disconnect();
            resolve(removedItemCount);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }),
    { modalSelector: ASSIGN, itemSelector: ITEM },
  );
  await footerButton(page, ASSIGN, "지정").click();
  expect(await removedWhileClosing).toBe(0);
  await expect(page.locator(`${TOAST}:not([data-ending-style])`)).toHaveText(
    "2건에 담당자를 지정했습니다.",
  );
  await expect(page.locator(BODY_ROW)).toHaveCount(0);
});

test("Alarm 규칙 Modal의 크기, 배치, Text, Color 확인", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await openRules(page);

  const BODY = `${RULES} [data-slot="alarm-rules-body"]`;
  const DESCRIPTION = `${BODY} [data-slot="alarm-rules-description"]`;
  const descriptionBox = await box(page, DESCRIPTION);
  expect(descriptionBox.height % 18).toBe(0);
  const tableHeight = 1080 * 0.52;
  const { header, contentWidth } = await expectModalFrame(page, "alarm-rules", {
    width: RULES_WIDTH,
    height: 36 + 14 + descriptionBox.height + 14 + 20 + 14 + 16 + 14 + tableHeight + 14 + 32 + 34,
    title: "알람 규칙",
  });

  const body = await box(page, BODY);
  expect(body.x).toBeCloseTo(header.x, 1);
  expect(body.width).toBeCloseTo(contentWidth, 1);
  const bodyStyle = (await measure(page, BODY)).style;
  expect(bodyStyle.paddingLeft).toBe("0px");
  expect(bodyStyle.marginLeft).toBe("0px");
  expect(bodyStyle.rowGap).toBe("14px");

  await expect(page.locator(DESCRIPTION)).toHaveText(
    "추론이 끝나면 편성·호차·날짜별로 이상 window 를 모아, 아래 조건 중 하나라도 맞으면 모델별로 알람을 만듭니다. 같은 편성·호차에 이상 시간대가 겹치는 알람이 이미 있으면 만들지 않습니다. 값이 0 인 조건은 쓰지 않습니다. 규칙이 겹치면 장치+모델 → 장치 → 모델 → 전체 순으로 더 구체적인 규칙을 씁니다.",
  );
  const description = (await measure(page, DESCRIPTION)).style;
  expect(description.fontSize).toBe("12px");
  expect(description.lineHeight).toBe("18px");
  expect(description.color).toBe(await color(page, "var(--muted-fg)"));

  const LEGEND = `${BODY} [data-slot="alarm-rules-legend"]`;
  const legend = await box(page, LEGEND);
  expect(legend.y).toBeCloseTo(descriptionBox.y + descriptionBox.height + 14, 1);
  expect(legend.height).toBe(20);
  expect((await measure(page, LEGEND)).style.columnGap).toBe("12px");
  const DOT = `${LEGEND} [data-slot="legend-dot"]`;
  await expect(page.locator(DOT)).toHaveText([
    "이 칸 전용 규칙",
    "장치 규칙",
    "모델 규칙",
    "전체 규칙",
    "꺼짐",
  ]);
  const dot = (await measure(page, DOT)).style;
  expect(dot.fontSize).toBe("11px");
  expect(dot.columnGap).toBe("5px");
  expect(dot.color).toBe(await color(page, "var(--muted-fg)"));
  const legendColors = [
    "var(--caution)",
    "var(--brand-line4-text)",
    "var(--success)",
    "var(--border-strong)",
    "var(--danger)",
  ];
  for (const [index, token] of legendColors.entries()) {
    const markSelector = `${DOT} [data-slot="legend-dot-mark"]`;
    const mark = await measure(page, markSelector, index);
    expect(mark.width).toBe(8);
    expect(mark.height).toBe(8);
    expect(mark.style.borderTopLeftRadius).toBe("2px");
    expect(mark.style.backgroundColor).toBe(await color(page, token));
  }
  const dots = await boxes(page, DOT);
  expect(dots[0].x).toBeCloseTo(header.x, 1);
  expect(dots[1].x - (dots[0].x + dots[0].width)).toBeCloseTo(12, 1);

  const CHECK_ITEM = `${LEGEND} [data-slot="checkbox-item"]`;
  await expect(page.locator(CHECK_ITEM)).toHaveText("따로 정한 장치만");
  const checkItem = await measure(page, CHECK_ITEM);
  const checkItemBox = await box(page, CHECK_ITEM);
  expect(checkItemBox.x + checkItemBox.width).toBeCloseTo(header.x + contentWidth, 1);
  expect(checkItem.style.paddingLeft).toBe("4px");
  expect(checkItem.style.columnGap).toBe("8px");
  const checkLabel = (await measure(page, `${CHECK_ITEM} [data-slot="field-label"]`)).style;
  expect(checkLabel.fontSize).toBe("14px");
  expect(checkLabel.fontWeight).toBe("400");
  expect(checkLabel.color).toBe(await color(page, "var(--fg)"));
  const CHECKBOX = `${CHECK_ITEM} [data-slot="checkbox"]`;
  const checkbox = await measure(page, CHECKBOX);
  expect(checkbox.width).toBe(16);
  expect(checkbox.height).toBe(16);
  expect(checkbox.style.borderTopLeftRadius).toBe("4px");
  expect(checkbox.style.borderTopWidth).toBe("1px");
  expect(checkbox.style.borderTopColor).toBe(await color(page, "var(--border-strong)"));
  expect(checkbox.style.backgroundColor).toBe(await color(page, "var(--card)"));
  await expect(page.locator(CHECKBOX)).toHaveAttribute("aria-checked", "false");

  const HINT = `${BODY} [data-slot="alarm-rules-hint"]`;
  await expect(page.locator(HINT)).toHaveText(
    "왼쪽 위 칸을 누르면 전체 규칙, 칸을 누르면 그 장치·모델 규칙, 장치 이름을 누르면 장치 규칙, 모델 이름을 누르면 모델 규칙을 고칩니다.",
  );
  const hint = await measure(page, HINT);
  const hintBox = await box(page, HINT);
  expect(hintBox.y).toBeCloseTo(legend.y + 20 + 14, 1);
  expect(hint.height).toBe(16);
  expect(hint.style.fontSize).toBe("12px");
  expect(hint.style.lineHeight).toBe("16px");
  expect(hint.style.color).toBe(await color(page, "var(--muted-fg)"));

  const TABLE = `${BODY} [data-slot="alarm-rules-table"]`;
  const table = await box(page, TABLE);
  expect(table.y).toBeCloseTo(hintBox.y + 16 + 14, 1);
  expect(table.width).toBeCloseTo(contentWidth, 1);
  expect(table.height).toBeCloseTo(tableHeight, 1);
  const tableStyle = (await measure(page, TABLE)).style;
  expect(tableStyle.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(tableStyle.borderTopWidth).toBe("1px");
  expect(tableStyle.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(tableStyle.borderTopLeftRadius).toBe("12px");
  expect(tableStyle.paddingTop).toBe("12px");
  expect(tableStyle.paddingLeft).toBe("12px");
  expect(await styleOf(page, TABLE, "max-height")).toBe(`${tableHeight}px`);
  expect(await styleOf(page, TABLE, "overflow-y")).toBe("auto");
  const GRID = `${TABLE} [data-slot="alarm-rules-grid"]`;
  const gridStyle = (await measure(page, GRID)).style;
  expect(gridStyle.columnGap).toBe("8px");
  expect(gridStyle.rowGap).toBe("8px");

  const columnWidth = (contentWidth - 2 - 24 - 8 * 4) / 5;
  const gridX = table.x + 13;
  const gridY = table.y + 13;
  const CELL = `${GRID} [data-slot="rule-cell"]`;
  const SCOPE = `${GRID} [data-slot="alarm-rule-scope-button"]`;
  await expect(page.locator(CELL)).toHaveCount(1 + DEVICE_NAMES.length * MODEL_CODES.length);
  const cells = await boxes(page, CELL);
  const scopes = await boxes(page, SCOPE);
  expect(cells[0].x).toBeCloseTo(gridX, 1);
  expect(cells[0].y).toBeCloseTo(gridY, 1);
  for (const cell of cells) {
    expect(cell.width).toBeCloseTo(columnWidth, 1);
    expect(cell.height).toBe(66);
  }
  await expect(page.locator(SCOPE)).toHaveText([
    "IF",
    "SVM ●",
    "VAE",
    "PCA",
    ...DEVICE_NAMES.map((name) =>
      name === "차축 베어링" || name === "주공기 압축기" ? `${name} ●` : name,
    ),
  ]);
  MODEL_CODES.forEach((_, index) => {
    expect(scopes[index].x).toBeCloseTo(gridX + (columnWidth + 8) * (index + 1), 1);
    expect(scopes[index].width).toBeCloseTo(columnWidth, 1);
    expect(scopes[index].height).toBe(32);
    expect(scopes[index].y).toBeCloseTo(gridY + 66 - 32, 1);
  });
  DEVICE_NAMES.forEach((_, deviceIndex) => {
    const rowY = gridY + (66 + 8) * (deviceIndex + 1);
    const name = scopes[MODEL_CODES.length + deviceIndex];
    expect(name.x).toBeCloseTo(gridX, 1);
    expect(name.y).toBeCloseTo(rowY, 1);
    expect(name.height).toBe(66);
    MODEL_CODES.forEach((__, modelIndex) => {
      const cell = cells[1 + deviceIndex * MODEL_CODES.length + modelIndex];
      expect(cell.x).toBeCloseTo(gridX + (columnWidth + 8) * (modelIndex + 1), 1);
      expect(cell.y).toBeCloseTo(rowY, 1);
    });
  });
  const modelName = (await measure(page, SCOPE)).style;
  expect(modelName.fontSize).toBe("12px");
  expect(modelName.fontWeight).toBe("700");
  expect(modelName.color).toBe(await color(page, "var(--fg)"));
  expect((await measure(page, SCOPE, 1)).style.color).toBe(
    await color(page, "var(--warning-strong)"),
  );
  const deviceName = (await measure(page, SCOPE, 4)).style;
  expect(deviceName.fontSize).toBe("14px");
  expect(deviceName.fontWeight).toBe("700");
  expect(deviceName.paddingLeft).toBe("4px");
  expect(deviceName.color).toBe(await color(page, "var(--fg)"));
  expect((await measure(page, SCOPE, 5)).style.color).toBe(
    await color(page, "var(--warning-strong)"),
  );
  expect((await box(page, `${SCOPE} span`, 4)).x).toBeCloseTo(gridX + 4, 1);

  const cellLines = async (index: number) =>
    page.locator(CELL).nth(index).locator("span[data-slot]").allTextContents();
  const cellOf = (deviceIndex: number, modelIndex: number) =>
    1 + deviceIndex * MODEL_CODES.length + modelIndex;
  const expectations: {
    index: number;
    lines: string[];
    bar: string;
    background: string;
    border: string;
    title: string | null;
  }[] = [
    {
      index: 0,
      lines: ["3분 / 5개", "H 30 · M 10", "전체 규칙"],
      bar: "var(--border-strong)",
      background: "var(--card)",
      border: "var(--border)",
      title: null,
    },
    {
      index: cellOf(0, 0),
      lines: ["3분 / 5개", "H 30 · M 10", "전체 규칙"],
      bar: "var(--border-strong)",
      background: "var(--card)",
      border: "var(--border)",
      title: "전체 (기본)",
    },
    {
      index: cellOf(0, 1),
      lines: ["5분 / 8개", "H 30 · M 10", "모델 규칙"],
      bar: "var(--success)",
      background: "var(--card)",
      border: "var(--border)",
      title: "전체 장치 · SVM",
    },
    {
      index: cellOf(1, 0),
      lines: ["1분 / 3개", "H 15 · M 5"],
      bar: "var(--caution)",
      background: "var(--caution-subtle)",
      border: "color-mix(in srgb, var(--caution) 45%, var(--card))",
      title: "차축 베어링 · IF",
    },
    {
      index: cellOf(1, 1),
      lines: ["2분 / 4개", "H 20 · M 5", "장치 규칙"],
      bar: "var(--brand-line4-text)",
      background: "var(--card)",
      border: "var(--border)",
      title: "차축 베어링 · 전체 모델",
    },
    {
      index: cellOf(3, 3),
      lines: ["꺼짐", "전용"],
      bar: "var(--danger)",
      background: "var(--card)",
      border: "var(--border)",
      title: "주공기 압축기 · PCA",
    },
    {
      index: cellOf(4, 0),
      lines: ["꺼짐", "전용"],
      bar: "var(--danger)",
      background: "var(--card)",
      border: "var(--border)",
      title: "출입문장치 · IF",
    },
    {
      index: cellOf(6, 2),
      lines: ["4분 / 6개", "H 40 · M 10"],
      bar: "var(--caution)",
      background: "var(--caution-subtle)",
      border: "color-mix(in srgb, var(--caution) 45%, var(--card))",
      title: "제동장치 · VAE",
    },
  ];
  for (const expected of expectations) {
    expect(await cellLines(expected.index)).toEqual(expected.lines);
    const cell = (await measure(page, CELL, expected.index)).style;
    expect(cell.borderLeftWidth).toBe("4px");
    expect(cell.borderLeftColor).toBe(await color(page, expected.bar));
    expect(cell.borderTopWidth).toBe("1px");
    expect(cell.borderTopColor).toBe(await color(page, expected.border));
    expect(cell.backgroundColor).toBe(await color(page, expected.background));
    expect(cell.borderTopLeftRadius).toBe("4px");
    expect(cell.paddingTop).toBe("8px");
    expect(cell.paddingLeft).toBe("10px");
    expect(cell.paddingRight).toBe("10px");
    expect(cell.rowGap).toBe("2px");
    expect(cell.fontSize).toBe("11px");
    expect(cell.lineHeight).toBe("16px");
    expect(cell.textAlign).toBe("left");
    const title = await page.locator(CELL).nth(expected.index).getAttribute("title");
    expect(title).toBe(expected.title);
  }
  const primaryOf = async (index: number) =>
    page
      .locator(CELL)
      .nth(index)
      .locator('[data-slot="rule-cell-primary"]')
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.fontWeight, style.color];
      });
  expect(await primaryOf(0)).toEqual(["600", await color(page, "var(--fg)")]);
  expect(await primaryOf(cellOf(0, 0))).toEqual(["700", await color(page, "var(--fg)")]);
  expect(await primaryOf(cellOf(3, 3))).toEqual(["700", await color(page, "var(--danger)")]);
  expect(
    await styleOf(page, `${CELL} [data-slot="rule-cell-secondary"]`, "color"),
  ).toBe(await color(page, "var(--muted-fg)"));
  const GLOBAL_TERTIARY = `${CELL} [data-slot="rule-cell-tertiary"]`;
  expect((await measure(page, GLOBAL_TERTIARY)).style.columnGap).toBe("2px");
  expect((await box(page, `${GLOBAL_TERTIARY} svg`)).width).toBe(12);
  expect(await shownIconShape(page, GLOBAL_TERTIARY)).toBe(iconShape("Edit"));

  const NOTICE = `${RULES} [data-slot="alarm-rules-notice"]`;
  await expect(page.locator(NOTICE)).toHaveText("");
  const notice = (await measure(page, NOTICE)).style;
  expect(notice.fontSize).toBe("12px");
  expect(notice.color).toBe(await color(page, "var(--on-success-subtle)"));
  const BUTTON = `${RULES} [data-slot="dialog-footer"] [data-slot="action-button"]`;
  await expect(page.locator(BUTTON)).toHaveText(["닫기"]);
  await expectButton(page, BUTTON, {
    height: 32,
    paddingX: 14,
    weight: "500",
    background: "var(--card)",
    text: "var(--fg)",
    border: "var(--border)",
  });
  const closeButton = await box(page, BUTTON);
  expect(closeButton.x + closeButton.width).toBeCloseTo(header.x + contentWidth, 1);

  await page.locator(CHECKBOX).click();
  await expect(page.locator(CHECKBOX)).toHaveAttribute("aria-checked", "true");
  await page.waitForTimeout(300);
  const checked = (await measure(page, CHECKBOX)).style;
  expect(checked.backgroundColor).toBe(await color(page, "var(--primary)"));
  expect((await box(page, `${CHECKBOX} svg`)).width).toBe(14);
  expect(await shownIconShape(page, CHECKBOX)).toBe(iconShape("Check"));
  await expect(page.locator(SCOPE)).toHaveText([
    "IF",
    "SVM ●",
    "VAE",
    "PCA",
    "차축 베어링 ●",
    "주공기 압축기 ●",
  ]);
  await expect(page.locator(CELL)).toHaveCount(1 + 2 * MODEL_CODES.length);
  await expect(page.locator(`${TABLE} [data-slot="alarm-rules-empty"]`)).toHaveCount(0);
  await page.locator(`${CHECK_ITEM} [data-slot="field-label"]`).click();
  await expect(page.locator(CHECKBOX)).toHaveAttribute("aria-checked", "false");
  await expect(page.locator(CELL)).toHaveCount(1 + DEVICE_NAMES.length * MODEL_CODES.length);
});

test("Alarm 규칙 추가와 수정 Modal의 크기, 배치, Text, Color 확인", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await openRules(page);
  await ruleCell(page, 0, 0).click();

  const scopeHeight = CONTROL_HEIGHT * 3 + 20 * 2 + SECTION_PADDING_Y * 2 + 2;
  const conditionsHeight =
    20 * 2 + CONTROL_HEIGHT * 6 + 20 * 7 - 8 * 2 + SECTION_PADDING_Y * 2 + 2;
  const baseHeight = 36 + 14 + scopeHeight + 14 + conditionsHeight + 14 + 32 + 34;
  const { header, contentWidth } = await expectModalFrame(page, "alarm-rule-edit", {
    width: RULE_EDIT_WIDTH,
    height: baseHeight + BANNER_HEIGHT + 14,
    title: "알람 규칙 추가 — 차상신호장치 · IF",
    overlayColor: SOFT_OVERLAY,
  });
  await expect(page.locator(RULES)).toBeVisible();
  await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(2);

  const BODY = `${RULE_EDIT} [data-slot="alarm-rule-edit-body"]`;
  const body = await box(page, BODY);
  expect(body.x).toBeCloseTo(header.x, 1);
  expect(body.width).toBeCloseTo(contentWidth, 1);

  const BANNER = `${BODY} [data-slot="alert-banner"]`;
  await expect(page.locator(BANNER)).toHaveText(
    "지금 적용 중인 「차상신호장치 · IF」 값을 채워 두었습니다. 바꿀 값만 고쳐 저장하세요.",
  );
  await expect(page.locator(BANNER)).toHaveAttribute("role", "note");
  const banner = await measure(page, BANNER);
  expect(banner.height).toBe(BANNER_HEIGHT);
  expect(banner.style.paddingLeft).toBe("16px");
  expect(banner.style.fontWeight).toBe("500");
  expect(banner.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(banner.style.color).toBe(await color(page, "var(--fg)"));
  expect((await measure(page, `${BANNER} svg`)).style.color).toBe(
    await color(page, "var(--brand-line4-text)"),
  );
  expect(await shownIconShape(page, BANNER)).toBe(iconShape("Info"));

  const SCOPE = `${BODY} [data-slot="alarm-rule-edit-scope"]`;
  const scope = await box(page, SCOPE);
  const bannerBox = await box(page, BANNER);
  expect(scope.y).toBeCloseTo(bannerBox.y + BANNER_HEIGHT + 14, 1);
  expect(scope.width).toBeCloseTo(contentWidth, 1);
  expect(scope.height).toBeCloseTo(scopeHeight, 1);
  await expectSection(page, SCOPE);
  expect((await measure(page, SCOPE)).style.rowGap).toBe("20px");
  await expect(page.locator(`${SCOPE} [data-slot="field-label"]`)).toHaveText([
    "장치",
    "모델",
    "사용 여부",
  ]);
  const scopeRows = await boxes(page, `${SCOPE} [data-slot="form-row"]`);
  const scopeLabels = await boxes(page, `${SCOPE} [data-slot="field-label"]`);
  const TRIGGER = `${SCOPE} [data-slot="select-trigger"]`;
  await expect(page.locator(TRIGGER)).toHaveText(["차상신호장치", "IF", "Y (자동 알람 켬)"]);
  const triggers = await boxes(page, TRIGGER);
  for (const [index, row] of scopeRows.entries()) {
    expect(row.y).toBeCloseTo(scope.y + 1 + SECTION_PADDING_Y + index * (CONTROL_HEIGHT + 20), 1);
    expect(row.height).toBe(CONTROL_HEIGHT);
    expect(scopeLabels[index].y + scopeLabels[index].height / 2).toBeCloseTo(
      row.y + CONTROL_HEIGHT / 2,
      1,
    );
    expect(triggers[index].x).toBeCloseTo(row.x + LABEL_WIDTH_LG, 1);
    expect(triggers[index].width).toBeCloseTo(row.width - LABEL_WIDTH_LG, 1);
    await expectInput(page, TRIGGER, index);
  }
  const scopeLabel = (await measure(page, `${SCOPE} [data-slot="field-label"]`)).style;
  expect(scopeLabel.fontSize).toBe("14px");
  expect(scopeLabel.fontWeight).toBe("700");

  const CONDITIONS = `${BODY} [data-slot="alarm-rule-edit-conditions"]`;
  const conditions = await box(page, CONDITIONS);
  expect(conditions.y).toBeCloseTo(scope.y + scope.height + 14, 1);
  expect(conditions.height).toBeCloseTo(conditionsHeight, 1);
  await expectSection(page, CONDITIONS);
  expect((await measure(page, CONDITIONS)).style.rowGap).toBe("20px");
  const HEADING = `${CONDITIONS} [data-slot="alarm-rule-edit-heading"]`;
  await expect(page.locator(HEADING)).toHaveText([
    "발생 조건(둘 중 하나라도 맞으면 알람 · 0 = 안 씀)",
    "심각도 기준(가장 긴 연속 구간 기준 · 그 외 LOW · CRIT 는 수동)",
  ]);
  const heading = (await measure(page, HEADING)).style;
  expect(heading.marginBottom).toBe("-8px");
  expect(heading.columnGap).toBe("8px");
  const headingTitle = (await measure(page, `${HEADING} span`)).style;
  expect(headingTitle.fontSize).toBe("14px");
  expect(headingTitle.fontWeight).toBe("700");
  const headingHint = (await measure(page, `${HEADING} span`, 1)).style;
  expect(headingHint.fontSize).toBe("11px");
  expect(headingHint.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator(`${CONDITIONS} [data-slot="field-label"]`)).toHaveText([
    "연속 지속(분)",
    "이상 window 수",
    "이어 붙일 간격(초)",
    "MID (분 이상)",
    "HIGH (분 이상)",
    "설명",
  ]);
  const conditionsTop = conditions.y + 1 + SECTION_PADDING_Y;
  const headings = await boxes(page, HEADING);
  const conditionRows = await boxes(page, `${CONDITIONS} [data-slot="form-row"]`);
  expect(headings[0].y).toBeCloseTo(conditionsTop, 1);
  expect(headings[0].height).toBe(20);
  const rowOffsets = [32, 84, 136, 220, 272, 324];
  conditionRows.forEach((row, index) => {
    expect(row.y).toBeCloseTo(conditionsTop + rowOffsets[index], 1);
    expect(row.height).toBe(CONTROL_HEIGHT);
  });
  expect(headings[1].y).toBeCloseTo(conditionsTop + 188, 1);

  const NUMBER = `${CONDITIONS} div[data-slot="text-input"]`;
  await expect(page.locator(`${NUMBER} input`)).toHaveCount(5);
  expect(
    await page
      .locator(`${NUMBER} input`)
      .evaluateAll((inputs) =>
        inputs.map((input) => [(input as HTMLInputElement).value, input.getAttribute("inputmode")]),
      ),
  ).toEqual([
    ["3", "decimal"],
    ["5", "decimal"],
    ["120", "decimal"],
    ["10", "decimal"],
    ["30", "decimal"],
  ]);
  await expect(page.locator(`${NUMBER} [data-slot="text-input-unit"]`)).toHaveText([
    "분",
    "개",
    "초",
    "분",
    "분",
  ]);
  const numbers = await boxes(page, NUMBER);
  const units = await boxes(page, `${NUMBER} [data-slot="text-input-unit"]`);
  for (const [index, number] of numbers.entries()) {
    await expectInput(page, NUMBER, index);
    expect(number.x).toBeCloseTo(conditionRows[index].x + LABEL_WIDTH_LG, 1);
    expect(number.width).toBeCloseTo(conditionRows[index].width - LABEL_WIDTH_LG, 1);
    expect(number.x + number.width - (units[index].x + units[index].width)).toBeCloseTo(12, 1);
  }
  const unit = (await measure(page, `${NUMBER} [data-slot="text-input-unit"]`)).style;
  expect(unit.fontSize).toBe("14px");
  expect(unit.color).toBe(await color(page, "var(--muted-fg)"));
  const DESCRIPTION = `${CONDITIONS} input[data-slot="text-input"]`;
  await expect(page.locator(DESCRIPTION)).toHaveValue("");
  await expect(page.locator(DESCRIPTION)).toHaveAttribute("placeholder", "(선택)");
  await expectInput(page, DESCRIPTION);

  const BUTTON = `${RULE_EDIT} [data-slot="dialog-footer"] [data-slot="action-button"]`;
  await expect(page.locator(BUTTON)).toHaveText(["취소", "저장"]);
  await expectButton(page, BUTTON, {
    height: 32,
    paddingX: 14,
    weight: "500",
    background: "var(--card)",
    text: "var(--fg)",
    border: "var(--border)",
  });
  await expectButton(
    page,
    BUTTON,
    { height: 32, paddingX: 16, weight: "500", background: "var(--primary)", text: "var(--on-primary)" },
    1,
  );
  const buttons = await boxes(page, BUTTON);
  expect(buttons[1].x + buttons[1].width).toBeCloseTo(header.x + contentWidth, 1);
  expect(buttons[1].x - (buttons[0].x + buttons[0].width)).toBeCloseTo(8, 1);

  await selectOption(page, `${TRIGGER} >> nth=1`, "(전체 모델)");
  await expect(page.locator(`${RULE_EDIT} [data-slot="dialog-title"]`)).toHaveText(
    "알람 규칙 추가 — 차상신호장치 · 전체 모델",
  );
  await page.locator(TRIGGER).nth(0).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText(["(전체 장치)", ...DEVICE_NAMES]);
  await page.locator(OPEN_ITEMS).first().click();
  await expect(page.locator(`${RULE_EDIT} [data-slot="dialog-title"]`)).toHaveText("알람 규칙 추가");
  await expect(page.locator(TRIGGER)).toHaveText(["(전체 장치)", "(전체 모델)", "Y (자동 알람 켬)"]);
  await page.waitForTimeout(300);
  for (const index of [0, 1, 2]) {
    await expect(page.locator(TRIGGER).nth(index)).toBeEnabled();
    await expectInput(page, TRIGGER, index);
  }
  await page.locator(TRIGGER).nth(1).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText(["(전체 모델)", ...MODEL_CODES]);
  await page.keyboard.press("Escape");
  await page.locator(TRIGGER).nth(2).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText([
    "Y (자동 알람 켬)",
    "N (이 범위 자동 알람 끔)",
  ]);
  await page.keyboard.press("Escape");
  await expect(page.locator(RULE_EDIT)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(RULE_EDIT)).toHaveCount(0);
  await expect(page.locator(RULES)).toBeVisible();

  await page.locator(`${RULES} [data-slot="rule-cell"]`).first().click();
  await expectModalFrame(page, "alarm-rule-edit", {
    width: RULE_EDIT_WIDTH,
    height: baseHeight,
    title: "알람 규칙 수정 — 전체 (기본)",
    overlayColor: SOFT_OVERLAY,
  });
  await expect(page.locator(BANNER)).toHaveCount(0);
  await expect(page.locator(TRIGGER)).toHaveText(["(전체 장치)", "(전체 모델)", "Y (자동 알람 켬)"]);
  for (const index of [0, 1]) {
    await expect(page.locator(TRIGGER).nth(index)).toBeDisabled();
    const disabled = (await measure(page, TRIGGER, index)).style;
    expect(disabled.backgroundColor).toBe(await color(page, "var(--muted)"));
    expect(disabled.color).toBe(await color(page, "var(--muted-fg)"));
    expect(disabled.opacity).toBe("1");
    expect(disabled.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(await styleOf(page, TRIGGER, "cursor", index)).toBe("not-allowed");
  }
  await expect(page.locator(TRIGGER).nth(2)).toBeEnabled();
  await expect(page.locator(BUTTON)).toHaveText(["취소", "저장"]);
  await expect(page.locator(DESCRIPTION)).toHaveValue("기본 규칙(전체 장치·전체 모델)");
  await page.mouse.click(40, 40);
  await expect(page.locator(RULE_EDIT)).toHaveCount(0);
  await expect(page.locator(RULES)).toBeVisible();

  await ruleCell(page, 1, 0).click();
  await expect(page.locator(`${RULE_EDIT} [data-slot="dialog-title"]`)).toHaveText(
    "알람 규칙 수정 — 차축 베어링 · IF",
  );
  await expect(page.locator(BANNER)).toHaveCount(0);
  await expect(page.locator(TRIGGER)).toHaveText(["차축 베어링", "IF", "Y (자동 알람 켬)"]);
  await expect(page.locator(TRIGGER).nth(0)).toBeEnabled();
  await expect(page.locator(DESCRIPTION)).toHaveValue("차축 베어링 민감 규칙");
  await expect(page.locator(BUTTON)).toHaveText(["삭제", "취소", "저장"]);
  await expectButton(page, BUTTON, {
    height: 32,
    paddingX: 14,
    weight: "500",
    background: "var(--card)",
    text: "var(--danger)",
    border: "var(--danger)",
  });
  expect((await box(page, BUTTON)).x).toBeCloseTo(header.x, 1);
  await footerButton(page, RULE_EDIT, "취소").click();
  await expect(page.locator(RULE_EDIT)).toHaveCount(0);

  await ruleCell(page, 4, 0).click();
  await expect(page.locator(TRIGGER)).toHaveText(["출입문장치", "IF", "N (이 범위 자동 알람 끔)"]);
  await page.locator(`${RULE_EDIT} [data-slot="dialog-close"]`).click();
  await expect(page.locator(RULE_EDIT)).toHaveCount(0);
  const scopeButton = page.locator(`${RULES} [data-slot="alarm-rule-scope-button"]`);
  await scopeButton.nth(1).click();
  await expect(page.locator(`${RULE_EDIT} [data-slot="dialog-title"]`)).toHaveText(
    "알람 규칙 수정 — 전체 장치 · SVM",
  );
  await page.keyboard.press("Escape");
  await scopeButton.nth(0).click();
  await expect(page.locator(`${RULE_EDIT} [data-slot="dialog-title"]`)).toHaveText(
    "알람 규칙 추가 — 전체 장치 · IF",
  );
  await expect(page.locator(BANNER)).toHaveCount(0);
  await expect(page.locator(`${NUMBER} input`).first()).toHaveValue("3");
  await page.keyboard.press("Escape");
  await scopeButton.nth(4 + 1).click();
  await expect(page.locator(`${RULE_EDIT} [data-slot="dialog-title"]`)).toHaveText(
    "알람 규칙 수정 — 차축 베어링 · 전체 모델",
  );
  await page.keyboard.press("Escape");
  await scopeButton.nth(4).click();
  await expect(page.locator(`${RULE_EDIT} [data-slot="dialog-title"]`)).toHaveText(
    "알람 규칙 추가 — 차상신호장치 · 전체 모델",
  );
});

test("Alarm 규칙의 Input 검증과, 저장과 삭제가 Table에 반영됨", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await openRules(page);
  const CELL = `${RULES} [data-slot="rule-cell"]`;
  const NOTICE = `${RULES} [data-slot="alarm-rules-notice"]`;
  const BANNER = `${RULE_EDIT} [data-slot="alert-banner"]`;
  const NUMBER = `${RULE_EDIT} div[data-slot="text-input"]`;
  const numberInput = (index: number) => page.locator(`${NUMBER} input`).nth(index);
  const save = footerButton(page, RULE_EDIT, "저장");
  const cellLines = (index: number) =>
    page.locator(CELL).nth(index).locator("span[data-slot]").allTextContents();
  const cellOf = (deviceIndex: number, modelIndex: number) =>
    1 + deviceIndex * MODEL_CODES.length + modelIndex;

  await page.locator(CELL).first().click();
  await numberInput(0).fill("");
  await numberInput(3).fill("  ");
  await save.click();
  await expect(page.locator(BANNER)).toHaveText(
    "빈 칸이 있습니다. 조건을 쓰지 않으려면 0 을 입력하세요.",
  );
  await expect(page.locator(BANNER)).toHaveAttribute("role", "alert");
  await page.waitForTimeout(300);
  const banner = (await measure(page, BANNER)).style;
  expect(banner.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect(banner.color).toBe(await color(page, "var(--on-danger-subtle)"));
  expect(banner.paddingLeft).toBe("16px");
  expect(banner.fontWeight).toBe("500");
  expect((await measure(page, `${BANNER} svg`)).style.color).toBe(
    await color(page, "var(--danger)"),
  );
  expect(await shownIconShape(page, BANNER)).toBe(iconShape("WarningAmber"));
  expect((await box(page, RULE_EDIT)).height).toBe(704 + BANNER_HEIGHT + 14);
  const borders = await page
    .locator(NUMBER)
    .evaluateAll((groups) => groups.map((group) => getComputedStyle(group).borderTopWidth));
  expect(borders).toEqual(["2px", "1px", "1px", "2px", "1px"]);
  expect((await measure(page, NUMBER)).style.borderTopColor).toBe(
    await color(page, "var(--danger)"),
  );
  await expect(page.locator(RULE_EDIT)).toBeVisible();
  await expect(page.locator(NOTICE)).toHaveText("");

  await numberInput(0).fill("-1");
  await expect(page.locator(BANNER)).toHaveText(
    "빈 칸이 있습니다. 조건을 쓰지 않으려면 0 을 입력하세요.",
  );
  await numberInput(3).fill("abc");
  await expect(page.locator(BANNER)).toHaveText("값은 0 이상 숫자로 입력하세요.");
  await numberInput(3).fill("12");
  await numberInput(0).fill("0");
  await expect(page.locator(BANNER)).toHaveCount(0);
  await numberInput(0).fill("4");
  await page.locator(`${RULE_EDIT} input[data-slot="text-input"]`).fill("기본 규칙 조정");
  await save.click();
  await expect(page.locator(RULE_EDIT)).toHaveCount(0);
  await expect(page.locator(RULES)).toBeVisible();
  await expect(page.locator(NOTICE)).toHaveText("저장되었습니다. 다음 추론부터 적용됩니다.");
  await expect(page.locator(TOAST)).toHaveCount(0);
  expect(await cellLines(0)).toEqual(["4분 / 5개", "H 30 · M 12", "전체 규칙"]);
  expect(await cellLines(cellOf(0, 0))).toEqual(["4분 / 5개", "H 30 · M 12", "전체 규칙"]);
  expect(await cellLines(cellOf(0, 1))).toEqual(["5분 / 8개", "H 30 · M 10", "모델 규칙"]);
  expect(await cellLines(cellOf(1, 0))).toEqual(["1분 / 3개", "H 15 · M 5"]);

  await ruleCell(page, 0, 0).click();
  await expect(numberInput(0)).toHaveValue("4");
  await numberInput(0).fill("7");
  await numberInput(4).fill("45");
  await save.click();
  await expect(page.locator(RULE_EDIT)).toHaveCount(0);
  expect(await cellLines(cellOf(0, 0))).toEqual(["7분 / 5개", "H 45 · M 12"]);
  await page.waitForTimeout(300);
  const own = (await measure(page, CELL, cellOf(0, 0))).style;
  expect(own.backgroundColor).toBe(await color(page, "var(--caution-subtle)"));
  expect(own.borderLeftColor).toBe(await color(page, "var(--caution)"));
  await expect(page.locator(CELL).nth(cellOf(0, 0))).toHaveAttribute("title", "차상신호장치 · IF");
  await ruleCell(page, 0, 0).click();
  await expect(page.locator(`${RULE_EDIT} [data-slot="dialog-title"]`)).toHaveText(
    "알람 규칙 수정 — 차상신호장치 · IF",
  );
  await selectOption(
    page,
    `${RULE_EDIT} [data-slot="select-trigger"] >> nth=2`,
    "N (이 범위 자동 알람 끔)",
  );
  await save.click();
  await expect(page.locator(RULE_EDIT)).toHaveCount(0);
  expect(await cellLines(cellOf(0, 0))).toEqual(["꺼짐", "전용"]);
  await page.waitForTimeout(300);
  const off = (await measure(page, CELL, cellOf(0, 0))).style;
  expect(off.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(off.borderLeftColor).toBe(await color(page, "var(--danger)"));

  await ruleCell(page, 1, 0).click();
  await footerButton(page, RULE_EDIT, "삭제").click();
  await expectConfirmDialog(page, RULE_DELETE, {
    title: "알람 규칙을 삭제할까요?",
    description: "이 알람 규칙을 삭제할까요?\n이 범위는 더 넓은 규칙(예: 전체 규칙)을 따르게 됩니다.",
  });
  await expectSentenceLines(page, `${RULE_DELETE} [data-slot="alert-dialog-description"]`, {
    sentences: 2,
    lineHeight: 20,
  });
  await expect(page.locator(RULE_EDIT)).toBeVisible();
  await expect(page.locator(RULES)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(RULE_DELETE)).toHaveCount(0);
  await expect(page.locator(RULE_EDIT)).toBeVisible();
  expect(await cellLines(cellOf(1, 0))).toEqual(["1분 / 3개", "H 15 · M 5"]);
  await footerButton(page, RULE_EDIT, "삭제").click();
  await page.locator(`${RULE_DELETE} [data-slot="alert-dialog-action"]`).click();
  await expect(page.locator(RULE_DELETE)).toHaveCount(0);
  await expect(page.locator(RULE_EDIT)).toHaveCount(0);
  await expect(page.locator(RULES)).toBeVisible();
  await expect(page.locator(NOTICE)).toHaveText(
    "삭제되었습니다. 다음 추론부터 더 넓은 규칙을 따릅니다.",
  );
  expect(await cellLines(cellOf(1, 0))).toEqual(["2분 / 4개", "H 20 · M 5", "장치 규칙"]);

  const scopeButton = page.locator(`${RULES} [data-slot="alarm-rule-scope-button"]`);
  for (const deviceIndex of [1, 3]) {
    await scopeButton.nth(MODEL_CODES.length + deviceIndex).click();
    await footerButton(page, RULE_EDIT, "삭제").click();
    await page.locator(`${RULE_DELETE} [data-slot="alert-dialog-action"]`).click();
    await expect(page.locator(RULE_EDIT)).toHaveCount(0);
  }
  await expect(scopeButton.nth(MODEL_CODES.length + 1)).toHaveText("차축 베어링");
  await page.locator(`${RULES} [data-slot="checkbox"]`).click();
  const EMPTY = `${RULES} [data-slot="alarm-rules-empty"]`;
  await expect(page.locator(EMPTY)).toHaveText("장치를 지정한 규칙이 없습니다.");
  const empty = (await measure(page, EMPTY)).style;
  expect(empty.paddingTop).toBe("24px");
  expect(empty.fontSize).toBe("14px");
  expect(empty.textAlign).toBe("center");
  expect(empty.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator(CELL)).toHaveCount(1);

  await footerButton(page, RULES, "닫기").click();
  await expect(page.locator(RULES)).toHaveCount(0);
  await openRules(page);
  await expect(page.locator(NOTICE)).toHaveText("");
  await expect(page.locator(`${RULES} [data-slot="checkbox"]`)).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(await cellLines(0)).toEqual(["4분 / 5개", "H 30 · M 12", "전체 규칙"]);
});

test("Alarm 규칙에서 전체 규칙을 끄면 그 규칙을 따르는 Cell만 꺼짐으로 표시됨", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await openRules(page);
  const CELL = `${RULES} [data-slot="rule-cell"]`;
  const cellLines = (index: number) =>
    page.locator(CELL).nth(index).locator("span[data-slot]").allTextContents();

  await page.locator(CELL).first().click();
  await expect(page.locator(`${RULE_EDIT} [data-slot="dialog-title"]`)).toHaveText(
    "알람 규칙 수정 — 전체 (기본)",
  );
  await selectOption(
    page,
    `${RULE_EDIT} [data-slot="select-trigger"] >> nth=2`,
    "N (이 범위 자동 알람 끔)",
  );
  await footerButton(page, RULE_EDIT, "저장").click();
  await expect(page.locator(RULE_EDIT)).toHaveCount(0);
  await expect(page.locator(`${RULES} [aria-disabled="true"]`)).toHaveCount(0);

  expect(await cellLines(0)).toEqual(["3분 / 5개", "H 30 · M 10", "전체 규칙"]);
  await expect(page.locator(CELL).first()).toHaveAttribute("data-tone", "global");
  expect(await cellLines(ruleCellIndex(0, 0))).toEqual(["꺼짐", "전체 규칙"]);
  await expect(page.locator(CELL).nth(ruleCellIndex(0, 0))).toHaveAttribute("data-tone", "off");
  await expect(page.locator(CELL).nth(ruleCellIndex(0, 0))).toHaveAttribute("title", "전체 (기본)");
  expect(await cellLines(ruleCellIndex(0, 1))).toEqual(["5분 / 8개", "H 30 · M 10", "모델 규칙"]);
  expect(await cellLines(ruleCellIndex(1, 0))).toEqual(["1분 / 3개", "H 15 · M 5"]);
});

test("Alarm 규칙을 저장하거나 삭제한 뒤 다시 조회가 끝날 때까지 Cell과 이름을 Click할 수 없음", async ({
  page,
}) => {
  await openAlarms(page, 1920, 1080);
  await openRules(page);
  const CELL = `${RULES} [data-slot="rule-cell"]`;
  const SCOPE = `${RULES} [data-slot="alarm-rule-scope-button"]`;
  const BLOCKED = `${RULES} [aria-disabled="true"]`;
  const NOTICE = `${RULES} [data-slot="alarm-rules-notice"]`;
  const TITLE = `${RULE_EDIT} [data-slot="dialog-title"]`;
  const numberInput = (index: number) =>
    page.locator(`${RULE_EDIT} div[data-slot="text-input"] input`).nth(index);
  const TARGET = 1;
  const cellCount = 1 + DEVICE_NAMES.length * MODEL_CODES.length;
  const scopeCount = MODEL_CODES.length + DEVICE_NAMES.length;
  await expect(page.locator(CELL)).toHaveCount(cellCount);
  await expect(page.locator(SCOPE)).toHaveCount(scopeCount);
  await expect(page.locator(BLOCKED)).toHaveCount(0);

  await page.evaluate(
    ({ cell, scope, target }) => {
      const grid = document.querySelector('[data-slot="alarm-rules-grid"]');
      if (!grid) throw new Error("규칙 표 없음");
      const log = { blockedCells: 0, blockedScopes: 0, releasedCells: 0, clicks: 0 };
      (window as unknown as { ruleReloadLog: typeof log }).ruleReloadLog = log;
      new MutationObserver((records) => {
        for (const record of records) {
          const element = record.target as HTMLElement;
          const becameBlocked = record.oldValue !== "true";
          if (element.matches(cell)) {
            if (becameBlocked) log.blockedCells += 1;
            else log.releasedCells += 1;
          }
          if (element.matches(scope) && becameBlocked) log.blockedScopes += 1;
        }
        const targetCell = document.querySelectorAll<HTMLElement>(cell)[target];
        if (targetCell?.getAttribute("aria-disabled") !== "true") return;
        targetCell.click();
        log.clicks += 1;
      }).observe(grid, {
        subtree: true,
        attributeFilter: ["aria-disabled"],
        attributeOldValue: true,
      });
    },
    { cell: CELL, scope: SCOPE, target: TARGET },
  );
  const reloadLog = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            ruleReloadLog: {
              blockedCells: number;
              blockedScopes: number;
              releasedCells: number;
              clicks: number;
            };
          }
        ).ruleReloadLog,
    );

  await page.locator(CELL).nth(TARGET).click();
  await expect(page.locator(TITLE)).toHaveText("알람 규칙 추가 — 차상신호장치 · IF");
  await numberInput(0).fill("7");
  await footerButton(page, RULE_EDIT, "저장").click();
  await expect(page.locator(NOTICE)).toHaveText("저장되었습니다. 다음 추론부터 적용됩니다.");
  await expect(page.locator(BLOCKED)).toHaveCount(0);
  expect(await reloadLog()).toEqual({
    blockedCells: cellCount,
    blockedScopes: scopeCount,
    releasedCells: cellCount,
    clicks: 1,
  });
  await expect(page.locator(RULE_EDIT)).toHaveCount(0);
  await expect(page.locator(RULES)).toBeVisible();

  await page.locator(CELL).nth(TARGET).click();
  await expect(page.locator(TITLE)).toHaveText("알람 규칙 수정 — 차상신호장치 · IF");
  await expect(numberInput(0)).toHaveValue("7");

  await footerButton(page, RULE_EDIT, "삭제").click();
  await page.locator(`${RULE_DELETE} [data-slot="alert-dialog-action"]`).click();
  await expect(page.locator(NOTICE)).toHaveText(
    "삭제되었습니다. 다음 추론부터 더 넓은 규칙을 따릅니다.",
  );
  await expect(page.locator(BLOCKED)).toHaveCount(0);
  expect(await reloadLog()).toEqual({
    blockedCells: cellCount * 2,
    blockedScopes: scopeCount * 2,
    releasedCells: cellCount * 2,
    clicks: 2,
  });
  await expect(page.locator(RULE_EDIT)).toHaveCount(0);
  await page.locator(CELL).nth(TARGET).click();
  await expect(page.locator(TITLE)).toHaveText("알람 규칙 추가 — 차상신호장치 · IF");
  await expect(numberInput(0)).toHaveValue("3");
});

test("Toast의 크기, 위치, Color, 사라지는 시간 확인", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await expect(page.locator(TOAST)).toHaveCount(0);
  await page.locator(BODY_ROW).nth(0).locator('[data-slot="checkbox"]').click();
  await page.locator(`${BULK_BAR} [data-slot="action-button"]`).nth(0).click();
  await expect(page.locator(TOAST)).toHaveText("1건을 확인 처리했습니다.");
  const shownAt = Date.now();
  await page.waitForTimeout(400);

  const toast = await box(page, TOAST);
  expect(toast.width).toBe(440);
  expect(toast.height).toBe(46);
  expect(toast.x + toast.width).toBe(1920 - 24);
  expect(toast.y + toast.height).toBe(1080 - 24);
  const style = (await measure(page, TOAST)).style;
  expect(style.minWidth).toBe("440px");
  expect(await styleOf(page, TOAST, "max-width")).toBe("640px");
  expect(style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(style.borderTopWidth).toBe("1px");
  expect(style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(style.borderTopLeftRadius).toBe("8px");
  expect(visibleShadow(style.boxShadow)).toBe(TOAST_SHADOW);
  expect(style.opacity).toBe("1");
  const content = (await measure(page, `${TOAST} [data-slot="toast-content"]`)).style;
  expect(content.paddingTop).toBe("12px");
  expect(content.paddingLeft).toBe("18px");
  expect(content.columnGap).toBe("12px");
  const text = (await measure(page, `${TOAST} [data-slot="toast-description"]`)).style;
  expect(text.fontSize).toBe("14px");
  expect(text.color).toBe(await color(page, "var(--fg)"));
  const icon = await measure(page, `${TOAST} [data-slot="toast-icon"]`);
  expect(icon.width).toBe(20);
  expect(icon.style.color).toBe(await color(page, "var(--success)"));
  expect(
    await page.evaluate(
      (selector) => document.querySelector(selector)?.querySelector("path")?.getAttribute("d"),
      `${TOAST} [data-slot="toast-icon"]`,
    ),
  ).toBe(iconShape("Check"));
  await expect(page.locator('[data-slot="toast-viewport"]')).toHaveAttribute("role", "region");
  await expect(page.locator('[data-slot="toast-viewport"]')).toHaveAttribute("aria-label", "알림");

  await expect(page.locator(TOAST)).toHaveCount(0, { timeout: 5000 });
  const elapsed = Date.now() - shownAt;
  expect(elapsed).toBeGreaterThan(TOAST_TIMEOUT - 300);
  expect(elapsed).toBeLessThan(TOAST_TIMEOUT + 1500);

  await page.locator(BODY_ROW).nth(1).locator('[data-slot="checkbox"]').click();
  await page.locator(BODY_ROW).nth(2).locator('[data-slot="checkbox"]').click();
  await page.locator(`${BULK_BAR} [data-slot="action-button"]`).nth(0).click();
  await expect(page.locator(TOAST)).toHaveText("2건을 확인 처리했습니다.");
  await rowButton(page, 9, 1).click();
  await page.locator(`${ALARM_DELETE} [data-slot="alert-dialog-action"]`).click();
  await expect(page.locator(`${TOAST}:not([data-ending-style])`)).toHaveText("알람을 삭제했습니다.");
  await expect(page.locator(`${TOAST}:not([data-ending-style])`)).toHaveCount(1);
});

async function topmostAtToast(page: Page): Promise<string> {
  return page.evaluate((selector) => {
    const toast = document.querySelector(selector);
    if (!toast) return "토스트 없음";
    const rect = toast.getBoundingClientRect();
    const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    if (top === null) return "요소 없음";
    if (toast.contains(top)) return "toast";
    return top.closest("[data-slot]")?.getAttribute("data-slot") ?? top.tagName;
  }, `${TOAST}:not([data-ending-style])`);
}

async function raiseToast(page: Page): Promise<void> {
  await page.locator(BODY_ROW).nth(0).locator('[data-slot="checkbox"]').click();
  await page.locator(`${BULK_BAR} [data-slot="action-button"]`).nth(0).click();
  await expect(page.locator(`${TOAST}:not([data-ending-style])`)).toHaveText(
    "1건을 확인 처리했습니다.",
  );
}

for (const theme of ["라이트", "다크"] as const) {
  test(`Modal이 열려 있는 동안 Toast가 Overlay보다 위에 표시됨 (${theme} Theme)`, async ({
    page,
  }) => {
    await openAlarms(page, 1920, 1080);
    if (theme === "다크") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }

    await raiseToast(page);
    expect(await topmostAtToast(page)).toBe("toast");

    await raiseToast(page);
    await openCreate(page);
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(1);
    expect(await topmostAtToast(page)).toBe("toast");
    await page.keyboard.press("Escape");
    await expect(page.locator(CREATE)).toHaveCount(0);

    await raiseToast(page);
    await rowButton(page, 9, 1).click();
    await expect(page.locator(ALARM_DELETE)).toBeVisible();
    await expect(page.locator('[data-slot="alert-dialog-overlay"]')).toHaveCount(1);
    expect(await topmostAtToast(page)).toBe("toast");
    await page.keyboard.press("Escape");
    await expect(page.locator(ALARM_DELETE)).toHaveCount(0);

    await raiseToast(page);
    await openRules(page);
    await ruleCell(page, 0, 0).click();
    await expect(page.locator(RULE_EDIT)).toBeVisible();
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(2);
    expect(await topmostAtToast(page)).toBe("toast");

    const toast = await box(page, `${TOAST}:not([data-ending-style])`);
    await page.mouse.click(toast.x + toast.width / 2, toast.y + toast.height / 2);
    await page.waitForTimeout(300);
    await expect(page.locator(RULE_EDIT)).toBeVisible();
    await expect(page.locator(RULES)).toBeVisible();
    await page.mouse.click(40, 40);
    await expect(page.locator(RULE_EDIT)).toHaveCount(0);
    await expect(page.locator(RULES)).toBeVisible();
  });
}

for (const theme of ["라이트", "다크"] as const) {
  test(`Alarm 규칙에 Hover하면 왼쪽 위 Cell의 배경이 바뀌고 나머지 Cell은 조금 어두워짐 (${theme} Theme)`, async ({
    page,
  }) => {
    await openAlarms(page, 1920, 1080);
    if (theme === "다크") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    await openRules(page);
    const CELL = `${RULES} [data-slot="rule-cell"]`;
    const token = (name: string) => color(page, `var(--${name})`);
    const hovered = async (index: number) => {
      await page.locator(CELL).nth(index).hover();
      await page.waitForTimeout(300);
      return [
        (await measure(page, CELL, index)).style.backgroundColor,
        await styleOf(page, CELL, "filter", index),
      ];
    };
    const resting = async (index: number) => [
      (await measure(page, CELL, index)).style.backgroundColor,
      await styleOf(page, CELL, "filter", index),
    ];

    expect(await resting(0)).toEqual([await token("card"), "none"]);
    expect(await resting(ruleCellIndex(0, 0))).toEqual([await token("card"), "none"]);

    expect(await hovered(0)).toEqual([await token("muted"), "none"]);
    await expect(ruleCell(page, 0, 0).locator('[data-slot="rule-cell-tertiary"]')).toHaveText(
      "전체 규칙",
    );
    expect(await hovered(ruleCellIndex(0, 0))).toEqual([await token("card"), "brightness(0.97)"]);
    expect(await resting(0)).toEqual([await token("card"), "none"]);
    expect(await hovered(ruleCellIndex(0, 1))).toEqual([await token("card"), "brightness(0.97)"]);
    expect(await hovered(ruleCellIndex(1, 0))).toEqual([
      await token("caution-subtle"),
      "brightness(0.97)",
    ]);
  });
}

for (const theme of ["라이트", "다크"] as const) {
  test(`Alarm 등록에서 Hover한 바닥 Row의 Button과 심각도 Button Group의 Color 확인 (${theme} Theme)`, async ({
    page,
  }) => {
    await openAlarms(page, 1920, 1080);
    if (theme === "다크") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    await openCreate(page);
    const ITEM = `${CREATE} [data-slot="segmented"] [data-slot="toggle-group-item"]`;
    const BUTTON = `${CREATE} [data-slot="dialog-footer"] [data-slot="action-button"]`;
    const CLEAR = "rgba(0, 0, 0, 0)";
    const token = (name: string) => color(page, `var(--${name})`);
    const colors = async (selector: string, index: number) => {
      const { style } = await measure(page, selector, index);
      return [style.backgroundColor, style.color, style.fontWeight];
    };
    const hovered = async (selector: string, index: number) => {
      await page.locator(selector).nth(index).hover();
      await page.waitForTimeout(300);
      return colors(selector, index);
    };

    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    await expect(page.locator(BUTTON)).toHaveText(["취소", "등록"]);
    await expect(page.locator(ITEM)).toHaveText(["LOW", "MID", "HIGH", "CRIT"]);
    expect(await colors(BUTTON, 0)).toEqual([await token("card"), await token("fg"), "600"]);
    expect(await colors(BUTTON, 1)).toEqual([
      await token("primary"),
      await token("on-primary"),
      "600",
    ]);
    expect(await colors(ITEM, 0)).toEqual([CLEAR, await token("muted-fg"), "400"]);
    expect(await colors(ITEM, 1)).toEqual([await token("card"), await token("fg"), "600"]);

    expect(await hovered(BUTTON, 0)).toEqual([await token("muted"), await token("fg"), "600"]);
    expect(await hovered(BUTTON, 1)).toEqual([
      await token("primary-hover"),
      await token("on-primary"),
      "600",
    ]);
    expect(await colors(BUTTON, 0)).toEqual([await token("card"), await token("fg"), "600"]);

    expect(await hovered(ITEM, 0)).toEqual([CLEAR, await token("fg"), "400"]);
    expect(await hovered(ITEM, 3)).toEqual([CLEAR, await token("fg"), "400"]);
    expect(await colors(ITEM, 0)).toEqual([CLEAR, await token("muted-fg"), "400"]);
    expect(await hovered(ITEM, 1)).toEqual([await token("card"), await token("fg"), "600"]);

    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    expect(await colors(ITEM, 3)).toEqual([CLEAR, await token("muted-fg"), "400"]);
    expect(await colors(BUTTON, 1)).toEqual([
      await token("primary"),
      await token("on-primary"),
      "600",
    ]);
  });
}

async function focusedText(page: Page): Promise<string> {
  return page.evaluate(() => document.activeElement?.textContent ?? "");
}

test("Modal은 닫기 Button, 취소, Esc로 닫히고 Focus가 Modal 안에 머물다가 연 Button으로 돌아옴", async ({
  page,
}) => {
  await openAlarms(page, 1920, 1080);

  await openCreate(page);
  await expect(page.locator(CREATE)).toHaveAttribute("role", "dialog");
  const titleId = await page.locator(`${CREATE} [data-slot="dialog-title"]`).getAttribute("id");
  expect(titleId).toBeTruthy();
  await expect(page.locator(CREATE)).toHaveAttribute("aria-labelledby", titleId ?? "");
  expect(await focusIsInside(page, CREATE)).toBe(true);
  const rulesButton = await box(page, `${FILTER} [data-slot="action-button"]`, 1);
  expect(
    await page.evaluate(
      ([x, y]) => (document.elementFromPoint(x, y) as HTMLElement | null)?.dataset.slot ?? null,
      [rulesButton.x + rulesButton.width / 2, rulesButton.y + rulesButton.height / 2],
    ),
  ).toBe("dialog-overlay");
  expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("닫기");
  const order: string[] = [];
  for (let step = 0; step < 12; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, CREATE)).toBe(true);
    order.push(
      await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        return element?.dataset.slot ?? "";
      }),
    );
  }
  expect(order).toEqual([
    "select-trigger",
    "select-trigger",
    "text-input",
    "text-input",
    "text-input",
    "toggle-group-item",
    "input-group-control",
    "text-input",
    "text-input",
    "text-area-input",
    "action-button",
    "action-button",
  ]);
  expect(await focusedText(page)).toBe("등록");
  await pressTab(page);
  expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("닫기");
  await pressTab(page, "Shift+Tab");
  expect(await focusedText(page)).toBe("등록");
  for (let step = 0; step < 30; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, CREATE)).toBe(true);
  }
  for (let step = 0; step < 30; step += 1) {
    await pressTab(page, "Shift+Tab");
    expect(await focusIsInside(page, CREATE)).toBe(true);
  }
  await page.locator(`${CREATE} input[data-slot="text-input"]`).nth(1).fill("405");
  await page.mouse.click(40, 40);
  await expect(page.locator(CREATE)).toBeVisible();
  await expect(page.locator(`${CREATE} input[data-slot="text-input"]`).nth(1)).toHaveValue("405");
  await page.keyboard.press("Escape");
  await expect(page.locator(CREATE)).toHaveCount(0);
  expect(await focusedText(page)).toBe("알람 등록");
  await openCreate(page);
  await expect(page.locator(`${CREATE} input[data-slot="text-input"]`).nth(1)).toHaveValue("");
  await page.locator(`${CREATE} [data-slot="dialog-close"]`).click();
  await expect(page.locator(CREATE)).toHaveCount(0);
  expect(await focusedText(page)).toBe("알람 등록");
  await openCreate(page);
  await footerButton(page, CREATE, "취소").click();
  await expect(page.locator(CREATE)).toHaveCount(0);
  expect(await focusedText(page)).toBe("알람 등록");
  await page.keyboard.press("Enter");
  await expect(page.locator(CREATE)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(CREATE)).toHaveCount(0);

  await openProcess(page, 4);
  expect(await focusIsInside(page, PROCESS)).toBe(true);
  await page.mouse.click(40, 40);
  await expect(page.locator(PROCESS)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(PROCESS)).toHaveCount(0);
  expect(
    await page.evaluate(
      (selector) =>
        [...document.querySelectorAll(selector)].indexOf(
          document.activeElement?.closest('[data-slot="table-row"]') as Element,
        ),
      BODY_ROW,
    ),
  ).toBe(4);
  expect(await focusedText(page)).toBe("처리");

  await openAssign(page, [1]);
  await page.mouse.click(40, 40);
  await expect(page.locator(ASSIGN)).toBeVisible();
  await page.locator(`${ASSIGN} [data-slot="dialog-close"]`).click();
  await expect(page.locator(ASSIGN)).toHaveCount(0);
  await expect(page.locator(`${BULK_BAR} [data-slot="bulk-bar-label"]`)).toHaveText("선택 1건");
  expect(await focusedText(page)).toBe("담당자 지정");

  await openRules(page);
  await page.mouse.click(40, 40);
  await expect(page.locator(RULES)).toHaveCount(0);
  await openRules(page);
  await ruleCell(page, 1, 0).click();
  await expect(page.locator(RULE_EDIT)).toBeVisible();
  expect(await focusIsInside(page, RULE_EDIT)).toBe(true);
  for (let step = 0; step < 30; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, RULE_EDIT)).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(RULE_EDIT)).toHaveCount(0);
  await expect(page.locator(RULES)).toBeVisible();
  expect(await focusIsInside(page, RULES)).toBe(true);
  expect(
    await page.evaluate(() => document.activeElement?.getAttribute("title") ?? null),
  ).toBe("차축 베어링 · IF");
  await page.keyboard.press("Escape");
  await expect(page.locator(RULES)).toHaveCount(0);
  expect(await focusedText(page)).toBe("알람 규칙");
});

test("Browser Dialog이 낮으면 Modal은 Dialog 높이에서 64를 뺀 만큼까지만 커지고 본문이 Scroll됨", async ({ page }) => {
  await openAlarms(page, 1440, 800);
  await openRules(page);
  expect((await box(page, `${RULES} [data-slot="alarm-rules-table"]`)).height).toBeCloseTo(
    800 * 0.52,
    1,
  );
  await ruleCell(page, 0, 0).click();
  const frame = await box(page, RULE_EDIT);
  expect(frame.height).toBe(800 - 64);
  expect(frame.y).toBe(32);
  expect(frame.width).toBe(RULE_EDIT_WIDTH);
  expect(await styleOf(page, RULE_EDIT, "overflow-y")).toBe("hidden");
  const BODY = `${RULE_EDIT} [data-slot="alarm-rule-edit-body"]`;
  const scroll = await page.evaluate((selector) => {
    const body = document.querySelector(selector) as HTMLElement;
    return [body.scrollHeight, body.clientHeight, getComputedStyle(body).overflowY];
  }, BODY);
  expect(scroll[2]).toBe("auto");
  expect(Number(scroll[0])).toBe(BANNER_HEIGHT + 14 + 170 + 14 + 390);
  expect(Number(scroll[1])).toBe(736 - 34 - 36 - 14 - 14 - 32);
  const footer = await box(page, `${RULE_EDIT} [data-slot="dialog-footer"]`);
  expect(footer.y + footer.height).toBe(32 + 736 - 17);
  await page.locator(BODY).evaluate((body) => body.scrollTo(0, body.scrollHeight));
  expect((await box(page, `${RULE_EDIT} [data-slot="dialog-header"]`)).y).toBe(32 + 17);
  await expect(page.locator(`${RULE_EDIT} input[data-slot="text-input"]`)).toBeInViewport();
});

test("다크 Theme에서 Modal, 확인 Dialog, Toast의 Color 확인", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const token = (name: string) => color(page, `var(--${name})`);
  const background = async (selector: string, index = 0) =>
    (await measure(page, selector, index)).style.backgroundColor;
  const textColor = async (selector: string, index = 0) =>
    (await measure(page, selector, index)).style.color;
  const borderColor = async (selector: string, index = 0) =>
    (await measure(page, selector, index)).style.borderTopColor;

  await openCreate(page);
  await footerButton(page, CREATE, "등록").click();
  await page.waitForTimeout(300);
  expect(await background('[data-slot="dialog-overlay"]')).toBe(await token("scrim"));
  expect(await background(CREATE)).toBe(await token("dialog"));
  expect(await borderColor(CREATE)).toBe(await token("border"));
  expect(await textColor(`${CREATE} [data-slot="dialog-title"]`)).toBe(await token("fg"));
  expect(await textColor(`${CREATE} [data-slot="dialog-close"]`)).toBe(await token("fg"));
  expect(await background(`${CREATE} [data-slot="alarm-create-form"]`)).toBe(
    await token("surface-low"),
  );
  expect(await background(`${CREATE} [data-slot="select-trigger"]`)).toBe(await token("card"));
  expect(await borderColor(`${CREATE} [data-slot="select-trigger"]`)).toBe(await token("border"));
  expect(await background(`${CREATE} input[data-slot="text-input"]`)).toBe(await token("card"));
  expect(await textColor(`${CREATE} input[data-slot="text-input"]`)).toBe(await token("fg"));
  expect(await borderColor(`${CREATE} input[aria-invalid="true"]`)).toBe(await token("danger"));
  expect(await background(`${CREATE} div[data-slot="text-input"]`)).toBe(await token("card"));
  expect(await borderColor(`${CREATE} div[data-slot="text-input"]`)).toBe(await token("danger"));
  expect(await background(`${CREATE} [data-slot="text-area-input"]`)).toBe(await token("card"));
  expect(await background(`${CREATE} [data-slot="segmented"]`)).toBe(await token("muted"));
  expect(await background(`${CREATE} [data-slot="toggle-group-item"]`, 1)).toBe(
    await token("card"),
  );
  expect(await textColor(`${CREATE} [data-slot="toggle-group-item"]`, 0)).toBe(
    await token("muted-fg"),
  );
  expect(await background(`${CREATE} [data-slot="alert-banner"]`)).toBe(
    await token("danger-subtle"),
  );
  expect(await textColor(`${CREATE} [data-slot="alert-banner"]`)).toBe(
    await token("on-danger-subtle"),
  );
  expect(await textColor(`${CREATE} [data-slot="field-error"]`)).toBe(await token("danger"));
  const createButtons = `${CREATE} [data-slot="dialog-footer"] [data-slot="action-button"]`;
  expect(await background(createButtons)).toBe(await token("card"));
  expect(await borderColor(createButtons)).toBe(await token("border"));
  expect(await background(createButtons, 1)).toBe(await token("primary"));
  expect(await textColor(createButtons, 1)).toBe(await token("on-primary"));
  await page.keyboard.press("Escape");
  await expect(page.locator(CREATE)).toHaveCount(0);

  await openProcess(page, 2);
  const OPTION = `${PROCESS} [data-slot="state-option"]`;
  expect(await background(OPTION, 0)).toBe(await token("brand-line4-subtle"));
  expect(await textColor(OPTION, 0)).toBe(await token("brand-line4-text"));
  expect(await borderColor(OPTION, 0)).toBe(await token("brand-line4"));
  expect(await background(OPTION, 2)).toBe(await token("primary"));
  expect(await background(OPTION, 3)).toBe(await token("card"));
  expect(await borderColor(OPTION, 3)).toBe(await token("border"));
  expect(await textColor(OPTION, 3)).toBe(await token("fg"));
  const STAMP = `${PROCESS} [data-slot="alarm-process-stamp"]`;
  expect(await background(STAMP)).toBe(await token("card"));
  expect(await borderColor(STAMP)).toBe(await token("border-strong"));
  expect(await background(`${PROCESS} [data-slot="alarm-severity"]`)).toBe(await token("danger"));
  expect(await textColor(`${PROCESS} [data-slot="alarm-severity"]`)).toBe(await token("danger-fg"));
  const processButtons = `${PROCESS} [data-slot="dialog-footer"] [data-slot="action-button"]`;
  expect(await background(processButtons)).toBe(await token("danger"));
  expect(await textColor(processButtons)).toBe(await token("danger-fg"));
  await footerButton(page, PROCESS, "삭제").click();
  await expect(page.locator(ALARM_DELETE)).toBeVisible();
  expect(await background('[data-slot="alert-dialog-overlay"]')).toBe(await token("scrim"));
  expect(await background(ALARM_DELETE)).toBe(await token("surface-low"));
  expect(await borderColor(ALARM_DELETE)).toBe(await token("border"));
  expect(await background(`${ALARM_DELETE} [data-slot="alert-dialog-media"]`)).toBe(
    await token("danger-subtle"),
  );
  expect(await textColor(`${ALARM_DELETE} [data-slot="alert-dialog-media"]`)).toBe(
    await token("danger"),
  );
  expect(await textColor(`${ALARM_DELETE} [data-slot="alert-dialog-title"]`)).toBe(
    await token("fg"),
  );
  expect(await textColor(`${ALARM_DELETE} [data-slot="alert-dialog-description"]`)).toBe(
    await token("muted-fg"),
  );
  expect(await background(`${ALARM_DELETE} [data-slot="alert-dialog-cancel"]`)).toBe(
    await token("card"),
  );
  expect(await borderColor(`${ALARM_DELETE} [data-slot="alert-dialog-cancel"]`)).toBe(
    await token("border"),
  );
  expect(await background(`${ALARM_DELETE} [data-slot="alert-dialog-action"]`)).toBe(
    await token("danger"),
  );
  expect(await textColor(`${ALARM_DELETE} [data-slot="alert-dialog-action"]`)).toBe(
    await token("on-primary"),
  );
  await page.locator(`${ALARM_DELETE} [data-slot="alert-dialog-action"]`).click();
  await expect(page.locator(PROCESS)).toHaveCount(0);

  await expect(page.locator(TOAST)).toHaveText("알람을 삭제했습니다.");
  await page.waitForTimeout(400);
  expect(await background(TOAST)).toBe(await token("card"));
  expect(await borderColor(TOAST)).toBe(await token("border"));
  expect(await textColor(`${TOAST} [data-slot="toast-description"]`)).toBe(await token("fg"));
  expect(await textColor(`${TOAST} [data-slot="toast-icon"]`)).toBe(await token("success"));

  await openAssign(page, [0]);
  expect(await background(`${ASSIGN} [data-slot="alert-banner"]`)).toBe(
    await token("brand-line4-subtle"),
  );
  expect(await textColor(`${ASSIGN} [data-slot="alert-banner"]`)).toBe(await token("fg"));
  expect(await textColor(`${ASSIGN} [data-slot="assignee-bulk-list-title"]`)).toBe(
    await token("brand-line4-text"),
  );
  expect(await borderColor(`${ASSIGN} [data-slot="assignee-bulk-item"]`)).toBe(
    await token("border"),
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(ASSIGN)).toHaveCount(0);

  await openRules(page);
  const CELL = `${RULES} [data-slot="rule-cell"]`;
  expect(await background(`${RULES} [data-slot="alarm-rules-table"]`)).toBe(await token("card"));
  expect(await background(CELL)).toBe(await token("card"));
  expect(await borderColor(CELL)).toBe(await token("border"));
  expect((await measure(page, CELL)).style.borderLeftColor).toBe(await token("border-strong"));
  const ownIndex = 1 + MODEL_CODES.length;
  expect(await background(CELL, ownIndex)).toBe(await token("caution-subtle"));
  expect(await borderColor(CELL, ownIndex)).toBe(
    await color(page, "color-mix(in srgb, var(--caution) 45%, var(--card))"),
  );
  expect((await measure(page, CELL, ownIndex)).style.borderLeftColor).toBe(await token("caution"));
  expect(await textColor(CELL, ownIndex)).toBe(await token("fg"));
  expect(await textColor(`${RULES} [data-slot="alarm-rule-scope-button"]`, 1)).toBe(
    await token("warning-strong"),
  );
  expect(await background(`${RULES} [data-slot="checkbox"]`)).toBe(await token("card"));
  expect(await borderColor(`${RULES} [data-slot="checkbox"]`)).toBe(await token("border-strong"));
  expect(await textColor(`${RULES} [data-slot="alarm-rules-description"]`)).toBe(
    await token("muted-fg"),
  );
  await page.locator(CELL).first().click();
  await expect(page.locator(RULE_EDIT)).toBeVisible();
  expect(await background('[data-slot="dialog-overlay"]', 1)).toBe(SOFT_OVERLAY);
  expect(await background(RULE_EDIT)).toBe(await token("dialog"));
  const TRIGGER = `${RULE_EDIT} [data-slot="select-trigger"]`;
  expect(await background(TRIGGER)).toBe(await token("muted"));
  expect(await textColor(TRIGGER)).toBe(await token("muted-fg"));
  expect(await background(TRIGGER, 2)).toBe(await token("card"));
  expect(await background(`${RULE_EDIT} div[data-slot="text-input"]`)).toBe(await token("card"));
  expect(await textColor(`${RULE_EDIT} [data-slot="text-input-unit"]`)).toBe(
    await token("muted-fg"),
  );
  expect(await background(`${RULE_EDIT} [data-slot="alarm-rule-edit-conditions"]`)).toBe(
    await token("surface-low"),
  );
});

test("기본 Font 크기를 2배로 하면 Modal, 확인 Dialog, Toast의 크기도 2배가 됨", async ({ page }) => {
  await openAlarms(page, 1920, 1080);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page.waitForTimeout(400);

  await openAssign(page, [0, 2]);
  await page.waitForTimeout(400);
  const frame = await box(page, ASSIGN);
  expect(frame.width).toBe(ASSIGN_WIDTH * 2);
  expect(frame.height).toBe(1080 - 128);
  const frameStyle = (await measure(page, ASSIGN)).style;
  expect(frameStyle.paddingTop).toBe("32px");
  expect(frameStyle.borderTopWidth).toBe("2px");
  expect(frameStyle.borderTopLeftRadius).toBe("32px");
  expect(frameStyle.rowGap).toBe("28px");
  expect(visibleShadow(frameStyle.boxShadow)).toBe("rgba(0, 0, 0, 0.3) 0px 48px 128px 0px");
  const header = await measure(page, `${ASSIGN} [data-slot="dialog-header"]`);
  expect(header.height).toBe(72);
  const title = (await measure(page, `${ASSIGN} [data-slot="dialog-title"]`)).style;
  expect(title.fontSize).toBe("44px");
  expect(title.lineHeight).toBe("56px");
  const close = await measure(page, `${ASSIGN} [data-slot="dialog-close"]`);
  expect(close.width).toBe(64);
  expect((await box(page, `${ASSIGN} [data-slot="dialog-close"] svg`)).width).toBe(40);
  const section = (await measure(page, `${ASSIGN} [data-slot="assignee-bulk-targets"]`)).style;
  expect(section.paddingTop).toBe("32px");
  expect(section.paddingLeft).toBe("36px");
  expect(section.borderTopLeftRadius).toBe("24px");
  expect(section.borderTopWidth).toBe("2px");
  const item = await measure(page, `${ASSIGN} [data-slot="assignee-bulk-item"]`);
  expect(item.height).toBe(104);
  expect(item.style.borderBottomWidth).toBe("2px");
  const badge = await measure(page, `${ASSIGN} [data-slot="alarm-severity"]`);
  expect(badge.width).toBe(104);
  expect(badge.height).toBe(48);
  expect((await measure(page, `${ASSIGN} [data-slot="assignee-bulk-item-title"]`)).width).toBe(280);
  const trigger = await measure(page, `${ASSIGN} [data-slot="select-trigger"]`);
  expect(trigger.height).toBe(64);
  expect(trigger.style.borderTopWidth).toBe("2px");
  expect(trigger.style.borderTopLeftRadius).toBe("12px");
  expect(trigger.style.paddingLeft).toBe("24px");
  expect(trigger.style.fontSize).toBe("28px");
  const rows = await boxes(page, `${ASSIGN} [data-slot="form-row"]`);
  const contents = await boxes(page, `${ASSIGN} [data-slot="field-content"]`);
  expect(contents[0].x - rows[0].x).toBeCloseTo(LABEL_WIDTH_LG * 2, 1);
  const label = await measure(page, `${ASSIGN} [data-slot="field-label"]`);
  expect(label.height).toBe(80);
  expect(label.style.marginTop).toBe("-8px");
  const area = await measure(page, `${ASSIGN} [data-slot="text-area-input"]`);
  expect(area.height).toBe(textAreaHeight(3) * 2);
  expect(area.style.paddingTop).toBe("20px");
  expect(area.style.lineHeight).toBe("40px");
  const footer = await measure(page, `${ASSIGN} [data-slot="dialog-footer"]`);
  expect(footer.height).toBe(64);
  await expectButton(
    page,
    `${ASSIGN} [data-slot="dialog-footer"] [data-slot="action-button"]`,
    { height: 32, paddingX: 16, weight: "600", background: "var(--card)", text: "var(--fg)", border: "var(--border)", scale: 2 },
  );
  const scroll = await page.evaluate((selector) => {
    const body = document.querySelector(selector) as HTMLElement;
    return body.scrollHeight > body.clientHeight;
  }, `${ASSIGN} [data-slot="modal-body-scroll"]`);
  expect(scroll).toBe(true);
  await footerButton(page, ASSIGN, "지정").click();
  const error = await measure(page, `${ASSIGN} [data-slot="field-error"]`);
  expect(error.height).toBe(FIELD_ERROR_HEIGHT * 2);
  expect(error.style.fontSize).toBe("24px");
  await page.locator(`${ASSIGN} [data-slot="text-area-input"]`).focus();
  await page.waitForTimeout(300);
  expect(
    visibleShadow((await measure(page, `${ASSIGN} [data-slot="text-area-input"]`)).style.boxShadow),
  ).toBe("rgb(0, 164, 227) 0px 0px 0px 2px, rgb(229, 246, 253) 0px 0px 0px 8px");
  await page.keyboard.press("Escape");
  await expect(page.locator(ASSIGN)).toHaveCount(0);

  await openCreate(page);
  await page.waitForTimeout(400);
  const create = await box(page, CREATE);
  expect(create.width).toBe(1920 - 128);
  expect(create.x).toBe(64);
  const segmented = await measure(page, `${CREATE} [data-slot="segmented"]`);
  expect(segmented.height).toBe(64);
  expect(segmented.style.paddingTop).toBe("4px");
  expect(segmented.style.columnGap).toBe("4px");
  expect((await measure(page, `${CREATE} [data-slot="toggle-group-item"]`, 1)).height).toBe(56);
  expect(
    visibleShadow(
      (await measure(page, `${CREATE} [data-slot="toggle-group-item"]`, 1)).style.boxShadow,
    ),
  ).toBe("rgba(11, 31, 46, 0.12) 0px 2px 4px 0px");
  const rate = await box(page, `${CREATE} div[data-slot="text-input"]`);
  const unit = await box(page, `${CREATE} [data-slot="text-input-unit"]`);
  expect(rate.height).toBe(64);
  expect(rate.x + rate.width - (unit.x + unit.width)).toBeCloseTo(24, 1);
  await footerButton(page, CREATE, "등록").click();
  await page.waitForTimeout(300);
  expect((await measure(page, `${CREATE} input[aria-invalid="true"]`)).style.borderTopWidth).toBe(
    "4px",
  );
  const banner = await measure(page, `${CREATE} [data-slot="alert-banner"]`);
  expect(banner.height).toBe(BANNER_HEIGHT * 2);
  expect(banner.style.paddingLeft).toBe("32px");
  expect((await box(page, `${CREATE} [data-slot="alert-banner"] svg`)).width).toBe(40);
  await page.keyboard.press("Escape");
  await expect(page.locator(CREATE)).toHaveCount(0);

  await rowButton(page, 9, 1).click();
  await expect(page.locator(ALARM_DELETE)).toBeVisible();
  await page.waitForTimeout(400);
  const confirm = await measure(page, ALARM_DELETE);
  expect(confirm.width).toBe(CONFIRM_WIDTH * 2);
  expect(confirm.style.paddingTop).toBe("48px");
  expect(confirm.style.borderTopLeftRadius).toBe("32px");
  expect(confirm.style.borderTopWidth).toBe("2px");
  expect((await measure(page, `${ALARM_DELETE} [data-slot="alert-dialog-media"]`)).width).toBe(88);
  expect((await box(page, `${ALARM_DELETE} [data-slot="alert-dialog-media"] svg`)).width).toBe(44);
  const confirmTitle = (await measure(page, `${ALARM_DELETE} [data-slot="alert-dialog-title"]`))
    .style;
  expect(confirmTitle.fontSize).toBe("44px");
  expect(confirmTitle.lineHeight).toBe("56px");
  expect((await measure(page, `${ALARM_DELETE} [data-slot="alert-dialog-action"]`)).height).toBe(80);
  await page.locator(`${ALARM_DELETE} [data-slot="alert-dialog-action"]`).click();

  await expect(page.locator(TOAST)).toHaveText("알람을 삭제했습니다.");
  await page.waitForTimeout(400);
  const toast = await box(page, TOAST);
  expect(toast.width).toBe(880);
  expect(toast.height).toBe(92);
  expect(toast.x + toast.width).toBe(1920 - 48);
  expect(toast.y + toast.height).toBe(1080 - 48);
  const toastStyle = (await measure(page, TOAST)).style;
  expect(toastStyle.borderTopWidth).toBe("2px");
  expect(toastStyle.borderTopLeftRadius).toBe("16px");
  expect(visibleShadow(toastStyle.boxShadow)).toBe("rgba(7, 21, 31, 0.16) 0px 16px 48px 0px");
  expect((await box(page, `${TOAST} [data-slot="toast-icon"]`)).width).toBe(40);
});

const SCALE_SCENES: { name: string; modalSlots: number; open: (page: Page) => Promise<void> }[] = [
  {
    name: "알람 등록 · 입력 오류 표시",
    modalSlots: 65,
    open: async (page) => {
      await openCreate(page);
      await footerButton(page, CREATE, "등록").click();
      await expect(page.locator(`${CREATE} [data-slot="field-error"]`)).toHaveCount(3);
    },
  },
  {
    name: "알람 처리 위의 삭제 확인",
    modalSlots: 50,
    open: async (page) => {
      await openProcess(page, 2);
      await footerButton(page, PROCESS, "삭제").click();
      await expect(page.locator(ALARM_DELETE)).toBeVisible();
    },
  },
  {
    name: "담당자 지정",
    modalSlots: 31,
    open: async (page) => {
      await openAssign(page, [0, 2]);
    },
  },
  {
    name: "알람 규칙 위의 규칙 추가",
    modalSlots: 459,
    open: async (page) => {
      await openRules(page);
      await ruleCell(page, 0, 0).click();
      await expect(page.locator(RULE_EDIT)).toBeVisible();
    },
  },
];

for (const scene of SCALE_SCENES) {
  test(`3840×2160 화면의 Modal은 1920×1080 화면의 2배 (${scene.name})`, async ({ page }) => {
    const openScene = async (width: number, height: number) => {
      await openAlarms(page, width, height);
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

test("움직임 줄이기를 켜면 Modal, 확인 Dialog, Toast는 크기와 위치 변화 없이 Fade만 적용됨", async ({
  page,
}) => {
  await openAlarms(page, 1920, 1080);
  await openCreate(page);
  expect(await enterMotion(page, CREATE)).toEqual(["enter", "0.1s", "1", "0"]);
  expect(await enterMotion(page, '[data-slot="dialog-overlay"]')).toEqual([
    "enter",
    "0.1s",
    "1",
    "0",
  ]);
  await page.keyboard.press("Escape");
  await expect(page.locator(CREATE)).toHaveCount(0);
  await rowButton(page, 9, 1).click();
  await expect(page.locator(ALARM_DELETE)).toBeVisible();
  expect(await enterMotion(page, ALARM_DELETE)).toEqual(["enter", "0.1s", "1", "0"]);
  await page.locator(`${ALARM_DELETE} [data-slot="alert-dialog-action"]`).click();
  await expect(page.locator(TOAST)).toBeVisible();
  expect(await styleOf(page, TOAST, "transition-property")).toBe("opacity");
  expect(await styleOf(page, TOAST, "transition-duration")).toBe("0.2s");
  await page.waitForTimeout(400);
  expect((await box(page, TOAST)).y + 46).toBe(1080 - 24);
});

interface BannerFrame {
  count: number;
  time: number;
  opacity: number;
  offsetY: number;
  modalHeight: number;
}

function recordBanner(page: Page, root: string, frameCount: number): Promise<BannerFrame[]> {
  return page.evaluate(
    async ({ root, frameCount }) => {
      const frames: BannerFrame[] = [];
      for (let index = 0; index < frameCount; index += 1) {
        const time = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
        const modal = document.querySelector(root)?.getBoundingClientRect();
        const banners = document.querySelectorAll(`${root} [data-slot="alert-banner"]`);
        const banner = banners[0];
        frames.push({
          count: banners.length,
          time,
          opacity: banner ? Number(getComputedStyle(banner).opacity) : -1,
          offsetY: banner && modal ? banner.getBoundingClientRect().y - modal.y : -1,
          modalHeight: modal?.height ?? -1,
        });
      }
      return frames;
    },
    { root, frameCount },
  );
}

function fadeInTime(shown: BannerFrame[]): number {
  const full = shown.find((frame) => frame.opacity === 1);
  return full ? full.time - shown[0].time : -1;
}

async function bannerOffsetY(page: Page, root: string): Promise<number> {
  return (await box(page, `${root} [data-slot="alert-banner"]`)).y - (await box(page, root)).y;
}

async function recordCreateErrorBanner(
  page: Page,
): Promise<{ entering: BannerFrame[]; leaving: BannerFrame[]; restY: number }> {
  const restY = MODAL_BORDER + MODAL_PADDING + MODAL_HEADER_HEIGHT + MODAL_GAP;
  await openAlarms(page, 1920, 1080);
  await openCreate(page);
  await page.waitForTimeout(400);
  const FORM = `${CREATE} [data-slot="alarm-create-form"]`;
  const BANNER = `${CREATE} [data-slot="alert-banner"]`;
  const input = (index: number) => page.locator(`${FORM} input[data-slot="text-input"]`).nth(index);

  const enteringFrames = recordBanner(page, CREATE, 50);
  await footerButton(page, CREATE, "등록").click();
  const entering = await enteringFrames;
  await expect(page.locator(BANNER)).toHaveText(
    "입력값 3개를 확인하세요. 표시된 칸을 수정하면 등록할 수 있습니다.",
  );
  expect(await bannerOffsetY(page, CREATE)).toBeCloseTo(restY, 1);

  await input(1).fill("426");
  await page.locator(`${FORM} div[data-slot="text-input"] input`).fill("12.5");
  await expect(page.locator(BANNER)).toHaveText(
    "입력값 1개를 확인하세요. 표시된 칸을 수정하면 등록할 수 있습니다.",
  );
  const leavingFrames = recordBanner(page, CREATE, 50);
  await input(3).fill("2026-09-23 10:00:00");
  const leaving = await leavingFrames;
  await expect(page.locator(BANNER)).toHaveCount(0);
  return { entering, leaving, restY };
}

test("움직임 줄이기를 켜면 오류 알림 띠는 제자리에서 Fade로 나타나고 사라짐", async ({ page }) => {
  const { entering, leaving, restY } = await recordCreateErrorBanner(page);

  const shown = entering.filter((frame) => frame.count > 0);
  expect(shown.length).toBeGreaterThan(10);
  expect(shown[0].opacity).toBeLessThan(0.5);
  expect(shown.filter((frame) => frame.opacity > 0 && frame.opacity < 1).length).toBeGreaterThan(2);
  expect(shown[shown.length - 1].opacity).toBe(1);
  const fadeTime = fadeInTime(shown);
  expect(fadeTime).toBeGreaterThan(100);
  expect(fadeTime).toBeLessThan(450);
  for (const [index, frame] of shown.entries()) {
    if (index > 0) expect(frame.opacity).toBeGreaterThanOrEqual(shown[index - 1].opacity);
    expect(frame.offsetY).toBeCloseTo(restY, 1);
  }
  expect(new Set(shown.map((frame) => frame.modalHeight)).size).toBe(1);

  const fading = leaving.filter((frame) => frame.count > 0 && frame.opacity < 1);
  expect(fading.length).toBeGreaterThan(2);
  expect(leaving[leaving.length - 1].count).toBe(0);
  for (const frame of fading) expect(frame.offsetY).toBeCloseTo(restY, 1);
});

test.describe("움직임 줄이기를 끈 화면", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("Modal, 확인 Dialog, Toast는 기본 Animation으로 표시되고 끝난 위치는 같음", async ({ page }) => {
    await openAlarms(page, 1920, 1080);
    await openCreate(page);
    expect(await enterMotion(page, CREATE)).toEqual(["enter", "0.1s", ".95", "0"]);
    expect(await enterMotion(page, '[data-slot="dialog-overlay"]')).toEqual([
      "enter",
      "0.1s",
      "1",
      "0",
    ]);
    await page.waitForTimeout(400);
    const frame = await box(page, CREATE);
    expect(frame.width).toBe(CREATE_WIDTH);
    expect(frame.x).toBe((1920 - CREATE_WIDTH) / 2);
    expect(frame.y).toBe((1080 - 438) / 2);
    await page.keyboard.press("Escape");
    await expect(page.locator(CREATE)).toHaveCount(0);

    await rowButton(page, 9, 1).click();
    await expect(page.locator(ALARM_DELETE)).toBeVisible();
    expect(await enterMotion(page, ALARM_DELETE)).toEqual(["enter", "0.1s", ".95", "0"]);
    await page.locator(`${ALARM_DELETE} [data-slot="alert-dialog-action"]`).click();
    await expect(page.locator(TOAST)).toBeVisible();
    expect(await styleOf(page, TOAST, "transition-property")).toBe("transform, opacity, height");
    expect(await styleOf(page, TOAST, "transition-duration")).toBe("0.5s, 0.5s, 0.15s");
    await page.waitForTimeout(700);
    const toast = await box(page, TOAST);
    expect(toast.y + toast.height).toBe(1080 - 24);
    expect(toast.x + toast.width).toBe(1920 - 24);
  });

  test("오류 알림 띠는 0.2초 동안 Fade하며 4 아래에서 올라오고 같은 경로로 사라짐", async ({ page }) => {
    const { entering, leaving, restY } = await recordCreateErrorBanner(page);

    const shown = entering.filter((frame) => frame.count > 0);
    expect(shown.length).toBeGreaterThan(10);
    expect(shown[0].opacity).toBeLessThan(0.5);
    expect(shown[0].offsetY).toBeGreaterThan(restY);
    expect(shown[0].offsetY).toBeLessThanOrEqual(restY + 4);
    expect(shown.filter((frame) => frame.opacity > 0 && frame.opacity < 1).length).toBeGreaterThan(2);
    expect(shown.filter((frame) => frame.offsetY > restY).length).toBeGreaterThan(2);
    const last = shown[shown.length - 1];
    expect(last.opacity).toBe(1);
    expect(last.offsetY).toBeCloseTo(restY, 1);
    const fadeTime = fadeInTime(shown);
    expect(fadeTime).toBeGreaterThan(100);
    expect(fadeTime).toBeLessThan(450);
    for (const [index, frame] of shown.entries()) {
      if (index === 0) continue;
      expect(frame.opacity).toBeGreaterThanOrEqual(shown[index - 1].opacity);
      expect(frame.offsetY).toBeLessThanOrEqual(shown[index - 1].offsetY);
    }
    expect(new Set(shown.map((frame) => frame.modalHeight)).size).toBe(1);

    const fading = leaving.filter((frame) => frame.count > 0 && frame.opacity < 1);
    expect(fading.length).toBeGreaterThan(2);
    expect(leaving[leaving.length - 1].count).toBe(0);
    for (const frame of fading) {
      expect(frame.offsetY).toBeGreaterThan(restY);
      expect(frame.offsetY).toBeLessThanOrEqual(restY + 4);
    }
  });

  test("규칙 추가의 오류 띠와 채워 둔 값 안내 띠는 같은 위치에서 차례로 바뀜", async ({ page }) => {
    await openAlarms(page, 1920, 1080);
    await openRules(page);
    await ruleCell(page, 0, 0).click();
    await expect(page.locator(RULE_EDIT)).toBeVisible();
    await page.waitForTimeout(400);
    const BANNER = `${RULE_EDIT} [data-slot="alert-banner"]`;
    const numberInput = page.locator(`${RULE_EDIT} div[data-slot="text-input"] input`).first();
    await expect(page.locator(BANNER)).toHaveAttribute("role", "note");
    expect((await measure(page, BANNER)).style.opacity).toBe("1");
    const restY = await bannerOffsetY(page, RULE_EDIT);
    const height = (await box(page, RULE_EDIT)).height;

    await numberInput.fill("");
    const enteringFrames = recordBanner(page, RULE_EDIT, 50);
    await footerButton(page, RULE_EDIT, "저장").click();
    const entering = await enteringFrames;
    await expect(page.locator(BANNER)).toHaveAttribute("role", "alert");
    expect(entering.filter((frame) => frame.opacity > 0 && frame.opacity < 1).length).toBeGreaterThan(2);
    expect(entering[entering.length - 1].opacity).toBe(1);
    expect(await bannerOffsetY(page, RULE_EDIT)).toBeCloseTo(restY, 1);

    const leavingFrames = recordBanner(page, RULE_EDIT, 50);
    await numberInput.fill("3");
    const leaving = await leavingFrames;
    await expect(page.locator(BANNER)).toHaveAttribute("role", "note");
    expect(leaving.filter((frame) => frame.opacity > 0 && frame.opacity < 1).length).toBeGreaterThan(2);
    expect(leaving[leaving.length - 1].opacity).toBe(1);
    expect(await bannerOffsetY(page, RULE_EDIT)).toBeCloseTo(restY, 1);

    for (const frame of [...entering, ...leaving]) {
      expect(frame.count).toBe(1);
      expect(frame.modalHeight).toBeCloseTo(height, 1);
    }
  });
});
