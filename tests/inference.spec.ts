import { expect, test } from "@playwright/test";
import { inferenceJobMetaTones, inferenceJobStatusTones, inferenceRateTextClassNames } from "../src/components/organisms/inferenceTones";
import { classifyAnomalyWindows } from "../src/domain/anomaly";
import { isFailedInferenceJobStatus, type InferenceJobStatus } from "../src/domain/inference";
import { inferenceJobStatusLabels } from "../src/domain/labels/inferenceJobStatus";
import {
  exportInferenceResultsCsv,
  fetchInferenceFilterOptions,
  fetchInferenceJobs,
  fetchInferenceResults,
  fetchInferenceRunOptions,
  retryInferenceJob,
  runInference,
} from "../src/services/inference";
import { downloadCsv } from "./helpers/download";
import { INFERENCE_RESULT_ROW, openInference } from "./helpers/inference";
import {
  calendarDayCell,
  color,
  columnTexts,
  delayMockResponses,
  hoveredStyle,
  measure,
  normalLineHeight,
  pickOption,
  pressable,
  shownTableLines,
  stopWatchingDisabled,
  stopWatchingDisabledLook,
  truncation,
  visibleShadow,
  watchDisabled,
  watchDisabledLook,
  watchDisabledWithin,
} from "./helpers/measure";
import { box, boxes, iconShape, modal, shownIconShape, styleOf, texts } from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const ROOT = '[data-slot="inference"]';
const FILTER = '[data-slot="inference-filter-bar"]';
const SELECTS = `${FILTER} [data-slot="select-trigger"]`;
const TRIGGER = `${FILTER} [data-slot="date-range-trigger"]`;
const RESET = `${FILTER} [data-slot="icon-button"]`;
const BUTTONS = `${FILTER} [data-slot="action-button"]`;
const JOBS = '[data-slot="inference-jobs-card"]';
const JOBS_DESCRIPTION = `${JOBS} [data-slot="section-card-description"]`;
const GUIDE = `${JOBS} [data-slot="inference-jobs-guide"]`;
const SWITCH_LABEL = `${JOBS} [data-slot="switch-control"]`;
const SWITCH = `${JOBS} [data-slot="switch"]`;
const THUMB = `${JOBS} [data-slot="switch-thumb"]`;
const JOB_LIST = '[data-slot="inference-job-list"]';
const JOB = `${JOB_LIST} [data-slot="job-card"]`;
const RESULTS = '[data-slot="inference-results-card"]';
const HEAD = `${RESULTS} [data-slot="table-head"]`;
const ROW = INFERENCE_RESULT_ROW;
const TOTAL = `${RESULTS} [data-slot="inference-results-total"]`;
const CSV = `${RESULTS} [data-slot="section-card-header"] [data-slot="action-button"]`;
const CURRENT_PAGE = `${RESULTS} [data-slot="pagination-page"][aria-current="page"]`;
const PICKER = '[data-slot="popover-content"][data-picker="range"]';
const CALENDAR = `${PICKER} [data-slot="calendar"]`;
const PAGES = `${RESULTS} [data-slot="pagination-page"]`;
const SEARCHING = '[data-overlay="searching"], [data-slot="searching-overlay"]';
const RELOAD_MS = 1500;
const NO_RELOAD_WATCH_MS = 800;

const RESULT_ROWS = [
  ["2026-09-23 12:38", "Tabular VAE", "축전지", "default", "22 / 240", "9.2%", "0.0430"],
  ["2026-09-23 12:32", "Isolation Forest", "표시기장치", "default", "0 / 210", "0.0%", "0.5200"],
  ["2026-09-23 12:26", "Tabular VAE", "공기질개선장치", "default", "61 / 180", "33.9%", "0.0430"],
  ["2026-09-23 12:20", "Isolation Forest", "차축 베어링", "default", "0 / 150", "0.0%", "0.5200"],
  ["2026-09-22 13:39", "Isolation Forest", "화재감지장치", "default", "16 / 270", "5.9%", "0.5200"],
  ["2026-09-22 13:33", "Tabular VAE", "무정전장치", "default", "17 / 240", "7.1%", "0.0430"],
  ["2026-09-22 13:27", "Isolation Forest", "출입문장치", "default", "32 / 210", "15.2%", "0.5200"],
  ["2026-09-22 13:21", "Tabular VAE", "드라이빙 기어", "default", "20 / 180", "11.1%", "0.0430"],
  ["2026-09-22 13:21", "Tabular VAE", "드라이빙 기어", "default", "20 / 180", "11.1%", "0.0430"],
] as const;
const RESULT_CODES = ["BMS", "PISC", "MICOM_AIRPURIFIER", "AXLE_BEARING", "FRU", "UNVR", "DCU", "DRIVING_GEAR", "DRIVING_GEAR"];
const RESULT_RATE_TOKENS = ["on-caution-subtle", "muted-fg", "danger", "muted-fg", "on-caution-subtle", "on-caution-subtle", "on-warning-subtle", "on-warning-subtle", "on-warning-subtle"];

const RECENT_JOBS = [
  { title: "TRACTION_MOTOR · SVM", status: "성공", pct: null, meta: "09-23 13:11 · 편성 410 · 이상 3.0%", tone: ["success-subtle", "on-success-subtle"] },
  { title: "ECU · VAE", status: "성공", pct: null, meta: "09-23 14:16 · 편성 411 · 이상 7.0%", tone: ["success-subtle", "on-success-subtle"] },
  { title: "MICOM_AIRPURIFIER · PCA", status: "추론 중", pct: "55%", meta: "09-23 15:21 · 세그먼트 1 / 2 처리 중", tone: ["brand-line4-subtle", "brand-on-line4-subtle"] },
  { title: "VVVF · IF", status: "성공", pct: null, meta: "09-23 16:26 · 편성 413 · 이상 15.0%", tone: ["success-subtle", "on-success-subtle"] },
] as const;
const FAILED_JOBS = [
  { title: "MICOM_COOLER · VAE", meta: "09-23 17:02 · 편성 409 · 센서 데이터 62% 누락" },
  { title: "ESW · IF", meta: "09-22 18:40 · 저장된 모델이 없습니다: device=ESW" },
] as const;

