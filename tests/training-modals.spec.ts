import { expect, test, type Page } from "@playwright/test";
import type { ComponentProps } from "react";
import type { FieldMessage } from "../src/components/atoms/FieldMessage";
import type { TextInput } from "../src/components/atoms/TextInput";
import type { AlertBanner } from "../src/components/molecules/AlertBanner";
import type { CheckboxItem } from "../src/components/molecules/CheckboxItem";
import {
  createTrainingScheduleDraft,
  findTrainingScheduleProblem,
  toTrainingScheduleInput,
  trainingScheduleProblemField,
  type TrainingScheduleDraft,
} from "../src/domain/training";
import { formatTimeOfDayHourMinute } from "../src/lib/formatTime";
import {
  fetchTrainingJobDetail,
  fetchTrainingResultDetail,
  fetchTrainingResults,
  fetchTrainingScheduleOptions,
} from "../src/services/training";
import { DEVICE_CODES_IN_GRID, DEVICE_NAMES_IN_GRID } from "./helpers/jobRequest";
import {
  calendarDayCell,
  color,
  isoDaysAgo,
  measure,
  pickOption,
  visibleShadow,
} from "./helpers/measure";
import {
  SECTION_PADDING_X,
  SECTION_PADDING_Y,
  box,
  boxes,
  type Box,
  collectSlotRects,
  doubledMismatches,
  enterMotion,
  expectButton,
  expectModalFrame,
  expectSection,
  focusIsInside,
  focusedSlot,
  footerButton,
  frameHeight,
  iconShape,
  modal,
  pressTab,
  shownIconShape,
  styleOf,
  textWhileClosing,
  texts,
} from "./helpers/modal";
import { TRAINING_RESULT_ROW, openTraining } from "./helpers/training";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const FILTER = '[data-slot="training-filter-bar"]';
const KPI = '[data-slot="training-kpi-row"] [data-slot="kpi-stat"]';
const JOB = '[data-slot="training-job-list"] [data-slot="job-card"]';
const ROW = TRAINING_RESULT_ROW;
const TOAST = '[data-slot="toast"]';
const OPEN_SELECT = '[data-slot="select-content"][data-open]';
const OPEN_ITEMS = `${OPEN_SELECT} [data-slot="select-item"]`;
const PICKER = '[data-slot="popover-content"][data-picker="range"]';
const CALENDAR = `${PICKER} [data-slot="calendar"]`;

const SCHEDULE = modal("training-schedule");
const JOB_DETAIL = modal("training-job-detail");
const RESULT_DETAIL = modal("training-result-detail");

const FIELDS = `${SCHEDULE} [data-slot="job-request-fields"]`;
const FORMATION_TRIGGER = `${FIELDS} [data-slot="select-trigger"]`;
const DEVICES = `${SCHEDULE} [data-slot="job-request-devices"]`;
const DEVICE_LIST = `${SCHEDULE} [data-slot="job-request-device-list"]`;
const DEVICE_ITEM = `${DEVICE_LIST} [data-slot="checkbox-item"]`;
const DATE_TRIGGER = `${SCHEDULE} [data-slot="date-range-trigger"]`;
const SEGMENT_ITEM = `${SCHEDULE} [data-slot="toggle-group-item"]`;
const FIELD_ERROR = `${SCHEDULE} [data-slot="field-error"]`;
const DEVICE_SEARCH = `${SCHEDULE} [data-slot="job-request-devices-header"] input`;

const SCHEDULE_WIDTH = 900;
const JOB_WIDTH = 1000;
const RESULT_WIDTH = 1700;
const RESULT_HEIGHT = 900;
const FIELDS_HEIGHT = 36 * 4 + 12 * 3 + SECTION_PADDING_Y * 2 + 2;
const DEVICES_HEIGHT = 32 + 12 + 246 + SECTION_PADDING_Y * 2 + 2;
const SCHEDULE_HEIGHT = frameHeight(FIELDS_HEIGHT + 14 + DEVICES_HEIGHT);
const LABEL_WIDTH = 136;
const KEY_VALUE_HEIGHT = 38;
const PANEL_TITLE_GAP = 8;
const SEGMENT_SHADOW = "rgba(11, 31, 46, 0.12) 0px 1px 2px 0px";

const scheduleButton = (page: Page) =>
  page.locator(FILTER).getByRole("button", { name: "학습 예약", exact: true });

async function openSchedule(page: Page): Promise<void> {
  await scheduleButton(page).click();
  await expect(page.locator(SCHEDULE)).toBeVisible();
}

async function openJob(page: Page, index: number): Promise<void> {
  await page.locator(JOB).nth(index).click();
  await expect(page.locator(JOB_DETAIL)).toBeVisible();
  await expect(
    page.locator(`${JOB_DETAIL} [data-slot="key-value-row-value"]`).nth(9),
  ).not.toHaveText("–");
}

async function openResult(page: Page, index: number): Promise<void> {
  await page.locator(ROW).nth(index).click();
  await expect(page.locator(RESULT_DETAIL)).toBeVisible();
  await expect(page.locator(`${RESULT_DETAIL} [data-slot="chart-dot"]`).first()).toBeVisible();
}

async function selectEnterTransform(page: Page): Promise<[string, string]> {
  return page.evaluate((selector) => {
    const popup = document.querySelector<HTMLElement>(selector);
    if (!popup) throw new Error(`요소 없음: ${selector}`);
    const style = getComputedStyle(popup);
    const value = (name: string, fallback: string) =>
      style.getPropertyValue(name).trim() || fallback;
    const scale = value("--tw-enter-scale", "1");
    const probe = document.createElement("div");
    probe.style.transform = `translate3d(${value("--tw-enter-translate-x", "0")}, ${value("--tw-enter-translate-y", "0")}, 0) scale3d(${scale}, ${scale}, ${scale})`;
    document.body.append(probe);
    const transform = getComputedStyle(probe).transform;
    probe.remove();
    return [popup.dataset.side ?? "", transform];
  }, OPEN_SELECT);
}

function mockupHash(text: string, modulo: number): number {
  let hash = 7;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return hash % modulo;
}

function mockupThresholdChart(deviceCode: string, threshold: number) {
  const values = [0.93, 0.99, 1.04, 0.99, 0.93, 1].map((factor, index) =>
    index === 5
      ? threshold
      : threshold * (threshold < 0 ? 2 - factor : factor) +
        (mockupHash(deviceCode + index, 7) - 3) * Math.abs(threshold) * 0.003,
  );
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = (high - low) * 0.25 || Math.abs(threshold) * 0.05;
  const bottom = low - pad;
  const top = high + pad;
  return {
    values,
    ticks: [4, 3, 2, 1, 0].map((index) => (bottom + ((top - bottom) * index) / 4).toFixed(2)),
    yPercent: values.map((value) => (1 - (value - bottom) / (top - bottom)) * 100),
    xPercent: values.map((_, index) => 2 + (index * 96) / 5),
  };
}

