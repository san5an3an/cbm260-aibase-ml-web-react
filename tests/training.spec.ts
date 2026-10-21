import { expect, test, type Page } from "@playwright/test";
import { trainingJobMetaTones } from "../src/components/organisms/trainingTones";
import {
  countTrainingJobs,
  isActiveTrainingJobStatus,
  type TrainingJob,
  type TrainingJobStatus,
} from "../src/domain/training";
import { trainingJobStatusLabels } from "../src/domain/labels/trainingJobStatus";
import { trainingProgressUnitLabels } from "../src/domain/labels/trainingProgressUnit";
import { trainingStageKeys, trainingStageLabels } from "../src/domain/labels/trainingStage";
import {
  exportTrainingResultsCsv,
  fetchTrainingFilterOptions,
  fetchTrainingJobDetail,
  fetchTrainingJobs,
  fetchTrainingResults,
  fetchTrainingSummary,
  retryTrainingJob,
  scheduleTraining,
} from "../src/services/training";
import { downloadCsv } from "./helpers/download";
import {
  calendarDayCell,
  color,
  columnTexts,
  delayMockResponses,
  hoveredStyle,
  isoDaysAgo,
  measure,
  pickOption,
  shownTableLines,
  stopWatchingDisabled,
  truncation,
  visibleShadow,
  watchDisabled,
} from "./helpers/measure";
import { box, boxes, iconShape, modal, shownIconShape, styleOf, texts } from "./helpers/modal";
import { TRAINING_RESULT_ROW, openTraining } from "./helpers/training";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const ROOT = '[data-slot="training-settings"]';
const FILTER = '[data-slot="training-filter-bar"]';
const SELECTS = `${FILTER} [data-slot="select-trigger"]`;
const TRIGGER = `${FILTER} [data-slot="date-range-trigger"]`;
const RESET = `${FILTER} [data-slot="icon-button"]`;
const BUTTONS = `${FILTER} [data-slot="action-button"]`;
const KPI_ROW = '[data-slot="training-kpi-row"]';
const KPI = `${KPI_ROW} [data-slot="kpi-stat"]`;
const JOBS = '[data-slot="training-jobs-card"]';
const JOB_LIST = '[data-slot="training-job-list"]';
const JOB = `${JOB_LIST} [data-slot="job-card"]`;
const RESULTS = '[data-slot="training-results-card"]';
const HEAD = `${RESULTS} [data-slot="table-head"]`;
const ROW = TRAINING_RESULT_ROW;
const GEAR = `${ROW} [data-slot="icon-button"]`;
const PAGE_SIZE = `${RESULTS} [data-slot="select-trigger"]`;
const CSV = `${RESULTS} [data-slot="section-card-header"] [data-slot="action-button"]`;
const EMPTY_STATE = `${RESULTS} [data-slot="empty-state"]`;
const CURRENT_PAGE = `${RESULTS} [data-slot="pagination-page"][aria-current="page"]`;
const PICKER = '[data-slot="popover-content"][data-picker="range"]';
const CALENDAR = `${PICKER} [data-slot="calendar"]`;
const OPEN_ITEMS = '[data-slot="select-content"][data-open] [data-slot="select-item"]';
const RELOAD_MS = 1500;
const NO_RELOAD_WATCH_MS = 800;

const RESULT_ROWS = [
  ["2026-09-23 09:12:00", "Isolation Forest", "AXLE_BEARING", "default", "0.5277"],
  ["2026-09-22 10:12:07", "One-Class SVM", "AXLE_BEARING", "default", "-1.2758"],
  ["2026-09-22 09:13:07", "Isolation Forest", "DRIVING_GEAR", "default", "0.5140"],
  ["2026-09-22 09:12:07", "Isolation Forest", "AXLE_BEARING", "unit_a", "0.4914"],
  ["2026-09-22 09:12:07", "Isolation Forest", "AXLE_BEARING", "unit_a", "0.4914"],
  ["2026-09-21 11:14:14", "Tabular VAE", "TRACTION_MOTOR", "default", "0.0433"],
] as const;

const JOBS_SEEN = [
  { title: "DRIVING_GEAR · IF", status: "학습 중", pct: "68%", meta: "09-23 09:05 · epoch 7 / 10", tone: ["brand-line4-subtle", "brand-on-line4-subtle"] },
  { title: "ECU · SVM", status: "전처리 중", pct: "35%", meta: "09-23 10:12 · part 3 / 8", tone: ["brand-line4-subtle", "brand-on-line4-subtle"] },
  { title: "DCU · VAE", status: "성공", pct: null, meta: "09-23 11:19 · 편성 403 · 완료 11:48", tone: ["success-subtle", "on-success-subtle"] },
  { title: "TCMS · PCA", status: "성공", pct: null, meta: "09-23 12:26 · 편성 404 · 완료 12:51", tone: ["success-subtle", "on-success-subtle"] },
  { title: "UNVR · IF", status: "예약", pct: null, meta: "09-23 13:33 · 편성 405 · 13:40 시작 예정", tone: ["muted", "muted-fg"] },
  { title: "MICOM_COOLER · SVM", status: "실패", pct: null, meta: "09-23 14:40 · 특징벡터 생성 실패: 대상 기간 데이터 없음", tone: ["danger-subtle", "on-danger-subtle"] },
] as const;

const FIXED_COLUMNS = [220, 220, 160, 160, 140];
const FIXED_COLUMNS_SUM = FIXED_COLUMNS.reduce((sum, width) => sum + width, 0);

const CSV_COLUMN_COUNT = 5;

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`재학습 설정의 배치, 조건 Row, KPI Row (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await openTraining(page, viewport.width, viewport.height);

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

    await expect(page.locator(SELECTS)).toHaveText(["학습 모델 (전체)", "장치 (전체)"]);
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
    }

    await expect(page.locator(TRIGGER)).toHaveText("학습일시 2026-09-17 ~ 2026-09-23");
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

    await expect(page.locator(BUTTONS)).toHaveText(["검색", "학습 예약"]);
    for (const [index, icon] of ["Search", "Add"].entries()) {
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
    const scheduleBox = await box(page, BUTTONS, 1);
    expect(scheduleBox.x + scheduleBox.width).toBeCloseTo(filterBox.x + filterBox.width - 17, 1);

    const kpiRow = await measure(page, KPI_ROW);
    expect(kpiRow.height).toBe(112);
    expect(kpiRow.style.columnGap).toBe("16px");
    await expect(page.locator(KPI)).toHaveCount(5);
    for (const kpiBox of await boxes(page, KPI)) {
      expect(kpiBox.width).toBeCloseTo((root.width - 16 * 4) / 5, 1);
    }

    const card = await measure(page, KPI);
    expect(card.style.borderTopWidth).toBe("1px");
    expect(card.style.borderLeftWidth).toBe("4px");
    expect(card.style.borderTopLeftRadius).toBe("12px");
    expect(card.style.paddingTop).toBe("16px");
    expect(card.style.paddingLeft).toBe("20px");
    expect(card.style.rowGap).toBe("6px");
    expect(card.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(visibleShadow(card.style.boxShadow)).toBe("rgba(11, 31, 46, 0.06) 0px 1px 3px 0px");
    for (const [index, token] of [
      "--brand-line4",
      "--brand-line4",
      "--warning",
      "--border-strong",
      "--danger",
    ].entries()) {
      const item = await measure(page, KPI, index);
      expect(item.height).toBe(118);
      expect(item.style.borderLeftColor).toBe(await color(page, `var(${token})`));
    }
    await expect(page.locator(`${KPI} [data-slot="kpi-stat-label"]`)).toHaveText([
      "총 학습 이력",
      "학습 모델 종류",
      "진행중 학습",
      "최근 학습 일시",
      "실패 학습 (7일)",
    ]);
    await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`)).toHaveText([
      "81",
      "4",
      "3",
      "09-23 09:12",
      "1",
    ]);
    await expect(page.locator(`${KPI} [data-slot="kpi-stat-unit"]`)).toHaveText([
      "건",
      "종",
      "건",
      "",
      "건",
    ]);
    await expect(page.locator(`${KPI} [data-slot="kpi-stat-description"]`)).toHaveText([
      "장치×세그먼트×모델×버전 = 1행",
      "IF · SVM · VAE · PCA",
      "예약 1 · 전처리 1 · 학습 1",
      "2026-09-23 · AXLE_BEARING",
      "MICOM_COOLER · SVM · 대상 기간 데이터 없음",
    ]);
    const label = await measure(page, `${KPI} [data-slot="kpi-stat-label"]`);
    expect(label.style.fontSize).toBe("16px");
    expect(label.style.lineHeight).toBe("22px");
    expect(label.style.fontWeight).toBe("700");
    const value = await measure(page, `${KPI} [data-slot="kpi-stat-value"]`);
    expect(value.style.fontSize).toBe("30px");
    expect(value.style.lineHeight).toBe("34px");
    expect(await styleOf(page, `${KPI} [data-slot="kpi-stat-value"]`, "white-space", 3)).toBe(
      "nowrap",
    );
    expect(await truncation(page, `${KPI} [data-slot="kpi-stat-description"]`, 4)).toEqual([
      "nowrap",
      "hidden",
      "ellipsis",
    ]);
    const description = await measure(page, `${KPI} [data-slot="kpi-stat-description"]`, 4);
    expect(description.style.fontSize).toBe("12px");
    expect(description.style.lineHeight).toBe("16px");
    expect(description.style.color).toBe(await color(page, "var(--muted-fg)"));
    expect(description.height).toBe(16);
    const unit = await measure(page, `${KPI} [data-slot="kpi-stat-unit"]`);
    expect(unit.style.fontSize).toBe("13px");
    expect(unit.style.color).toBe(await color(page, "var(--muted-fg)"));
  });
}