const FIXED_COLUMNS = [180, 210, 150, 150, 140, 130];
const FIXED_COLUMNS_SUM = FIXED_COLUMNS.reduce((sum, width) => sum + width, 0);
const HOVER_SHADOW = "rgba(11, 31, 46, 0.1) 0px 2px 8px 0px";
const CARD_SHADOW = "rgba(11, 31, 46, 0.06) 0px 1px 3px 0px";
const THUMB_SHADOW = "rgba(0, 0, 0, 0.25) 0px 1px 2px 0px";
const RESULT_COLUMN_COUNT = 7;

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`추론의 Layout과 조건 Row 확인 (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await openInference(page, viewport.width, viewport.height);

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

    await expect(page.locator(SELECTS)).toHaveText(["추론 모델 (전체)", "장치 (전체)"]);
    for (const [index, width] of [170, 190].entries()) {
      const trigger = await measure(page, SELECTS, index);
      expect(trigger.width).toBe(width);
      expect(trigger.height).toBe(32);
      expect(trigger.style.paddingLeft).toBe("12px");
      expect(trigger.style.paddingRight).toBe("10px");
      expect(trigger.style.borderTopLeftRadius).toBe("6px");
      expect(trigger.style.fontSize).toBe("14px");
      expect(trigger.style.backgroundColor).toBe(await color(page, "var(--card)"));
      expect(trigger.style.color).toBe(await color(page, "var(--fg)"));
      const arrow = await measure(page, `${SELECTS} svg`, index);
      expect(arrow.width).toBe(18);
      expect(arrow.style.color).toBe(await color(page, "var(--muted-fg)"));
      expect(await shownIconShape(page, `${SELECTS} svg`, index)).toBe(iconShape("KeyboardArrowDown"));
    }

    await expect(page.locator(TRIGGER)).toHaveText("추론일시 2026-09-17 ~ 2026-09-23");
    const range = await measure(page, TRIGGER);
    expect(range.width).toBe(330);
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
    expect(await styleOf(page, TRIGGER, "font-variant-numeric")).toBe("tabular-nums");
    const rangeIcon = await measure(page, `${TRIGGER} svg`);
    expect(rangeIcon.width).toBe(18);
    expect(rangeIcon.style.color).toBe(await color(page, "var(--fg)"));
    expect(await shownIconShape(page, `${TRIGGER} svg`)).toBe(iconShape("CalendarToday"));

    const reset = await measure(page, RESET);
    expect(reset.width).toBe(32);
    expect(reset.height).toBe(32);
    expect(reset.style.borderTopLeftRadius).toBe("6px");
    expect(reset.style.borderTopWidth).toBe("1px");
    expect(reset.style.backgroundColor).toBe(await color(page, "var(--card)"));
    await expect(page.locator(RESET)).toHaveAttribute("aria-label", "초기화");
    expect((await measure(page, `${RESET} svg`)).width).toBe(18);
    expect(await shownIconShape(page, `${RESET} svg`)).toBe(iconShape("Refresh"));

    await expect(page.locator(BUTTONS)).toHaveText(["검색", "추론 실행"]);
    for (const [index, icon] of ["Search", "PlayArrow"].entries()) {
      const button = await measure(page, BUTTONS, index);
      expect(button.height).toBe(32);
      expect(button.style.paddingLeft).toBe("16px");
      expect(button.style.paddingRight).toBe("16px");
      expect(button.style.borderTopLeftRadius).toBe("6px");
      expect(button.style.borderTopWidth).toBe("0px");
      expect(button.style.backgroundColor).toBe(await color(page, "var(--primary)"));
      expect(button.style.color).toBe(await color(page, "var(--on-primary)"));
      expect(button.style.fontSize).toBe("14px");
      expect(button.style.fontWeight).toBe("500");
      expect(button.style.columnGap).toBe("6px");
      expect((await measure(page, `${BUTTONS} svg`, index)).width).toBe(18);
      expect(await shownIconShape(page, `${BUTTONS} svg`, index)).toBe(iconShape(icon));
    }

    const [filterBox] = await boxes(page, FILTER);
    const leftGroup = [
      ...(await boxes(page, SELECTS)),
      await box(page, TRIGGER),
      await box(page, RESET),
      await box(page, BUTTONS, 0),
    ];
    expect(leftGroup[0].x - filterBox.x).toBeCloseTo(17, 1);
    for (let index = 1; index < leftGroup.length; index += 1) {
      const previous = leftGroup[index - 1];
      expect(leftGroup[index].x - (previous.x + previous.width)).toBeCloseTo(10, 1);
    }
    const runBox = await box(page, BUTTONS, 1);
    expect(runBox.x + runBox.width).toBeCloseTo(filterBox.x + filterBox.width - 17, 1);

    const jobs = await measure(page, JOBS);
    expect(await styleOf(page, JOBS, "flex-grow")).toBe("0");
    expect(jobs.width).toBe(root.width);
    expect(jobs.height).toBe(40 + 14 + 76 + 32 + 2);
    const list = await measure(page, JOB_LIST);
    expect(list.width).toBe(root.width - 2 - 36);
    for (const jobBox of await boxes(page, JOB)) {
      expect(jobBox.width).toBeCloseTo((list.width - 12 * 3) / 4, 1);
    }

    const results = await measure(page, RESULTS);
    expect(results.height).toBe(root.height - 66 - 14 - jobs.height - 14);
    expect(results.width).toBe(root.width);

    const cellWidths = await page.evaluate(
      (selector) =>
        [...document.querySelectorAll(selector)[0].querySelectorAll("td")].map(
          (cell) => cell.getBoundingClientRect().width,
        ),
      ROW,
    );
    const tableInner = results.width - 2 - 36 - 2;
    expect(cellWidths).toEqual([180, 210, Math.max(180, tableInner - FIXED_COLUMNS_SUM), 150, 150, 140, 130]);
  });
}

test("추론 Job Card의 헤더, Switch, Card 넷, 상태, 진행률 확인", async ({ page }) => {
  await openInference(page);

  const card = await measure(page, JOBS);
  expect(card.style.borderTopLeftRadius).toBe("16px");
  expect(card.style.paddingTop).toBe("16px");
  expect(card.style.paddingLeft).toBe("18px");
  expect(card.style.rowGap).toBe("14px");
  expect(card.style.borderTopWidth).toBe("1px");
  expect(card.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(visibleShadow(card.style.boxShadow)).toBe(CARD_SHADOW);

  await expect(page.locator(`${JOBS} [data-slot="section-card-eyebrow"]`)).toHaveText("INFERENCE JOBS");
  const eyebrow = await measure(page, `${JOBS} [data-slot="section-card-eyebrow"]`);
  expect(eyebrow.style.fontSize).toBe("11px");
  expect(eyebrow.style.lineHeight).toBe("16px");
  expect(eyebrow.style.fontWeight).toBe("700");
  expect(eyebrow.style.letterSpacing).toBe("0.6px");
  expect(eyebrow.style.color).toBe(await color(page, "var(--brand-line4-text)"));
  await expect(page.locator(`${JOBS} [data-slot="section-card-title"]`)).toHaveText("추론 진행 / 결과");
  const title = await measure(page, `${JOBS} [data-slot="section-card-title"]`);
  expect(title.style.fontSize).toBe("16px");
  expect(title.style.lineHeight).toBe("22px");
  expect(title.style.fontWeight).toBe("700");
  await expect(page.locator(JOBS_DESCRIPTION)).toHaveCount(0);

  await expect(page.locator(GUIDE)).toHaveText("카드를 누르면 상세");
  const guide = await measure(page, GUIDE);
  expect(guide.style.fontSize).toBe("12px");
  expect(guide.style.paddingTop).toBe("4px");
  expect(guide.style.color).toBe(await color(page, "var(--muted-fg)"));
  expect(guide.height).toBe(4 + (await normalLineHeight(page, "카드를 누르면 상세", 12)));
  const [cardBox] = await boxes(page, JOBS);
  const guideBox = await box(page, GUIDE);
  const switchBox = await box(page, SWITCH_LABEL);
  expect(guideBox.y).toBeCloseTo(cardBox.y + 17, 1);
  expect(switchBox.x - (guideBox.x + guideBox.width)).toBeCloseTo(12, 1);
  expect(switchBox.x + switchBox.width).toBeCloseTo(cardBox.x + cardBox.width - 19, 1);
  expect(switchBox.y).toBeCloseTo(cardBox.y + 17, 1);

  await expect(page.locator(SWITCH_LABEL)).toHaveText("실패만 보기");
  const label = await measure(page, SWITCH_LABEL);
  expect(label.style.fontSize).toBe("14px");
  expect(label.style.fontWeight).toBe("600");
  expect(label.style.color).toBe(await color(page, "var(--fg)"));
  expect(label.style.columnGap).toBe("8px");
  expect(label.height).toBe(24);
  const track = await measure(page, SWITCH);
  expect(track.width).toBe(44);
  expect(track.height).toBe(24);
  expect(parseFloat(track.style.borderTopLeftRadius)).toBeGreaterThanOrEqual(12);
  expect(track.style.borderTopWidth).toBe("0px");
  expect(track.style.backgroundColor).toBe(await color(page, "var(--muted-strong)"));
  await expect(page.getByRole("switch", { name: "실패만 보기" })).toHaveAttribute("aria-checked", "false");
  const thumb = await measure(page, THUMB);
  expect(thumb.width).toBe(20);
  expect(thumb.height).toBe(20);
  expect(thumb.style.backgroundColor).toBe(await color(page, "var(--on-primary)"));
  expect(visibleShadow(thumb.style.boxShadow)).toBe(THUMB_SHADOW);
  expect(parseFloat(await styleOf(page, THUMB, "border-top-left-radius"))).toBeGreaterThanOrEqual(thumb.width / 2);
  const trackBox = await box(page, SWITCH);
  const thumbBox = await box(page, THUMB);
  expect(thumbBox.x - trackBox.x).toBeCloseTo(2, 1);
  expect(thumbBox.y - trackBox.y).toBeCloseTo(2, 1);

  const list = await measure(page, JOB_LIST);
  expect(list.style.columnGap).toBe("12px");
  expect(list.style.rowGap).toBe("12px");
  expect(await styleOf(page, JOB_LIST, "display")).toBe("grid");
  await expect(page.locator(JOB)).toHaveCount(4);
  const jobBoxes = await boxes(page, JOB);
  for (const jobBox of jobBoxes) {
    expect(jobBox.y).toBe(jobBoxes[0].y);
    expect(jobBox.height).toBe(76);
  }
  expect(await styleOf(page, JOB, "min-height")).toBe("74px");

  for (let index = 0; index < 4; index += 1) {
    const job = await measure(page, JOB, index);
    expect(job.style.borderTopLeftRadius).toBe("10px");
    expect(job.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(job.style.rowGap).toBe("6px");
    if (index === 0) {
      expect(job.style.borderTopWidth).toBe("2px");
      expect(job.style.borderTopColor).toBe(await color(page, "var(--brand-line4)"));
      expect(job.style.paddingTop).toBe("13px");
      expect(job.style.paddingLeft).toBe("15px");
    } else {
      expect(job.style.borderTopWidth).toBe("1px");
      expect(job.style.borderTopColor).toBe(await color(page, "var(--border)"));
      expect(job.style.paddingTop).toBe("14px");
      expect(job.style.paddingLeft).toBe("16px");
    }
    const titleBox = await box(page, `${JOB} [data-slot="job-card-title"]`, index);
    expect(titleBox.x - jobBoxes[index].x).toBeCloseTo(17, 1);
  }
  await expect(page.locator(JOB).first()).toHaveAttribute("aria-current", "true");
  await expect(page.locator(`${JOB}[aria-current]`)).toHaveCount(1);

  await expect(page.locator(`${JOB} [data-slot="job-card-title"]`)).toHaveText(RECENT_JOBS.map((job) => job.title));
  await expect(page.locator(`${JOB} [data-slot="state-pill"]`)).toHaveText(RECENT_JOBS.map((job) => job.status));
  await expect(page.locator(`${JOB} [data-slot="job-card-meta"]`)).toHaveText(RECENT_JOBS.map((job) => job.meta));
  const jobTitle = await measure(page, `${JOB} [data-slot="job-card-title"]`);
  expect(jobTitle.style.fontSize).toBe("14px");
  expect(jobTitle.style.fontWeight).toBe("700");
  expect(await truncation(page, `${JOB} [data-slot="job-card-title"]`)).toEqual(["nowrap", "hidden", "ellipsis"]);
  for (const [index, job] of RECENT_JOBS.entries()) {
    const pill = await measure(page, `${JOB} [data-slot="state-pill"]`, index);
    expect(pill.height).toBe(24);
    expect(pill.style.paddingLeft).toBe("10px");
    expect(pill.style.borderTopLeftRadius).toBe("12px");
    expect(pill.style.fontSize).toBe("12px");
    expect(pill.style.fontWeight).toBe("600");
    expect(pill.style.backgroundColor).toBe(await color(page, `var(--${job.tone[0]})`));
    expect(pill.style.color).toBe(await color(page, `var(--${job.tone[1]})`));
    const meta = await measure(page, `${JOB} [data-slot="job-card-meta"]`, index);
    expect(meta.style.fontSize).toBe("12px");
    expect(meta.style.lineHeight).toBe("16px");
    expect(meta.style.color).toBe(await color(page, "var(--muted-fg)"));
  }
  expect(await styleOf(page, `${JOB} [data-slot="job-card-meta"]`, "font-variant-numeric")).toBe("tabular-nums");
  expect(await truncation(page, `${JOB} [data-slot="job-card-meta"]`, 2)).toEqual(["nowrap", "hidden", "ellipsis"]);

  await expect(page.locator(`${JOB} [data-slot="job-card-progress"]`)).toHaveText(["55%"]);
  await expect(page.locator(`${JOB} [data-slot="spinner"]`)).toHaveCount(1);
  await expect(page.locator(JOB).nth(2).locator('[data-slot="spinner"]')).toHaveCount(1);
  const spinner = await measure(page, `${JOB} [data-slot="spinner"]`);
  expect(spinner.width).toBe(14);
  expect(spinner.height).toBe(14);
  expect(spinner.style.color).toBe(await color(page, "var(--brand-line4)"));
  await expect(page.locator(`${JOB} [data-slot="spinner"].lucide-loader-circle`)).toHaveCount(1);
  expect(await styleOf(page, `${JOB} [data-slot="spinner"]`, "stroke")).toBe(await color(page, "var(--brand-line4)"));
  const progress = await measure(page, `${JOB} [data-slot="job-card-progress"]`);
  expect(progress.style.fontSize).toBe("14px");
  expect(progress.style.fontWeight).toBe("700");
  expect(progress.style.color).toBe(await color(page, "var(--brand-line4-text)"));
  await expect(page.locator(`${JOB} [data-slot="job-card-steps"]`)).toHaveCount(0);
});

test("실패만 보기를 켜면 실패한 Job이 전부 표시되고, 헤더의 설명이 보이며, 다시 끄면 앞의 넷이 표시됨", async ({ page }) => {
  await openInference(page);
  const jobsBefore = await measure(page, JOBS);
  const resultsBefore = await measure(page, RESULTS);
  const toggle = page.getByRole("switch", { name: "실패만 보기" });

  await page.locator(SWITCH_LABEL).getByText("실패만 보기").click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.waitForTimeout(300);
  expect((await measure(page, SWITCH)).style.backgroundColor).toBe(await color(page, "var(--primary)"));
  expect((await box(page, THUMB)).x - (await box(page, SWITCH)).x).toBeCloseTo(22, 1);

  await expect(page.locator(JOB)).toHaveCount(2);
  await expect(page.locator(`${JOB} [data-slot="job-card-title"]`)).toHaveText(FAILED_JOBS.map((job) => job.title));
  await expect(page.locator(`${JOB} [data-slot="state-pill"]`)).toHaveText(["실패", "실패"]);
  await expect(page.locator(`${JOB} [data-slot="job-card-meta"]`)).toHaveText(FAILED_JOBS.map((job) => job.meta));
  for (let index = 0; index < 2; index += 1) {
    const pill = await measure(page, `${JOB} [data-slot="state-pill"]`, index);
    expect(pill.style.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
    expect(pill.style.color).toBe(await color(page, "var(--on-danger-subtle)"));
    const meta = await measure(page, `${JOB} [data-slot="job-card-meta"]`, index);
    expect(meta.style.color).toBe(await color(page, "var(--danger)"));
  }
  await expect(page.locator(`${JOB}[aria-current]`)).toHaveCount(0);

  await expect(page.locator(JOBS_DESCRIPTION)).toHaveText(
    "실패 2건만 표시 중 · 카드의 재시도 또는 상세에서 원인을 확인하세요",
  );
  const description = await measure(page, JOBS_DESCRIPTION);
  expect(description.style.fontSize).toBe("14px");
  expect(description.style.lineHeight).toBe("20px");
  expect(description.style.color).toBe(await color(page, "var(--muted-fg)"));
  const titleBox = await box(page, `${JOBS} [data-slot="section-card-title"]`);
  expect((await box(page, JOBS_DESCRIPTION)).y - (titleBox.y + titleBox.height)).toBeCloseTo(4, 1);
  expect((await measure(page, JOBS)).height).toBe(jobsBefore.height + 24);
  expect((await measure(page, RESULTS)).height).toBe(resultsBefore.height - 24);
  await expect(page.locator(ROW)).toHaveCount(9);

  await toggle.focus();
  await page.keyboard.press(" ");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(page.locator(JOB)).toHaveCount(4);
  await expect(page.locator(`${JOB} [data-slot="job-card-title"]`)).toHaveText(RECENT_JOBS.map((job) => job.title));
  await expect(page.locator(JOBS_DESCRIPTION)).toHaveCount(0);
  await page.waitForTimeout(300);
  expect((await measure(page, SWITCH)).style.backgroundColor).toBe(await color(page, "var(--muted-strong)"));
  expect((await box(page, THUMB)).x - (await box(page, SWITCH)).x).toBeCloseTo(2, 1);
  await expect(page.locator(JOB).first()).toHaveAttribute("aria-current", "true");
});

test("실패만 보기 Switch를 Keyboard Enter와 Space 모두로 켜고 끌 수 있음", async ({ page }) => {
  await openInference(page);
  const toggle = page.getByRole("switch", { name: "실패만 보기" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(JOB)).toHaveCount(2);
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(page.locator(JOB)).toHaveCount(4);
  await expect(toggle).toBeFocused();
});

test("추론 결과 Card의 헤더, Table, Page 번호 확인", async ({ page }) => {
  await openInference(page);

  const card = await measure(page, RESULTS);
  expect(card.style.borderTopLeftRadius).toBe("16px");
  expect(card.style.paddingTop).toBe("16px");
  expect(card.style.paddingLeft).toBe("18px");
  expect(card.style.rowGap).toBe("14px");
  expect(visibleShadow(card.style.boxShadow)).toBe(CARD_SHADOW);

  await expect(page.locator(`${RESULTS} [data-slot="section-card-eyebrow"]`)).toHaveText("INFERENCE RESULTS");
  await expect(page.locator(`${RESULTS} [data-slot="section-card-title"]`)).toHaveText("장치 추론 결과");
  const descriptionSelector = `${RESULTS} [data-slot="section-card-description"]`;
  await expect(page.locator(descriptionSelector)).toHaveText(
    "이상 비율은 상태 기준 색으로 강조 (위험 ≥ 20% · 경고 ≥ 10% · 주의 > 0%)",
  );
  const description = await measure(page, descriptionSelector);
  expect(description.style.fontSize).toBe("14px");
  expect(description.style.lineHeight).toBe("20px");
  expect(description.style.color).toBe(await color(page, "var(--muted-fg)"));

  await expect(page.locator(TOTAL)).toHaveText("총 31건");
  const total = await measure(page, TOTAL);
  expect(total.style.fontSize).toBe("14px");
  expect(total.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator(`${RESULTS} [data-slot="select-trigger"]`)).toHaveCount(0);
  await expect(page.locator(CSV)).toHaveText("CSV 내보내기");
  const csv = await measure(page, CSV);
  expect(csv.height).toBe(32);
  expect(csv.style.paddingLeft).toBe("16px");
  expect(csv.style.borderTopLeftRadius).toBe("6px");
  expect(csv.style.borderTopWidth).toBe("1px");
  expect(csv.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(csv.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(csv.style.color).toBe(await color(page, "var(--fg)"));
  expect(csv.style.fontSize).toBe("14px");
  expect(csv.style.fontWeight).toBe("600");
  expect(csv.style.columnGap).toBe("6px");
  expect((await measure(page, `${CSV} svg`)).width).toBe(18);
  expect(await shownIconShape(page, `${CSV} svg`)).toBe(iconShape("Download"));
  const [cardBox] = await boxes(page, RESULTS);
  const totalBox = await box(page, TOTAL);
  const csvBox = await box(page, CSV);
  expect(csvBox.x - (totalBox.x + totalBox.width)).toBeCloseTo(12, 1);
  expect(csvBox.x + csvBox.width).toBeCloseTo(cardBox.x + cardBox.width - 19, 1);
  expect(csvBox.y).toBeCloseTo(cardBox.y + 17, 1);

  const frame = await measure(page, `${RESULTS} [data-slot="data-table"]`);
  expect(frame.style.borderTopWidth).toBe("1px");
  expect(frame.style.borderTopLeftRadius).toBe("10px");
  const headRow = await measure(page, `${RESULTS} thead [data-slot="table-row"]`);
  expect(headRow.height).toBe(44);
  expect(headRow.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(headRow.style.borderBottomWidth).toBe("1px");
  expect(await texts(page, HEAD)).toEqual(["추론 일시", "모델 명", "장치 명", "세그먼트", "이상 window", "이상 비율", "임계치"]);
  for (let index = 0; index < 7; index += 1) {
    const head = await measure(page, HEAD, index);
    expect(head.style.fontSize).toBe("14px");
    expect(head.style.fontWeight).toBe("400");
    expect(head.style.paddingLeft).toBe("16px");
    expect(head.style.paddingRight).toBe("16px");
    expect(head.style.textAlign).toBe(index >= 4 ? "right" : "left");
  }
  await expect(page.locator(HEAD).nth(2)).toHaveAttribute("title", "장치 이름에 마우스를 올리면 장치 Code 가 보입니다");
  await expect(page.locator(`${HEAD}[title]`)).toHaveCount(1);
  await expect(page.locator(`${HEAD} button`)).toHaveCount(0);
  await expect(page.locator(`${HEAD}[aria-sort]`)).toHaveCount(0);

  await expect(page.locator(ROW)).toHaveCount(9);
  for (let column = 0; column < 7; column += 1) {
    expect(await columnTexts(page, ROW, column)).toEqual(RESULT_ROWS.map((row) => row[column]));
  }
  const row = await measure(page, ROW);
  expect(row.height).toBe(48);
  expect(row.style.borderBottomWidth).toBe("1px");
  expect(row.style.fontSize).toBe("14px");
  expect(await styleOf(page, ROW, "font-variant-numeric")).toBe("tabular-nums");
  const cell = (rowIndex: number, column: number) =>
    page.evaluate(
      ({ selector, rowIndex, column }) => {
        const element = document.querySelectorAll(selector)[rowIndex].querySelectorAll("td")[column];
        const style = getComputedStyle(element);
        return {
          weight: style.fontWeight,
          align: style.textAlign,
          color: style.color,
          paddingLeft: style.paddingLeft,
          title: element.getAttribute("title"),
        };
      },
      { selector: ROW, rowIndex, column },
    );
  for (let rowIndex = 0; rowIndex < RESULT_ROWS.length; rowIndex += 1) {
    const cells = await Promise.all([0, 1, 2, 3, 4, 5, 6].map((column) => cell(rowIndex, column)));
    expect(cells.map((value) => value.weight)).toEqual([
      "700",
      "700",
      "700",
      "400",
      RESULT_ROWS[rowIndex][4].startsWith("0 ") ? "400" : "700",
      "700",
      "400",
    ]);
    expect(cells.map((value) => value.align)).toEqual(["start", "start", "start", "start", "right", "right", "right"]);
    expect(cells.every((value) => value.paddingLeft === "16px")).toBe(true);
    expect(cells[2].title).toBe(RESULT_CODES[rowIndex]);
    expect(cells[5].color).toBe(await color(page, `var(--${RESULT_RATE_TOKENS[rowIndex]})`));
    expect(cells[6].color).toBe(await color(page, "var(--muted-fg)"));
    expect(cells[0].color).toBe(await color(page, "var(--fg)"));
  }

  await expect(page.locator(ROW).first()).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(`${ROW}[aria-selected="true"]`)).toHaveCount(1);
  expect((await measure(page, ROW, 0)).style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect((await measure(page, ROW, 1)).style.backgroundColor).toBe("rgba(0, 0, 0, 0)");

  await expect(page.locator(`${RESULTS} [data-slot="pagination-page"]`)).toHaveText(["1", "2", "3", "10"]);
  await expect(page.locator(`${RESULTS} [data-slot="pagination-ellipsis"]`)).toHaveText("…");
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
  const paginationBox = await box(page, `${RESULTS} [data-slot="pagination"]`);
  expect(paginationBox.y + paginationBox.height).toBeCloseTo(cardBox.y + cardBox.height - 17, 1);
});

test("조건, 검색, 초기화, Page 이동, 결과가 없을 때 확인", async ({ page }) => {
  await openInference(page);
  const pages = page.locator(`${RESULTS} [data-slot="pagination-page"]`);
  const selects = page.locator(SELECTS);

  await pages.nth(1).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await page.locator(`${RESULTS} [data-slot="pagination-next"]`).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await page.locator(`${RESULTS} [data-slot="pagination-previous"]`).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");

  await selects.nth(0).click();
  await pickOption(page, "Isolation Forest");
  await expect(selects.nth(0)).toHaveText("Isolation Forest");
  await expect(page.locator(ROW)).toHaveCount(9);
  await page.locator(BUTTONS).first().click();
  await expect(page.locator(ROW)).toHaveCount(4);
  expect(await columnTexts(page, ROW, 2)).toEqual(["표시기장치", "차축 베어링", "화재감지장치", "출입문장치"]);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");

  await selects.nth(1).click();
  await pickOption(page, "DCU");
  await page.locator(BUTTONS).first().click();
  await expect(page.locator(ROW)).toHaveCount(1);
  expect(await columnTexts(page, ROW, 2)).toEqual(["출입문장치"]);

  await selects.nth(0).click();
  await pickOption(page, "PCA Reconstruction");
  await page.locator(BUTTONS).first().click();
  await expect(page.locator(ROW)).toHaveCount(0);
  await expect(page.locator(`${RESULTS} [data-slot="empty-state"]`)).toHaveCount(0);
  await expect(page.locator(`${RESULTS} thead [data-slot="table-row"]`)).toBeVisible();

  await pages.nth(2).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await page.locator(RESET).click();
  await expect(selects).toHaveText(["추론 모델 (전체)", "장치 (전체)"]);
  await expect(page.locator(TRIGGER)).toHaveText("추론일시 2026-09-17 ~ 2026-09-23");
  await expect(page.locator(ROW)).toHaveCount(9);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
});

test("추론일시를 고르면 즉시 반영되어 첫 Page로 가고, 초기화하면 처음 기간으로 돌아감", async ({ page }) => {
  await openInference(page);
  const pages = page.locator(`${RESULTS} [data-slot="pagination-page"]`);
  await pages.nth(2).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");

  await page.locator(TRIGGER).click();
  await expect(page.locator(CALENDAR)).toBeVisible();
  await expect(page.locator(TRIGGER)).toHaveCSS("border-top-color", await color(page, "var(--brand-line4)"));
  await expect(page.locator(`${CALENDAR} [role="status"]`)).toHaveText(["2026년 9월", "2026년 10월"]);

  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-23")} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText("추론일시 2026-09-23");
  await expect(page.locator(ROW)).toHaveCount(4);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
  expect(await columnTexts(page, ROW, 0)).toEqual(RESULT_ROWS.slice(0, 4).map((row) => row[0]));
  await page.keyboard.press("Escape");
  await expect(page.locator(CALENDAR)).toHaveCount(0);

  await pages.nth(1).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await page.locator(TRIGGER).click();
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-22")} button`).click();
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-22")} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText("추론일시 2026-09-22 ~ 2026-09-22");
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await expect(page.locator(ROW)).toHaveCount(5);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");

  await page.locator(RESET).click();
  await expect(page.locator(TRIGGER)).toHaveText("추론일시 2026-09-17 ~ 2026-09-23");
  await expect(page.locator(ROW)).toHaveCount(9);
});