function mockupLearningCurve() {
  const curve = (speed: number, floor: number) =>
    Array.from(
      { length: 41 },
      (_, index) => 100 - (Math.exp(-index / speed) * (100 - floor) + floor),
    );
  const train = curve(7, 9);
  const validation = curve(9, 20).map((y, index) => (index > 26 ? y - (index - 26) * 0.25 : y));
  const round2 = (value: number) => Number(value.toFixed(2));
  return {
    trainY: train,
    validationY: validation,
    tip: (index: number) =>
      `train ${(1 - (round2(train[index]) / 100 / 0.94) * 0.94).toFixed(3)} · val ${(1 - round2(validation[index]) / 100).toFixed(3)}`,
  };
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`학습 예약 Modal의 크기, 배치, Text, Color (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await openTraining(page, viewport.width, viewport.height);
    await openSchedule(page);
    const { frame, header, contentWidth } = await expectModalFrame(page, "training-schedule", {
      width: SCHEDULE_WIDTH,
      height: SCHEDULE_HEIGHT,
      title: "학습 예약",
    });
    expect(await styleOf(page, SCHEDULE, "overflow-y")).toBe("hidden");

    const body = await box(page, `${SCHEDULE} [data-slot="modal-body-scroll"]`);
    expect(body.x).toBeCloseTo(header.x - 4, 1);
    expect(body.width).toBeCloseTo(contentWidth + 8, 1);
    expect(body.y).toBeCloseTo(header.y + 36 + 14, 1);
    const fields = await box(page, FIELDS);
    const devices = await box(page, DEVICES);
    expect(fields.x).toBeCloseTo(header.x, 1);
    expect(fields.width).toBeCloseTo(contentWidth, 1);
    expect(fields.height).toBeCloseTo(FIELDS_HEIGHT, 1);
    expect(devices.y).toBeCloseTo(fields.y + fields.height + 14, 1);
    expect(devices.height).toBeCloseTo(DEVICES_HEIGHT, 1);
    await expectSection(page, FIELDS);
    await expectSection(page, DEVICES);
    expect((await measure(page, FIELDS)).style.rowGap).toBe("12px");
    expect((await measure(page, DEVICES)).style.rowGap).toBe("12px");

    const rows = await boxes(page, `${FIELDS} [data-slot="form-row"]`);
    expect(rows).toHaveLength(4);
    rows.forEach((row, index) => {
      expect(row.x).toBeCloseTo(fields.x + 1 + SECTION_PADDING_X, 1);
      expect(row.height).toBeCloseTo(36, 1);
      expect(row.y).toBeCloseTo(fields.y + 1 + SECTION_PADDING_Y + index * (36 + 12), 1);
    });
    expect(await texts(page, `${FIELDS} [data-slot="field-label"]`)).toEqual([
      "학습 일자*",
      "학습 시각",
      "학습 모델*",
      "편성 번호",
    ]);
    const label = await measure(page, `${FIELDS} [data-slot="field-label"]`);
    expect(label.style.fontSize).toBe("14px");
    expect(label.style.fontWeight).toBe("700");
    expect(label.height).toBe(40);
    const asterisk = await measure(page, `${FIELDS} [data-slot="field-label"] span`);
    expect(asterisk.style.color).toBe(await color(page, "var(--danger)"));
    expect(asterisk.style.paddingLeft).toBe("2px");
    const controlX = rows[0].x + LABEL_WIDTH;

    const trigger = await measure(page, DATE_TRIGGER);
    const triggerBox = await box(page, DATE_TRIGGER);
    expect(triggerBox.x).toBeCloseTo(controlX, 1);
    expect(triggerBox.y).toBeCloseTo(rows[0].y, 1);
    expect(trigger.width).toBe(306);
    expect(trigger.height).toBe(32);
    expect(trigger.style.paddingLeft).toBe("12px");
    expect(trigger.style.paddingRight).toBe("12px");
    expect(trigger.style.borderTopLeftRadius).toBe("6px");
    expect(trigger.style.borderTopWidth).toBe("1px");
    expect(trigger.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(trigger.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(trigger.style.color).toBe(await color(page, "var(--fg)"));
    expect(trigger.style.fontSize).toBe("14px");
    expect(trigger.style.columnGap).toBe("10px");
    expect(await styleOf(page, DATE_TRIGGER, "font-variant-numeric")).toBe("tabular-nums");
    await expect(page.locator(DATE_TRIGGER)).toHaveText("2026-09-16 ~ 2026-09-22");
    expect((await box(page, `${DATE_TRIGGER} svg`)).width).toBe(18);
    expect(await shownIconShape(page, DATE_TRIGGER)).toBe(iconShape("CalendarToday"));

    const inputs = await boxes(page, `${FIELDS} [data-slot="text-input"]`);
    expect(inputs.map((input) => [input.width, input.height])).toEqual([
      [140, 32],
      [140, 32],
    ]);
    expect(inputs[0].x).toBeCloseTo(controlX, 1);
    expect(inputs[0].y).toBeCloseTo(rows[1].y, 1);
    const tilde = await box(
      page,
      `${FIELDS} [data-slot="form-row"]:nth-child(2) span[aria-hidden]`,
    );
    expect(tilde.x).toBeCloseTo(inputs[0].x + 140 + 10, 1);
    expect(inputs[1].x).toBeCloseTo(tilde.x + tilde.width + 10, 1);
    expect(
      (await measure(page, `${FIELDS} [data-slot="form-row"]:nth-child(2) span[aria-hidden]`)).style
        .color,
    ).toBe(await color(page, "var(--muted-fg)"));
    const startInput = await measure(page, `${FIELDS} [data-slot="text-input"]`);
    expect(startInput.style.paddingLeft).toBe("12px");
    expect(startInput.style.borderTopLeftRadius).toBe("6px");
    expect(startInput.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(startInput.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(startInput.style.fontSize).toBe("14px");
    await expect(page.locator(`${FIELDS} [data-slot="text-input"]`).nth(0)).toHaveValue("00:00:00");
    await expect(page.locator(`${FIELDS} [data-slot="text-input"]`).nth(1)).toHaveValue("23:59:59");
    await expect(page.locator(`${FIELDS} [data-slot="text-input"]`).nth(0)).toHaveAttribute(
      "placeholder",
      "00:00:00",
    );
    await expect(page.locator(`${FIELDS} [data-slot="text-input"]`).nth(1)).toHaveAttribute(
      "placeholder",
      "23:59:59",
    );

    const segmented = await measure(page, `${SCHEDULE} [data-slot="segmented"]`);
    const segmentedBox = await box(page, `${SCHEDULE} [data-slot="segmented"]`);
    expect(segmentedBox.x).toBeCloseTo(controlX, 1);
    expect(segmentedBox.y).toBeCloseTo(rows[2].y, 1);
    expect(segmented.height).toBe(34);
    expect(segmented.style.paddingTop).toBe("2px");
    expect(segmented.style.borderTopWidth).toBe("1px");
    expect(segmented.style.borderTopColor).toBe("rgba(0, 0, 0, 0)");
    expect(segmented.style.borderTopLeftRadius).toBe("8px");
    expect(segmented.style.backgroundColor).toBe(await color(page, "var(--muted)"));
    expect(segmented.style.columnGap).toBe("2px");
    expect(await texts(page, SEGMENT_ITEM)).toEqual(["IF", "SVM", "VAE", "PCA"]);
    const items = await boxes(page, SEGMENT_ITEM);
    items.forEach((item, index) => {
      expect(item.height).toBe(28);
      if (index > 0) expect(item.x).toBeCloseTo(items[index - 1].x + items[index - 1].width + 2, 1);
    });
    const item = await measure(page, SEGMENT_ITEM);
    expect(item.style.paddingLeft).toBe("16px");
    expect(item.style.borderTopLeftRadius).toBe("6px");
    expect(item.style.fontWeight).toBe("400");
    expect(item.style.color).toBe(await color(page, "var(--muted-fg)"));
    expect(item.style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    await expect(page.locator(`${SEGMENT_ITEM}[aria-pressed="true"]`)).toHaveCount(0);

    const select = await measure(page, `${FIELDS} [data-slot="select-trigger"]`);
    const selectBox = await box(page, `${FIELDS} [data-slot="select-trigger"]`);
    expect(selectBox.x).toBeCloseTo(controlX, 1);
    expect(selectBox.y).toBeCloseTo(rows[3].y, 1);
    expect([select.width, select.height]).toEqual([306, 32]);
    expect(select.style.paddingLeft).toBe("12px");
    expect(select.style.paddingRight).toBe("10px");
    expect(select.style.color).toBe(await color(page, "var(--fg)"));
    await expect(page.locator(`${FIELDS} [data-slot="select-trigger"]`)).toHaveText(
      "전체 (401 – 426)",
    );
    expect((await box(page, `${FIELDS} [data-slot="select-trigger"] svg`)).width).toBe(18);
    expect(await shownIconShape(page, `${FIELDS} [data-slot="select-trigger"] svg`)).toBe(
      iconShape("KeyboardArrowDown"),
    );

    const head = await box(page, `${DEVICES} [data-slot="job-request-devices-header"]`);
    expect(head.x).toBeCloseTo(devices.x + 1 + SECTION_PADDING_X, 1);
    expect(head.y).toBeCloseTo(devices.y + 1 + SECTION_PADDING_Y, 1);
    expect(head.height).toBe(32);
    expect(
      (await measure(page, `${DEVICES} [data-slot="job-request-devices-header"]`)).style.columnGap,
    ).toBe("8px");
    const title = await measure(page, `${DEVICES} [data-slot="job-request-devices-header"] > span`);
    expect(title.style.fontSize).toBe("14px");
    expect(title.style.fontWeight).toBe("700");
    await expect(
      page.locator(`${DEVICES} [data-slot="job-request-devices-header"] > span`).first(),
    ).toHaveText("대상 장치");
    const count = await measure(page, `${DEVICES} [data-slot="job-request-device-count"]`);
    await expect(page.locator(`${DEVICES} [data-slot="job-request-device-count"]`)).toHaveText(
      "2 / 21",
    );
    expect(count.style.color).toBe(await color(page, "var(--brand-line4-text)"));
    expect(count.style.fontWeight).toBe("700");
    expect(count.style.paddingLeft).toBe("4px");
    const more = await measure(page, `${DEVICES} [data-slot="job-request-device-more"]`);
    await expect(page.locator(`${DEVICES} [data-slot="job-request-device-more"]`)).toHaveText(
      "· 스크롤하면 9개 더 있습니다",
    );
    expect(more.style.fontSize).toBe("12px");
    expect(more.style.color).toBe(await color(page, "var(--muted-fg)"));
    const search = await measure(page, `${DEVICES} [data-slot="text-input"]`);
    const searchBox = await box(page, `${DEVICES} [data-slot="text-input"]`);
    expect([search.width, search.height]).toEqual([200, 32]);
    expect(search.style.borderTopLeftRadius).toBe("6px");
    expect(search.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(search.style.backgroundColor).toBe(await color(page, "var(--card)"));
    const searchIcon = await box(page, `${DEVICES} [data-slot="text-input"] svg`);
    expect(searchIcon.width).toBe(16);
    expect(searchIcon.x).toBeCloseTo(searchBox.x + 1 + 10, 1);
    expect(await shownIconShape(page, `${DEVICES} [data-slot="text-input"]`)).toBe(
      iconShape("Search"),
    );
    const searchInput = await measure(page, DEVICE_SEARCH);
    const searchInputBox = await box(page, DEVICE_SEARCH);
    expect(searchInputBox.x + parseFloat(searchInput.style.paddingLeft)).toBeCloseTo(
      searchIcon.x + 16 + 6 + 2,
      1,
    );
    expect(
      searchInputBox.x + searchInputBox.width - parseFloat(searchInput.style.paddingRight),
    ).toBeCloseTo(searchBox.x + 200 - 1 - 10 - 2, 1);
    await expect(page.locator(DEVICE_SEARCH)).toHaveAttribute("placeholder", "장치 검색");
    const allButton = `${DEVICES} [data-slot="action-button"]`;
    await expect(page.locator(allButton)).toHaveText("전체 선택");
    await expectButton(page, allButton, {
      height: 32,
      paddingX: 14,
      weight: "600",
      background: "var(--card)",
      text: "var(--fg)",
      border: "var(--border)",
    });
    const allBox = await box(page, allButton);
    expect(allBox.x + allBox.width).toBeCloseTo(head.x + head.width, 1);
    expect(allBox.x).toBeCloseTo(searchBox.x + 200 + 8, 1);

    const list = await measure(page, DEVICE_LIST);
    const listBox = await box(page, DEVICE_LIST);
    expect(listBox.y).toBeCloseTo(head.y + 32 + 12, 1);
    expect(listBox.width).toBeCloseTo(head.width, 1);
    expect(list.height).toBe(246);
    expect(list.style.borderTopWidth).toBe("1px");
    expect(list.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(list.style.borderTopLeftRadius).toBe("10px");
    expect(list.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(list.style.paddingTop).toBe("4px");
    expect(list.style.columnGap).toBe("24px");
    expect(await styleOf(page, DEVICE_LIST, "overflow-y")).toBe("auto");
    expect(await texts(page, `${DEVICE_ITEM} [data-slot="field-label"]`)).toEqual(
      DEVICE_NAMES_IN_GRID.map((name) =>
        name === "화재감지장치" || name === "배전반" ? `${name}(학습 불가)` : name,
      ),
    );
    const deviceRows = await boxes(page, DEVICE_ITEM);
    const columnWidth = (listBox.width - 2 - 8 - 24) / 2;
    deviceRows.slice(0, 12).forEach((row, index) => {
      expect(row.width).toBeCloseTo(columnWidth, 1);
      expect(row.height).toBe(36);
      expect(row.x).toBeCloseTo(listBox.x + 1 + 4 + (index % 2) * (columnWidth + 24), 1);
      expect(row.y).toBeCloseTo(listBox.y + 1 + 4 + 2 + Math.floor(index / 2) * 40, 1);
    });
    expect(
      await page
        .locator(DEVICE_ITEM)
        .evaluateAll((items) => items.map((item) => item.getAttribute("title"))),
    ).toEqual(
      DEVICE_CODES_IN_GRID.map((code) =>
        code === "FRU" || code === "IDBC" ? "학습·추론 경로가 아직 없는 장치입니다" : code,
      ),
    );
    const picked = await measure(page, DEVICE_ITEM, 0);
    expect(picked.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
    expect(picked.style.paddingLeft).toBe("10px");
    expect(picked.style.borderTopLeftRadius).toBe("6px");
    expect(picked.style.columnGap).toBe("10px");
    expect(
      (await measure(page, `${DEVICE_ITEM} [data-slot="field-label"]`, 0)).style.fontWeight,
    ).toBe("600");
    const pickedBox = await measure(page, `${DEVICE_ITEM} [data-slot="checkbox"]`, 0);
    expect([pickedBox.width, pickedBox.height]).toEqual([16, 16]);
    expect(pickedBox.style.borderTopLeftRadius).toBe("4px");
    expect(pickedBox.style.backgroundColor).toBe(await color(page, "var(--primary)"));
    await expect(page.locator(`${DEVICE_ITEM} [data-slot="checkbox"][data-checked]`)).toHaveCount(
      2,
    );
    await expect(page.locator(`${DEVICE_ITEM}[data-checked="true"]`)).toHaveText([
      "차상신호장치",
      "드라이빙 기어",
    ]);
    const free = await measure(page, DEVICE_ITEM, 1);
    expect(free.style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(
      (await measure(page, `${DEVICE_ITEM} [data-slot="field-label"]`, 1)).style.fontWeight,
    ).toBe("400");
    const freeBox = await measure(page, `${DEVICE_ITEM} [data-slot="checkbox"]`, 1);
    expect(freeBox.style.borderTopColor).toBe(await color(page, "var(--border-strong)"));
    expect(freeBox.style.backgroundColor).toBe(await color(page, "var(--card)"));
    const blocked = await measure(page, DEVICE_ITEM, 7);
    expect(blocked.style.opacity).toBe("0.45");
    expect((await measure(page, `${DEVICE_ITEM} [data-slot="checkbox"]`, 7)).style.opacity).toBe(
      "1",
    );
    const hint = await measure(page, `${DEVICE_ITEM} [data-slot="checkbox-item-hint"]`);
    expect(hint.style.fontSize).toBe("12px");
    expect(hint.style.color).toBe(await color(page, "var(--muted-fg)"));

    const footnote = await measure(page, `${SCHEDULE} [data-slot="modal-footnote"]`);
    await expect(page.locator(`${SCHEDULE} [data-slot="modal-footnote"]`)).toHaveText(
      "예약하면 장치 학습 예약 카드에 추가됩니다",
    );
    expect(footnote.style.fontSize).toBe("12px");
    expect(footnote.style.color).toBe(await color(page, "var(--muted-fg)"));
    await expect(
      page.locator(`${SCHEDULE} [data-slot="dialog-footer"] [data-slot="action-button"]`),
    ).toHaveText(["취소", "예약"]);
    await expectButton(
      page,
      `${SCHEDULE} [data-slot="dialog-footer"] [data-slot="action-button"]`,
      {
        height: 32,
        paddingX: 16,
        weight: "600",
        background: "var(--card)",
        text: "var(--fg)",
        border: "var(--border)",
      },
    );
    const submit = `${SCHEDULE} [data-slot="dialog-footer"] [data-slot="action-button"]`;
    await expectButton(
      page,
      submit,
      {
        height: 32,
        paddingX: 16,
        weight: "600",
        background: "var(--primary)",
        text: "var(--on-primary)",
      },
      1,
    );
    expect((await boxes(page, `${submit} svg`))[0].width).toBe(18);
    expect(await shownIconShape(page, submit, 1)).toBe(iconShape("Check"));
    expect(frame.width).toBe(SCHEDULE_WIDTH);
  });
}

test("학습 예약에서 Model, 학습 일자, 대상 장치 순서로 확인하고 오류가 난 Input을 고치면 그 오류만 사라짐", async ({
  page,
}) => {
  await openTraining(page);
  await openSchedule(page);
  const submit = footerButton(page, SCHEDULE, "예약");
  const segmented = `${SCHEDULE} [data-slot="segmented"]`;

  await submit.click();
  await expect(page.locator(FIELD_ERROR)).toHaveText(["학습 모델을 선택하세요"]);
  await expect(page.locator(SCHEDULE)).toBeVisible();
  const error = await measure(page, FIELD_ERROR);
  expect(error.style.fontSize).toBe("12px");
  expect(error.style.fontWeight).toBe("700");
  expect(error.style.color).toBe(await color(page, "var(--danger)"));
  expect(error.style.paddingTop).toBe("6px");
  expect(error.style.columnGap).toBe("4px");
  expect((await box(page, `${FIELD_ERROR} svg`)).width).toBe(14);
  expect(await shownIconShape(page, FIELD_ERROR)).toBe(iconShape("WarningAmber"));
  const segmentBox = await box(page, segmented);
  expect((await box(page, FIELD_ERROR)).y).toBeCloseTo(segmentBox.y + segmentBox.height, 1);
  expect((await measure(page, segmented)).style.borderTopColor).toBe(
    await color(page, "var(--danger)"),
  );
  expect((await measure(page, segmented)).height).toBe(34);
  await page.locator(`${FIELDS} [data-slot="text-input"]`).nth(0).fill("09:30");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(1);
  await page.locator(SEGMENT_ITEM).nth(1).click();
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
  await page.waitForTimeout(300);
  expect((await measure(page, segmented)).style.borderTopColor).toBe("rgba(0, 0, 0, 0)");
  const pickedItem = await measure(page, SEGMENT_ITEM, 1);
  expect(pickedItem.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(pickedItem.style.fontWeight).toBe("600");
  expect(pickedItem.style.color).toBe(await color(page, "var(--fg)"));
  expect(visibleShadow(pickedItem.style.boxShadow)).toBe(SEGMENT_SHADOW);

  await page.locator(DATE_TRIGGER).click();
  await expect(page.locator(CALENDAR)).toBeVisible();
  await page.waitForTimeout(300);
  expect((await measure(page, DATE_TRIGGER)).style.borderTopColor).toBe(
    await color(page, "var(--brand-line4)"),
  );
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-10")} button`).click();
  await expect(page.locator(DATE_TRIGGER)).toHaveText("2026-09-10");
  await expect(page.locator(CALENDAR)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await expect(page.locator(SCHEDULE)).toBeVisible();
  await submit.click();
  await expect(page.locator(FIELD_ERROR)).toHaveText(["학습 일자를 선택하세요"]);
  await page.waitForTimeout(300);
  const invalidTrigger = await measure(page, DATE_TRIGGER);
  expect(invalidTrigger.style.borderTopWidth).toBe("2px");
  expect(invalidTrigger.style.borderTopColor).toBe(await color(page, "var(--danger)"));
  expect(visibleShadow(invalidTrigger.style.boxShadow)).toBe("");
  await page.locator(DATE_TRIGGER).click();
  await expect(page.locator(CALENDAR)).toBeVisible();
  await page.waitForTimeout(300);
  expect((await measure(page, DATE_TRIGGER)).style.borderTopColor).toBe(
    await color(page, "var(--danger)"),
  );
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-12")} button`).click();
  await expect(page.locator(DATE_TRIGGER)).toHaveText("2026-09-10 ~ 2026-09-12");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  expect((await measure(page, DATE_TRIGGER)).style.borderTopWidth).toBe("1px");

  await page.locator(`${DEVICE_ITEM} [data-slot="checkbox"]`).nth(0).click();
  await page.locator(`${DEVICE_ITEM} [data-slot="checkbox"]`).nth(10).click();
  await expect(page.locator(`${DEVICES} [data-slot="job-request-device-count"]`)).toHaveText(
    "0 / 21",
  );
  await submit.click();
  await expect(page.locator(FIELD_ERROR)).toHaveText(["학습 대상 장치를 선택하세요"]);
  expect((await measure(page, DEVICES)).style.borderTopColor).toBe(
    await color(page, "var(--danger)"),
  );
  const listBox = await box(page, DEVICE_LIST);
  expect((await box(page, FIELD_ERROR)).y).toBeCloseTo(listBox.y + listBox.height + 12, 1);
  await page.locator(`${FIELDS} [data-slot="select-trigger"]`).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveCount(27);
  await pickOption(page, "403");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(1);
  await page.locator(`${DEVICE_ITEM} [data-slot="field-label"]`).nth(2).click();
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
  expect((await measure(page, DEVICES)).style.borderTopColor).toBe(
    await color(page, "var(--border)"),
  );
  await expect(page.locator(`${DEVICES} [data-slot="job-request-device-count"]`)).toHaveText(
    "1 / 21",
  );
});