test("학습 Job Card의 Card Row, 상태, 진행률, 단계", async ({ page }) => {
  await openTraining(page);

  const card = await measure(page, JOBS);
  expect(await styleOf(page, JOBS, "flex-grow")).toBe("0");
  expect(await styleOf(page, JOBS, "flex-shrink")).toBe("0");
  expect(card.style.borderTopLeftRadius).toBe("16px");
  expect(card.style.paddingTop).toBe("16px");
  expect(card.style.paddingLeft).toBe("18px");
  expect(card.style.rowGap).toBe("14px");
  expect(card.style.borderTopWidth).toBe("1px");
  expect(card.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(visibleShadow(card.style.boxShadow)).toBe("rgba(11, 31, 46, 0.06) 0px 1px 3px 0px");

  await expect(page.locator(`${JOBS} [data-slot="section-card-eyebrow"]`)).toHaveText(
    "TRAINING JOBS",
  );
  const headEyebrow = await measure(page, `${JOBS} [data-slot="section-card-eyebrow"]`);
  expect(headEyebrow.style.fontSize).toBe("11px");
  expect(headEyebrow.style.lineHeight).toBe("16px");
  expect(headEyebrow.style.fontWeight).toBe("700");
  expect(headEyebrow.style.letterSpacing).toBe("0.6px");
  expect(headEyebrow.style.color).toBe(await color(page, "var(--brand-line4-text)"));
  await expect(page.locator(`${JOBS} [data-slot="section-card-title"]`)).toHaveText(
    "장치 학습 예약",
  );
  const headTitle = await measure(page, `${JOBS} [data-slot="section-card-title"]`);
  expect(headTitle.style.fontSize).toBe("16px");
  expect(headTitle.style.lineHeight).toBe("22px");
  expect(headTitle.style.fontWeight).toBe("700");
  const guideSelector = `${JOBS} [data-slot="training-jobs-guide"]`;
  await expect(page.locator(guideSelector)).toHaveText(
    "카드를 누르면 상세 · 단계: 전처리 → 특징벡터 → 학습 → 저장",
  );
  const guide = await measure(page, guideSelector);
  expect(guide.style.fontSize).toBe("12px");
  expect(guide.style.lineHeight).toBe("16px");
  expect(guide.style.color).toBe(await color(page, "var(--muted-fg)"));
  const [cardBox] = await boxes(page, JOBS);
  const guideBox = await box(page, guideSelector);
  expect(guideBox.x + guideBox.width).toBeCloseTo(cardBox.x + cardBox.width - 19, 1);
  expect(guideBox.y).toBeCloseTo(cardBox.y + 17, 1);

  const list = await measure(page, JOB_LIST);
  expect(list.style.columnGap).toBe("12px");
  expect(await styleOf(page, JOB_LIST, "overflow-x")).toBe("auto");
  expect(await styleOf(page, JOB_LIST, "overflow-y")).toBe("hidden");
  expect([list.style.paddingTop, list.style.paddingLeft, list.style.marginTop, list.style.marginLeft]).toEqual(["12px", "8px", "-12px", "-8px"]);
  const listContentWidth = list.width - parseFloat(list.style.paddingLeft) - parseFloat(list.style.paddingRight);
  await expect(page.locator(JOB)).toHaveCount(6);
  const jobBoxes = await boxes(page, JOB);
  for (const jobBox of jobBoxes) {
    expect(jobBox.width).toBeCloseTo(Math.max(260, (listContentWidth - 12 * 5) / 6), 1);
    expect(jobBox.height).toBe(98);
  }
  expect(card.height).toBe(40 + 14 + 98 + 32 + 2);

  for (let index = 0; index < 6; index += 1) {
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

  await expect(page.locator(`${JOB} [data-slot="job-card-title"]`)).toHaveText(
    JOBS_SEEN.map((job) => job.title),
  );
  await expect(page.locator(`${JOB} [data-slot="state-pill"]`)).toHaveText(
    JOBS_SEEN.map((job) => job.status),
  );
  await expect(page.locator(`${JOB} [data-slot="job-card-meta"]`)).toHaveText(
    JOBS_SEEN.map((job) => job.meta),
  );
  const title = await measure(page, `${JOB} [data-slot="job-card-title"]`);
  expect(title.style.fontSize).toBe("14px");
  expect(title.style.fontWeight).toBe("700");
  expect(await truncation(page, `${JOB} [data-slot="job-card-title"]`)).toEqual([
    "nowrap",
    "hidden",
    "ellipsis",
  ]);
  for (const [index, job] of JOBS_SEEN.entries()) {
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
    expect(meta.style.color).toBe(
      await color(page, job.status === "실패" ? "var(--danger)" : "var(--muted-fg)"),
    );
  }
  expect(await styleOf(page, `${JOB} [data-slot="job-card-meta"]`, "font-variant-numeric")).toBe("tabular-nums");
  expect(await truncation(page, `${JOB} [data-slot="job-card-meta"]`, 5)).toEqual([
    "nowrap",
    "hidden",
    "ellipsis",
  ]);

  await expect(page.locator(`${JOB} [data-slot="spinner"]`)).toHaveCount(2);
  await expect(page.locator(`${JOB} [data-slot="job-card-progress"]`)).toHaveText(["68%", "35%"]);
  for (const index of [0, 1]) {
    await expect(page.locator(JOB).nth(index).locator('[data-slot="spinner"]')).toHaveCount(1);
  }
  const spinner = await measure(page, `${JOB} [data-slot="spinner"]`);
  expect(spinner.width).toBe(14);
  expect(spinner.height).toBe(14);
  expect(spinner.style.color).toBe(await color(page, "var(--brand-line4)"));
  await expect(page.locator(`${JOB} [data-slot="spinner"].lucide-loader-circle`)).toHaveCount(2);
  expect(await styleOf(page, `${JOB} [data-slot="spinner"]`, "stroke")).toBe(await color(page, "var(--brand-line4)"));
  const progress = await measure(page, `${JOB} [data-slot="job-card-progress"]`);
  expect(progress.style.fontSize).toBe("14px");
  expect(progress.style.fontWeight).toBe("700");
  expect(progress.style.color).toBe(await color(page, "var(--brand-line4-text)"));
  expect(await styleOf(page, `${JOB} [data-slot="job-card-progress"]`, "font-variant-numeric")).toBe(
    "tabular-nums",
  );
  const [firstJob] = jobBoxes;
  const pillBox = await box(page, `${JOB} [data-slot="state-pill"]`);
  const spinnerBox = await box(page, `${JOB} [data-slot="spinner"]`);
  const progressBox = await box(page, `${JOB} [data-slot="job-card-progress"]`);
  expect(spinnerBox.x - (pillBox.x + pillBox.width)).toBeCloseTo(8, 1);
  expect(progressBox.x - (spinnerBox.x + spinnerBox.width)).toBeCloseTo(8, 1);
  expect(progressBox.x + progressBox.width).toBeCloseTo(firstJob.x + firstJob.width - 17, 1);
  const okPillBox = await box(page, `${JOB} [data-slot="state-pill"]`, 2);
  expect(okPillBox.x + okPillBox.width).toBeCloseTo(jobBoxes[2].x + jobBoxes[2].width - 17, 1);

  await expect(page.locator(`${JOB} [data-slot="job-card-steps"]`)).toHaveCount(2);
  const steps = await measure(page, `${JOB} [data-slot="job-card-steps"]`);
  expect(steps.style.fontSize).toBe("11px");
  expect(steps.style.columnGap).toBe("6px");
  expect(steps.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator(`${JOB} [data-slot="step-dot"]`)).toHaveText([
    "전처리",
    "특징벡터",
    "학습",
    "저장",
    "전처리",
    "특징벡터",
    "학습",
    "저장",
  ]);
  const reached = [true, true, false, false, true, false, false, false];
  for (const [index, isReached] of reached.entries()) {
    const dotLabel = await measure(page, `${JOB} [data-slot="step-dot"]`, index);
    expect(dotLabel.style.columnGap).toBe("4px");
    expect(dotLabel.style.fontWeight).toBe(isReached ? "600" : "400");
    expect(dotLabel.style.color).toBe(
      await color(page, isReached ? "var(--fg)" : "var(--muted-fg)"),
    );
    const dot = await measure(page, `${JOB} [data-slot="step-dot"] > span`, index);
    expect(dot.width).toBe(6);
    expect(dot.height).toBe(6);
    expect(dot.style.borderTopLeftRadius).toBe("50%");
    expect(dot.style.backgroundColor).toBe(
      await color(page, isReached ? "var(--brand-line4)" : "var(--disabled)"),
    );
  }
  const lines = `${JOB} [data-slot="job-card-steps"] > span[aria-hidden]`;
  await expect(page.locator(lines)).toHaveCount(6);
  const line = await measure(page, lines);
  expect(line.height).toBe(1);
  expect(line.style.minWidth).toBe("8px");
  expect(line.style.backgroundColor).toBe(await color(page, "var(--border)"));
});

test("학습 결과 Card의 머리, Table, Page 번호", async ({ page }) => {
  await openTraining(page);
  const root = await measure(page, ROOT);
  const jobs = await measure(page, JOBS);

  const card = await measure(page, RESULTS);
  expect(card.height).toBe(root.height - 66 - 14 - 112 - 14 - jobs.height - 14);
  expect(card.style.borderTopLeftRadius).toBe("16px");
  expect(card.style.paddingTop).toBe("16px");
  expect(card.style.paddingLeft).toBe("18px");
  expect(card.style.rowGap).toBe("14px");
  expect(visibleShadow(card.style.boxShadow)).toBe("rgba(11, 31, 46, 0.06) 0px 1px 3px 0px");

  await expect(page.locator(`${RESULTS} [data-slot="section-card-eyebrow"]`)).toHaveText(
    "TRAINING RESULTS",
  );
  await expect(page.locator(`${RESULTS} [data-slot="section-card-title"]`)).toHaveText(
    "장치 학습 결과",
  );
  const descriptionSelector = `${RESULTS} [data-slot="section-card-description"]`;
  await expect(page.locator(descriptionSelector)).toHaveText(
    "행을 누르면 학습 상세 · ⚙ 는 같은 장치·모델·세그먼트 프로파일이 있으면 그 설정을, 없으면 새 설정을 채워 엽니다",
  );
  const description = await measure(page, descriptionSelector);
  expect(description.style.fontSize).toBe("14px");
  expect(description.style.lineHeight).toBe("20px");
  expect(description.style.color).toBe(await color(page, "var(--muted-fg)"));

  const totalSelector = `${RESULTS} [data-slot="training-results-total"]`;
  await expect(page.locator(totalSelector)).toHaveText("총 81건");
  const total = await measure(page, totalSelector);
  expect(total.style.fontSize).toBe("14px");
  expect(total.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator(PAGE_SIZE)).toHaveText("20개씩");
  const size = await measure(page, PAGE_SIZE);
  expect(size.width).toBe(110);
  expect(size.height).toBe(32);
  expect(size.style.paddingLeft).toBe("12px");
  expect(size.style.paddingRight).toBe("10px");
  await expect(page.locator(CSV)).toHaveText("CSV 내보내기");
  const csv = await measure(page, CSV);
  expect(csv.height).toBe(32);
  expect(csv.style.paddingLeft).toBe("16px");
  expect(csv.style.borderTopWidth).toBe("1px");
  expect(csv.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(csv.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(csv.style.color).toBe(await color(page, "var(--fg)"));
  expect(csv.style.fontWeight).toBe("600");
  expect(csv.style.columnGap).toBe("6px");
  expect((await measure(page, `${CSV} svg`)).width).toBe(18);
  expect(await shownIconShape(page, `${CSV} svg`)).toBe(iconShape("Download"));
  const [cardBox] = await boxes(page, RESULTS);
  const totalBox = await box(page, totalSelector);
  const sizeBox = await box(page, PAGE_SIZE);
  const csvBox = await box(page, CSV);
  expect(sizeBox.x - (totalBox.x + totalBox.width)).toBeCloseTo(12, 1);
  expect(csvBox.x - (sizeBox.x + sizeBox.width)).toBeCloseTo(12, 1);
  expect(csvBox.x + csvBox.width).toBeCloseTo(cardBox.x + cardBox.width - 19, 1);
  expect(csvBox.y).toBeCloseTo(cardBox.y + 17, 1);

  const frame = await measure(page, `${RESULTS} [data-slot="data-table"]`);
  expect(frame.style.borderTopWidth).toBe("1px");
  expect(frame.style.borderTopLeftRadius).toBe("10px");
  const headRow = await measure(page, `${RESULTS} thead [data-slot="table-row"]`);
  expect(headRow.height).toBe(44);
  expect(headRow.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(headRow.style.borderBottomWidth).toBe("1px");
  await expect(page.locator(HEAD)).toHaveText([
    "모델 학습 일시",
    "모델 명",
    "장치",
    "세그먼트",
    "임계치",
    "임계치 관리",
  ]);
  const gridWidth = frame.width - 2;
  const headBoxes = await boxes(page, HEAD);
  expect(headBoxes.map((head) => Math.round(head.width * 10) / 10)).toEqual(
    [220, 220, Math.max(180, gridWidth - FIXED_COLUMNS_SUM), 160, 160, 140].map(
      (width) => Math.round(width * 10) / 10,
    ),
  );
  const head = await measure(page, HEAD);
  expect(head.style.paddingLeft).toBe("16px");
  expect(head.style.fontSize).toBe("14px");
  expect(head.style.fontWeight).toBe("400");
  expect(head.style.color).toBe(await color(page, "var(--fg)"));

  const sortButtons = `${HEAD} [data-slot="column-sort-button"]`;
  await expect(page.locator(sortButtons)).toHaveText(["모델 학습 일시", "모델 명", "장치", "임계치"]);
  await expect(page.locator(HEAD).nth(3).locator("button")).toHaveCount(0);
  await expect(page.locator(HEAD).nth(5).locator("button")).toHaveCount(0);
  for (const [index, shape] of ["ArrowDownward", "SwapVert", "SwapVert", "SwapVert"].entries()) {
    const icon = await measure(page, `${sortButtons} svg`, index);
    expect(icon.width).toBe(16);
    expect(icon.style.color).toBe(await color(page, index === 0 ? "var(--fg)" : "var(--muted-fg)"));
    expect(await shownIconShape(page, `${sortButtons} svg`, index)).toBe(iconShape(shape));
  }
  await expect(page.locator(HEAD).nth(0)).toHaveAttribute("aria-sort", "descending");
  await expect(page.locator(HEAD).nth(1)).toHaveAttribute("aria-sort", "none");
  const sortButton = await measure(page, sortButtons);
  expect(sortButton.style.columnGap).toBe("4px");
  expect(sortButton.style.paddingLeft).toBe("0px");
  const thresholdHead = headBoxes[4];
  const thresholdButton = await box(page, sortButtons, 3);
  expect(thresholdButton.x + thresholdButton.width).toBeCloseTo(
    thresholdHead.x + thresholdHead.width - 16,
    1,
  );
  const gearHeadText = await page.evaluate((selector) => {
    const element = document.querySelectorAll(selector)[5] as Element;
    const range = document.createRange();
    range.selectNodeContents(element);
    const rect = range.getBoundingClientRect();
    return rect.x + rect.width / 2;
  }, HEAD);
  expect(gearHeadText).toBeCloseTo(headBoxes[5].x + headBoxes[5].width / 2, 0);

  await expect(page.locator(ROW)).toHaveCount(6);
  for (const [index, cells] of RESULT_ROWS.entries()) {
    await expect(page.locator(ROW).nth(index).locator('[data-slot="table-cell"]')).toHaveText([
      ...cells,
      "",
    ]);
  }
  const row = await measure(page, ROW, 1);
  expect(row.height).toBe(50);
  expect(row.style.borderBottomWidth).toBe("1px");
  expect(row.style.borderBottomColor).toBe(await color(page, "var(--border)"));
  expect(row.style.fontSize).toBe("14px");
  const cellSelector = `${ROW}:nth-child(2) [data-slot="table-cell"]`;
  for (const [index, weight] of ["700", "700", "700", "400", "700"].entries()) {
    const cell = await measure(page, cellSelector, index);
    expect(cell.style.fontWeight).toBe(weight);
    expect(cell.style.paddingLeft).toBe("16px");
    expect(cell.style.paddingRight).toBe("16px");
  }
  expect((await measure(page, cellSelector, 4)).style.textAlign).toBe("right");
  expect(await styleOf(page, cellSelector, "font-variant-numeric", 0)).toBe("tabular-nums");
  expect(await styleOf(page, cellSelector, "font-variant-numeric", 4)).toBe("tabular-nums");

  await expect(page.locator(ROW).first()).toHaveAttribute("aria-selected", "true");
  expect((await measure(page, ROW, 0)).style.backgroundColor).toBe(
    await color(page, "var(--brand-line4-subtle)"),
  );
  expect(row.style.backgroundColor).toBe("rgba(0, 0, 0, 0)");

  await expect(page.locator(GEAR)).toHaveCount(6);
  await expect(page.locator(GEAR).first()).toHaveAttribute("aria-label", "임계치 관리");
  await expect(page.locator(GEAR).first()).toHaveAttribute("title", "임계치 관리");
  const gear = await measure(page, GEAR, 1);
  expect(gear.width).toBe(32);
  expect(gear.height).toBe(32);
  expect(gear.style.borderTopLeftRadius).toBe("6px");
  expect(gear.style.borderTopWidth).toBe("1px");
  expect(gear.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(gear.style.color).toBe(await color(page, "var(--fg)"));
  expect((await measure(page, `${GEAR} svg`)).width).toBe(18);
  expect(await shownIconShape(page, `${GEAR} svg`)).toBe(iconShape("Tune"));
  const gearBox = await box(page, GEAR, 1);
  expect(gearBox.x + gearBox.width / 2).toBeCloseTo(headBoxes[5].x + headBoxes[5].width / 2, 1);

  await expect(page.locator(`${RESULTS} [data-slot="pagination-page"]`)).toHaveText([
    "1",
    "2",
    "3",
    "10",
  ]);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
  await expect(page.locator(`${RESULTS} [data-slot="pagination-previous"]`)).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  const pagination = await box(page, `${RESULTS} nav`);
  expect(pagination.y + pagination.height).toBeCloseTo(cardBox.y + cardBox.height - 17, 1);
});

test("조건, 검색, 초기화, 빈 상태, Page 이동", async ({ page }) => {
  await openTraining(page);
  const search = page.locator(BUTTONS).first();
  const selects = page.locator(SELECTS);

  await selects.nth(0).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText([
    "학습 모델 (전체)",
    "Isolation Forest",
    "One-Class SVM",
    "Tabular VAE",
    "PCA Reconstruction",
  ]);
  await page.keyboard.press("Escape");
  await selects.nth(1).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveCount(22);
  await expect(page.locator(OPEN_ITEMS).first()).toHaveText("장치 (전체)");
  await expect(page.locator(OPEN_ITEMS).nth(1)).toHaveText("ATC");
  await page.keyboard.press("Escape");

  await selects.nth(0).click();
  await pickOption(page, "Isolation Forest");
  await expect(selects.nth(0)).toHaveText("Isolation Forest");
  await expect(page.locator(ROW)).toHaveCount(6);

  await search.click();
  await expect(page.locator(ROW)).toHaveCount(4);
  expect(await columnTexts(page, ROW, 1)).toEqual(Array(4).fill("Isolation Forest"));
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`).first()).toHaveText("81");
  await expect(page.locator(JOB)).toHaveCount(6);

  await selects.nth(1).click();
  await pickOption(page, "DRIVING_GEAR");
  await search.click();
  await expect(page.locator(ROW)).toHaveCount(1);
  expect(await columnTexts(page, ROW, 2)).toEqual(["DRIVING_GEAR"]);

  await selects.nth(1).click();
  await pickOption(page, "TRACTION_MOTOR");
  await search.click();
  await expect(page.locator(ROW)).toHaveCount(0);
  await expect(page.locator(EMPTY_STATE)).toBeVisible();
  await expect(page.locator(`${EMPTY_STATE} [data-slot="empty-state-title"]`)).toHaveText(
    "조건에 맞는 학습 결과가 없습니다",
  );
  await expect(page.locator(`${EMPTY_STATE} [data-slot="empty-state-description"]`)).toHaveText(
    "기간을 넓히거나 모델·장치 필터를 전체로 바꿔 보세요.",
  );
  const empty = await measure(page, EMPTY_STATE);
  expect(empty.style.paddingTop).toBe("40px");
  expect(empty.style.paddingLeft).toBe("16px");
  expect(empty.style.rowGap).toBe("10px");
  const emptyIcon = await measure(page, `${EMPTY_STATE} [data-slot="empty-state-icon"]`);
  expect(emptyIcon.width).toBe(56);
  expect(emptyIcon.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(emptyIcon.style.color).toBe(await color(page, "var(--muted-fg)"));
  expect((await measure(page, `${EMPTY_STATE} [data-slot="empty-state-icon"] svg`)).width).toBe(26);
  expect(await shownIconShape(page, `${EMPTY_STATE} [data-slot="empty-state-icon"] svg`)).toBe(
    iconShape("FindInPage"),
  );
  const emptyTitle = await measure(page, `${EMPTY_STATE} [data-slot="empty-state-title"]`);
  expect(emptyTitle.style.fontSize).toBe("16px");
  expect(emptyTitle.style.fontWeight).toBe("700");
  const emptyDescription = await measure(
    page,
    `${EMPTY_STATE} [data-slot="empty-state-description"]`,
  );
  expect(emptyDescription.style.fontSize).toBe("14px");
  expect(emptyDescription.style.color).toBe(await color(page, "var(--muted-fg)"));
  const emptyButtonSelector = `${EMPTY_STATE} [data-slot="action-button"]`;
  await expect(page.locator(emptyButtonSelector)).toHaveText("필터 초기화");
  const emptyButton = await measure(page, emptyButtonSelector);
  expect(emptyButton.height).toBe(40);
  expect(emptyButton.style.paddingLeft).toBe("16px");
  expect(emptyButton.style.fontWeight).toBe("600");
  expect(emptyButton.style.borderTopWidth).toBe("1px");
  const [frameBox] = await boxes(page, `${RESULTS} [data-slot="data-table"]`);
  const [emptyButtonBox] = await boxes(page, emptyButtonSelector);
  expect(emptyButtonBox.x + emptyButtonBox.width / 2).toBeCloseTo(
    frameBox.x + frameBox.width / 2,
    0,
  );

  await page.locator(emptyButtonSelector).click();
  await expect(page.locator(ROW)).toHaveCount(6);
  await expect(selects).toHaveText(["학습 모델 (전체)", "장치 (전체)"]);
  await expect(page.locator(EMPTY_STATE)).toHaveCount(0);

  await selects.nth(1).click();
  await pickOption(page, "AXLE_BEARING");
  await search.click();
  await expect(page.locator(ROW)).toHaveCount(4);
  await page.locator(RESET).click();
  await expect(page.locator(ROW)).toHaveCount(6);
  await expect(selects.nth(1)).toHaveText("장치 (전체)");

  const pages = page.locator(`${RESULTS} [data-slot="pagination-page"]`);
  await pages.nth(1).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("2");
  await page.locator(`${RESULTS} [data-slot="pagination-next"]`).click();
  await page.locator(`${RESULTS} [data-slot="pagination-next"]`).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("4");
  await expect(pages).toHaveText(["1", "4", "10"]);
  await pages.last().click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("10");
  await expect(page.locator(`${RESULTS} [data-slot="pagination-next"]`)).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.locator(`${RESULTS} [data-slot="pagination-previous"]`).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("9");
  await page.locator(RESET).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
  await pages.nth(2).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");
  await search.click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
});

test("학습일시 선택은 검색을 Click해야 반영하고 초기화하면 처음 기간으로 돌아감", async ({ page }) => {
  await openTraining(page);
  const pages = page.locator(`${RESULTS} [data-slot="pagination-page"]`);
  await pages.nth(2).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");

  await page.locator(TRIGGER).click();
  await expect(page.locator(CALENDAR)).toBeVisible();
  await expect(page.locator(TRIGGER)).toHaveCSS("border-top-color", await color(page, "var(--brand-line4)"));
  await expect(page.locator(`${CALENDAR} [role="status"]`)).toHaveText(["2026년 9월", "2026년 10월"]);

  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-22")} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText("학습일시 2026-09-22");
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-22")} button`).click();
  await expect(page.locator(TRIGGER)).toHaveText("학습일시 2026-09-22 ~ 2026-09-22");
  await expect(page.locator(CALENDAR)).toHaveCount(0);
  await expect(page.locator(TRIGGER)).toHaveCSS("border-top-color", await color(page, "var(--border)"));
  await expect(page.locator(ROW)).toHaveCount(6);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");

  await page.locator(BUTTONS).first().click();
  await expect(page.locator(ROW)).toHaveCount(4);
  expect(await columnTexts(page, ROW, 0)).toEqual([
    "2026-09-22 10:12:07",
    "2026-09-22 09:13:07",
    "2026-09-22 09:12:07",
    "2026-09-22 09:12:07",
  ]);
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");

  await page.locator(RESET).click();
  await expect(page.locator(TRIGGER)).toHaveText("학습일시 2026-09-17 ~ 2026-09-23");
  await expect(page.locator(ROW)).toHaveCount(6);

  await page.locator(TRIGGER).click();
  await page.getByRole("button", { name: "다음 달" }).click();
  await page.locator(`${calendarDayCell(CALENDAR, "2026-10-01")} button`).click();
  await page.locator(`${calendarDayCell(CALENDAR, "2026-10-05")} button`).click();
  await page.keyboard.press("Escape");
  await page.locator(BUTTONS).first().click();
  await expect(page.locator(ROW)).toHaveCount(0);
  await expect(page.locator(EMPTY_STATE)).toBeVisible();
  await page.locator(`${EMPTY_STATE} [data-slot="action-button"]`).click();
  await expect(page.locator(TRIGGER)).toHaveText("학습일시 2026-09-17 ~ 2026-09-23");
  await expect(page.locator(ROW)).toHaveCount(6);
});

test("Sort에서 다른 Column은 큰 값부터, 같은 Column은 반대로 정렬하고 Page 번호는 그대로임", async ({
  page,
}) => {
  await openTraining(page);
  const sortButtons = page.locator(`${HEAD} [data-slot="column-sort-button"]`);
  const pages = page.locator(`${RESULTS} [data-slot="pagination-page"]`);
  await pages.nth(2).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");

  await sortButtons.nth(1).click();
  await expect(page.locator(HEAD).nth(1)).toHaveAttribute("aria-sort", "descending");
  await expect(page.locator(HEAD).nth(0)).toHaveAttribute("aria-sort", "none");
  await expect.poll(() => columnTexts(page, ROW, 1)).toEqual([
    "Tabular VAE",
    "One-Class SVM",
    "Isolation Forest",
    "Isolation Forest",
    "Isolation Forest",
    "Isolation Forest",
  ]);
  expect(await shownIconShape(page, `${HEAD} [data-slot="column-sort-button"] svg`, 1)).toBe(
    iconShape("ArrowDownward"),
  );
  expect(await shownIconShape(page, `${HEAD} [data-slot="column-sort-button"] svg`, 0)).toBe(
    iconShape("SwapVert"),
  );
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");

  await sortButtons.nth(1).click();
  await expect(page.locator(HEAD).nth(1)).toHaveAttribute("aria-sort", "ascending");
  await expect.poll(() => columnTexts(page, ROW, 0)).toEqual([
    "2026-09-23 09:12:00",
    "2026-09-22 09:13:07",
    "2026-09-22 09:12:07",
    "2026-09-22 09:12:07",
    "2026-09-22 10:12:07",
    "2026-09-21 11:14:14",
  ]);
  expect(await shownIconShape(page, `${HEAD} [data-slot="column-sort-button"] svg`, 1)).toBe(
    iconShape("ArrowUpward"),
  );

  await sortButtons.nth(3).click();
  await expect.poll(() => columnTexts(page, ROW, 4)).toEqual([
    "0.5277",
    "0.5140",
    "0.4914",
    "0.4914",
    "0.0433",
    "-1.2758",
  ]);
  await sortButtons.nth(2).click();
  await expect.poll(() => columnTexts(page, ROW, 2)).toEqual([
    "TRACTION_MOTOR",
    "DRIVING_GEAR",
    "AXLE_BEARING",
    "AXLE_BEARING",
    "AXLE_BEARING",
    "AXLE_BEARING",
  ]);
  await sortButtons.nth(0).click();
  await expect.poll(() => columnTexts(page, ROW, 0)).toEqual(RESULT_ROWS.map((row) => row[0]));
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");

  await sortButtons.nth(3).click();
  await sortButtons.nth(3).click();
  await expect.poll(() => columnTexts(page, ROW, 4)).toEqual([
    "-1.2758",
    "0.0433",
    "0.4914",
    "0.4914",
    "0.5140",
    "0.5277",
  ]);
  await expect(page.locator(ROW).last()).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(`${ROW}[aria-selected="true"]`)).toHaveCount(1);
});

test("Page 크기를 바꾸면 첫 Page로 돌아가고 결과만 다시 조회함", async ({ page }) => {
  await openTraining(page);
  const pages = page.locator(`${RESULTS} [data-slot="pagination-page"]`);
  await pages.nth(2).click();
  await expect(page.locator(CURRENT_PAGE)).toHaveText("3");

  await page.locator(PAGE_SIZE).click();
  await expect(page.locator(OPEN_ITEMS)).toHaveText(["20개씩", "50개씩", "100개씩"]);

  await delayMockResponses(page, RELOAD_MS);
  await watchDisabled(page, "gear", GEAR);
  await watchDisabled(page, "job", JOB);
  await pickOption(page, "50개씩");
  await expect(page.locator(PAGE_SIZE)).toHaveText("50개씩");
  await expect(page.locator(CURRENT_PAGE)).toHaveText("1");
  await expect(page.locator(GEAR).first()).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(GEAR).first()).toHaveAttribute("aria-disabled", "false");
  await page.waitForTimeout(200);
  const gearChanges = await stopWatchingDisabled(page, "gear");
  expect(gearChanges.filter((value) => value === "true").length).toBeGreaterThanOrEqual(1);
  expect(gearChanges[gearChanges.length - 1]).toBe("false");
  expect(await stopWatchingDisabled(page, "job")).toEqual([]);
  await expect(page.locator(ROW)).toHaveCount(6);
});

test("검색과 초기화는 조건이 그대로여도 다시 조회하고, 다시 받는 동안 Card와 Row를 막음", async ({
  page,
}) => {
  await openTraining(page);
  await expect(page.locator(GEAR).first()).toHaveAttribute("aria-disabled", "false");
  await expect(page.locator(ROW).first()).toHaveAttribute("aria-disabled", "false");
  await expect(page.locator(JOB).first()).toHaveAttribute("aria-disabled", "false");

  await delayMockResponses(page, RELOAD_MS);
  for (const target of [page.locator(BUTTONS).first(), page.locator(RESET)]) {
    await watchDisabled(page, "gear", GEAR);
    await watchDisabled(page, "row", ROW);
    await watchDisabled(page, "job", JOB);
    await target.click();
    await expect(page.locator(GEAR).first()).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator(JOB).first()).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator(GEAR).first()).toHaveAttribute("aria-disabled", "false");
    await expect(page.locator(JOB).first()).toHaveAttribute("aria-disabled", "false");
    await page.waitForTimeout(200);
    for (const name of ["gear", "row", "job"]) {
      const changes = await stopWatchingDisabled(page, name);
      expect(changes.filter((value) => value === "true").length).toBeGreaterThanOrEqual(1);
      expect(changes[changes.length - 1]).toBe("false");
    }
  }

  await watchDisabled(page, "gear", GEAR);
  await watchDisabled(page, "job", JOB);
  await page.waitForTimeout(NO_RELOAD_WATCH_MS);
  expect(await stopWatchingDisabled(page, "gear")).toEqual([]);
  expect(await stopWatchingDisabled(page, "job")).toEqual([]);
});

async function closeOpenedModal(page: Page): Promise<void> {
  await expect(page.locator("[data-modal]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-modal]")).toHaveCount(0);
}

test("학습 Job Card에서 선택한 Card는 보조 기술에 현재 항목(aria-current)으로 읽히고, Pointer Cursor로 표시되며, 진행 Icon은 보조 기술에서 숨김", async ({
  page,
}) => {
  await openTraining(page);
  await expect(page.locator(`${JOB}[aria-current="true"]`)).toHaveCount(1);
  await expect(page.locator(JOB).nth(0)).toHaveAttribute("aria-current", "true");
  await expect(page.locator(`${JOB}[aria-current]`)).toHaveCount(1);
  await expect(page.locator(`${JOB}[data-selected]`)).toHaveCount(0);
  await page.locator(JOB).nth(3).click();
  await closeOpenedModal(page);
  await expect(page.locator(JOB).nth(3)).toHaveAttribute("aria-current", "true");
  await expect(page.locator(JOB).nth(0)).not.toHaveAttribute("aria-current");

  for (let index = 0; index < 6; index += 1) {
    expect(await styleOf(page, JOB, "cursor", index)).toBe("pointer");
  }
  expect(await styleOf(page, ROW, "cursor")).toBe("pointer");

  const spinner = page.locator(`${JOB} [data-slot="spinner"]`).first();
  await expect(spinner).toHaveAttribute("aria-label", "진행 중");
  await expect(spinner).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(`${JOB_LIST} [aria-label="Loading"]`)).toHaveCount(0);
  await expect(page.locator(JOB_LIST).getByRole("status")).toHaveCount(0);
  await expect(page.locator(JOB).nth(0)).toHaveAccessibleName(/학습 중\s*68%/);
  await expect(page.locator(JOB).nth(0)).not.toHaveAccessibleName(/진행 중|Loading/);
});