test("검색과 초기화는 조건이 그대로여도 다시 조회하고, 다시 받는 동안 Card와 Row를 막음", async ({ page }) => {
  await openInference(page);
  const firstJob = `${JOB_LIST} [data-slot="job-card"]:first-child`;
  const firstRow = `${ROW}:first-child`;
  await delayMockResponses(page, RELOAD_MS);
  for (const button of [`${BUTTONS} >> nth=0`, RESET]) {
    await watchDisabled(page, "job", firstJob);
    await watchDisabled(page, "row", firstRow);
    await page.locator(button).click();
    await expect(page.locator(firstRow)).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator(firstJob)).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator(firstRow)).toHaveAttribute("aria-disabled", "false");
    await expect(page.locator(firstJob)).toHaveAttribute("aria-disabled", "false");
    expect(await stopWatchingDisabled(page, "job")).toEqual(["true", "false"]);
    expect(await stopWatchingDisabled(page, "row")).toEqual(["true", "false"]);
  }
  await watchDisabledWithin(page, "jobs", JOB_LIST);
  await watchDisabled(page, "row", firstRow);
  await page.getByRole("switch", { name: "실패만 보기" }).click();
  await expect(page.locator(JOB)).toHaveCount(2);
  await page.waitForTimeout(NO_RELOAD_WATCH_MS);
  await expect(page.locator(`${JOB}[aria-disabled="true"]`)).toHaveCount(0);
  expect(await stopWatchingDisabled(page, "jobs")).toEqual([]);
  expect(await stopWatchingDisabled(page, "row")).toEqual([]);
});