test("학습 예약에서 장치 검색, 전체 선택이 되고 학습 불가 장치는 고를 수 없음", async ({ page }) => {
  await openTraining(page);
  await openSchedule(page);
  const allButton = page.locator(`${DEVICES} [data-slot="action-button"]`);
  const count = page.locator(`${DEVICES} [data-slot="job-request-device-count"]`);

  await page.locator(DEVICE_ITEM).nth(7).click({ force: true });
  await expect(count).toHaveText("2 / 21");
  await expect(page.locator(`${DEVICE_ITEM} [data-slot="checkbox"]`).nth(7)).toHaveAttribute(
    "data-disabled",
    "",
  );

  await allButton.click();
  await expect(count).toHaveText("19 / 21");
  await expect(allButton).toHaveText("전체 해제");
  await expect(page.locator(`${DEVICE_ITEM}[data-checked="true"]`)).toHaveCount(19);
  await allButton.click();
  await expect(count).toHaveText("0 / 21");
  await expect(allButton).toHaveText("전체 선택");

  await page.locator(`${DEVICE_ITEM} [data-slot="checkbox"]`).nth(0).click();
  await page.locator(DEVICE_SEARCH).fill("gear");
  await expect(page.locator(`${DEVICE_ITEM} [data-slot="field-label"]`)).toHaveText([
    "드라이빙 기어",
  ]);
  await expect(count).toHaveText("1 / 21");
  await page.locator(DEVICE_SEARCH).fill(" 장치 ");
  await expect(page.locator(DEVICE_ITEM)).toHaveCount(12);
  await page.locator(DEVICE_SEARCH).fill("없는장치");
  await expect(page.locator(DEVICE_ITEM)).toHaveCount(0);
  await page.locator(DEVICE_SEARCH).fill("");
  await expect(page.locator(DEVICE_ITEM)).toHaveCount(21);
  await page.locator(DEVICE_SEARCH).focus();
  await page.waitForTimeout(300);
  const focused = await measure(page, `${DEVICES} [data-slot="text-input"]`);
  expect(focused.style.borderTopColor).toBe(await color(page, "var(--brand-line4)"));
  expect(visibleShadow(focused.style.boxShadow)).toBe(
    `${await color(page, "var(--brand-line4)")} 0px 0px 0px 1px, ${await color(page, "var(--brand-line4-subtle)")} 0px 0px 0px 4px`,
  );
});

test("학습 예약에서 예약하면 닫히고 고른 장치마다 예약 Card가 맨 앞에 표시되며 KPI에 반영되고, 다시 열면 처음 값임", async ({
  page,
}) => {
  await openTraining(page);
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`).nth(2)).toHaveText("3");
  await openSchedule(page);
  await page.locator(SEGMENT_ITEM).nth(2).click();
  await page.locator(`${FIELDS} [data-slot="select-trigger"]`).click();
  await pickOption(page, "405");
  await expect(page.locator(`${FIELDS} [data-slot="select-trigger"]`)).toHaveText("405");
  await page.locator(`${FIELDS} [data-slot="text-input"]`).nth(0).fill(" 08:30 ");
  await footerButton(page, SCHEDULE, "예약").click();

  await expect(page.locator(SCHEDULE)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("학습 예약 완료 — trn-1006 / QUEUED");
  await expect(page.locator(JOB)).toHaveCount(8);
  await expect(page.locator(`${JOB} [data-slot="job-card-title"]`).nth(0)).toHaveText("ATC · VAE");
  await expect(page.locator(`${JOB} [data-slot="job-card-title"]`).nth(1)).toHaveText(
    "DRIVING_GEAR · VAE",
  );
  await expect(page.locator(`${JOB} [data-slot="state-pill"]`).nth(0)).toHaveText("예약");
  await expect(page.locator(`${JOB} [data-slot="job-card-meta"]`).nth(0)).toHaveText(
    "09-23 12:00 · 편성 405 · 12:07 시작 예정",
  );
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`).nth(2)).toHaveText("5");
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-description"]`).nth(2)).toHaveText(
    "예약 3 · 전처리 1 · 학습 1",
  );
  await expect(
    page.locator(`${JOB}[aria-current="true"] [data-slot="job-card-title"]`),
  ).toHaveText("DRIVING_GEAR · IF");

  await page.locator(JOB).nth(0).click();
  await expect(page.locator(JOB_DETAIL)).toBeVisible();
  await expect(page.locator(`${JOB_DETAIL} [data-slot="dialog-title"]`)).toHaveText(
    "학습 상세 · trn-1006",
  );
  await expect(page.locator(`${JOB_DETAIL} [data-slot="key-value-row-value"]`)).toHaveText([
    "trn-1006",
    "학습",
    "ATC VAE",
    "2026-09-23 12:00:00 · –",
    "–",
    "ATC",
    "VAE",
    "405",
    "2026-09-16 08:30 ~ 2026-09-22 23:59",
    "60",
  ]);
  await page.keyboard.press("Escape");
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);

  await openSchedule(page);
  await expect(page.locator(`${SEGMENT_ITEM}[aria-pressed="true"]`)).toHaveCount(0);
  await expect(page.locator(`${FIELDS} [data-slot="select-trigger"]`)).toHaveText(
    "전체 (401 – 426)",
  );
  await expect(page.locator(`${FIELDS} [data-slot="text-input"]`).nth(0)).toHaveValue("00:00:00");
  await expect(page.locator(`${DEVICES} [data-slot="job-request-device-count"]`)).toHaveText(
    "2 / 21",
  );
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
});

async function expectStep(
  page: Page,
  index: number,
  state: "done" | "current" | "failed" | "pending",
  mark: string,
): Promise<void> {
  const STEP = `${JOB_DETAIL} [data-slot="step-item"]`;
  await expect(page.locator(STEP).nth(index)).toHaveAttribute("data-state", state);
  const circle = await measure(page, `${STEP} [data-slot="step-item-mark"]`, index);
  const label = await measure(page, `${STEP} [data-slot="step-item-label"]`, index);
  expect([circle.width, circle.height]).toEqual([28, 28]);
  expect(circle.style.borderTopLeftRadius).toBe("50%");
  expect(circle.style.fontSize).toBe("11px");
  expect(circle.style.fontWeight).toBe("700");
  expect(label.style.fontSize).toBe("14px");
  const thinBorder = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.border = "1.5px solid";
    document.body.append(probe);
    const width = getComputedStyle(probe).borderTopWidth;
    probe.remove();
    return width;
  });
  if (state === "done") {
    expect(circle.style.backgroundColor).toBe(await color(page, "var(--brand-line4)"));
    expect(circle.style.borderTopWidth).toBe("0px");
    expect(circle.style.color).toBe(await color(page, "var(--on-primary)"));
    expect((await boxes(page, `${STEP} [data-slot="step-item-mark"]`)).length).toBeGreaterThan(
      index,
    );
    expect(await shownIconShape(page, `${STEP} [data-slot="step-item-mark"]`, index)).toBe(
      iconShape("Check"),
    );
    expect(label.style.fontWeight).toBe("700");
    expect(label.style.color).toBe(await color(page, "var(--brand-line4-text)"));
    return;
  }
  await expect(page.locator(`${STEP} [data-slot="step-item-mark"]`).nth(index)).toHaveText(mark);
  expect(circle.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(circle.style.borderTopWidth).toBe(thinBorder);
  const tone = {
    current: "var(--brand-line4)",
    failed: "var(--danger)",
    pending: "var(--border-strong)",
  }[state];
  const text = {
    current: "var(--brand-line4-text)",
    failed: "var(--danger)",
    pending: "var(--muted-fg)",
  }[state];
  expect(circle.style.borderTopColor).toBe(await color(page, tone));
  expect(circle.style.color).toBe(await color(page, text));
  expect(label.style.fontWeight).toBe(state === "pending" ? "400" : "700");
  expect(label.style.color).toBe(await color(page, text));
}