test("Job Card와 결과 Row 선택을 Mouse와 Keyboard로 확인", async ({ page }) => {
  await openTraining(page);
  const selectedJobs = page.locator(`${JOB}[aria-current="true"]`);

  await page.locator(JOB).nth(2).click();
  await closeOpenedModal(page);
  await expect(selectedJobs).toHaveCount(1);
  await expect(page.locator(JOB).nth(2)).toHaveAttribute("aria-current", "true");
  await page.waitForTimeout(300);
  const picked = await measure(page, JOB, 2);
  expect(picked.style.borderTopWidth).toBe("2px");
  expect(picked.style.borderTopColor).toBe(await color(page, "var(--brand-line4)"));
  expect(picked.style.paddingTop).toBe("13px");
  expect(picked.height).toBe(98);
  const released = await measure(page, JOB, 0);
  expect(released.style.borderTopWidth).toBe("1px");
  expect(released.style.paddingTop).toBe("14px");

  await page.locator(JOB).nth(4).focus();
  await page.keyboard.press("Enter");
  await closeOpenedModal(page);
  await expect(page.locator(JOB).nth(4)).toHaveAttribute("aria-current", "true");
  await expect(selectedJobs).toHaveCount(1);
  await page.locator(JOB).nth(5).focus();
  await page.keyboard.press(" ");
  await closeOpenedModal(page);
  await expect(page.locator(JOB).nth(5)).toHaveAttribute("aria-current", "true");

  await page.locator(ROW).nth(2).click();
  await closeOpenedModal(page);
  await expect(page.locator(ROW).nth(2)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(`${ROW}[aria-selected="true"]`)).toHaveCount(1);
  await page.locator(ROW).nth(3).focus();
  await page.keyboard.press("Enter");
  await closeOpenedModal(page);
  await expect(page.locator(ROW).nth(3)).toHaveAttribute("aria-selected", "true");
  await page.locator(ROW).nth(5).focus();
  await page.keyboard.press(" ");
  await closeOpenedModal(page);
  await expect(page.locator(ROW).nth(5)).toHaveAttribute("aria-selected", "true");

  const resultDetail = page.locator(modal("training-result-detail"));
  await page.locator(GEAR).nth(1).click();
  await expect(page.locator(ROW).nth(1)).toHaveAttribute("aria-selected", "true");
  await page.waitForTimeout(200);
  await expect(resultDetail).toHaveCount(0);
  await page.locator(GEAR).nth(4).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(ROW).nth(4)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(`${ROW}[aria-selected="true"]`)).toHaveCount(1);
  await page.waitForTimeout(200);
  await expect(resultDetail).toHaveCount(0);
});