test("막힌 결과 Row는 Job Card처럼 옅어지고 Mouse가 닿지 않음, 다시 받는 동안(Hover 배경 없음, 손가락 모양 Cursor 없음)", async ({ page }) => {
  await openInference(page);
  const firstRow = `${ROW}:first-child`;
  const firstJob = `${JOB_LIST} [data-slot="job-card"]:first-child`;
  await delayMockResponses(page, RELOAD_MS);
  await watchDisabledLook(page, "row", firstRow);
  await page.locator(PAGES).nth(1).click();
  await expect(page.locator(firstRow)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(firstRow)).toHaveAttribute("aria-disabled", "false");
  const rowLooks = await stopWatchingDisabledLook(page, "row");
  expect(rowLooks).toEqual([
    { disabled: "true", opacity: "0.5", pointerEvents: "none", reachable: false },
    { disabled: "false", opacity: "1", pointerEvents: "auto", reachable: true },
  ]);
  await watchDisabledLook(page, "job", firstJob);
  await page.locator(`${BUTTONS} >> nth=0`).click();
  await expect(page.locator(firstJob)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(firstJob)).toHaveAttribute("aria-disabled", "false");
  const jobLooks = await stopWatchingDisabledLook(page, "job");
  expect(jobLooks.map(({ disabled, pointerEvents }) => ({ disabled, pointerEvents }))).toEqual(
    rowLooks.map(({ disabled, pointerEvents }) => ({ disabled, pointerEvents })),
  );
  await expect(page.locator(SEARCHING)).toHaveCount(0);
  expect(await pressable(page, firstJob)).toEqual([true]);
});