async function expectConnectors(page: Page, reached: boolean[]): Promise<void> {
  const CONNECTOR = `${JOB_DETAIL} [data-slot="step-connector"]`;
  await expect(page.locator(CONNECTOR)).toHaveCount(3);
  for (const [index, isReached] of reached.entries()) {
    const line = await measure(page, CONNECTOR, index);
    expect(line.height).toBe(2);
    expect(line.style.borderTopLeftRadius).toBe("1px");
    expect(line.style.backgroundColor).toBe(
      await color(page, isReached ? "var(--brand-line4)" : "var(--border)"),
    );
  }
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`학습 Job 상세에서 진행 중 Job의 크기, 배치, Text, Color (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await openTraining(page, viewport.width, viewport.height);
    await openJob(page, 0);
    const progressRow = (await box(page, `${JOB_DETAIL} [data-slot="progress-bar"]`)).height;
    const panelTitle = (await box(page, `${JOB_DETAIL} [data-slot="panel-eyebrow"]`)).height;
    const stagesHeight = 24 + 14 + 28 + 14 + progressRow + SECTION_PADDING_Y * 2 + 2;
    const panelHeight = panelTitle + KEY_VALUE_HEIGHT * 5 + SECTION_PADDING_Y * 2 + 2;
    const { header, contentWidth } = await expectModalFrame(page, "training-job-detail", {
      width: JOB_WIDTH,
      height: frameHeight(stagesHeight + 14 + panelHeight),
      title: "학습 상세 · trn-1000",
    });
    expect(progressRow).toBeGreaterThanOrEqual(16);
    expect(progressRow).toBeLessThanOrEqual(17);
    expect(panelTitle).toBe(13 + PANEL_TITLE_GAP);

    const STAGES = `${JOB_DETAIL} [data-slot="training-job-stages"]`;
    const stages = await box(page, STAGES);
    expect(stages.x).toBeCloseTo(header.x, 1);
    expect(stages.y).toBeCloseTo(header.y + 36 + 14, 1);
    expect(stages.width).toBeCloseTo(contentWidth, 1);
    await expectSection(page, STAGES);
    expect((await measure(page, STAGES)).style.rowGap).toBe("14px");
    const heading = await measure(page, `${STAGES} > div > span`);
    await expect(page.locator(`${STAGES} > div > span`).first()).toHaveText("진행 단계");
    expect(heading.style.fontSize).toBe("16px");
    expect(heading.style.fontWeight).toBe("700");
    const pill = await measure(page, `${STAGES} [data-slot="state-pill"]`);
    const pillBox = await box(page, `${STAGES} [data-slot="state-pill"]`);
    await expect(page.locator(`${STAGES} [data-slot="state-pill"]`)).toHaveText("학습 중");
    expect(pill.height).toBe(24);
    expect(pill.style.paddingLeft).toBe("10px");
    expect(pill.style.borderTopLeftRadius).toBe("12px");
    expect(pill.style.fontSize).toBe("12px");
    expect(pill.style.fontWeight).toBe("600");
    expect(pill.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
    expect(pill.style.color).toBe(await color(page, "var(--brand-on-line4-subtle)"));
    expect(pillBox.x + pillBox.width).toBeCloseTo(
      stages.x + stages.width - 1 - SECTION_PADDING_X,
      1,
    );

    const TRACK = `${STAGES} [data-slot="training-job-step-track"]`;
    const track = await box(page, TRACK);
    expect(track.y).toBeCloseTo(stages.y + 1 + SECTION_PADDING_Y + 24 + 14, 1);
    expect(track.height).toBe(28);
    expect((await measure(page, TRACK)).style.columnGap).toBe("10px");
    await expect(page.locator(`${STAGES} [data-slot="step-item-label"]`)).toHaveText([
      "전처리",
      "특징벡터",
      "학습",
      "저장",
    ]);
    expect((await measure(page, `${STAGES} [data-slot="step-item"]`)).style.columnGap).toBe("8px");
    await expectStep(page, 0, "done", "");
    await expectStep(page, 1, "done", "");
    await expectStep(page, 2, "current", "3");
    await expectStep(page, 3, "pending", "4");
    await expectConnectors(page, [true, true, false]);
    const lastStep = await box(page, `${STAGES} [data-slot="step-item"]`, 3);
    expect(lastStep.x + lastStep.width).toBeCloseTo(track.x + track.width, 1);

    const BAR = `${STAGES} [data-slot="progress-bar"]`;
    const bar = await box(page, BAR);
    expect(bar.y).toBeCloseTo(track.y + 28 + 14, 1);
    expect((await measure(page, BAR)).style.columnGap).toBe("12px");
    await expect(page.locator(BAR)).toHaveAttribute("role", "progressbar");
    await expect(page.locator(BAR)).toHaveAttribute("aria-valuenow", "68");
    const trackBar = await measure(page, `${BAR} [data-slot="progress-track"]`);
    const trackBox = await box(page, `${BAR} [data-slot="progress-track"]`);
    expect(trackBar.height).toBe(8);
    expect(trackBar.style.borderTopLeftRadius).toBe("4px");
    expect(trackBar.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
    expect(trackBox.x).toBeCloseTo(bar.x, 1);
    const fill = await measure(page, `${BAR} [data-slot="progress-indicator"]`);
    expect(fill.width).toBeCloseTo(trackBox.width * 0.68, 1);
    expect(fill.height).toBe(8);
    expect(fill.style.borderTopLeftRadius).toBe("4px");
    expect(
      await styleOf(page, `${BAR} [data-slot="progress-indicator"]`, "background-image"),
    ).toContain("linear-gradient(90deg");
    expect(
      await styleOf(page, `${BAR} [data-slot="progress-indicator"]`, "background-image"),
    ).toBe(
      `linear-gradient(90deg, ${await color(page, "color-mix(in srgb, var(--brand-line4) 70%, var(--card))")}, ${await color(page, "var(--brand-line4)")})`,
    );
    const value = await measure(page, `${BAR} [data-slot="progress-value"]`);
    const valueBox = await box(page, `${BAR} [data-slot="progress-value"]`);
    await expect(page.locator(`${BAR} [data-slot="progress-value"]`)).toHaveText("68%");
    expect(value.style.fontSize).toBe("14px");
    expect(value.style.fontWeight).toBe("700");
    expect(value.style.color).toBe(await color(page, "var(--brand-line4-text)"));
    expect(await styleOf(page, `${BAR} [data-slot="progress-value"]`, "font-variant-numeric")).toBe(
      "tabular-nums",
    );
    expect(valueBox.x).toBeCloseTo(trackBox.x + trackBox.width + 12, 1);
    const meta = await measure(page, `${BAR} [data-slot="progress-bar-meta"]`);
    const metaBox = await box(page, `${BAR} [data-slot="progress-bar-meta"]`);
    await expect(page.locator(`${BAR} [data-slot="progress-bar-meta"]`)).toHaveText("epoch 7 / 10");
    expect(meta.style.fontSize).toBe("14px");
    expect(meta.style.color).toBe(await color(page, "var(--muted-fg)"));
    expect(metaBox.x).toBeCloseTo(valueBox.x + valueBox.width + 12, 1);
    expect(metaBox.x + metaBox.width).toBeCloseTo(bar.x + bar.width, 1);

    const PANELS = `${JOB_DETAIL} [data-slot="training-job-panel"]`;
    const panels = await boxes(page, PANELS);
    expect(panels).toHaveLength(2);
    expect(panels[0].y).toBeCloseTo(stages.y + stages.height + 14, 1);
    expect(panels[0].width).toBeCloseTo((contentWidth - 14) / 2, 1);
    expect(panels[1].x).toBeCloseTo(panels[0].x + panels[0].width + 14, 1);
    expect(panels[0].height).toBeCloseTo(panelHeight, 1);
    await expectSection(page, PANELS, 0);
    await expectSection(page, PANELS, 1);
    await expect(page.locator(`${PANELS} [data-slot="panel-eyebrow"]`)).toHaveText([
      "JOB",
      "REQUEST",
    ]);
    const eyebrow = await measure(page, `${PANELS} [data-slot="panel-eyebrow"]`);
    expect(eyebrow.style.fontSize).toBe("11px");
    expect(eyebrow.style.fontWeight).toBe("700");
    expect(eyebrow.style.letterSpacing).toBe("0.6px");
    expect(eyebrow.style.color).toBe(await color(page, "var(--brand-line4-text)"));
    expect(eyebrow.style.paddingBottom).toBe("8px");
    await expect(page.locator(`${PANELS} [data-slot="key-value-row-label"]`)).toHaveText([
      "Job ID",
      "종류",
      "라벨",
      "생성 · 시작",
      "종료",
      "장치",
      "모델",
      "편성",
      "학습 기간",
      "윈도우(초)",
    ]);
    await expect(page.locator(`${PANELS} [data-slot="key-value-row-value"]`)).toHaveText([
      "trn-1000",
      "학습",
      "DRIVING_GEAR IF",
      "2026-09-23 09:05:00 · 09:05:00",
      "–",
      "DRIVING_GEAR",
      "IF",
      "401",
      "2026-09-16 00:00 ~ 2026-09-22 23:59",
      "60",
    ]);
    const kv = await measure(page, `${PANELS} [data-slot="key-value-row"]`);
    expect(kv.height).toBe(KEY_VALUE_HEIGHT);
    expect(kv.style.borderBottomWidth).toBe("1px");
    expect(
      await styleOf(page, `${PANELS} [data-slot="key-value-row"]`, "border-bottom-style"),
    ).toBe("dashed");
    expect(kv.style.columnGap).toBe("12px");
    expect(await styleOf(page, `${PANELS} [data-slot="key-value-row-value"]`, "white-space")).toBe(
      "nowrap",
    );

    await expect(page.locator(`${JOB_DETAIL} [data-slot="modal-footnote"]`)).toHaveText(
      "실패 시 오류 메시지가 이 자리에 표시됩니다 · 완료되면 결과(세그먼트·window·특징 수)가 표시됩니다",
    );
    await expect(
      page.locator(`${JOB_DETAIL} [data-slot="dialog-footer"] [data-slot="action-button"]`),
    ).toHaveText(["학습 취소", "닫기"]);
    await expectButton(
      page,
      `${JOB_DETAIL} [data-slot="dialog-footer"] [data-slot="action-button"]`,
      {
        height: 32,
        paddingX: 16,
        weight: "600",
        background: "var(--primary)",
        text: "var(--on-primary)",
      },
      1,
    );
    await expect(page.locator(`${JOB_DETAIL} [data-slot="alert-banner"]`)).toHaveCount(0);
  });
}

test("학습 Job 상세에서 실패, 성공, 예약 Job의 단계, 알림 Banner, 아래 Button", async ({ page }) => {
  await openTraining(page);

  await openJob(page, 5);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="dialog-title"]`)).toHaveText(
    "학습 상세 · trn-1005",
  );
  await expect(page.locator(`${JOB_DETAIL} [data-slot="state-pill"]`)).toHaveText("실패");
  const pill = await measure(page, `${JOB_DETAIL} [data-slot="state-pill"]`);
  expect(pill.style.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect(pill.style.color).toBe(await color(page, "var(--on-danger-subtle)"));
  await expectStep(page, 0, "done", "");
  await expectStep(page, 1, "failed", "!");
  await expectStep(page, 2, "pending", "3");
  await expectStep(page, 3, "pending", "4");
  await expectConnectors(page, [true, false, false]);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="progress-bar"]`)).toHaveCount(0);
  const BANNER = `${JOB_DETAIL} [data-slot="alert-banner"]`;
  await expect(page.locator(BANNER)).toHaveText(
    "특징벡터 생성 실패 — 대상 기간(2026-09-16 ~ 2026-09-22)에 MICOM_COOLER 센서 데이터가 없습니다. 기간을 바꾸거나 수집 상태를 확인한 뒤 다시 시도하세요.",
  );
  const banner = await measure(page, BANNER);
  const bannerBox = await box(page, BANNER);
  const stages = await box(page, `${JOB_DETAIL} [data-slot="training-job-stages"]`);
  expect(bannerBox.y).toBeCloseTo(stages.y + stages.height + 14, 1);
  expect(banner.style.paddingTop).toBe("12px");
  expect(banner.style.paddingLeft).toBe("16px");
  expect(banner.style.borderTopLeftRadius).toBe("8px");
  expect(banner.style.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect(banner.style.color).toBe(await color(page, "var(--on-danger-subtle)"));
  expect(banner.style.fontSize).toBe("14px");
  expect(banner.style.lineHeight).toBe("20px");
  expect(banner.style.fontWeight).toBe("400");
  expect(banner.style.columnGap).toBe("10px");
  const bannerIcon = await box(page, `${BANNER} svg`);
  expect(bannerIcon.width).toBe(18);
  expect(bannerIcon.y).toBeCloseTo(bannerBox.y + 12 + 1, 1);
  expect(await shownIconShape(page, BANNER)).toBe(iconShape("WarningAmber"));
  expect(bannerBox.height).toBe(64);
  const panels = await boxes(page, `${JOB_DETAIL} [data-slot="training-job-panel"]`);
  expect(panels[0].y).toBeCloseTo(bannerBox.y + bannerBox.height + 14, 1);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="key-value-row-value"]`)).toHaveText([
    "trn-1005",
    "학습",
    "MICOM_COOLER SVM",
    "2026-09-23 14:40:00 · 14:40:02",
    "14:41:17 (실패)",
    "MICOM_COOLER",
    "SVM",
    "406",
    "2026-09-16 00:00 ~ 2026-09-22 23:59",
    "60",
  ]);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="modal-footnote"]`)).toHaveText(
    "실패한 잡은 결과 표에 남지 않습니다 · 재시도하면 같은 조건으로 새 잡을 만듭니다",
  );
  const FOOTER_BUTTON = `${JOB_DETAIL} [data-slot="dialog-footer"] [data-slot="action-button"]`;
  await expect(page.locator(FOOTER_BUTTON)).toHaveText(["닫기", "재시도"]);
  await expectButton(page, FOOTER_BUTTON, {
    height: 32,
    paddingX: 16,
    weight: "600",
    background: "var(--card)",
    text: "var(--fg)",
    border: "var(--border)",
  });
  await expectButton(
    page,
    FOOTER_BUTTON,
    {
      height: 32,
      paddingX: 16,
      weight: "600",
      background: "var(--primary)",
      text: "var(--on-primary)",
    },
    1,
  );
  expect((await box(page, `${FOOTER_BUTTON} svg`)).width).toBe(18);
  expect(await shownIconShape(page, FOOTER_BUTTON, 1)).toBe(iconShape("Refresh"));
  await page.keyboard.press("Escape");
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);

  await openJob(page, 2);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="state-pill"]`)).toHaveText("성공");
  const successPill = await measure(page, `${JOB_DETAIL} [data-slot="state-pill"]`);
  expect(successPill.style.backgroundColor).toBe(await color(page, "var(--success-subtle)"));
  expect(successPill.style.color).toBe(await color(page, "var(--on-success-subtle)"));
  for (const index of [0, 1, 2, 3]) await expectStep(page, index, "done", "");
  await expectConnectors(page, [true, true, true]);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="progress-bar"]`)).toHaveCount(0);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="alert-banner"]`)).toHaveCount(0);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="key-value-row-value"]`).nth(3)).toHaveText(
    "2026-09-23 11:19:00 · 11:19:00",
  );
  await expect(page.locator(`${JOB_DETAIL} [data-slot="key-value-row-value"]`).nth(4)).toHaveText(
    "11:48:00",
  );
  await expect(page.locator(`${JOB_DETAIL} [data-slot="key-value-row-value"]`).nth(7)).toHaveText(
    "403",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);

  await openJob(page, 4);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="state-pill"]`)).toHaveText("예약");
  const queuedPill = await measure(page, `${JOB_DETAIL} [data-slot="state-pill"]`);
  expect(queuedPill.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(queuedPill.style.color).toBe(await color(page, "var(--muted-fg)"));
  for (const index of [0, 1, 2, 3]) await expectStep(page, index, "pending", String(index + 1));
  await expectConnectors(page, [false, false, false]);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="key-value-row-value"]`).nth(3)).toHaveText(
    "2026-09-23 13:33:00 · –",
  );
  await expect(page.locator(`${JOB_DETAIL} [data-slot="key-value-row-value"]`).nth(4)).toHaveText(
    "–",
  );

  await page.keyboard.press("Escape");
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await openJob(page, 1);
  await expectStep(page, 0, "current", "1");
  await expectStep(page, 1, "pending", "2");
  await expectConnectors(page, [false, false, false]);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="progress-value"]`)).toHaveText("35%");
  await expect(page.locator(`${JOB_DETAIL} [data-slot="progress-bar-meta"]`)).toHaveText(
    "part 3 / 8",
  );
});

const SIX_DAYS_AFTER_MOCK_TODAY = new Date(2026, 8, 29, 12, 0, 0);