const JOB_ROW_FRAMES = [
  {
    width: 1920,
    height: 1080,
    content: [105, 395, 1782, 98],
    cardLefts: [105, 404, 703, 1002, 1301, 1600],
    cardWidth: 287,
    maxScrollLeft: 0,
    resultsTop: 524,
  },
  {
    width: 1440,
    height: 900,
    content: [105, 395, 1302, 98],
    cardLefts: [105, 377, 649, 921, 1193, 1465],
    cardWidth: 260,
    maxScrollLeft: 318,
    resultsTop: 524,
  },
] as const;

const NOTHING_OUTSIDE = { top: 0, right: 0, bottom: 0, left: 0 };

async function jobRowOverflow(page: Page, index: number) {
  return page.evaluate(
    ({ list, job, index }) => {
      const row = document.querySelector<HTMLElement>(list);
      const card = document.querySelectorAll<HTMLElement>(job)[index];
      if (!row || !card) throw new Error(`요소 없음: ${job} [${index}]`);
      const style = getComputedStyle(card);
      const layers: string[] = [];
      let depth = 0;
      let current = "";
      for (const char of style.boxShadow) {
        if (char === "(") depth += 1;
        if (char === ")") depth -= 1;
        if (char === "," && depth === 0) {
          layers.push(current);
          current = "";
        } else {
          current += char;
        }
      }
      layers.push(current);
      const reach = { top: 0, right: 0, bottom: 0, left: 0 };
      for (const layer of layers) {
        const colorText = layer.match(/[a-z]+\([^)]*\)/)?.[0] ?? "";
        if (/(,|\/)\s*0\)$/.test(colorText) || layer.includes("inset")) continue;
        const [x = 0, y = 0, blur = 0, spread = 0] = (
          layer.replace(colorText, "").match(/-?[\d.]+px/g) ?? []
        ).map(parseFloat);
        const extent = blur + spread;
        reach.top = Math.max(reach.top, extent - y);
        reach.right = Math.max(reach.right, extent + x);
        reach.bottom = Math.max(reach.bottom, extent + y);
        reach.left = Math.max(reach.left, extent - x);
      }
      const cardBox = card.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      const clipLeft = rowBox.left + row.clientLeft;
      const clipTop = rowBox.top + row.clientTop;
      const beyond = (value: number) => Math.round(Math.max(0, value) * 100) / 100;
      const outside = {
        top: beyond(clipTop - (cardBox.top - reach.top)),
        right: beyond(cardBox.right + reach.right - (clipLeft + row.clientWidth)),
        bottom: beyond(cardBox.bottom + reach.bottom - (clipTop + row.clientHeight)),
        left: beyond(clipLeft - (cardBox.left - reach.left)),
      };
      const scrollTopBefore = row.scrollTop;
      row.scrollTop = 20;
      const scrolledTop = row.scrollTop;
      row.scrollTop = scrollTopBefore;
      return {
        reach,
        outside,
        scrollHeight: row.scrollHeight,
        clientHeight: row.clientHeight,
        scrolledTop,
        translate: style.translate,
        focusVisible: card.matches(":focus-visible"),
        height: cardBox.height,
      };
    },
    { list: JOB_LIST, job: JOB, index },
  );
}