test("Job Card와 결과 Row를 Mouse와 Keyboard로 고르고 손가락 모양 Cursor가 표시됨", async ({ page }) => {
  await openInference(page);
  const closeDetail = async () => {
    await expect(page.locator(modal("inference-detail"))).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(modal("inference-detail"))).toHaveCount(0);
  };

  await page.locator(JOB).nth(1).click();
  await closeDetail();
  await expect(page.locator(JOB).nth(1)).toHaveAttribute("aria-current", "true");
  await expect(page.locator(`${JOB}[aria-current]`)).toHaveCount(1);
  await page.locator(JOB).nth(2).focus();
  await page.keyboard.press("Enter");
  await closeDetail();
  await expect(page.locator(JOB).nth(2)).toHaveAttribute("aria-current", "true");
  await page.locator(JOB).nth(3).focus();
  await page.keyboard.press(" ");
  await closeDetail();
  await expect(page.locator(JOB).nth(3)).toHaveAttribute("aria-current", "true");
  await expect(page.locator(`${JOB}[aria-current]`)).toHaveCount(1);
  await expect(page.locator(`${JOB}[data-selected]`)).toHaveCount(0);

  await page.locator(ROW).nth(2).click();
  await closeDetail();
  await expect(page.locator(ROW).nth(2)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(`${ROW}[aria-selected="true"]`)).toHaveCount(1);
  await page.locator(ROW).nth(4).focus();
  await page.keyboard.press("Enter");
  await closeDetail();
  await expect(page.locator(ROW).nth(4)).toHaveAttribute("aria-selected", "true");
  await page.locator(ROW).nth(6).focus();
  await page.keyboard.press(" ");
  await closeDetail();
  await expect(page.locator(ROW).nth(6)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(`${ROW}[aria-selected="true"]`)).toHaveCount(1);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  expect((await measure(page, ROW, 6)).style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));

  await page.getByRole("switch", { name: "실패만 보기" }).click();
  await page.locator(JOB).nth(1).click();
  await closeDetail();
  await expect(page.locator(JOB).nth(1)).toHaveAttribute("aria-current", "true");
  await page.getByRole("switch", { name: "실패만 보기" }).click();
  await expect(page.locator(`${JOB}[aria-current]`)).toHaveCount(0);

  const pointers = [
    JOB,
    ROW,
    SWITCH_LABEL,
    SWITCH,
    RESET,
    BUTTONS,
    CSV,
    `${RESULTS} [data-slot="pagination-page"]`,
    `${RESULTS} [data-slot="pagination-next"]`,
  ];
  for (const selector of pointers) {
    expect(await styleOf(page, selector, "cursor"), selector).toBe("pointer");
  }
  expect(await styleOf(page, `${BUTTONS}`, "cursor", 1)).toBe("pointer");
  expect(await styleOf(page, SELECTS, "cursor")).toBe("pointer");
  expect(await styleOf(page, TRIGGER, "cursor")).toBe("pointer");
});