test("학습 Job 상세에서 기준일 6일 뒤에 열어도 실패 내용 속 대상 기간은 학습 기간과 같은 날로 옮겨짐", async ({
  page,
}) => {
  await openTraining(page, 1920, 1080, SIX_DAYS_AFTER_MOCK_TODAY);
  await openJob(page, 5);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="dialog-title"]`)).toHaveText(
    "학습 상세 · trn-1005",
  );
  await expect(page.locator(`${JOB_DETAIL} [data-slot="key-value-row-value"]`).nth(8)).toHaveText(
    "2026-09-22 00:00 ~ 2026-09-28 23:59",
  );
  await expect(page.locator(`${JOB_DETAIL} [data-slot="alert-banner"]`)).toHaveText(
    "특징벡터 생성 실패 — 대상 기간(2026-09-22 ~ 2026-09-28)에 MICOM_COOLER 센서 데이터가 없습니다. 기간을 바꾸거나 수집 상태를 확인한 뒤 다시 시도하세요.",
  );
});

test("학습 Job 상세에서 재시도하면 닫히고 같은 조건의 새 Job이 맨 앞에 전처리부터 진행 중으로 표시되며, 실패한 Job은 남고 KPI에 반영됨", async ({
  page,
}) => {
  await openTraining(page);
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`).nth(4)).toHaveText("1");
  await openJob(page, 5);
  await footerButton(page, JOB_DETAIL, "재시도").click();
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText(
    "trn-1006 재시도 요청 — 원래 조건으로 다시 예약했습니다.",
  );
  await expect(page.locator(JOB)).toHaveCount(7);
  await expect(page.locator(`${JOB} [data-slot="job-card-title"]`).nth(0)).toHaveText(
    "MICOM_COOLER · SVM",
  );
  await expect(page.locator(`${JOB} [data-slot="state-pill"]`).nth(0)).toHaveText("전처리 중");
  await expect(page.locator(`${JOB} [data-slot="job-card-meta"]`).nth(0)).toHaveText(
    "09-23 12:00 · 재시도",
  );
  await expect(page.locator(`${JOB} [data-slot="job-card-title"]`).nth(6)).toHaveText(
    "MICOM_COOLER · SVM",
  );
  await expect(page.locator(`${JOB} [data-slot="state-pill"]`).nth(6)).toHaveText("실패");
  await expect(page.locator(`${JOB} [data-slot="job-card-meta"]`).nth(6)).toHaveText(
    "09-23 14:40 · 특징벡터 생성 실패: 대상 기간 데이터 없음",
  );
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`).nth(4)).toHaveText("1");
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`).nth(2)).toHaveText("4");
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-description"]`).nth(2)).toHaveText(
    "예약 1 · 전처리 2 · 학습 1",
  );
  await openJob(page, 0);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="dialog-title"]`)).toHaveText(
    "학습 상세 · trn-1006",
  );
  await expectStep(page, 0, "current", "1");
  await expect(page.locator(`${JOB_DETAIL} [data-slot="progress-value"]`)).toHaveText("2%");
  await expect(page.locator(`${JOB_DETAIL} [data-slot="progress-bar-meta"]`)).toHaveText("재시도");
  await expect(page.locator(`${JOB_DETAIL} [data-slot="alert-banner"]`)).toHaveCount(0);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="key-value-row-value"]`)).toHaveText([
    "trn-1006",
    "학습",
    "MICOM_COOLER SVM",
    "2026-09-23 12:00:00 · 12:00:00",
    "–",
    "MICOM_COOLER",
    "SVM",
    "406",
    "2026-09-16 00:00 ~ 2026-09-22 23:59",
    "60",
  ]);
  await expect(
    page.locator(`${JOB_DETAIL} [data-slot="dialog-footer"] [data-slot="action-button"]`),
  ).toHaveText(["학습 취소", "닫기"]);
  await page.keyboard.press("Escape");
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await openJob(page, 6);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="dialog-title"]`)).toHaveText(
    "학습 상세 · trn-1005",
  );
  await expectStep(page, 1, "failed", "!");
  await expect(page.locator(`${JOB_DETAIL} [data-slot="alert-banner"]`)).toHaveCount(1);
  await expect(
    page.locator(`${JOB_DETAIL} [data-slot="dialog-footer"] [data-slot="action-button"]`),
  ).toHaveText(["닫기", "재시도"]);
});

const METRICS = `${RESULT_DETAIL} [data-slot="training-result-metrics"]`;
const CHARTS = `${RESULT_DETAIL} [data-slot="training-result-charts"]`;
const TREND = `${CHARTS} [data-slot="threshold-trend-chart"]`;
const CURVE = `${CHARTS} [data-slot="learning-health-curve-chart"]`;
const GRID_LINE = ".recharts-cartesian-grid-horizontal line";

async function chartPlot(page: Page, chart: string, scale = 1): Promise<Box> {
  const [firstLine] = await boxes(page, `${chart} ${GRID_LINE}`);
  const [baseline] = await boxes(page, `${chart} [data-slot="chart-baseline"]`);
  const top = firstLine.y - scale / 2;
  return { x: baseline.x, y: top, width: baseline.width, height: baseline.y + scale / 2 - top };
}

async function dotDiameters(page: Page, selector: string): Promise<number[]> {
  return page
    .locator(selector)
    .evaluateAll((dots) =>
      dots.map(
        (dot) => dot.getBoundingClientRect().width + Number(dot.getAttribute("stroke-width") ?? 0),
      ),
    );
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`학습 결과 상세의 크기, 배치, Text, Color (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await openTraining(page, viewport.width, viewport.height);
    await openResult(page, 0);
    const width = Math.min(RESULT_WIDTH, viewport.width - 64);
    const height = Math.min(RESULT_HEIGHT, viewport.height - 64);
    const { header, contentWidth } = await expectModalFrame(page, "training-result-detail", {
      width,
      height,
      title: "학습 결과 상세 · AXLE_BEARING IF",
    });
    const BODY = `${RESULT_DETAIL} [data-slot="training-result-detail-body"]`;
    const body = await box(page, BODY);
    const bodyHeight = height - 34 - 36 - 14 - 14 - 32;
    expect(body.x).toBeCloseTo(header.x, 1);
    expect(body.width).toBeCloseTo(contentWidth, 1);
    expect(body.height).toBeCloseTo(bodyHeight, 1);
    const metrics = await box(page, METRICS);
    const charts = await box(page, CHARTS);
    expect([metrics.width, metrics.height]).toEqual([440, bodyHeight]);
    expect(charts.x).toBeCloseTo(metrics.x + 440 + 14, 1);
    expect(charts.width).toBeCloseTo(contentWidth - 440 - 14, 1);
    expect(charts.height).toBeCloseTo(bodyHeight, 1);
    await expectSection(page, METRICS);
    await expectSection(page, CHARTS);
    expect(await styleOf(page, METRICS, "overflow-y")).toBe("auto");
    expect(await styleOf(page, CHARTS, "overflow-y")).toBe("auto");
    expect((await measure(page, CHARTS)).style.rowGap).toBe("12px");

    await expect(page.locator(`${RESULT_DETAIL} [data-slot="panel-eyebrow"]`)).toHaveText([
      "학습 지표",
      "임계치 추이 (버전별)",
      "학습 건강도 곡선",
    ]);
    expect((await box(page, `${METRICS} [data-slot="panel-eyebrow"]`)).height).toBe(
      16 + PANEL_TITLE_GAP,
    );
    await expect(page.locator(`${METRICS} [data-slot="key-value-row-label"]`)).toHaveText([
      "모델",
      "장치",
      "세그먼트 · 편성",
      "학습 일시",
      "모델 버전",
      "임계치",
      "윈도우(초)",
      "학습 window 수",
      "특징 수",
      "학습 방식 · 상태",
    ]);
    await expect(page.locator(`${METRICS} [data-slot="key-value-row-value"]`)).toHaveText([
      "Isolation Forest (IF)",
      "AXLE_BEARING",
      "default · 전체",
      "2026-09-23 09:12:00",
      "20260923T091200",
      "0.5277",
      "60",
      "346",
      "86",
      "reservoir · 성공",
    ]);
    const firstRow = await box(page, `${METRICS} [data-slot="key-value-row"]`);
    expect(firstRow.y).toBeCloseTo(metrics.y + 1 + SECTION_PADDING_Y + 16 + PANEL_TITLE_GAP, 1);
    expect(firstRow.height).toBe(KEY_VALUE_HEIGHT);

    const trend = await box(page, TREND);
    const trendTitle = await box(page, `${CHARTS} [data-slot="panel-eyebrow"]`);
    expect(trend.x).toBeCloseTo(charts.x + 1 + SECTION_PADDING_X, 1);
    expect(trend.y).toBeCloseTo(trendTitle.y + trendTitle.height + 12, 1);
    expect(trend.height).toBeCloseTo(220 + 8 + 14, 1);
    const ticks = await boxes(page, `${TREND} [data-slot="chart-value-tick"]`);
    expect(ticks).toHaveLength(5);
    ticks.forEach((tick) => expect(tick.x + tick.width).toBeCloseTo(trend.x + 44, 0));
    const plotBox = await chartPlot(page, TREND);
    expect(plotBox.x).toBeCloseTo(trend.x + 44 + 8, 1);
    expect(plotBox.width).toBeCloseTo(trend.width - 44 - 8 - 40, 1);
    expect(plotBox.y).toBeCloseTo(trend.y, 1);
    expect(plotBox.height).toBeCloseTo(220, 1);
    const baseline = page.locator(`${TREND} [data-slot="chart-baseline"]`);
    await expect(baseline).toHaveAttribute("stroke-width", "1");
    await expect(baseline).toHaveAttribute("stroke", "var(--muted-strong)");
    const gridLines = await boxes(page, `${TREND} ${GRID_LINE}`);
    expect(gridLines).toHaveLength(4);
    gridLines.forEach((line, index) => {
      expect(line.y - 0.5).toBeCloseTo(plotBox.y + 55 * index, 1);
      expect(line.x).toBeCloseTo(plotBox.x, 1);
      expect(line.width).toBeCloseTo(plotBox.width, 1);
    });
    await expect(page.locator(`${TREND} ${GRID_LINE}`).first()).toHaveAttribute(
      "stroke",
      "var(--muted)",
    );
    await expect(page.locator(`${TREND} ${GRID_LINE}`).first()).toHaveAttribute(
      "stroke-width",
      "1",
    );
    const tick = await measure(page, `${TREND} [data-slot="chart-value-tick"]`);
    expect(tick.style.fontSize).toBe("11px");
    expect(tick.style.fontWeight).toBe("600");
    expect(await styleOf(page, `${TREND} [data-slot="chart-value-tick"]`, "fill")).toBe(
      await color(page, "var(--muted-fg)"),
    );
    await expect(page.locator(`${TREND} [data-slot="chart-value-tick"]`).first()).toHaveAttribute(
      "text-anchor",
      "end",
    );
    expect(
      await styleOf(page, `${TREND} [data-slot="chart-value-tick"]`, "font-variant-numeric"),
    ).toBe("tabular-nums");
    const dates = await boxes(page, `${TREND} [data-slot="chart-date-tick"]`);
    expect(dates).toHaveLength(6);
    dates.forEach((date) =>
      expect(date.y + date.height / 2).toBeCloseTo(plotBox.y + 220 + 8 + 13 / 2, 1),
    );
    expect(trend.y + trend.height).toBeCloseTo(plotBox.y + 220 + 8 + 14, 1);
    const date = await measure(page, `${TREND} [data-slot="chart-date-tick"]`);
    expect(date.style.fontSize).toBe("11px");
    expect(date.style.fontWeight).toBe("600");
    expect(await styleOf(page, `${TREND} [data-slot="chart-date-tick"]`, "fill")).toBe(
      await color(page, "var(--muted-fg)"),
    );
    const area = page.locator(`${TREND} .recharts-area-curve`);
    await expect(area).toHaveAttribute("stroke", "var(--brand-line4)");
    await expect(area).toHaveAttribute("stroke-width", "2");
    const stops = await page
      .locator(`${TREND} linearGradient stop`)
      .evaluateAll((items) =>
        items.map((item) => [item.getAttribute("stop-color"), item.getAttribute("stop-opacity")]),
      );
    expect(stops).toEqual([
      ["var(--brand-line4)", "0.35"],
      ["var(--brand-line4)", "0.02"],
    ]);

    const HEAD = `${CHARTS} [data-slot="learning-curve-header"]`;
    const head = await box(page, HEAD);
    expect(head.y).toBeCloseTo(trend.y + trend.height + 12, 1);
    expect((await measure(page, HEAD)).style.paddingTop).toBe("10px");
    expect((await measure(page, HEAD)).style.columnGap).toBe("12px");
    await expect(page.locator(`${HEAD} [data-slot="legend-swatch"]`)).toHaveText(["train", "val"]);
    const legend = await measure(page, `${HEAD} [data-slot="learning-curve-legend"]`);
    expect(legend.style.fontSize).toBe("11px");
    expect(legend.style.color).toBe(await color(page, "var(--muted-fg)"));
    expect(legend.style.columnGap).toBe("12px");
    const swatch = await measure(page, `${HEAD} [data-slot="legend-swatch-mark"]`);
    expect([swatch.width, swatch.height]).toEqual([14, 3]);
    expect(swatch.style.borderTopLeftRadius).toBe("2px");
    expect(swatch.style.backgroundColor).toBe(await color(page, "var(--brand-line4)"));
    expect(
      (await measure(page, `${HEAD} [data-slot="legend-swatch-mark"]`, 1)).style.backgroundColor,
    ).toBe(await color(page, "var(--chart-2)"));
    expect((await measure(page, `${HEAD} [data-slot="legend-swatch"]`)).style.columnGap).toBe(
      "5px",
    );
    const legendBox = await box(page, `${HEAD} [data-slot="learning-curve-legend"]`);
    expect(legendBox.x + legendBox.width).toBeCloseTo(head.x + head.width, 1);

    const curve = await box(page, CURVE);
    expect(curve.y).toBeCloseTo(head.y + head.height + 12, 1);
    expect(curve.y + curve.height).toBeCloseTo(charts.y + charts.height - 1 - SECTION_PADDING_Y, 1);
    const curvePlotBox = await chartPlot(page, CURVE);
    expect(curvePlotBox.y).toBeCloseTo(curve.y, 1);
    expect(curvePlotBox.height).toBeCloseTo(248, 1);
    expect(curvePlotBox.x).toBeCloseTo(curve.x + 44 + 8, 1);
    expect(curvePlotBox.width).toBeCloseTo(curve.width - 44 - 8 - 40, 1);
    const curveGrid = await boxes(page, `${CURVE} ${GRID_LINE}`);
    expect(curveGrid).toHaveLength(2);
    curveGrid.forEach((line, index) =>
      expect(line.y - 0.5).toBeCloseTo(curvePlotBox.y + 124 * index, 1),
    );
    await expect(page.locator(`${CURVE} ${GRID_LINE}`).first()).toHaveAttribute(
      "stroke",
      "var(--muted)",
    );
    await expect(page.locator(`${CURVE} [data-slot="chart-baseline"]`)).toHaveAttribute(
      "stroke",
      "var(--muted-strong)",
    );
    await expect(page.locator(`${CURVE} .recharts-area-curve`)).toHaveAttribute(
      "stroke",
      "var(--brand-line4)",
    );
    await expect(page.locator(`${CURVE} .recharts-line-curve`)).toHaveAttribute(
      "stroke",
      "var(--chart-2)",
    );
    await expect(page.locator(`${CURVE} .recharts-line-curve`)).toHaveAttribute(
      "stroke-width",
      "2",
    );
    const curveStops = await page
      .locator(`${CURVE} linearGradient stop`)
      .evaluateAll((items) => items.map((item) => item.getAttribute("stop-opacity")));
    expect(curveStops).toEqual(["0.3", "0.02"]);

    const FOOTER_BUTTON = `${RESULT_DETAIL} [data-slot="dialog-footer"] [data-slot="action-button"]`;
    await expect(page.locator(FOOTER_BUTTON)).toHaveText(["임계치 관리 (모델 커스텀)", "닫기"]);
    await expectButton(page, FOOTER_BUTTON, {
      height: 32,
      paddingX: 16,
      weight: "600",
      background: "var(--card)",
      text: "var(--fg)",
      border: "var(--border)",
    });
    await expectButton(
      page,
      FOOTER_BUTTON,
      {
        height: 32,
        paddingX: 16,
        weight: "600",
        background: "var(--primary)",
        text: "var(--on-primary)",
      },
      1,
    );
    expect(await shownIconShape(page, FOOTER_BUTTON)).toBe(iconShape("Tune"));
    await expect(page.locator(`${RESULT_DETAIL} [data-slot="modal-footnote"]`)).toHaveCount(0);
    const closeButton = await box(page, FOOTER_BUTTON, 1);
    expect(closeButton.x + closeButton.width).toBeCloseTo(header.x + contentWidth, 1);
  });
}