async function verticalPositions(page: Page) {
  return page.evaluate(
    ({ jobs, list }) => {
      const scrollers = [
        document.scrollingElement,
        document.querySelector('[data-slot="monitoring-shell"]'),
        document.querySelector('[data-slot="monitoring-main"]'),
        document.querySelector('[data-slot="training-settings"]'),
        document.querySelector(list),
      ];
      return {
        scrollTops: scrollers.map((element) => element?.scrollTop ?? -1),
        jobsTop: document.querySelector(jobs)?.getBoundingClientRect().top ?? -1,
        cardTops: [...document.querySelectorAll(`${list} [data-slot="job-card"]`)].map(
          (element) => element.getBoundingClientRect().top,
        ),
      };
    },
    { jobs: JOBS, list: JOB_LIST },
  );
}

async function scrollJobRow(page: Page, left: number): Promise<void> {
  await page.locator(JOB_LIST).evaluate((element, left) => {
    element.scrollLeft = left;
  }, left);
}

for (const frame of JOB_ROW_FRAMES) {
  test(`학습 Job Card에서 Hover한 Card의 그림자가 Card Row에 잘리지 않음, 첫 Card, 셋째 Card, 마지막 Card 포함 (${frame.width}×${frame.height})`, async ({
    page,
  }) => {
    await openTraining(page, frame.width, frame.height);
    for (let index = 0; index < 6; index += 1) {
      await scrollJobRow(page, index < 4 ? 0 : 99999);
      await page.locator(JOB).nth(index).hover();
      await page.waitForTimeout(300);
      const hovered = await jobRowOverflow(page, index);
      expect(hovered.reach).toEqual({ top: 6, right: 8, bottom: 10, left: 8 });
      expect(hovered.outside).toEqual(NOTHING_OUTSIDE);
      expect(hovered.scrollHeight).toBeLessThanOrEqual(hovered.clientHeight);
    }
  });
}