for (const theme of ["light", "dark"] as const) {
  test(`Hover한 Card, Row, Switch의 Color 확인 (${theme} Theme)`, async ({ page }) => {
    await openInference(page);
    if (theme === "dark") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
      await page.waitForTimeout(300);
    }
    const hoveredCard = await hoveredStyle(page, JOB, 1);
    expect(visibleShadow(hoveredCard.shadow)).toBe(HOVER_SHADOW);
    expect(hoveredCard.background).toBe(await color(page, "var(--card)"));
    const hoveredRow = await hoveredStyle(page, ROW, 3);
    expect(hoveredRow.background).toBe(await color(page, "var(--brand-line4-subtle)"));
    const hoveredSwitch = await hoveredStyle(page, SWITCH);
    expect(hoveredSwitch.background).toBe(await color(page, "var(--muted-strong)"));
  });
}

test("기본 Font 크기를 2배로 하면 추론의 크기도 2배가 됨", async ({ page }) => {
  await openInference(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page.waitForTimeout(400);

  const filter = await measure(page, FILTER);
  expect(filter.height).toBe(132);
  expect(filter.style.borderTopWidth).toBe("2px");
  expect((await measure(page, SELECTS, 0)).width).toBe(340);
  expect((await measure(page, SELECTS, 1)).width).toBe(380);
  const range = await measure(page, TRIGGER);
  expect(range.width).toBe(660);
  expect(range.height).toBe(64);
  const run = await measure(page, BUTTONS, 1);
  expect(run.height).toBe(64);
  expect(run.style.paddingLeft).toBe("32px");

  const jobs = await measure(page, JOBS);
  expect(jobs.height).toBe(2 * (40 + 14 + 76 + 32 + 2));
  expect(jobs.style.borderTopWidth).toBe("2px");
  for (const jobBox of await boxes(page, JOB)) {
    expect(jobBox.height).toBe(152);
  }
  const job = await measure(page, JOB);
  expect(job.style.borderTopWidth).toBe("4px");
  expect(job.style.paddingTop).toBe("26px");
  expect(job.style.borderTopLeftRadius).toBe("20px");
  expect((await measure(page, GUIDE)).style.paddingTop).toBe("8px");
  expect((await measure(page, GUIDE)).style.fontSize).toBe("24px");
  const track = await measure(page, SWITCH);
  expect(track.width).toBe(88);
  expect(track.height).toBe(48);
  expect(parseFloat(track.style.borderTopLeftRadius)).toBeGreaterThanOrEqual(24);
  const thumb = await measure(page, THUMB);
  expect(thumb.width).toBe(40);
  expect((await box(page, THUMB)).x - (await box(page, SWITCH)).x).toBeCloseTo(4, 1);
  expect(visibleShadow(thumb.style.boxShadow)).toBe("rgba(0, 0, 0, 0.25) 0px 2px 4px 0px");
  expect((await measure(page, SWITCH_LABEL)).style.fontSize).toBe("28px");
  const spinner = await measure(page, `${JOB} [data-slot="spinner"]`);
  expect(spinner.width).toBe(28);

  const headRow = await measure(page, `${RESULTS} thead [data-slot="table-row"]`);
  expect(headRow.height).toBe(88);
  const row = await measure(page, ROW);
  expect(row.height).toBe(96);
  expect(row.style.fontSize).toBe("28px");
  expect((await measure(page, HEAD)).style.paddingLeft).toBe("32px");
  const cellWidths = await page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)[0].querySelectorAll("td")].map(
        (cell) => cell.getBoundingClientRect().width,
      ),
    ROW,
  );
  expect([cellWidths[0], cellWidths[1], ...cellWidths.slice(3)]).toEqual(FIXED_COLUMNS.map((width) => width * 2));
  const csv = await measure(page, CSV);
  expect(csv.height).toBe(64);
  expect(csv.style.borderTopWidth).toBe("2px");
});