test("학습 결과 상세에서 눈금, 날짜, 점의 위치와 다른 Row의 학습 지표", async ({
  page,
}) => {
  await openTraining(page);
  await openResult(page, 1);
  await expect(page.locator(`${RESULT_DETAIL} [data-slot="dialog-title"]`)).toHaveText(
    "학습 결과 상세 · AXLE_BEARING SVM",
  );
  await expect(page.locator(`${METRICS} [data-slot="key-value-row-value"]`)).toHaveText([
    "One-Class SVM (SVM)",
    "AXLE_BEARING",
    "default · 전체",
    "2026-09-22 10:12:07",
    "20260922T101207",
    "-1.2758",
    "60",
    String(180 + mockupHash("2026-09-22 10:12:07AXLE_BEARING", 300)),
    String(40 + mockupHash("AXLE_BEARING", 60)),
    "reservoir · 성공",
  ]);

  const expected = mockupThresholdChart("AXLE_BEARING", -1.2758);
  await expect(page.locator(`${TREND} [data-slot="chart-value-tick"]`)).toHaveText(expected.ticks);
  await expect(page.locator(`${TREND} [data-slot="chart-date-tick"]`)).toHaveText([
    "08-18",
    "08-25",
    "09-01",
    "09-08",
    "09-15",
    "09-22",
  ]);
  const plot = await chartPlot(page, TREND);
  const plotInner = plot.height - 1;
  const dots = await boxes(page, `${TREND} [data-slot="chart-dot"]`);
  expect(dots).toHaveLength(6);
  expect(await dotDiameters(page, `${TREND} [data-slot="chart-dot"]`)).toEqual([6, 6, 6, 6, 6, 14]);
  dots.forEach((dot, index) => {
    expect(dot.x + dot.width / 2).toBeCloseTo(
      plot.x + (plot.width * expected.xPercent[index]) / 100,
      1,
    );
    expect(dot.y + dot.height / 2).toBeCloseTo(
      plot.y + (plotInner * expected.yPercent[index]) / 100,
      1,
    );
  });
  const smallDot = page.locator(`${TREND} [data-slot="chart-dot"]`).first();
  expect(await smallDot.evaluate((dot) => dot.tagName)).toBe("circle");
  await expect(smallDot).toHaveAttribute("fill", "var(--brand-line4)");
  expect(await smallDot.getAttribute("stroke")).toBeNull();
  const lastDot = page.locator(`${TREND} [data-slot="chart-dot"]`).nth(5);
  await expect(lastDot).toHaveAttribute("fill", "var(--card)");
  await expect(lastDot).toHaveAttribute("stroke-width", "3");
  await expect(lastDot).toHaveAttribute("stroke", "var(--brand-line4)");
  const dateLabels = await boxes(page, `${TREND} [data-slot="chart-date-tick"]`);
  dateLabels.forEach((label, index) => {
    expect(label.x + label.width / 2).toBeCloseTo(
      plot.x + (plot.width * expected.xPercent[index]) / 100,
      1,
    );
  });
  const tickBoxes = await boxes(page, `${TREND} [data-slot="chart-value-tick"]`);
  const tickHeight = tickBoxes[0].height;
  tickBoxes.forEach((tick, index) => {
    expect(tick.y).toBeCloseTo(plot.y + (index * (220 - tickHeight)) / 4 - tickHeight / 2, 1);
  });

  const curve = mockupLearningCurve();
  await expect(page.locator(`${CURVE} [data-slot="chart-value-tick"]`)).toHaveText([
    "1.0",
    "0.5",
    "0.0",
  ]);
  const curvePlot = await chartPlot(page, CURVE);
  const curveTicks = await boxes(page, `${CURVE} [data-slot="chart-value-tick"]`);
  expect(curveTicks[0].y + curveTicks[0].height / 2).toBeCloseTo(curvePlot.y, 1);
  expect(curveTicks[2].y + curveTicks[2].height / 2).toBeCloseTo(curvePlot.y + 248, 1);
  const ends = await boxes(page, `${CURVE} [data-slot="chart-dot"]`);
  expect(ends).toHaveLength(2);
  expect(await dotDiameters(page, `${CURVE} [data-slot="chart-dot"]`)).toEqual([16, 16]);
  const curveInner = curvePlot.height - 1;
  const center = (end: Box) => ({ x: end.x + end.width / 2, y: end.y + end.height / 2 });
  expect(center(ends[0]).x).toBeCloseTo(curvePlot.x + curvePlot.width, 1);
  expect(center(ends[0]).y).toBeCloseTo(curvePlot.y + (curveInner * curve.trainY[40]) / 100, 0);
  expect(center(ends[1]).y).toBeCloseTo(
    curvePlot.y + (curveInner * curve.validationY[40]) / 100,
    0,
  );
  const trainEnd = page.locator(`${CURVE} [data-slot="chart-dot"]`).first();
  await expect(trainEnd).toHaveAttribute("stroke-width", "4");
  await expect(trainEnd).toHaveAttribute("stroke", "var(--brand-line4)");
  await expect(trainEnd).toHaveAttribute("fill", "var(--card)");
  await expect(page.locator(`${CURVE} [data-slot="chart-dot"]`).nth(1)).toHaveAttribute(
    "stroke",
    "var(--chart-2)",
  );
});

test("학습 결과 상세에서 Chart 둘의 눈금 Text, 가로선, 아래 선, 날짜, 점을 Recharts가 그리고, 점은 Hover한 Cell보다 위에 표시됨", async ({
  page,
}) => {
  await openTraining(page);
  await openResult(page, 1);
  await expect(page.locator(`${CHARTS} [data-slot="learning-curve-chart"]`)).toHaveCount(0);
  await expect(page.locator(CURVE)).toHaveCount(1);
  for (const [chart, tickCount, gridCount, dotCount] of [
    [TREND, 5, 4, 6],
    [CURVE, 3, 2, 2],
  ] as const) {
    await expect(
      page.locator(`${chart} .recharts-yAxis-tick-labels [data-slot="chart-value-tick"]`),
    ).toHaveCount(tickCount);
    await expect(page.locator(`${chart} .recharts-cartesian-grid ${GRID_LINE}`)).toHaveCount(
      gridCount,
    );
    await expect(
      page.locator(`${chart} svg.recharts-surface line[data-slot="chart-baseline"]`),
    ).toHaveCount(1);
    await expect(
      page.locator(`${chart} svg.recharts-surface circle[data-slot="chart-dot"]`),
    ).toHaveCount(dotCount);
    await expect(
      page.locator(
        ["chart-value-ticks", "chart-plot", "chart-dot-layer", "chart-date-row"]
          .map((slot) => `${chart} [data-slot="${slot}"]`)
          .join(", "),
      ),
    ).toHaveCount(0);
  }
  await expect(
    page.locator(`${TREND} .recharts-xAxis-tick-labels [data-slot="chart-date-tick"]`),
  ).toHaveCount(
    6,
  );
  const expected = mockupThresholdChart("AXLE_BEARING", -1.2758);
  const plot = await chartPlot(page, TREND);
  await page.mouse.move(plot.x + (plot.width * expected.xPercent[3]) / 100 + 20, plot.y + 60);
  await expect(page.locator(`${RESULT_DETAIL} [data-slot="chart-hovered-column"]`)).toHaveCount(1);
  const layers = await page.locator(`${TREND} svg.recharts-surface > g`).evaluateAll((groups) =>
    groups.map((group) => ({
      hovered: group.querySelector('[data-slot="chart-hovered-column"]') !== null,
      dot: group.querySelector('[data-slot="chart-dot"]') !== null,
    })),
  );
  const hoveredLayer = layers.findIndex((layer) => layer.hovered);
  expect(hoveredLayer).toBeGreaterThanOrEqual(0);
  expect(layers.findIndex((layer) => layer.dot)).toBeGreaterThan(hoveredLayer);
});

test("학습 결과 상세에서 Chart에 Mouse를 올렸을 때만 Tooltip이 Cursor를 따라가고 그 Cell은 연한 회색임", async ({
  page,
}) => {
  await openTraining(page);
  await openResult(page, 1);
  const TIP = `${RESULT_DETAIL} [data-slot="chart-hover-tooltip"]`;
  const HOVERED = `${RESULT_DETAIL} [data-slot="chart-hovered-column"]`;
  await page.mouse.move(5, 5);
  await expect(page.locator(TIP)).toHaveCount(0);
  await expect(page.locator(HOVERED)).toHaveCount(0);

  const expected = mockupThresholdChart("AXLE_BEARING", -1.2758);
  const plot = await chartPlot(page, TREND);
  const pointX = plot.x + (plot.width * expected.xPercent[3]) / 100;
  await page.mouse.move(pointX + 20, plot.y + 60);
  await expect(page.locator(TIP)).toHaveCount(1);
  await expect(page.locator(`${TIP} b`)).toHaveText("09-08");
  await expect(page.locator(TIP)).toContainText(`임계값 ${expected.values[3].toFixed(4)}`);
  const hovered = await box(page, HOVERED);
  const band = (plot.width * 96) / 5 / 100;
  expect(hovered.x).toBeCloseTo(pointX - band / 2, 0);
  expect(hovered.width).toBeCloseTo(band, 0);
  expect(hovered.height).toBeCloseTo(plot.height - 1, 0);
  await expect(page.locator(HOVERED)).toHaveAttribute("fill", "var(--muted)");
  const layers = await page.locator(`${TREND} svg.recharts-surface > g`).evaluateAll((groups) =>
    groups.map((group) => ({
      layer: group.getAttribute("class") ?? "",
      hovered: group.querySelector('[data-slot="chart-hovered-column"]') !== null,
      area: group.querySelector(".recharts-area") !== null,
    })),
  );
  const hoveredLayer = layers.findIndex((layer) => layer.hovered);
  const areaLayer = layers.findIndex((layer) => layer.area);
  expect(hoveredLayer).toBeGreaterThanOrEqual(0);
  expect(areaLayer).toBeGreaterThan(hoveredLayer);
  const before = await box(page, TIP);
  await page.mouse.move(pointX + 20, plot.y + 140);
  await expect.poll(async () => (await box(page, TIP)).y).toBeGreaterThan(before.y + 40);
  await page.mouse.move(plot.x + 4, plot.y + 100);
  await expect(page.locator(`${TIP} b`)).toHaveText("08-18");
  const firstBand = await box(page, HOVERED);
  expect(firstBand.x).toBeCloseTo(plot.x, 0);
  expect(firstBand.width).toBeCloseTo(band / 2 + (plot.width * 2) / 100, 0);

  const curve = mockupLearningCurve();
  const curvePlot = await chartPlot(page, CURVE);
  await page.mouse.move(curvePlot.x + (curvePlot.width * 20) / 40, curvePlot.y + 100);
  await expect(page.locator(`${TIP} b`)).toHaveText("epoch 21");
  await expect(page.locator(TIP)).toContainText(curve.tip(20));
  const curveBand = await box(page, HOVERED);
  expect(curveBand.width).toBeCloseTo(curvePlot.width / 40, 0);
  expect(curveBand.x + curveBand.width / 2).toBeCloseTo(curvePlot.x + curvePlot.width / 2, 0);
  const bubble = await measure(page, `${TIP} [data-slot="chart-tooltip-bubble"]`);
  expect(bubble.style.backgroundColor).toBe(await color(page, "var(--fg)"));
  expect(bubble.style.color).toBe(await color(page, "var(--card)"));
  expect(bubble.style.fontSize).toBe("12px");
  expect(bubble.style.lineHeight).toBe("16px");
  expect(bubble.style.borderTopLeftRadius).toBe("6px");
  expect(bubble.style.paddingTop).toBe("6px");
  expect(bubble.style.paddingLeft).toBe("10px");
  await page.mouse.move(5, 5);
  await expect(page.locator(TIP)).toHaveCount(0);
  await expect(page.locator(HOVERED)).toHaveCount(0);
});