test("학습 Job Card를 Click하거나 Keyboard로 Focus해도 Card Row가 세로로 넘치지 않고 화면도 세로로 움직이지 않음", async ({
  page,
}) => {
  await openTraining(page);
  const before = await verticalPositions(page);

  await page.locator(JOB).nth(2).hover();
  await page.waitForTimeout(300);
  await page.mouse.down();
  const pressed = await jobRowOverflow(page, 2);
  expect(pressed.translate).toBe("0px 1px");
  expect(pressed.scrollHeight).toBeLessThanOrEqual(pressed.clientHeight);
  expect(pressed.scrolledTop).toBe(0);
  expect(pressed.outside).toEqual(NOTHING_OUTSIDE);
  await page.mouse.up();
  await closeOpenedModal(page);

  await page.waitForTimeout(300);
  const returned = await jobRowOverflow(page, 2);
  expect(returned.focusVisible).toBe(true);
  expect(returned.height).toBe(98);
  expect((await measure(page, JOB, 2)).style.borderTopWidth).toBe("2px");
  expect(returned.reach).toEqual({ top: 6, right: 8, bottom: 10, left: 8 });
  expect(returned.outside).toEqual(NOTHING_OUTSIDE);
  expect(returned.scrollHeight).toBeLessThanOrEqual(returned.clientHeight);
  expect(returned.scrolledTop).toBe(0);

  await page.mouse.move(0, 0);
  await page.locator(JOB).nth(3).focus();
  await page.keyboard.press("Shift+Tab");
  await page.waitForTimeout(300);
  const focused = await jobRowOverflow(page, 2);
  expect(focused.focusVisible).toBe(true);
  expect(focused.reach).toEqual({ top: 3, right: 3, bottom: 3, left: 3 });
  expect(focused.outside).toEqual(NOTHING_OUTSIDE);
  expect(focused.scrollHeight).toBeLessThanOrEqual(focused.clientHeight);
  expect(focused.scrolledTop).toBe(0);
  for (const index of [0, 5]) {
    await page.locator(JOB).nth(index).focus();
    await page.waitForTimeout(300);
    const edge = await jobRowOverflow(page, index);
    expect(edge.focusVisible).toBe(true);
    expect(edge.outside).toEqual(NOTHING_OUTSIDE);
  }

  expect(await verticalPositions(page)).toEqual(before);
});

for (const frame of JOB_ROW_FRAMES) {
  test(`학습 Job Card에 그림자 Margin을 둔 뒤에도 Card Row, Card 위치, 가로 Scroll 거리는 그대로임 (${frame.width}×${frame.height})`, async ({
    page,
  }) => {
    await openTraining(page, frame.width, frame.height);
    const row = await page.locator(JOB_LIST).evaluate((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return {
        border: [box.left, box.top, box.right, box.bottom],
        content: [
          box.left + element.clientLeft + parseFloat(style.paddingLeft),
          box.top + element.clientTop + parseFloat(style.paddingTop),
          element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
          element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
        ],
      };
    });
    expect(row.content).toEqual([...frame.content]);
    const jobBoxes = await boxes(page, JOB);
    expect(jobBoxes.map((jobBox) => jobBox.x)).toEqual([...frame.cardLefts]);
    for (const jobBox of jobBoxes) {
      expect(jobBox.y).toBe(frame.content[1]);
      expect(jobBox.width).toBe(frame.cardWidth);
      expect(jobBox.height).toBe(98);
    }
    const [jobsBox] = await boxes(page, JOBS);
    expect([jobsBox.x, jobsBox.y, jobsBox.width, jobsBox.height]).toEqual([
      86,
      324,
      frame.width - 100,
      186,
    ]);
    expect((await box(page, RESULTS)).y).toBe(frame.resultsTop);

    const headerBox = await box(page, `${JOBS} [data-slot="section-card-header"]`);
    const [left, top, right, bottom] = row.border;
    expect(top).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
    expect(left).toBeGreaterThanOrEqual(jobsBox.x + 1);
    expect(right).toBeLessThanOrEqual(jobsBox.x + jobsBox.width - 1);
    expect(bottom).toBeLessThanOrEqual(jobsBox.y + jobsBox.height - 1);

    await scrollJobRow(page, 99999);
    expect(await page.locator(JOB_LIST).evaluate((element) => element.scrollLeft)).toBe(
      frame.maxScrollLeft,
    );
    const lastBox = await box(page, JOB, 5);
    expect(lastBox.x + lastBox.width).toBe(frame.content[0] + frame.content[2]);
  });
}