test("다크 Theme에서 추론의 Color 확인", async ({ page }) => {
  await openInference(page);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.waitForTimeout(300);
  const token = (name: string) => color(page, `var(--${name})`);

  expect((await measure(page, FILTER)).style.backgroundColor).toBe(await token("surface-low"));
  const select = await measure(page, SELECTS);
  expect(select.style.backgroundColor).toBe(await token("card"));
  expect(select.style.borderTopColor).toBe(await token("border"));
  expect(select.style.color).toBe(await token("fg"));
  const range = await measure(page, TRIGGER);
  expect(range.style.backgroundColor).toBe(await token("card"));
  expect(range.style.color).toBe(await token("fg"));
  const search = await measure(page, BUTTONS);
  expect(search.style.backgroundColor).toBe(await token("primary"));
  expect(search.style.color).toBe(await token("on-primary"));

  const jobs = await measure(page, JOBS);
  expect(jobs.style.backgroundColor).toBe(await token("card"));
  expect(jobs.style.borderTopColor).toBe(await token("border"));
  expect((await measure(page, `${JOBS} [data-slot="section-card-eyebrow"]`)).style.color).toBe(await token("brand-line4-text"));
  expect((await measure(page, GUIDE)).style.color).toBe(await token("muted-fg"));
  expect((await measure(page, SWITCH_LABEL)).style.color).toBe(await token("fg"));
  expect((await measure(page, SWITCH)).style.backgroundColor).toBe(await token("muted-strong"));
  expect((await measure(page, THUMB)).style.backgroundColor).toBe(await token("on-primary"));
  const first = await measure(page, JOB, 0);
  expect(first.style.backgroundColor).toBe(await token("card"));
  expect(first.style.borderTopColor).toBe(await token("brand-line4"));
  expect((await measure(page, JOB, 1)).style.borderTopColor).toBe(await token("border"));
  for (const [index, job] of RECENT_JOBS.entries()) {
    const pill = await measure(page, `${JOB} [data-slot="state-pill"]`, index);
    expect(pill.style.backgroundColor).toBe(await token(job.tone[0]));
    expect(pill.style.color).toBe(await token(job.tone[1]));
    expect((await measure(page, `${JOB} [data-slot="job-card-meta"]`, index)).style.color).toBe(await token("muted-fg"));
  }
  expect((await measure(page, `${JOB} [data-slot="job-card-progress"]`)).style.color).toBe(await token("brand-line4-text"));
  await page.getByRole("switch", { name: "실패만 보기" }).click();
  await page.waitForTimeout(300);
  expect((await measure(page, SWITCH)).style.backgroundColor).toBe(await token("primary"));
  expect((await measure(page, THUMB)).style.backgroundColor).toBe(await token("on-primary"));
  expect((await measure(page, `${JOB} [data-slot="job-card-meta"]`)).style.color).toBe(await token("danger"));
  expect((await measure(page, `${JOB} [data-slot="state-pill"]`)).style.backgroundColor).toBe(await token("danger-subtle"));
  expect((await measure(page, JOBS_DESCRIPTION)).style.color).toBe(await token("muted-fg"));
  await page.getByRole("switch", { name: "실패만 보기" }).click();

  const results = await measure(page, RESULTS);
  expect(results.style.backgroundColor).toBe(await token("card"));
  expect((await measure(page, TOTAL)).style.color).toBe(await token("muted-fg"));
  const csv = await measure(page, CSV);
  expect(csv.style.borderTopColor).toBe(await token("border"));
  expect(csv.style.color).toBe(await token("fg"));
  expect((await measure(page, `${RESULTS} thead [data-slot="table-row"]`)).style.backgroundColor).toBe(await token("muted"));
  expect((await measure(page, ROW, 0)).style.backgroundColor).toBe(await token("brand-line4-subtle"));
  expect((await measure(page, ROW, 0)).style.borderBottomColor).toBe(await token("border"));
  for (const [rowIndex, rateToken] of RESULT_RATE_TOKENS.entries()) {
    const rate = await page.evaluate(
      ({ selector, rowIndex }) => getComputedStyle(document.querySelectorAll(selector)[rowIndex].querySelectorAll("td")[5]).color,
      { selector: ROW, rowIndex },
    );
    expect(rate).toBe(await token(rateToken));
  }
});

test.describe("움직임 줄이기에 따른 Switch와 진행 표시 확인", () => {
  test("움직임 줄이기를 켜면 Switch의 Thumb가 전환 없이 옮겨 가고 진행 고리가 돌지 않음", async ({ page }) => {
    await openInference(page);
    expect(await styleOf(page, THUMB, "transition-property")).toBe("none");
    expect(await styleOf(page, `${JOB} [data-slot="spinner"]`, "animation-name")).toBe("none");
    expect(await styleOf(page, SWITCH, "transition-duration")).toBe("0.2s");
  });

  test.describe("움직임 줄이기를 끈 화면", () => {
    test.use({ contextOptions: { reducedMotion: "no-preference" } });

    test("Switch의 Thumb와 Track은 base 0.2초 ease-in-out, 진행 고리는 1.2초로 움직임", async ({ page }) => {
      await openInference(page);
      expect(await styleOf(page, THUMB, "transition-property")).toContain("translate");
      expect(await styleOf(page, THUMB, "transition-duration")).toBe("0.2s");
      expect(await styleOf(page, THUMB, "transition-timing-function")).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
      expect(await styleOf(page, SWITCH, "transition-duration")).toBe("0.2s");
      expect(await styleOf(page, SWITCH, "transition-timing-function")).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
      const spinner = `${JOB} [data-slot="spinner"]`;
      expect(await styleOf(page, spinner, "animation-name")).toBe("spin");
      expect(await styleOf(page, spinner, "animation-duration")).toBe("1.2s");
      expect(await styleOf(page, spinner, "animation-timing-function")).toBe("linear");
      expect(await styleOf(page, spinner, "animation-iteration-count")).toBe("infinite");
    });
  });
});

test("CSV 내보내기는 적용된 조건과 기간에 맞는 결과 전부를 Table에 보이는 형식의 CSV 파일로 내려받음", async ({ page }) => {
  await openInference(page);
  const toast = page.locator('[data-slot="toast"]');
  const selects = page.locator(SELECTS);

  const first = await downloadCsv(page, CSV);
  expect(first.fileName).toBe("inference-results-20260923-120000.csv");
  expect(first.hasByteOrderMark).toBe(true);
  expect(first.endsWithLineEnd).toBe(true);
  expect(first.hasBareLineBreak).toBe(false);
  await expect(toast).toHaveText("CSV 파일을 내려받았습니다.");
  await expect(page.locator(CSV)).toHaveAttribute("aria-disabled", "false");
  expect(first.lines[0]).toBe("추론 일시,모델 명,장치 명,세그먼트,이상 window,이상 비율,임계치");
  expect(first.lines[0]).toBe((await texts(page, HEAD)).join(","));
  expect(first.lines.slice(1)).toEqual(RESULT_ROWS.map((row) => row.join(",")));
  expect(first.lines.slice(1)).toEqual(await shownTableLines(page, ROW, RESULT_COLUMN_COUNT));
  await expect(page.locator(TOTAL)).toHaveText("총 31건");

  await selects.nth(0).click();
  await pickOption(page, "Isolation Forest");
  const pickedOnly = await downloadCsv(page, CSV);
  expect(pickedOnly.lines).toHaveLength(1 + 9);
  await page.locator(BUTTONS).first().click();
  await expect(page.locator(ROW)).toHaveCount(4);
  const searched = await downloadCsv(page, CSV);
  expect(searched.lines.slice(1)).toEqual(await shownTableLines(page, ROW, RESULT_COLUMN_COUNT));
  expect(searched.lines).toHaveLength(1 + 4);

  await page.locator(TRIGGER).click();
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-23")} button`).click();
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-23")} button`).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(ROW)).toHaveCount(2);
  const ranged = await downloadCsv(page, CSV);
  expect(ranged.lines.slice(1)).toEqual(await shownTableLines(page, ROW, RESULT_COLUMN_COUNT));
  expect(ranged.lines.slice(1)).toEqual([RESULT_ROWS[1].join(","), RESULT_ROWS[3].join(",")]);
});