test("학습 결과 상세에서 임계치 관리를 Click하면 결과 상세가 닫히고, 그 Row가 선택된 채 임계치 관리가 열림", async ({
  page,
}) => {
  await openTraining(page);
  await openResult(page, 3);
  await expect(footerButton(page, RESULT_DETAIL, "임계치 관리 (모델 커스텀)")).not.toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await footerButton(page, RESULT_DETAIL, "임계치 관리 (모델 커스텀)").click();
  await expect(page.locator(RESULT_DETAIL)).toHaveCount(0);
  await expect(page.locator(ROW).nth(3)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(modal("model-config"))).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(modal("model-config"))).toHaveCount(0);
  await openResult(page, 2);
  await footerButton(page, RESULT_DETAIL, "닫기").click();
  await expect(page.locator(RESULT_DETAIL)).toHaveCount(0);
});

test("Modal은 닫기 Button, 취소, Esc로 닫히고 바깥을 Click해도 그대로이며, Focus가 갇혔다가 연 곳으로 돌아옴", async ({
  page,
}) => {
  await openTraining(page);

  await openSchedule(page);
  await expect(page.locator(SCHEDULE)).toHaveAttribute("role", "dialog");
  expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe(
    "닫기",
  );
  const order: string[] = [];
  for (let step = 0; step < 7; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, SCHEDULE)).toBe(true);
    order.push(await focusedSlot(page));
  }
  expect(order).toEqual([
    "date-range-trigger",
    "text-input",
    "text-input",
    "toggle-group-item",
    "select-trigger",
    "input-group-control",
    "action-button",
  ]);
  for (let step = 0; step < 24; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, SCHEDULE)).toBe(true);
  }
  for (let step = 0; step < 6; step += 1) {
    await pressTab(page, "Shift+Tab");
    expect(await focusIsInside(page, SCHEDULE)).toBe(true);
  }
  await page.mouse.click(10, 1070);
  await page.waitForTimeout(200);
  await expect(page.locator(SCHEDULE)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(SCHEDULE)).toHaveCount(0);
  await expect(scheduleButton(page)).toBeFocused();
  await openSchedule(page);
  await footerButton(page, SCHEDULE, "취소").click();
  await expect(page.locator(SCHEDULE)).toHaveCount(0);
  await openSchedule(page);
  await page.locator(`${SCHEDULE} [data-slot="dialog-close"]`).click();
  await expect(page.locator(SCHEDULE)).toHaveCount(0);
  await expect(scheduleButton(page)).toBeFocused();

  await openJob(page, 1);
  await expect.poll(() => focusIsInside(page, JOB_DETAIL)).toBe(true);
  for (let step = 0; step < 4; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, JOB_DETAIL)).toBe(true);
  }
  await page.mouse.click(10, 1070);
  await page.waitForTimeout(200);
  await expect(page.locator(JOB_DETAIL)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB).nth(1)).toBeFocused();
  await openJob(page, 1);
  await footerButton(page, JOB_DETAIL, "닫기").click();
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB).nth(1)).toBeFocused();

  await openResult(page, 2);
  await expect.poll(() => focusIsInside(page, RESULT_DETAIL)).toBe(true);
  await page.mouse.click(10, 1070);
  await page.waitForTimeout(200);
  await expect(page.locator(RESULT_DETAIL)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(RESULT_DETAIL)).toHaveCount(0);
  await expect(page.locator(ROW).nth(2)).toBeFocused();
  await page.locator(ROW).nth(4).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(RESULT_DETAIL)).toBeVisible();
  await page.locator(`${RESULT_DETAIL} [data-slot="dialog-close"]`).click();
  await expect(page.locator(RESULT_DETAIL)).toHaveCount(0);
  await expect(page.locator(ROW).nth(4)).toBeFocused();
});