for (const theme of ["라이트", "다크"] as const) {
  test(`Hover한 Button, Card, Row의 Color (${theme} Theme)`, async ({ page }) => {
    await openTraining(page);
    if (theme === "다크") {
      await page.locator('[data-slot="theme-toggle-button"]').click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    const token = (name: string) => color(page, `var(--${name})`);

    expect((await hoveredStyle(page, BUTTONS, 0)).background).toBe(await token("primary-hover"));
    expect((await hoveredStyle(page, BUTTONS, 1)).background).toBe(await token("primary-hover"));
    const range = await hoveredStyle(page, TRIGGER);
    expect(range.background).toBe(await token("card"));
    expect(range.text).toBe(await token("fg"));
    const job = await hoveredStyle(page, JOB, 3);
    expect(job.background).toBe(await token("card"));
    expect(visibleShadow(job.shadow)).toBe("rgba(11, 31, 46, 0.1) 0px 2px 8px 0px");
    expect((await hoveredStyle(page, ROW, 2)).background).toBe(await token("brand-line4-subtle"));
    if (theme === "라이트") {
      expect((await hoveredStyle(page, GEAR, 2)).background).toBe(await token("muted"));
    }
  });
}

test("기본 Font 크기를 2배로 하면 재학습 설정의 크기도 2배임", async ({ page }) => {
  await openTraining(page);
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
  expect(range.style.columnGap).toBe("20px");
  expect((await measure(page, `${TRIGGER} svg`)).width).toBe(36);
  const search = await measure(page, BUTTONS);
  expect(search.height).toBe(64);
  expect(search.style.paddingLeft).toBe("32px");

  const kpiRow = await measure(page, KPI_ROW);
  expect(kpiRow.height).toBe(224);
  expect((await measure(page, KPI)).height).toBe(236);
  expect((await measure(page, `${KPI} [data-slot="kpi-stat-value"]`)).style.fontSize).toBe("60px");

  const job = await measure(page, JOB, 1);
  expect(job.height).toBe(196);
  expect(job.style.paddingTop).toBe("28px");
  expect(job.style.borderTopLeftRadius).toBe("20px");
  expect((await measure(page, JOB, 0)).style.borderTopWidth).toBe("4px");
  const spinner = await measure(page, `${JOB} [data-slot="spinner"]`);
  expect(spinner.width).toBe(28);
  const pill = await measure(page, `${JOB} [data-slot="state-pill"]`);
  expect(pill.height).toBe(48);
  expect(pill.style.fontSize).toBe("24px");
  const dot = await measure(page, `${JOB} [data-slot="step-dot"] > span`);
  expect(dot.width).toBe(12);
  expect((await measure(page, `${JOB} [data-slot="job-card-steps"] > span[aria-hidden]`)).height).toBe(2);

  expect((await measure(page, `${RESULTS} [data-slot="table"]`)).style.minWidth).toBe("2160px");
  expect((await measure(page, `${RESULTS} thead [data-slot="table-row"]`)).height).toBe(88);
  expect((await measure(page, HEAD, 0)).width).toBe(440);
  const row = await measure(page, ROW);
  expect(row.height).toBe(100);
  expect(row.style.borderBottomWidth).toBe("2px");
  expect((await measure(page, GEAR)).width).toBe(64);
  expect((await measure(page, PAGE_SIZE)).width).toBe(220);
});

test("다크 Theme에서 재학습 설정의 Color", async ({ page }) => {
  await openTraining(page);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.waitForTimeout(300);
  const token = (name: string) => color(page, `var(--${name})`);

  expect((await measure(page, FILTER)).style.backgroundColor).toBe(await token("surface-low"));
  const select = await measure(page, SELECTS);
  expect(select.style.backgroundColor).toBe(await token("card"));
  expect(select.style.borderTopColor).toBe(await token("border"));
  const range = await measure(page, TRIGGER);
  expect(range.style.backgroundColor).toBe(await token("card"));
  expect(range.style.borderTopColor).toBe(await token("border"));
  expect(range.style.color).toBe(await token("fg"));
  const reset = await measure(page, RESET);
  expect(reset.style.backgroundColor).toBe(await token("card"));
  expect(reset.style.borderTopColor).toBe(await token("border"));
  expect((await measure(page, BUTTONS, 1)).style.backgroundColor).toBe(await token("primary"));

  const kpi = await measure(page, KPI, 3);
  expect(kpi.style.backgroundColor).toBe(await token("card"));
  expect(kpi.style.borderLeftColor).toBe(await token("border-strong"));
  expect((await measure(page, `${KPI} [data-slot="kpi-stat-description"]`)).style.color).toBe(
    await token("muted-fg"),
  );

  const selectedJob = await measure(page, JOB, 0);
  expect(selectedJob.style.backgroundColor).toBe(await token("card"));
  expect(selectedJob.style.borderTopColor).toBe(await token("brand-line4"));
  expect((await measure(page, JOB, 1)).style.borderTopColor).toBe(await token("border"));
  for (const [index, job] of JOBS_SEEN.entries()) {
    const pill = await measure(page, `${JOB} [data-slot="state-pill"]`, index);
    expect(pill.style.backgroundColor).toBe(await token(job.tone[0]));
    expect(pill.style.color).toBe(await token(job.tone[1]));
  }
  expect((await measure(page, `${JOB} [data-slot="job-card-meta"]`, 5)).style.color).toBe(
    await token("danger"),
  );
  expect((await measure(page, `${JOB} [data-slot="job-card-progress"]`)).style.color).toBe(
    await token("brand-line4-text"),
  );
  expect((await measure(page, `${JOB} [data-slot="spinner"]`)).style.color).toBe(
    await token("brand-line4"),
  );
  expect((await measure(page, `${JOB} [data-slot="step-dot"] > span`, 0)).style.backgroundColor).toBe(
    await token("brand-line4"),
  );
  expect((await measure(page, `${JOB} [data-slot="step-dot"] > span`, 3)).style.backgroundColor).toBe(
    await token("disabled"),
  );

  expect((await measure(page, `${RESULTS} thead [data-slot="table-row"]`)).style.backgroundColor).toBe(
    await token("muted"),
  );
  expect((await measure(page, ROW, 0)).style.backgroundColor).toBe(await token("brand-line4-subtle"));
  expect((await measure(page, ROW, 1)).style.borderBottomColor).toBe(await token("border"));
  const gear = await measure(page, GEAR, 1);
  expect(gear.style.backgroundColor).toBe(await token("card"));
  expect(gear.style.borderTopColor).toBe(await token("border"));
  const csv = await measure(page, CSV);
  expect(csv.style.backgroundColor).toBe(await token("card"));
  expect(csv.style.borderTopColor).toBe(await token("border"));
});

test.describe("움직임 줄이기에 따른 진행 표시", () => {
  test("움직임 줄이기를 켜면 회전하지 않음", async ({ page }) => {
    await openTraining(page);
    expect(await styleOf(page, `${JOB} [data-slot="spinner"]`, "animation-name")).toBe("none");
  });

  test.describe("움직임 줄이기를 끈 화면", () => {
    test.use({ contextOptions: { reducedMotion: "no-preference" } });

    test("회전 주기 1.2초로 계속 회전함", async ({ page }) => {
      await openTraining(page);
      const spinner = `${JOB} [data-slot="spinner"]`;
      expect(await styleOf(page, spinner, "animation-name")).toBe("spin");
      expect(await styleOf(page, spinner, "animation-duration")).toBe("1.2s");
      expect(await styleOf(page, spinner, "animation-timing-function")).toBe("linear");
      expect(await styleOf(page, spinner, "animation-iteration-count")).toBe("infinite");
    });
  });
});

test("CSV 내보내기는 적용된 조건, 기간, Sort에 맞는 결과 전부를 Table에 보이는 형태의 CSV 파일로 내려받음", async ({
  page,
}) => {
  await openTraining(page);
  const toast = page.locator('[data-slot="toast"]');
  const selects = page.locator(SELECTS);

  const first = await downloadCsv(page, CSV);
  expect(first.fileName).toBe("training-results-20260923-120000.csv");
  expect(first.hasByteOrderMark).toBe(true);
  expect(first.endsWithLineEnd).toBe(true);
  expect(first.hasBareLineBreak).toBe(false);
  await expect(toast).toHaveText("CSV 파일을 내려받았습니다.");
  await expect(page.locator(CSV)).toHaveAttribute("aria-disabled", "false");
  const heads = await texts(page, HEAD);
  expect(first.lines[0]).toBe("모델 학습 일시,모델 명,장치,세그먼트,임계치");
  expect(first.lines[0]).toBe(heads.slice(0, -1).join(","));
  expect(first.lines.slice(1)).toEqual(RESULT_ROWS.map((row) => row.join(",")));
  expect(first.lines.slice(1)).toEqual(await shownTableLines(page, ROW, CSV_COLUMN_COUNT));
  await expect(page.locator(`${RESULTS} [data-slot="training-results-total"]`)).toHaveText("총 81건");
  await expect(page.locator(ROW)).toHaveCount(6);

  await page.locator(`${HEAD} [data-slot="column-sort-button"]`).nth(3).click();
  await expect(page.locator(HEAD).nth(4)).toHaveAttribute("aria-sort", "descending");
  await expect.poll(() => columnTexts(page, ROW, 4)).toEqual(["0.5277", "0.5140", "0.4914", "0.4914", "0.0433", "-1.2758"]);
  const byThreshold = await downloadCsv(page, CSV);
  expect(byThreshold.lines.slice(1).map((line) => line.split(",")[4])).toEqual([
    "0.5277",
    "0.5140",
    "0.4914",
    "0.4914",
    "0.0433",
    "-1.2758",
  ]);
  expect(byThreshold.lines.slice(1)).toEqual(await shownTableLines(page, ROW, CSV_COLUMN_COUNT));

  await selects.nth(0).click();
  await pickOption(page, "Isolation Forest");
  expect((await downloadCsv(page, CSV)).lines).toHaveLength(7);

  await page.locator(BUTTONS).first().click();
  await expect(page.locator(ROW)).toHaveCount(4);
  const isolationForest = await downloadCsv(page, CSV);
  expect(isolationForest.lines.slice(1)).toEqual(await shownTableLines(page, ROW, CSV_COLUMN_COUNT));
  expect(isolationForest.lines.slice(1).map((line) => line.split(",")[1])).toEqual(
    Array(4).fill("Isolation Forest"),
  );
});

test("고정 표기의 학습 단계, Job 상태, 진행 단위", () => {
  expect(trainingStageKeys).toEqual(["preprocess", "featureVector", "train", "save"]);
  expect(trainingStageKeys.map((key) => trainingStageLabels[key].label)).toEqual([
    "전처리",
    "특징벡터",
    "학습",
    "저장",
  ]);
  expect(trainingStageLabels.preprocess.runningLabel).toBe("전처리 중");
  expect(trainingStageLabels.train.runningLabel).toBe("학습 중");
  expect(trainingJobStatusLabels).toEqual({
    queued: { label: "예약", codeLabel: "QUEUED" },
    succeeded: { label: "성공", codeLabel: "SUCCEEDED" },
    failed: { label: "실패", codeLabel: "FAILED" },
  });
  expect(trainingProgressUnitLabels.epoch.label).toBe("epoch");
  expect(trainingProgressUnitLabels.part.label).toBe("part");
});

test("계산 함수의 예약, 진행 중, 실패 수와 가장 최근의 실패", () => {
  const base = { deviceCode: "ATC", modelCode: "IF", formation: null, isRetry: false };
  const jobs: TrainingJob[] = [
    { ...base, id: "a", createdAt: "2026-09-23T09:00:00", status: "queued", scheduledStartAt: "2026-09-23T10:00:00" },
    { ...base, id: "b", createdAt: "2026-09-23T09:00:00", status: "running", stage: "train", progressPercent: 10, stepProgress: null },
    { ...base, id: "c", createdAt: "2026-09-23T09:00:00", status: "running", stage: "save", progressPercent: 90, stepProgress: null },
    { ...base, id: "d", createdAt: "2026-09-23T09:00:00", status: "succeeded", completedAt: "2026-09-23T09:30:00" },
    { ...base, id: "e", deviceCode: "DCU", createdAt: "2026-09-22T09:00:00", status: "failed", stage: "train", failureReason: "옛 실패" },
    { ...base, id: "f", deviceCode: "SIV", modelCode: "VAE", createdAt: "2026-09-23T08:00:00", status: "failed", stage: "save", failureReason: "새 실패" },
  ];
  expect(countTrainingJobs(jobs)).toEqual({
    activeJobCount: 3,
    queuedJobCount: 1,
    runningJobCountsByStage: { preprocess: 0, featureVector: 0, train: 1, save: 1 },
    failedJobCount: 2,
    latestFailure: { deviceCode: "SIV", modelCode: "VAE", failureReason: "새 실패" },
  });
  expect(countTrainingJobs([]).latestFailure).toBeNull();
  expect(countTrainingJobs([]).activeJobCount).toBe(0);
});

test("상태마다의 판정과 Color로 진행중 학습에 드는 상태와 Job Card 설명 Row의 Color", () => {
  const statuses: TrainingJobStatus[] = ["queued", "running", "succeeded", "failed"];
  expect(statuses.filter(isActiveTrainingJobStatus)).toEqual(["queued", "running"]);
  expect(statuses.map((status) => trainingJobMetaTones[status])).toEqual([
    "muted",
    "muted",
    "muted",
    "danger",
  ]);
});

test("Mock 조회와 실행 함수는 조건, 기간, Sort로 거르고 바꾼 Job은 다시 조회한 값에 반영함", async () => {
  const options = await fetchTrainingFilterOptions();
  expect(options.defaultPeriod).toEqual({ from: isoDaysAgo(6), to: isoDaysAgo(0) });
  expect(options.selectablePeriod).toEqual({ from: null, to: null });
  expect(options.pageSizes).toEqual([20, 50, 100]);
  expect(options.defaultPageSize).toBe(20);

  const query = {
    modelCode: null,
    deviceCode: null,
    period: options.defaultPeriod,
    sort: { key: "trainedAt", direction: "desc" },
    page: 1,
    pageSize: 20,
  } as const;
  const all = await fetchTrainingResults(query);
  expect(all.rows.map((row) => row.modelCode)).toEqual(["IF", "SVM", "IF", "IF", "IF", "VAE"]);
  expect(all.rows[0].trainedAt).toBe(`${isoDaysAgo(0)}T09:12:00`);
  expect(all.totalCount).toBe(81);
  expect(all.pageCount).toBe(10);
  expect((await fetchTrainingResults({ ...query, modelCode: "IF" })).rows).toHaveLength(4);
  expect((await fetchTrainingResults({ ...query, deviceCode: "DRIVING_GEAR" })).rows).toHaveLength(1);
  const oneDay = { from: isoDaysAgo(2), to: isoDaysAgo(2) };
  expect((await fetchTrainingResults({ ...query, period: oneDay })).rows.map((row) => row.deviceCode)).toEqual([
    "TRACTION_MOTOR",
  ]);
  const byThreshold = await fetchTrainingResults({ ...query, sort: { key: "threshold", direction: "asc" } });
  expect(byThreshold.rows.map((row) => row.threshold)).toEqual([-1.2758, 0.0433, 0.4914, 0.4914, 0.514, 0.5277]);
  const exportQuery = { modelCode: null, deviceCode: null, period: query.period, sort: query.sort };
  const csv = await exportTrainingResultsCsv(exportQuery);
  expect(csv.type).toBe("text/csv;charset=utf-8");
  expect([...new Uint8Array(await csv.arrayBuffer()).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const csvLines = (await csv.text()).split("\r\n");
  expect(csvLines).toHaveLength(8);
  expect(csvLines[0]).toBe("모델 학습 일시,모델 명,장치,세그먼트,임계치");
  expect(csvLines[1]).toBe(`${isoDaysAgo(0)} 09:12:00,Isolation Forest,AXLE_BEARING,default,0.5277`);
  expect(csvLines[6]).toBe(`${isoDaysAgo(2)} 11:14:14,Tabular VAE,TRACTION_MOTOR,default,0.0433`);
  expect(csvLines[7]).toBe("");
  const csvByThreshold = await exportTrainingResultsCsv({
    ...exportQuery,
    sort: { key: "threshold", direction: "asc" },
  });
  expect(
    (await csvByThreshold.text()).split("\r\n").slice(1, -1).map((line) => line.split(",")[4]),
  ).toEqual(["-1.2758", "0.0433", "0.4914", "0.4914", "0.5140", "0.5277"]);
  const csvOneModel = await exportTrainingResultsCsv({ ...exportQuery, modelCode: "IF" });
  expect((await csvOneModel.text()).split("\r\n").slice(1, -1)).toHaveLength(4);

  const before = await fetchTrainingSummary();
  expect(before.activeJobCount).toBe(3);
  expect(before.failedJobCount).toBe(1);
  expect(before.latestTraining).toEqual({ trainedAt: `${isoDaysAgo(0)}T09:12:00`, deviceCode: "AXLE_BEARING" });

  const scheduledIds = await scheduleTraining({
    modelCode: "VAE",
    deviceCodes: ["ATC", "DRIVING_GEAR"],
    formation: null,
    period: { from: isoDaysAgo(7), to: isoDaysAgo(1) },
    startTime: "00:00:00",
    endTime: "23:59:59",
  });
  expect(scheduledIds).toEqual(["trn-1006", "trn-1006-1"]);
  const scheduled = await fetchTrainingJobs();
  expect(scheduled.map((job) => job.id).slice(0, 3)).toEqual(["trn-1006", "trn-1006-1", "trn-1000"]);
  expect(scheduled[0]).toMatchObject({ deviceCode: "ATC", modelCode: "VAE", status: "queued", formation: null });
  const firstScheduled = scheduled[0];
  const scheduledStartAt = firstScheduled.status === "queued" ? firstScheduled.scheduledStartAt : "";
  expect(Date.parse(scheduledStartAt) - Date.parse(firstScheduled.createdAt)).toBe(7 * 60_000);
  expect((await fetchTrainingSummary()).queuedJobCount).toBe(3);

  const retriedId = await retryTrainingJob("trn-1005");
  expect(retriedId).toBe("trn-1008");
  const afterRetry = await fetchTrainingJobs();
  expect(afterRetry[0]).toMatchObject({
    id: retriedId,
    deviceCode: "MICOM_COOLER",
    modelCode: "SVM",
    formation: "406",
    status: "running",
    stage: "preprocess",
    progressPercent: 2,
    stepProgress: null,
    isRetry: true,
  });
  expect(afterRetry.find((job) => job.id === "trn-1005")).toMatchObject({ status: "failed", isRetry: false });
  const failedDetail = await fetchTrainingJobDetail("trn-1005");
  const retriedDetail = await fetchTrainingJobDetail(retriedId);
  expect(retriedDetail).toMatchObject({
    requestedPeriod: failedDetail.requestedPeriod,
    requestedStartTime: failedDetail.requestedStartTime,
    requestedEndTime: failedDetail.requestedEndTime,
    windowSeconds: failedDetail.windowSeconds,
    startedAt: afterRetry[0].createdAt,
    endedAt: null,
    failureMessage: null,
  });
  expect(failedDetail.failureMessage).not.toBeNull();
  const after = await fetchTrainingSummary();
  expect(after.failedJobCount).toBe(1);
  expect(after.latestFailure).toEqual({ deviceCode: "MICOM_COOLER", modelCode: "SVM", failureReason: "대상 기간 데이터 없음" });
  expect(after.activeJobCount).toBe(6);
  expect(after.runningJobCountsByStage.preprocess).toBe(2);
  await expect(retryTrainingJob("trn-1002")).rejects.toThrow();
  await expect(retryTrainingJob("trn-9999")).rejects.toThrow();
});