test("고정 표기, 판정, Color 확인, Job 상태, 실패 여부, 이상 비율 등급", () => {
  const statuses: InferenceJobStatus[] = ["queued", "running", "succeeded", "failed"];
  expect(statuses.map((status) => inferenceJobStatusLabels[status].label)).toEqual(["예약", "추론 중", "성공", "실패"]);
  expect(inferenceJobStatusLabels.queued.codeLabel).toBe("QUEUED");
  expect(statuses.map(isFailedInferenceJobStatus)).toEqual([false, false, false, true]);
  expect(statuses.map((status) => inferenceJobStatusTones[status])).toEqual(["muted", "brand", "success", "danger"]);
  expect(statuses.map((status) => inferenceJobMetaTones[status])).toEqual(["muted", "muted", "muted", "danger"]);
  const thresholds = { dangerMinPercent: 20, warningMinPercent: 10 };
  expect(classifyAnomalyWindows(36, 180, thresholds)).toBe("danger");
  expect(classifyAnomalyWindows(35, 180, thresholds)).toBe("warning");
  expect(classifyAnomalyWindows(18, 180, thresholds)).toBe("warning");
  expect(classifyAnomalyWindows(17, 180, thresholds)).toBe("caution");
  expect(classifyAnomalyWindows(1, 240, thresholds)).toBe("caution");
  expect(classifyAnomalyWindows(0, 210, thresholds)).toBe("normal");
  expect(classifyAnomalyWindows(0, 0, thresholds)).toBe("normal");
  expect(classifyAnomalyWindows(25, 200, { dangerMinPercent: 20, warningMinPercent: 12.5 })).toBe("warning");
  expect(classifyAnomalyWindows(24, 200, { dangerMinPercent: 20, warningMinPercent: 12.5 })).toBe("caution");
  expect(inferenceRateTextClassNames.normal).toBe("text-muted-foreground");
});

test("Mock 조회와 실행 함수는 조건과 기간으로 거르고, 바꾼 Job은 다시 조회한 값에 반영함", async () => {
  const options = await fetchInferenceFilterOptions();
  expect(options.levelThresholds).toEqual({ dangerMinPercent: 20, warningMinPercent: 10 });
  expect(options.selectablePeriod).toEqual({ from: null, to: null });
  const today = new Date();
  const iso = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);
  expect(options.defaultPeriod).toEqual({ from: iso(weekAgo), to: iso(today) });

  const initial = await fetchInferenceJobs();
  expect(initial.recentDays).toBe(7);
  expect(initial.jobs.map((job) => job.id)).toEqual(["inf-2000", "inf-2003", "inf-2002", "inf-2004", "inf-2006", "inf-2005"]);

  const all = await fetchInferenceResults({ modelCode: null, deviceCode: null, period: { from: null, to: null }, page: 1 });
  expect(all.rows).toHaveLength(9);
  expect(all.totalCount).toBe(31);
  expect(all.pageCount).toBe(10);
  expect(all.rows.map((row) => row.anomalyRateLevel)).toEqual(["caution", "normal", "danger", "normal", "caution", "caution", "warning", "warning", "warning"]);
  const byModel = await fetchInferenceResults({ modelCode: "IF", deviceCode: "DCU", period: { from: null, to: null }, page: 3 });
  expect(byModel.rows.map((row) => row.deviceCode)).toEqual(["DCU"]);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const byPeriod = await fetchInferenceResults({ modelCode: null, deviceCode: null, period: { from: iso(today), to: null }, page: 1 });
  expect(byPeriod.rows).toHaveLength(4);
  const untilYesterday = await fetchInferenceResults({ modelCode: null, deviceCode: null, period: { from: null, to: iso(yesterday) }, page: 1 });
  expect(untilYesterday.rows).toHaveLength(5);

  const csv = await exportInferenceResultsCsv({ modelCode: "VAE", deviceCode: null, period: { from: null, to: null } });
  expect(csv.type).toBe("text/csv;charset=utf-8");
  const bytes = new Uint8Array(await csv.arrayBuffer());
  expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const lines = (await csv.text()).split("\r\n").filter((line) => line !== "");
  expect(lines[0]).toBe("추론 일시,모델 명,장치 명,세그먼트,이상 window,이상 비율,임계치");
  expect(lines).toHaveLength(1 + 5);

  const runOptions = await fetchInferenceRunOptions();
  expect(runOptions.defaultPeriod).toEqual({ from: iso(yesterday), to: iso(today) });
  expect([runOptions.defaultStartTime, runOptions.defaultEndTime]).toEqual(["00:00:00", "23:59:59"]);
  expect(runOptions.modelCodes).toEqual(["IF", "SVM", "VAE", "PCA"]);
  expect(runOptions.defaultModelCode).toBeNull();
  expect(runOptions.formations).toHaveLength(26);
  expect([runOptions.formations[0], runOptions.formations[25]]).toEqual(["401", "426"]);
  expect(runOptions.defaultFormation).toBeNull();
  expect(runOptions.defaultDeviceCodes).toEqual([]);
  expect(runOptions.unavailableDeviceCodes).toEqual(["FRU", "IDBC"]);

  const ranIds = await runInference({
    modelCode: "SVM",
    deviceCodes: ["ATC", "BMS"],
    formation: null,
    period: { from: iso(yesterday), to: iso(today) },
    startTime: "00:00:00",
    endTime: "23:59:59",
  });
  expect(ranIds).toEqual(["inf-2043", "inf-2043-1"]);
  const afterRun = await fetchInferenceJobs();
  expect(afterRun.jobs.slice(0, 2).map((job) => [job.id, job.deviceCode, job.modelCode, job.status, job.formation])).toEqual([
    ["inf-2043", "ATC", "SVM", "queued", null],
    ["inf-2043-1", "BMS", "SVM", "queued", null],
  ]);

  const retriedId = await retryInferenceJob("inf-2006");
  expect(retriedId).toBe("inf-2045");
  const afterRetry = await fetchInferenceJobs();
  const retried = afterRetry.jobs[0];
  expect([retried.id, retried.deviceCode, retried.modelCode, retried.formation, retried.isRetry, retried.status]).toEqual([
    "inf-2045",
    "MICOM_COOLER",
    "VAE",
    "409",
    true,
    "running",
  ]);
  expect(retried.status === "running" ? [retried.progressPercent, retried.segmentProgress] : null).toEqual([3, null]);
  expect(afterRetry.jobs.find((job) => job.id === "inf-2006")?.status).toBe("failed");
  await expect(retryInferenceJob("inf-2000")).rejects.toThrow();
  await expect(retryInferenceJob("inf-9999")).rejects.toThrow();
});