test("닫힌 Modal이 사라지는 동안 다른 종류의 Modal을 열어도 앞 Modal의 대상은 그대로임", async ({
  page,
}) => {
  await openTraining(page);
  await openJob(page, 0);
  const JOB_TEXT = `${JOB_DETAIL} [data-slot="dialog-title"], ${JOB_DETAIL} [data-slot="key-value-row-value"]`;
  const openedJob = await texts(page, JOB_TEXT);
  expect(openedJob.slice(0, 2)).toEqual(["학습 상세 · trn-1000", "trn-1000"]);
  const closingJob = await textWhileClosing(page, {
    close: { selector: `${JOB_DETAIL} [data-slot="dialog-footer"] button`, label: "닫기" },
    open: { selector: ROW, index: 1 },
    read: JOB_TEXT,
  });
  expect(closingJob).toEqual(openedJob);
  await expect(page.locator(RESULT_DETAIL)).toBeVisible();
  await expect(page.locator(`${RESULT_DETAIL} [data-slot="dialog-title"]`)).toHaveText(
    "학습 결과 상세 · AXLE_BEARING SVM",
  );
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await openJob(page, 3);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="dialog-title"]`)).toHaveText(
    "학습 상세 · trn-1003",
  );
  await expect(page.locator(`${JOB_DETAIL} [data-slot="key-value-row-value"]`).nth(0)).toHaveText(
    "trn-1003",
  );
});

test("다크 Theme에서 Modal의 Color", async ({ page }) => {
  await openTraining(page);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator("html")).toHaveClass(/dark/);

  await openSchedule(page);
  expect((await measure(page, SCHEDULE)).style.backgroundColor).toBe(
    await color(page, "var(--dialog)"),
  );
  await expectSection(page, FIELDS);
  await expectSection(page, DEVICES);
  const trigger = await measure(page, DATE_TRIGGER);
  expect(trigger.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(trigger.style.borderTopColor).toBe(await color(page, "var(--border)"));
  const input = await measure(page, `${FIELDS} [data-slot="text-input"]`);
  expect(input.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect((await measure(page, `${SCHEDULE} [data-slot="segmented"]`)).style.backgroundColor).toBe(
    await color(page, "var(--muted)"),
  );
  await page.locator(SEGMENT_ITEM).nth(0).click();
  await page.waitForTimeout(300);
  expect((await measure(page, SEGMENT_ITEM, 0)).style.backgroundColor).toBe(
    await color(page, "var(--card)"),
  );
  const list = await measure(page, DEVICE_LIST);
  expect(list.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(list.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect((await measure(page, DEVICE_ITEM, 0)).style.backgroundColor).toBe(
    await color(page, "var(--brand-line4-subtle)"),
  );
  expect(
    (await measure(page, `${DEVICE_ITEM} [data-slot="checkbox"]`, 1)).style.backgroundColor,
  ).toBe(await color(page, "var(--card)"));
  const search = await measure(page, `${DEVICES} [data-slot="text-input"]`);
  expect(search.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(
    (await measure(page, `${DEVICES} [data-slot="action-button"]`)).style.backgroundColor,
  ).toBe(await color(page, "var(--card)"));
  await page.locator(`${DEVICE_ITEM} [data-slot="checkbox"]`).nth(0).click();
  await page.locator(`${DEVICE_ITEM} [data-slot="checkbox"]`).nth(10).click();
  await footerButton(page, SCHEDULE, "예약").click();
  await expect(page.locator(FIELD_ERROR)).toHaveText(["학습 대상 장치를 선택하세요"]);
  expect((await measure(page, FIELD_ERROR)).style.color).toBe(await color(page, "var(--danger)"));
  expect((await measure(page, DEVICES)).style.borderTopColor).toBe(
    await color(page, "var(--danger)"),
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(SCHEDULE)).toHaveCount(0);

  await openJob(page, 5);
  await expectSection(page, `${JOB_DETAIL} [data-slot="training-job-stages"]`);
  await expectStep(page, 0, "done", "");
  await expectStep(page, 1, "failed", "!");
  await expectStep(page, 2, "pending", "3");
  const banner = await measure(page, `${JOB_DETAIL} [data-slot="alert-banner"]`);
  expect(banner.style.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect(banner.style.color).toBe(await color(page, "var(--on-danger-subtle)"));
  expect((await measure(page, `${JOB_DETAIL} [data-slot="panel-eyebrow"]`)).style.color).toBe(
    await color(page, "var(--brand-line4-text)"),
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await openJob(page, 0);
  expect(
    (await measure(page, `${JOB_DETAIL} [data-slot="progress-track"]`)).style.backgroundColor,
  ).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(
    await styleOf(page, `${JOB_DETAIL} [data-slot="progress-indicator"]`, "background-image"),
  ).toBe(
    `linear-gradient(90deg, ${await color(page, "color-mix(in srgb, var(--brand-line4) 70%, var(--card))")}, ${await color(page, "var(--brand-line4)")})`,
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);

  await openResult(page, 0);
  await expectSection(page, METRICS);
  await expectSection(page, CHARTS);
  expect(await styleOf(page, `${TREND} [data-slot="chart-baseline"]`, "stroke")).toBe(
    await color(page, "var(--muted-strong)"),
  );
  expect(await styleOf(page, `${TREND} [data-slot="chart-dot"]`, "fill", 5)).toBe(
    await color(page, "var(--card)"),
  );
  const curvePlot = await chartPlot(page, CURVE);
  await page.mouse.move(curvePlot.x + curvePlot.width / 2, curvePlot.y + 80);
  const bubble = await measure(page, `${RESULT_DETAIL} [data-slot="chart-tooltip-bubble"]`);
  expect(bubble.style.backgroundColor).toBe(await color(page, "var(--fg)"));
  expect(bubble.style.color).toBe(await color(page, "var(--card)"));
});

test("기본 Font 크기를 2배로 하면 Modal의 크기도 2배임", async ({ page }) => {
  await openTraining(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page.waitForTimeout(400);
  const maxWidth = 1920 - 128;
  const maxHeight = 1080 - 128;

  await openSchedule(page);
  await page.waitForTimeout(400);
  const frame = await box(page, SCHEDULE);
  expect(frame.width).toBe(maxWidth);
  expect(frame.height).toBe(maxHeight);
  const frameStyle = (await measure(page, SCHEDULE)).style;
  expect(frameStyle.paddingTop).toBe("32px");
  expect(frameStyle.borderTopWidth).toBe("2px");
  const scroll = await page.evaluate((selector) => {
    const body = document.querySelector(selector) as HTMLElement;
    return body.scrollHeight;
  }, `${SCHEDULE} [data-slot="modal-body-scroll"]`);
  expect(scroll).toBe((FIELDS_HEIGHT + 14 + DEVICES_HEIGHT) * 2);
  expect((await box(page, DATE_TRIGGER)).width).toBe(612);
  expect((await box(page, DATE_TRIGGER)).height).toBe(64);
  expect(
    (await boxes(page, `${FIELDS} [data-slot="text-input"]`)).map((input) => input.width),
  ).toEqual([280, 280]);
  expect((await measure(page, `${SCHEDULE} [data-slot="segmented"]`)).height).toBe(68);
  expect((await measure(page, SEGMENT_ITEM)).height).toBe(56);
  expect((await measure(page, SEGMENT_ITEM)).style.paddingLeft).toBe("32px");
  expect((await measure(page, DEVICE_LIST)).height).toBe(492);
  const item = await measure(page, DEVICE_ITEM);
  expect(item.height).toBe(72);
  expect((await measure(page, `${DEVICE_ITEM} [data-slot="checkbox"]`)).width).toBe(32);
  expect((await box(page, `${DEVICES} [data-slot="text-input"]`)).width).toBe(400);
  await page.keyboard.press("Escape");
  await expect(page.locator(SCHEDULE)).toHaveCount(0);

  await openJob(page, 0);
  await page.waitForTimeout(400);
  expect((await box(page, JOB_DETAIL)).width).toBe(maxWidth);
  expect((await measure(page, `${JOB_DETAIL} [data-slot="step-item-mark"]`)).width).toBe(56);
  expect((await measure(page, `${JOB_DETAIL} [data-slot="step-connector"]`)).height).toBe(4);
  expect((await measure(page, `${JOB_DETAIL} [data-slot="progress-track"]`)).height).toBe(16);
  expect((await measure(page, `${JOB_DETAIL} [data-slot="key-value-row"]`)).height).toBe(
    KEY_VALUE_HEIGHT * 2,
  );
  expect((await measure(page, `${JOB_DETAIL} [data-slot="panel-eyebrow"]`)).style.fontSize).toBe(
    "22px",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);

  await openResult(page, 1);
  await page.waitForTimeout(400);
  const result = await box(page, RESULT_DETAIL);
  expect([result.width, result.height]).toEqual([maxWidth, maxHeight]);
  expect((await box(page, METRICS)).width).toBe(880);
  expect((await chartPlot(page, TREND, 2)).height).toBe(440);
  const trendBox = await box(page, TREND);
  for (const tick of await boxes(page, `${TREND} [data-slot="chart-value-tick"]`)) {
    expect(tick.x + tick.width - trendBox.x).toBeCloseTo(88, 0);
  }
  expect((await chartPlot(page, CURVE, 2)).height).toBe(496);
  expect(await dotDiameters(page, `${TREND} [data-slot="chart-dot"]`)).toEqual([
    12, 12, 12, 12, 12, 28,
  ]);
  expect(await dotDiameters(page, `${CURVE} [data-slot="chart-dot"]`)).toEqual([32, 32]);
  await expect(page.locator(`${TREND} .recharts-area-curve`)).toHaveAttribute("stroke-width", "4");
});

const SCALE_SCENES: { name: string; modalSlots: number; open: (page: Page) => Promise<void> }[] = [
  {
    name: "학습 예약",
    modalSlots: 120,
    open: (page) => openSchedule(page),
  },
  {
    name: "학습 작업 상세(진행 중)",
    modalSlots: 60,
    open: (page) => openJob(page, 0),
  },
  {
    name: "학습 결과 상세(차트)",
    modalSlots: 75,
    open: async (page) => {
      await page.locator(ROW).nth(1).focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(`${RESULT_DETAIL} [data-slot="chart-dot"]`).first()).toBeVisible();
    },
  },
];

for (const scene of SCALE_SCENES) {
  test(`3840×2160 화면의 Modal은 1920×1080 화면의 2배임 (${scene.name})`, async ({ page }) => {
    const openScene = async (width: number, height: number) => {
      await openTraining(page, width, height);
      await expect(page.locator('[data-slot="session-chip-remaining"]')).not.toHaveText("--:--");
      await page.mouse.move(0, 0);
      await scene.open(page);
      await page.waitForTimeout(600);
      await expect(page.locator('[data-slot="chart-hover-tooltip"]')).toHaveCount(0);
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

test("움직임 줄이기를 켜면 Modal은 Fade만 적용되고 진행 Bar의 Width는 전환 없이 바뀜", async ({ page }) => {
  await openTraining(page);
  await openSchedule(page);
  expect(await enterMotion(page, SCHEDULE)).toEqual(["enter", "0.1s", "1", "0"]);
  await page.keyboard.press("Escape");
  await expect(page.locator(SCHEDULE)).toHaveCount(0);
  await page.locator(JOB).nth(0).click();
  await expect(page.locator(JOB_DETAIL)).toBeVisible();
  expect(await enterMotion(page, JOB_DETAIL)).toEqual(["enter", "0.1s", "1", "0"]);
  expect(
    await styleOf(page, `${JOB_DETAIL} [data-slot="progress-indicator"]`, "transition-property"),
  ).toBe("none");
  await page.keyboard.press("Escape");
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await page.locator(ROW).nth(0).click();
  await expect(page.locator(RESULT_DETAIL)).toBeVisible();
  expect(await enterMotion(page, RESULT_DETAIL)).toEqual(["enter", "0.1s", "1", "0"]);
});

test("움직임 줄이기를 켜면 Select List는 아래로 표시되든 위로 뒤집혀 표시되든 크기와 위치 변화 없이 Fade만 적용됨", async ({
  page,
}) => {
  await openTraining(page);
  await openSchedule(page);
  await page.locator(FORMATION_TRIGGER).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveCount(27);
  expect(await selectEnterTransform(page)).toEqual(["bottom", "matrix(1, 0, 0, 1, 0, 0)"]);
  expect(await enterMotion(page, OPEN_SELECT)).toEqual(["enter", "0.1s", "1", "0"]);
  await page.keyboard.press("Escape");
  await expect(page.locator(OPEN_SELECT)).toHaveCount(0);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page.waitForTimeout(400);
  await page.locator(FORMATION_TRIGGER).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveCount(27);
  expect(await selectEnterTransform(page)).toEqual(["top", "matrix(1, 0, 0, 1, 0, 0)"]);
});

test.describe("움직임 줄이기를 끈 화면", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("Select List는 기본 움직임 그대로 0.95 크기이고, 아래로 표시되면 8 위에서, 위로 뒤집히면 아래에서 나타남", async ({
    page,
  }) => {
    await openTraining(page);
    await openSchedule(page);
    await page.locator(FORMATION_TRIGGER).click();
    await expect(page.locator(OPEN_ITEMS)).toHaveCount(27);
    expect(await selectEnterTransform(page)).toEqual([
      "bottom",
      "matrix3d(0.95, 0, 0, 0, 0, 0.95, 0, 0, 0, 0, 0.95, 0, 0, -8, 0, 1)",
    ]);
    await page.keyboard.press("Escape");
    await expect(page.locator(OPEN_SELECT)).toHaveCount(0);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });
    await page.waitForTimeout(400);
    await page.locator(FORMATION_TRIGGER).click();
    await expect(page.locator(OPEN_ITEMS)).toHaveCount(27);
    expect(await selectEnterTransform(page)).toEqual([
      "top",
      "matrix3d(0.95, 0, 0, 0, 0, 0.95, 0, 0, 0, 0, 0.95, 0, 0, 16, 0, 1)",
    ]);
  });

  test("Modal은 기본 움직임이고, 진행 Bar의 Width는 0.3초 동안 바뀜", async ({ page }) => {
    await openTraining(page);
    await page.locator(JOB).nth(0).click();
    await expect(page.locator(JOB_DETAIL)).toBeVisible();
    expect(await enterMotion(page, JOB_DETAIL)).toEqual(["enter", "0.1s", ".95", "0"]);
    const indicator = `${JOB_DETAIL} [data-slot="progress-indicator"]`;
    expect(await styleOf(page, indicator, "transition-property")).toBe("all");
    expect(await styleOf(page, indicator, "transition-duration")).toBe("0.3s");
    expect(await styleOf(page, indicator, "transition-timing-function")).toBe(
      "cubic-bezier(0, 0, 0.2, 1)",
    );
  });
});

test("계산 함수의 학습 예약 Form 처음 값, 보낼 수 없는 까닭의 순서, 넘길 값", async () => {
  const options = await fetchTrainingScheduleOptions();
  const draft = createTrainingScheduleDraft(options);
  expect(draft).toEqual({
    period: { from: isoDaysAgo(7), to: isoDaysAgo(1) },
    startTime: "00:00:00",
    endTime: "23:59:59",
    modelCode: null,
    formation: null,
    deviceCodes: ["ATC", "DRIVING_GEAR"],
  });
  expect(draft.deviceCodes).not.toBe(options.defaultDeviceCodes);
  expect(
    createTrainingScheduleDraft({ ...options, defaultDeviceCodes: ["FRU", "ATC", "IDBC"] })
      .deviceCodes,
  ).toEqual(["ATC"]);
  expect(
    findTrainingScheduleProblem({
      ...createTrainingScheduleDraft({ ...options, defaultDeviceCodes: ["IDBC"] }),
      modelCode: "IF",
    }),
  ).toBe("missingDevices");

  const empty: TrainingScheduleDraft = {
    ...draft,
    period: { from: "2026-09-10", to: null },
    deviceCodes: [],
  };
  expect(findTrainingScheduleProblem(empty)).toBe("missingModel");
  expect(findTrainingScheduleProblem({ ...empty, modelCode: "IF" })).toBe("missingPeriod");
  expect(
    findTrainingScheduleProblem({
      ...empty,
      modelCode: "IF",
      period: { from: "2026-09-12", to: "2026-09-10" },
    }),
  ).toBe("reversedPeriod");
  expect(
    findTrainingScheduleProblem({
      ...empty,
      modelCode: "IF",
      period: { from: "2026-09-10", to: "2026-09-10" },
    }),
  ).toBe("missingDevices");
  expect(findTrainingScheduleProblem({ ...draft, modelCode: "IF" })).toBeNull();
  expect(
    (["missingModel", "missingPeriod", "reversedPeriod", "missingDevices"] as const).map(
      trainingScheduleProblemField,
    ),
  ).toEqual(["model", "period", "period", "devices"]);

  expect(toTrainingScheduleInput(draft)).toBeNull();
  expect(
    toTrainingScheduleInput({
      ...draft,
      modelCode: "VAE",
      formation: "405",
      startTime: " 08:30 ",
      endTime: "  ",
    }),
  ).toEqual({
    modelCode: "VAE",
    deviceCodes: ["ATC", "DRIVING_GEAR"],
    formation: "405",
    period: { from: isoDaysAgo(7), to: isoDaysAgo(1) },
    startTime: "08:30:00",
    endTime: null,
  });
  expect(toTrainingScheduleInput({ ...draft, modelCode: "IF", startTime: "9시" })?.startTime).toBe(
    "9시",
  );
});

test("Type 검사에서 Component가 그리지 않는 props 조합은 넘길 수 없음(FieldMessage, CheckboxItem, TextInput, AlertBanner)", () => {
  const noop = () => {};
  const message: ComponentProps<typeof FieldMessage> = { message: "오류" };
  const plainItem: ComponentProps<typeof CheckboxItem> = { label: "a", checked: false, onCheckedChange: noop };
  const rowItem: ComponentProps<typeof CheckboxItem> = { appearance: "row", label: "a", checked: false, onCheckedChange: noop, hint: "b", title: "c", disabled: true };
  const unitInput: ComponentProps<typeof TextInput> = { value: "", onValueChange: noop, unit: "%" };
  const iconInput: ComponentProps<typeof TextInput> = { value: "", onValueChange: noop, leadingIcon: null };
  const lineBanner: ComponentProps<typeof AlertBanner> = { tone: "danger", icon: null, emphasis: "plain", children: "a" };
  const paragraphBanner: ComponentProps<typeof AlertBanner> = { tone: "danger", icon: null, layout: "paragraph", children: "a" };
  // @ts-expect-error 오류 문구 Component는 외부 className을 받지 않음
  const messageClass: ComponentProps<typeof FieldMessage> = { message: "오류", className: "mt-2" };
  // @ts-expect-error plain 모양은 disabled를 지원하지 않음
  const plainDisabled: ComponentProps<typeof CheckboxItem> = { label: "a", checked: false, onCheckedChange: noop, disabled: true };
  // @ts-expect-error plain 모양은 hint를 지원하지 않음
  const plainHint: ComponentProps<typeof CheckboxItem> = { label: "a", checked: false, onCheckedChange: noop, hint: "b" };
  // @ts-expect-error plain 모양은 title을 지원하지 않음
  const plainTitle: ComponentProps<typeof CheckboxItem> = { label: "a", checked: false, onCheckedChange: noop, title: "c" };
  // @ts-expect-error 단위가 있으면 앞쪽 Icon을 지원하지 않음
  const unitAndIcon: ComponentProps<typeof TextInput> = { value: "", onValueChange: noop, unit: "%", leadingIcon: null };
  // @ts-expect-error paragraph는 Font Weight와 좌우 Padding을 직접 지정함
  const paragraphEmphasis: ComponentProps<typeof AlertBanner> = { tone: "danger", icon: null, layout: "paragraph", emphasis: "plain", children: "a" };
  expect([message, plainItem, rowItem, unitInput, iconInput, lineBanner, paragraphBanner]).toHaveLength(7);
  expect([messageClass, plainDisabled, plainHint, plainTitle, unitAndIcon, paragraphEmphasis]).toHaveLength(6);
});

test("학습 기간의 하루 안의 시각 \"HH:mm:ss\"에서 \"HH:mm\"으로 자름", () => {
  expect(formatTimeOfDayHourMinute("00:00:00")).toBe("00:00");
  expect(formatTimeOfDayHourMinute("23:59:59")).toBe("23:59");
  expect(formatTimeOfDayHourMinute("08:30:00")).toBe("08:30");
});

test("Mock 조회 함수의 예약 선택지, Job 상세, 결과 상세", async () => {
  const options = await fetchTrainingScheduleOptions();
  expect(options.defaultPeriod).toEqual({ from: isoDaysAgo(7), to: isoDaysAgo(1) });
  expect(options.selectablePeriod).toEqual({ from: null, to: null });
  expect(options.modelCodes).toEqual(["IF", "SVM", "VAE", "PCA"]);
  expect(options.defaultModelCode).toBeNull();
  expect(options.formations).toHaveLength(26);
  expect([options.formations[0], options.formations[25]]).toEqual(["401", "426"]);
  expect(options.defaultFormation).toBeNull();
  expect(options.defaultDeviceCodes).toEqual(["ATC", "DRIVING_GEAR"]);
  expect(options.unavailableDeviceCodes).toEqual(["FRU", "IDBC"]);

  expect(await fetchTrainingJobDetail("trn-1002")).toEqual({
    startedAt: `${isoDaysAgo(0)}T11:19:00`,
    endedAt: `${isoDaysAgo(0)}T11:48:00`,
    requestedPeriod: { from: isoDaysAgo(7), to: isoDaysAgo(1) },
    requestedStartTime: "00:00:00",
    requestedEndTime: "23:59:59",
    windowSeconds: 60,
    failureMessage: null,
  });
  expect((await fetchTrainingJobDetail("trn-1004")).startedAt).toBeNull();
  await expect(fetchTrainingJobDetail("trn-9999")).rejects.toThrow();

  const results = await fetchTrainingResults({
    modelCode: null,
    deviceCode: null,
    period: { from: null, to: null },
    sort: { key: "trainedAt", direction: "desc" },
    page: 1,
    pageSize: 20,
  });
  const latest = await fetchTrainingResultDetail(results.rows[0].id);
  expect(latest).not.toHaveProperty("resultId");
  expect(latest.modelVersion).toBe(`${isoDaysAgo(0).replace(/-/g, "")}T091200`);
  expect([latest.windowSeconds, latest.windowCount, latest.featureCount]).toEqual([60, 346, 86]);
  expect(latest.trainingMethod).toBe("reservoir");
  expect(latest.formation).toBeNull();
  expect(latest.thresholdHistory.map((point) => point.trainedOn)).toEqual(
    [35, 28, 21, 14, 7, 0].map((days) => isoDaysAgo(days)),
  );
  expect(latest.thresholdHistory.map((point) => point.threshold)).toEqual(
    mockupThresholdChart("AXLE_BEARING", 0.5277).values,
  );
  expect(latest.learningCurve).toHaveLength(41);
  expect(latest.learningCurve[0]).toEqual({ epoch: 1, train: 1, validation: 1 });
  expect(latest.learningCurve[40].epoch).toBe(41);
  await expect(fetchTrainingResultDetail("999")).rejects.toThrow();
});
