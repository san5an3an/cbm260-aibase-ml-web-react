import { expect, test, type Page } from "@playwright/test";
import {
  createJobRequestDraft,
  findJobRequestProblem,
  hasJobRequestFieldChanged,
  jobRequestProblemField,
  toJobRequestInput,
} from "../src/domain/jobRequest";
import {
  createTrainingScheduleDraft,
  findTrainingScheduleProblem,
  hasTrainingScheduleFieldChanged,
  toTrainingScheduleInput,
  trainingScheduleProblemField,
} from "../src/domain/training";
import {
  fetchInferenceJobDetail,
  fetchInferenceResults,
  fetchInferenceRunOptions,
} from "../src/services/inference";
import { DEVICE_NAMES_IN_GRID } from "./helpers/jobRequest";
import { calendarDayCell, color, measure, pickOption, truncation, visibleShadow } from "./helpers/measure";
import {
  SECTION_PADDING_X,
  SECTION_PADDING_Y,
  box,
  boxes,
  collectSlotRects,
  doubledMismatches,
  enterMotion,
  enterTranslate,
  expectButton,
  expectModalFrame,
  expectSection,
  focusIsInside,
  footerButton,
  frameHeight,
  iconShape,
  modal,
  pressTab,
  shownIconShape,
  styleOf,
  texts,
} from "./helpers/modal";
import { INFERENCE_RESULT_ROW, openInference } from "./helpers/inference";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const FILTER = '[data-slot="inference-filter-bar"]';
const JOBS = '[data-slot="inference-jobs-card"]';
const JOB = '[data-slot="inference-job-list"] [data-slot="job-card"]';
const ROW = INFERENCE_RESULT_ROW;
const TOAST = '[data-slot="toast"]';
const PICKER = '[data-slot="popover-content"][data-picker="range"]';
const CALENDAR = `${PICKER} [data-slot="calendar"]`;

const RUN = modal("inference-run");
const DETAIL = modal("inference-detail");

const FIELDS = `${RUN} [data-slot="job-request-fields"]`;
const DEVICES = `${RUN} [data-slot="job-request-devices"]`;
const DEVICE_ITEM = `${RUN} [data-slot="job-request-device-list"] [data-slot="checkbox-item"]`;
const DATE_TRIGGER = `${RUN} [data-slot="date-range-trigger"]`;
const SEGMENT_ITEM = `${RUN} [data-slot="toggle-group-item"]`;
const FIELD_ERROR = `${RUN} [data-slot="field-error"]`;

const KV_LABEL = `${DETAIL} [data-slot="key-value-row-label"]`;
const KV_VALUE = `${DETAIL} [data-slot="key-value-row-value"]`;
const EYEBROW = `${DETAIL} [data-slot="panel-eyebrow"]`;
const DETAIL_BODY = `${DETAIL} [data-slot="inference-detail-body"]`;
const JOB_PANEL = `${DETAIL} [data-slot="inference-detail-job"]`;
const RESULTS_PANEL = `${DETAIL} [data-slot="inference-detail-results"]`;
const SEGMENT_TABLE = `${RESULTS_PANEL} [data-slot="data-table"]`;
const SEGMENT_HEAD = `${RESULTS_PANEL} [data-slot="table-head"]`;
const SEGMENT_ROW = `${RESULTS_PANEL} tbody [data-slot="table-row"]`;
const WINDOW_ROW = `${DETAIL} [data-slot="anomaly-window-row"]`;
const HEATMAP = `${DETAIL} [data-slot="car-heatmap"]`;
const HEAT_HEADER = `${HEATMAP} [data-slot="car-heatmap-header"] > span`;
const HEAT_ROW = `${HEATMAP} [data-slot="car-heatmap-row"]`;
const HEAT_CELL = `${HEATMAP} [data-slot="heat-cell"]`;
const TOOLTIP = '[data-slot="cursor-tooltip"]';
const BANNER = `${DETAIL} [data-slot="alert-banner"]`;
const FAILED_PANEL = `${DETAIL} [data-slot="inference-detail-panel"]`;

const RUN_WIDTH = 900;
const RUN_HEIGHT = 682;
const RESULT_WIDTH = 1700;
const RESULT_HEIGHT = 900;
const FAILED_WIDTH = 1000;
const KEY_VALUE_HEIGHT = 38;
const EYEBROW_GAP = 8;
const JOB_PANEL_WIDTH = 440;
const SEGMENT_FIXED_COLUMNS = [150, 150, 150, 130];
const HEATMAP_WIDTH = 496;
const FINDINGS_GAP = 24;
const WINDOW_COLUMNS = [190, 92, 90];
const HEAT_LABEL_WIDTH = 56;
const HEAT_GAP = 4;
const HEAT_CELL_HEIGHT = 24;

const ANOMALY_WINDOWS = [
  ["09-22 14:04 ~ 14:05", "default", "편성 401 · 1호차", "score 0.600"],
  ["09-22 15:12 ~ 15:13", "default", "편성 402 · 2호차", "score 0.670"],
  ["09-22 16:21 ~ 16:22", "default", "편성 403 · 3호차", "score 0.740"],
  ["09-22 17:30 ~ 17:31", "unit_a", "편성 404 · 4호차", "score 0.810"],
  ["09-22 18:39 ~ 18:40", "default", "편성 405 · 5호차", "score 0.880"],
  ["09-22 19:48 ~ 19:49", "unit_a", "편성 403 · 6호차", "score 0.905"],
];
const HOT_CARS: Record<number, number[]> = { 401: [0, 9], 402: [1], 403: [2, 5], 404: [3] };
const hotCars = (formation: number) => HOT_CARS[formation] ?? [4];

const FAILURE_COOLER =
  "추론 실패 — 편성 409의 2026-09-22 ~ 09-23 구간 센서 데이터 중 62%가 비어 있어 window를 만들 수 없습니다. 기간을 바꾸거나 수집 상태를 확인한 뒤 다시 시도하세요.";
const FAILURE_ESW =
  "추론 실패 — 저장된 모델이 없습니다: device=ESW. 재학습 설정에서 ESW · IF 학습을 먼저 예약하세요.";

const runButton = (page: Page) =>
  page.locator(FILTER).getByRole("button", { name: "추론 실행", exact: true });
const failedOnlySwitch = (page: Page) => page.locator(JOBS).getByRole("switch", { name: "실패만 보기" });

async function openRun(page: Page): Promise<void> {
  await runButton(page).click();
  await expect(page.locator(RUN)).toBeVisible();
}

async function openJobDetail(page: Page, index: number, failedOnly = false): Promise<void> {
  if (failedOnly && (await failedOnlySwitch(page).getAttribute("aria-checked")) !== "true") {
    await failedOnlySwitch(page).click();
  }
  await page.locator(JOB).nth(index).click();
  await expect(page.locator(DETAIL)).toBeVisible();
  await expect(page.locator(KV_VALUE).first()).toBeVisible();
}

async function runOneDevice(page: Page): Promise<void> {
  await openRun(page);
  await page.locator(SEGMENT_ITEM).nth(0).click();
  await page.locator(`${DEVICE_ITEM} [data-slot="checkbox"]`).nth(0).click();
  await footerButton(page, RUN, "추론 실행").click();
  await expect(page.locator(RUN)).toHaveCount(0);
}

async function openRowDetail(page: Page, index: number): Promise<void> {
  await page.locator(ROW).nth(index).click();
  await expect(page.locator(DETAIL)).toBeVisible();
  await expect(page.locator(KV_VALUE).first()).toBeVisible();
}

async function tooltipLines(page: Page): Promise<string[]> {
  return texts(page, `${TOOLTIP} > span`);
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`추론 실행 Modal의 크기, Text, 처음 값 확인, 학습 예약 Modal과 같은 Layout에서 다른 부분 (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await openInference(page, viewport.width, viewport.height);
    await openRun(page);
    const { header, contentWidth } = await expectModalFrame(page, "inference-run", {
      width: RUN_WIDTH,
      height: RUN_HEIGHT,
      title: "추론 실행",
    });
    const fields = await box(page, FIELDS);
    expect(fields.x).toBeCloseTo(header.x, 1);
    expect(fields.width).toBeCloseTo(contentWidth, 1);
    await expectSection(page, FIELDS);
    await expectSection(page, DEVICES);
    expect(await texts(page, `${FIELDS} [data-slot="field-label"]`)).toEqual([
      "추론 일자*",
      "추론 시각",
      "추론 모델*",
      "편성 번호",
    ]);
    await expect(page.locator(DATE_TRIGGER)).toHaveText("2026-09-22 ~ 2026-09-23");
    await expect(page.locator(`${FIELDS} [data-slot="text-input"]`).nth(0)).toHaveValue("00:00:00");
    await expect(page.locator(`${FIELDS} [data-slot="text-input"]`).nth(1)).toHaveValue("23:59:59");
    expect(await texts(page, SEGMENT_ITEM)).toEqual(["IF", "SVM", "VAE", "PCA"]);
    await expect(page.locator(`${SEGMENT_ITEM}[aria-pressed="true"]`)).toHaveCount(0);
    await expect(page.locator(`${FIELDS} [data-slot="select-trigger"]`)).toHaveText("전체 (401 – 426)");
    await expect(page.locator(`${DEVICES} [data-slot="job-request-device-count"]`)).toHaveText("0 / 21");
    await expect(page.locator(`${DEVICES} [data-slot="job-request-device-more"]`)).toHaveText(
      "· 스크롤하면 9개 더 있습니다",
    );
    expect(await texts(page, `${DEVICE_ITEM} [data-slot="field-label"]`)).toEqual(
      DEVICE_NAMES_IN_GRID.map((name) => (name === "화재감지장치" || name === "배전반" ? `${name}(학습 불가)` : name)),
    );
    await expect(page.locator(`${DEVICE_ITEM}[data-checked="true"]`)).toHaveCount(0);
    expect(await texts(page, `${DEVICE_ITEM} [data-slot="checkbox-item-hint"]`)).toEqual([
      "(학습 불가)",
      "(학습 불가)",
    ]);
    await expect(page.locator(DEVICE_ITEM).nth(7)).toHaveAttribute("title", "학습·추론 경로가 아직 없는 장치입니다");
    const note = await measure(page, `${RUN} [data-slot="modal-footnote"]`);
    await expect(page.locator(`${RUN} [data-slot="modal-footnote"]`)).toHaveText(
      "학습본이 없는 장치는 추론에서 제외됩니다 (플릿 개요 · 커버리지 참고)",
    );
    expect(note.style.fontSize).toBe("12px");
    expect(note.style.color).toBe(await color(page, "var(--muted-fg)"));
    const buttons = `${RUN} [data-slot="dialog-footer"] [data-slot="action-button"]`;
    expect(await texts(page, buttons)).toEqual(["취소", "추론 실행"]);
    await expectButton(page, buttons, { height: 32, paddingX: 16, weight: "600", background: "var(--card)", text: "var(--fg)", border: "var(--border)" }, 0);
    await expectButton(page, buttons, { height: 32, paddingX: 16, weight: "600", background: "var(--primary)", text: "var(--on-primary)" }, 1);
    expect((await box(page, `${buttons}:last-child svg`)).width).toBe(18);
    expect(await shownIconShape(page, buttons, 1)).toBe(iconShape("PlayArrow"));
    await expect(page.locator(`${RUN} [data-slot="spinner"]`)).toHaveCount(0);
    await expect(page.locator(`${RUN} [aria-label="Loading"]`)).toHaveCount(0);
  });
}

test("추론 실행에서 Model, 추론 일자, 대상 장치 순서로 확인하고 오류가 난 Input을 고치면 그 오류만 사라짐", async ({
  page,
}) => {
  await openInference(page);
  await openRun(page);
  const submit = footerButton(page, RUN, "추론 실행");
  await submit.click();
  await expect(page.locator(FIELD_ERROR)).toHaveText("추론 모델을 선택하세요");
  await expect(page.locator(`${RUN} [data-slot="segmented"]`)).toHaveAttribute("aria-invalid", "true");
  await page.locator(`${FIELDS} [data-slot="text-input"]`).nth(0).fill("01:00");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(1);
  await page.locator(SEGMENT_ITEM).nth(2).click();
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
  await page.locator(DATE_TRIGGER).click();
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-10")} button`).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(PICKER)).toHaveCount(0);
  await submit.click();
  await expect(page.locator(FIELD_ERROR)).toHaveText("추론 일자를 선택하세요");
  await page.locator(DATE_TRIGGER).click();
  await page.locator(`${calendarDayCell(CALENDAR, "2026-09-12")} button`).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
  await submit.click();
  await expect(page.locator(FIELD_ERROR)).toHaveText("추론 대상 장치를 선택하세요");
  await page.locator(DEVICE_ITEM).nth(7).click({ force: true });
  await expect(page.locator(`${DEVICES} [data-slot="job-request-device-count"]`)).toHaveText("0 / 21");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(1);
  await page.locator(`${DEVICE_ITEM} [data-slot="checkbox"]`).nth(0).click();
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
  await expect(page.locator(`${DEVICES} [data-slot="job-request-device-count"]`)).toHaveText("1 / 21");
  await page.locator(DEVICES).getByRole("button", { name: "전체 선택", exact: true }).click();
  await expect(page.locator(`${DEVICES} [data-slot="job-request-device-count"]`)).toHaveText("19 / 21");
  await expect(page.locator(DEVICES).getByRole("button", { name: "전체 해제", exact: true })).toBeVisible();
});

test("추론 실행을 누르면 Modal이 닫히고 고른 장치마다 요청됨 Card가 맨 앞에 표시되며 알림이 뜨고 다시 열면 처음 값임", async ({
  page,
}) => {
  await openInference(page);
  const firstCardBefore = await texts(page, `${JOB} [data-slot="job-card-title"]`);
  expect(firstCardBefore).toEqual(["TRACTION_MOTOR · SVM", "ECU · VAE", "MICOM_AIRPURIFIER · PCA", "VVVF · IF"]);
  await openRun(page);
  await page.locator(SEGMENT_ITEM).nth(2).click();
  await page.locator(`${FIELDS} [data-slot="select-trigger"]`).click();
  await pickOption(page, "405");
  await page.locator(`${DEVICE_ITEM} [data-slot="checkbox"]`).nth(0).click();
  await page.locator(`${DEVICE_ITEM} [data-slot="checkbox"]`).nth(1).click();
  await footerButton(page, RUN, "추론 실행").click();
  await expect(page.locator(RUN)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("추론 요청 완료 — inf-2043 / QUEUED");
  await expect(page.locator(`${TOAST} svg`)).toHaveCount(1);
  expect(await shownIconShape(page, TOAST)).toBe(iconShape("Check"));
  await expect(page.locator(`${JOB} [data-slot="job-card-title"]`)).toHaveText([
    "ATC · VAE",
    "ECU · VAE",
    "TRACTION_MOTOR · SVM",
    "ECU · VAE",
  ]);
  await expect(page.locator(`${JOB} [data-slot="state-pill"]`).nth(0)).toHaveText("예약");
  await expect(page.locator(`${JOB} [data-slot="job-card-meta"]`).nth(0)).toHaveText("09-23 12:00 · 편성 405");
  await expect(page.locator(JOB).nth(0).locator('[data-slot="spinner"]')).toHaveCount(0);
  await openJobDetail(page, 0);
  await expect(page.locator(`${DETAIL} [data-slot="dialog-title"]`)).toHaveText("추론 상세 · ATC");
  expect(await texts(page, KV_VALUE)).toEqual([
    "inf-2043",
    "예약",
    "2026-09-23 12:00:00 · –",
    "ATC",
    "Tabular VAE",
    "405",
    "2026-09-22 00:00 ~ 2026-09-23 23:59",
    "60",
    "0 건 생성",
  ]);
  await expect(page.locator(SEGMENT_ROW)).toHaveCount(0);
  await expect(page.locator(WINDOW_ROW)).toHaveCount(0);
  await expect(page.locator(HEAT_CELL)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await openRun(page);
  await expect(page.locator(`${SEGMENT_ITEM}[aria-pressed="true"]`)).toHaveCount(0);
  await expect(page.locator(`${DEVICES} [data-slot="job-request-device-count"]`)).toHaveText("0 / 21");
  await expect(page.locator(`${FIELDS} [data-slot="select-trigger"]`)).toHaveText("전체 (401 – 426)");
});

test("요청됨 Job은 재학습 설정의 학습 예약처럼 회색 \"예약\"으로 표시됨, Card의 상태 표시와 상세의 상태 확인", async ({ page }) => {
  await openInference(page);
  await runOneDevice(page);
  const pill = page.locator(`${JOB} [data-slot="state-pill"]`).nth(0);
  await expect(pill).toHaveText("예약");
  const pillStyle = await measure(page, `${JOB} [data-slot="state-pill"]`, 0);
  expect(pillStyle.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(pillStyle.style.color).toBe(await color(page, "var(--muted-fg)"));
  const meta = await measure(page, `${JOB} [data-slot="job-card-meta"]`, 0);
  expect(meta.style.color).toBe(await color(page, "var(--muted-fg)"));
  await openJobDetail(page, 0);
  await expect(page.locator(KV_LABEL).nth(1)).toHaveText("상태");
  await expect(page.locator(KV_VALUE).nth(1)).toHaveText("예약");
});

test("결과가 빈 추론 상세(요청됨)의 편성 × 호차는 헤더만 표시되고, Cell이 없으면 헤더 Row와 Row를 그리지 않음", async ({ page }) => {
  await openInference(page);
  await runOneDevice(page);
  await openJobDetail(page, 0);
  await expect(page.locator(SEGMENT_ROW)).toHaveCount(0);
  await expect(page.locator(HEATMAP)).toBeVisible();
  await expect(page.locator(`${HEATMAP} [data-slot="panel-eyebrow"]`)).toHaveText("편성 × 호차");
  await expect(page.locator(`${HEATMAP} [data-slot="car-heatmap-header"]`)).toHaveCount(0);
  await expect(page.locator(HEAT_ROW)).toHaveCount(0);
  await expect(page.locator(HEAT_CELL)).toHaveCount(0);
});

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`추론 상세(성공)의 크기, 배치, Text, Color 확인, Job Card에서 엶 (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await openInference(page, viewport.width, viewport.height);
    await openJobDetail(page, 0);
    const width = Math.min(RESULT_WIDTH, viewport.width - 64);
    const height = Math.min(RESULT_HEIGHT, viewport.height - 64);
    const { header, contentWidth } = await expectModalFrame(page, "inference-detail", {
      width,
      height,
      title: "추론 상세 · TRACTION_MOTOR",
    });
    expect(await styleOf(page, DETAIL, "overflow-y")).toBe("hidden");
    const bodyHeight = height - 2 - 32 - 36 - 14 - 14 - 32;
    const body = await box(page, DETAIL_BODY);
    expect(body.x).toBeCloseTo(header.x, 1);
    expect(body.y).toBeCloseTo(header.y + 36 + 14, 1);
    expect(body.width).toBeCloseTo(contentWidth, 1);
    expect(body.height).toBeCloseTo(bodyHeight, 1);
    const jobPanel = await box(page, JOB_PANEL);
    const resultsPanel = await box(page, RESULTS_PANEL);
    expect(jobPanel.width).toBeCloseTo(JOB_PANEL_WIDTH, 1);
    expect(jobPanel.height).toBeCloseTo(bodyHeight, 1);
    expect(resultsPanel.x).toBeCloseTo(jobPanel.x + JOB_PANEL_WIDTH + 14, 1);
    expect(resultsPanel.width).toBeCloseTo(contentWidth - JOB_PANEL_WIDTH - 14, 1);
    expect(resultsPanel.height).toBeCloseTo(bodyHeight, 1);
    await expectSection(page, JOB_PANEL);
    await expectSection(page, RESULTS_PANEL);
    expect(await styleOf(page, JOB_PANEL, "overflow-y")).toBe("auto");
    expect(await styleOf(page, RESULTS_PANEL, "overflow-y")).toBe("auto");
    expect((await measure(page, RESULTS_PANEL)).style.rowGap).toBe("14px");

    expect(await texts(page, EYEBROW)).toEqual(["JOB", "세그먼트별 결과", "이상 시간대", "편성 × 호차"]);
    for (let index = 0; index < 4; index += 1) {
      const eyebrow = await measure(page, EYEBROW, index);
      expect(eyebrow.style.fontSize).toBe("11px");
      expect(eyebrow.style.fontWeight).toBe("700");
      expect(eyebrow.style.letterSpacing).toBe("0.6px");
      expect(eyebrow.style.color).toBe(await color(page, "var(--brand-line4-text)"));
    }
    expect((await measure(page, EYEBROW, 0)).style.paddingBottom).toBe("8px");
    expect((await measure(page, EYEBROW, 1)).style.paddingBottom).toBe("0px");
    expect((await measure(page, EYEBROW, 2)).style.paddingBottom).toBe("8px");
    expect((await measure(page, EYEBROW, 3)).style.paddingBottom).toBe("4px");

    expect(await texts(page, KV_LABEL)).toEqual([
      "Job ID",
      "상태",
      "생성 · 종료",
      "장치",
      "모델",
      "편성",
      "추론 기간",
      "윈도우(초)",
      "자동 알람",
    ]);
    expect(await texts(page, KV_VALUE)).toEqual([
      "inf-2000",
      "성공",
      "2026-09-23 13:11:00 · 13:30:00",
      "TRACTION_MOTOR",
      "One-Class SVM",
      "410",
      "2026-09-22 00:00 ~ 2026-09-23 06:00",
      "60",
      "2 건 생성",
    ]);
    const rows = await boxes(page, `${DETAIL} [data-slot="key-value-row"]`);
    const firstRowY = jobPanel.y + 1 + SECTION_PADDING_Y + 13 + EYEBROW_GAP;
    rows.forEach((row, index) => {
      expect(row.height).toBeCloseTo(KEY_VALUE_HEIGHT, 1);
      expect(row.x).toBeCloseTo(jobPanel.x + 1 + SECTION_PADDING_X, 1);
      expect(row.y).toBeCloseTo(firstRowY + index * KEY_VALUE_HEIGHT, 1);
    });
    const row = await measure(page, `${DETAIL} [data-slot="key-value-row"]`);
    expect(row.style.borderBottomColor).toBe(await color(page, "var(--border)"));
    expect(await styleOf(page, `${DETAIL} [data-slot="key-value-row"]`, "border-bottom-style")).toBe("dashed");
    expect(row.style.fontSize).toBe("14px");
    expect((await measure(page, KV_LABEL)).style.color).toBe(await color(page, "var(--muted-fg)"));
    expect((await measure(page, KV_VALUE)).style.fontWeight).toBe("700");
    expect(await styleOf(page, KV_VALUE, "text-overflow")).toBe("ellipsis");

    const tableFrame = await measure(page, SEGMENT_TABLE);
    expect(tableFrame.style.borderTopWidth).toBe("1px");
    expect(tableFrame.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(tableFrame.style.borderTopLeftRadius).toBe("10px");
    expect(tableFrame.style.backgroundColor).toBe(await color(page, "var(--card)"));
    const tableBox = await box(page, SEGMENT_TABLE);
    const resultsInnerWidth = resultsPanel.width - 2 - SECTION_PADDING_X * 2;
    expect(tableBox.width).toBeCloseTo(resultsInnerWidth, 1);
    expect(await texts(page, SEGMENT_HEAD)).toEqual(["세그먼트", "전체 window", "이상 window", "이상 비율", "임계값"]);
    const headRow = await measure(page, `${RESULTS_PANEL} thead [data-slot="table-row"]`);
    expect(headRow.height).toBeCloseTo(44, 1);
    expect(headRow.style.backgroundColor).toBe(await color(page, "var(--muted)"));
    expect((await measure(page, SEGMENT_HEAD)).style.fontWeight).toBe("400");
    const headWidths = (await boxes(page, SEGMENT_HEAD)).map((head) => head.width);
    expect(headWidths.slice(1)).toEqual(SEGMENT_FIXED_COLUMNS);
    expect(headWidths[0]).toBeCloseTo(resultsInnerWidth - 2 - SEGMENT_FIXED_COLUMNS.reduce((sum, value) => sum + value, 0), 1);
    expect(
      await page.locator(SEGMENT_HEAD).evaluateAll((heads) => heads.map((head) => getComputedStyle(head).textAlign)),
    ).toEqual(["left", "right", "right", "right", "right"]);
    const segmentCells = await page
      .locator(SEGMENT_ROW)
      .evaluateAll((segmentRows) =>
        segmentRows.map((segmentRow) =>
          [...segmentRow.querySelectorAll("td")].map((cell) => [
            cell.textContent,
            getComputedStyle(cell).fontWeight,
            getComputedStyle(cell).textAlign,
          ]),
        ),
      );
    expect(segmentCells).toEqual([
      [["default", "700", "start"], ["180", "400", "right"], ["61", "700", "right"], ["33.9%", "700", "right"], ["0.0430", "400", "right"]],
      [["unit_a", "700", "start"], ["120", "400", "right"], ["14", "700", "right"], ["11.7%", "700", "right"], ["0.0415", "400", "right"]],
    ]);
    const rateCell = `${SEGMENT_ROW} td:nth-child(4)`;
    expect((await measure(page, rateCell, 0)).style.color).toBe(await color(page, "var(--danger)"));
    expect((await measure(page, rateCell, 1)).style.color).toBe(await color(page, "var(--on-warning-subtle)"));
    expect((await measure(page, `${SEGMENT_ROW} td:nth-child(5)`, 0)).style.color).toBe(await color(page, "var(--fg)"));
    for (const segmentRow of await boxes(page, SEGMENT_ROW)) expect(segmentRow.height).toBeCloseTo(48, 1);
    await page.locator(SEGMENT_ROW).nth(0).hover();
    await page.waitForTimeout(300);
    expect((await measure(page, SEGMENT_ROW, 0)).style.backgroundColor).toBe("rgba(0, 0, 0, 0)");

    const list = await box(page, `${DETAIL} [data-slot="anomaly-window-list"]`);
    const heatmap = await box(page, HEATMAP);
    expect(heatmap.width).toBeCloseTo(HEATMAP_WIDTH, 1);
    expect(list.width).toBeCloseTo(resultsInnerWidth - HEATMAP_WIDTH - FINDINGS_GAP, 1);
    expect(heatmap.x).toBeCloseTo(list.x + list.width + FINDINGS_GAP, 1);
    expect(list.y).toBeCloseTo(tableBox.y + tableBox.height + 14, 1);

    expect(
      await page.locator(WINDOW_ROW).evaluateAll((windowRows) =>
        windowRows.map((windowRow) => [...windowRow.children].map((cell) => cell.textContent)),
      ),
    ).toEqual(ANOMALY_WINDOWS);
    const windowRow = await measure(page, WINDOW_ROW);
    expect(windowRow.height).toBeCloseTo(44, 1);
    expect(windowRow.style.fontSize).toBe("14px");
    expect(windowRow.style.borderBottomColor).toBe(await color(page, "var(--border)"));
    expect(await styleOf(page, WINDOW_ROW, "border-bottom-style")).toBe("dashed");
    const windowCells = await boxes(page, `${WINDOW_ROW}:nth-child(2) > *`);
    const fixedWindowWidth = WINDOW_COLUMNS.reduce((sum, value) => sum + value, 0);
    if (list.width >= fixedWindowWidth) {
      expect([windowCells[0].width, windowCells[1].width, windowCells[3].width]).toEqual(WINDOW_COLUMNS);
      expect(windowCells[2].width).toBeCloseTo(list.width - fixedWindowWidth, 1);
    } else {
      expect(windowCells[2].width).toBe(0);
      expect(windowCells[3].width).toBe(WINDOW_COLUMNS[2]);
    }
    expect(windowCells[3].x + windowCells[3].width).toBeCloseTo(list.x + list.width, 1);
    for (const index of [0, 1, 2, 3]) {
      expect(await truncation(page, `${WINDOW_ROW}:nth-child(2) > *`, index)).toEqual(["nowrap", "hidden", "ellipsis"]);
    }
    expect((await measure(page, `${WINDOW_ROW} [data-slot="anomaly-window-period"]`)).style.fontWeight).toBe("700");
    const score = await measure(page, `${WINDOW_ROW} [data-slot="anomaly-window-score"]`);
    expect(score.style.fontWeight).toBe("700");
    expect(score.style.textAlign).toBe("right");
    expect(score.style.color).toBe(await color(page, "var(--danger)"));
    expect((await box(page, WINDOW_ROW)).y).toBeCloseTo(list.y + 16 + 8, 1);

    expect(await texts(page, HEAT_HEADER)).toEqual(["편성·호차", ...Array.from({ length: 10 }, (_, index) => String(index))]);
    const headerLabel = await measure(page, HEAT_HEADER);
    expect(headerLabel.style.fontSize).toBe("11px");
    expect(headerLabel.style.fontWeight).toBe("600");
    expect(headerLabel.style.color).toBe(await color(page, "var(--muted-fg)"));
    expect(await texts(page, `${HEAT_ROW} [data-slot="car-heatmap-formation"]`)).toEqual(
      Array.from({ length: 21 }, (_, index) => String(401 + index)),
    );
    const formationLabel = await measure(page, `${HEAT_ROW} [data-slot="car-heatmap-formation"]`);
    expect(formationLabel.style.fontSize).toBe("12px");
    expect(formationLabel.style.fontWeight).toBe("700");
    const cellWidth = (HEATMAP_WIDTH - HEAT_LABEL_WIDTH - HEAT_GAP * 10) / 10;
    const cells = await boxes(page, HEAT_CELL);
    expect(cells).toHaveLength(210);
    const heatRows = await boxes(page, HEAT_ROW);
    heatRows.forEach((heatRow, index) => {
      expect(heatRow.height).toBeCloseTo(HEAT_CELL_HEIGHT, 1);
      if (index > 0) expect(heatRow.y).toBeCloseTo(heatRows[index - 1].y + HEAT_CELL_HEIGHT + 4, 1);
    });
    cells.slice(0, 10).forEach((cell, column) => {
      expect(cell.width).toBeCloseTo(cellWidth, 1);
      expect(cell.height).toBeCloseTo(HEAT_CELL_HEIGHT, 1);
      expect(cell.x).toBeCloseTo(heatmap.x + HEAT_LABEL_WIDTH + HEAT_GAP + column * (cellWidth + HEAT_GAP), 1);
    });
    const expectedValues = Array.from({ length: 21 }, (_, row) =>
      Array.from({ length: 10 }, (_, column) => (hotCars(401 + row).includes(column) ? "1" : "")),
    ).flat();
    expect(await texts(page, HEAT_CELL)).toEqual(expectedValues);
    const danger = await color(page, "var(--danger)");
    const muted = await color(page, "var(--muted)");
    expect(
      await page.locator(HEAT_CELL).evaluateAll((heatCells) => heatCells.map((cell) => getComputedStyle(cell).backgroundColor)),
    ).toEqual(expectedValues.map((value) => (value === "1" ? danger : muted)));
    const hotCell = await measure(page, HEAT_CELL, 0);
    expect(hotCell.style.borderTopLeftRadius).toBe("4px");
    expect(hotCell.style.fontSize).toBe("11px");
    expect(hotCell.style.fontWeight).toBe("700");
    expect(hotCell.style.color).toBe(await color(page, "var(--on-primary)"));
    expect(await styleOf(page, HEAT_CELL, "cursor")).toBe("default");

    const footerButtons = `${DETAIL} [data-slot="dialog-footer"] [data-slot="action-button"]`;
    expect(await texts(page, footerButtons)).toEqual(["닫기"]);
    await expectButton(page, footerButtons, { height: 32, paddingX: 16, weight: "600", background: "var(--primary)", text: "var(--on-primary)" });
    const close = await box(page, footerButtons);
    expect(close.x + close.width).toBeCloseTo(header.x + contentWidth, 1);
  });
}

test("추론 상세에서 진행 중 Job과 결과 Row를 만든 Job의 값 확인(이상이 없는 Row 포함)", async ({ page }) => {
  await openInference(page);
  await openJobDetail(page, 2);
  await expect(page.locator(`${DETAIL} [data-slot="dialog-title"]`)).toHaveText("추론 상세 · MICOM_AIRPURIFIER");
  expect(await texts(page, KV_VALUE)).toEqual([
    "inf-2002",
    "추론 중",
    "2026-09-23 15:21:00 · –",
    "MICOM_AIRPURIFIER",
    "PCA Reconstruction",
    "412",
    "2026-09-22 00:00 ~ 2026-09-23 06:00",
    "60",
    "2 건 생성",
  ]);
  await page.keyboard.press("Escape");
  await expect(page.locator(DETAIL)).toHaveCount(0);

  await openRowDetail(page, 0);
  await expect(page.locator(`${DETAIL} [data-slot="dialog-title"]`)).toHaveText("추론 상세 · BMS");
  expect(await texts(page, KV_VALUE)).toEqual([
    "inf-1999",
    "성공",
    "2026-09-23 12:38:00 · 12:57:00",
    "BMS",
    "Tabular VAE",
    "412",
    "2026-09-22 00:00 ~ 2026-09-23 06:00",
    "60",
    "1 건 생성",
  ]);
  expect(await page.locator(SEGMENT_ROW).evaluateAll((segmentRows) => segmentRows.map((segmentRow) => segmentRow.textContent))).toEqual([
    "default240229.2%0.0430",
    "unit_a12054.2%0.0415",
  ]);
  const rateCell = `${SEGMENT_ROW} td:nth-child(4)`;
  expect((await measure(page, rateCell, 0)).style.color).toBe(await color(page, "var(--on-caution-subtle)"));
  await expect(page.locator(ROW).nth(0)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator(DETAIL)).toHaveCount(0);

  await openRowDetail(page, 1);
  await expect(page.locator(`${DETAIL} [data-slot="dialog-title"]`)).toHaveText("추론 상세 · PISC");
  await expect(page.locator(KV_VALUE).nth(8)).toHaveText("0 건 생성");
  expect(await page.locator(SEGMENT_ROW).evaluateAll((segmentRows) => segmentRows.map((segmentRow) => segmentRow.textContent))).toEqual([
    "default21000.0%0.5200",
    "unit_a12000.0%0.0415",
  ]);
  expect((await measure(page, rateCell, 0)).style.color).toBe(await color(page, "var(--muted-fg)"));
  expect((await measure(page, rateCell, 1)).style.color).toBe(await color(page, "var(--muted-fg)"));
});

test("추론 상세(실패)의 크기, 배치, Text, Color 확인, 실패 띠, JOB, 요청 조건, 바닥 Button 셋", async ({ page }) => {
  await openInference(page);
  await openJobDetail(page, 0, true);
  const banner = await box(page, BANNER);
  const jobPanelHeight = 2 + SECTION_PADDING_Y * 2 + 13 + EYEBROW_GAP + KEY_VALUE_HEIGHT * 6;
  const { header, contentWidth } = await expectModalFrame(page, "inference-detail", {
    width: FAILED_WIDTH,
    height: frameHeight(banner.height + 14 + jobPanelHeight),
    title: "추론 상세 · inf-2006 · 실패",
  });
  expect(banner.x).toBeCloseTo(header.x, 1);
  expect(banner.y).toBeCloseTo(header.y + 36 + 14, 1);
  expect(banner.width).toBeCloseTo(contentWidth, 1);
  await expect(page.locator(BANNER)).toHaveText(FAILURE_COOLER);
  await expect(page.locator(BANNER)).toHaveAttribute("role", "alert");
  const bannerStyle = (await measure(page, BANNER)).style;
  expect(bannerStyle.paddingTop).toBe("12px");
  expect(bannerStyle.paddingLeft).toBe("16px");
  expect(bannerStyle.borderTopLeftRadius).toBe("8px");
  expect(bannerStyle.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect(bannerStyle.color).toBe(await color(page, "var(--on-danger-subtle)"));
  expect(bannerStyle.fontSize).toBe("14px");
  expect(bannerStyle.lineHeight).toBe("20px");
  expect(bannerStyle.fontWeight).toBe("400");
  expect(bannerStyle.columnGap).toBe("10px");
  expect(await styleOf(page, BANNER, "align-items")).toBe("flex-start");
  expect((await box(page, `${BANNER} svg`)).width).toBe(18);
  expect(await shownIconShape(page, BANNER)).toBe(iconShape("WarningAmber"));
  const panels = await boxes(page, FAILED_PANEL);
  expect(panels).toHaveLength(2);
  const panelWidth = (contentWidth - 14) / 2;
  expect(panels[0].width).toBeCloseTo(panelWidth, 1);
  expect(panels[1].x).toBeCloseTo(panels[0].x + panelWidth + 14, 1);
  expect(panels[0].y).toBeCloseTo(banner.y + banner.height + 14, 1);
  expect(panels[1].y).toBeCloseTo(panels[0].y, 1);
  expect(panels[0].height).toBeCloseTo(jobPanelHeight, 1);
  expect(panels[1].height).toBeCloseTo(2 + SECTION_PADDING_Y * 2 + 16 + EYEBROW_GAP + KEY_VALUE_HEIGHT * 4 + 12 + 17, 1);
  await expectSection(page, FAILED_PANEL, 0);
  await expectSection(page, FAILED_PANEL, 1);
  expect(await texts(page, EYEBROW)).toEqual(["JOB", "요청 조건"]);
  expect(await texts(page, KV_LABEL)).toEqual(["Job ID", "상태", "생성 · 종료", "장치", "편성", "추론 기간", "모델", "세그먼트", "윈도우(초)", "학습본"]);
  expect(await texts(page, KV_VALUE)).toEqual([
    "inf-2006",
    "실패",
    "2026-09-23 17:02 · 17:03",
    "MICOM_COOLER",
    "409",
    "2026-09-22 ~ 2026-09-23",
    "Tabular VAE",
    "default · unit_a",
    "60",
    "운영 · 20260920T111321",
  ]);
  const note = await measure(page, `${DETAIL} [data-slot="inference-detail-note"]`);
  await expect(page.locator(`${DETAIL} [data-slot="inference-detail-note"]`)).toHaveText(
    "같은 조건으로 재시도하거나, 기간을 바꿔 추론 실행에서 새로 요청하세요",
  );
  expect(note.style.fontSize).toBe("12px");
  expect(note.style.paddingTop).toBe("12px");
  expect(note.style.color).toBe(await color(page, "var(--muted-fg)"));
  const footerButtons = `${DETAIL} [data-slot="dialog-footer"] [data-slot="action-button"]`;
  expect(await texts(page, footerButtons)).toEqual(["추론 실행으로 이동", "닫기", "재시도"]);
  const outline = { height: 32, paddingX: 16, weight: "600", background: "var(--card)", text: "var(--fg)", border: "var(--border)" };
  await expectButton(page, footerButtons, outline, 0);
  await expectButton(page, footerButtons, outline, 1);
  await expectButton(page, footerButtons, { height: 32, paddingX: 16, weight: "600", background: "var(--primary)", text: "var(--on-primary)" }, 2);
  const footerBoxes = await boxes(page, footerButtons);
  expect(footerBoxes[0].x).toBeCloseTo(header.x, 1);
  expect(footerBoxes[2].x + footerBoxes[2].width).toBeCloseTo(header.x + contentWidth, 1);
  expect(footerBoxes[2].x).toBeCloseTo(footerBoxes[1].x + footerBoxes[1].width + 8, 1);
  expect(await shownIconShape(page, footerButtons, 2)).toBe(iconShape("Refresh"));
  await page.keyboard.press("Escape");
  await expect(page.locator(DETAIL)).toHaveCount(0);

  await openJobDetail(page, 1, true);
  await expect(page.locator(`${DETAIL} [data-slot="dialog-title"]`)).toHaveText("추론 상세 · inf-2005 · 실패");
  await expect(page.locator(BANNER)).toHaveText(FAILURE_ESW);
  expect((await texts(page, KV_VALUE)).slice(0, 6)).toEqual([
    "inf-2005",
    "실패",
    "2026-09-22 18:40 · 18:41",
    "ESW",
    "–",
    "2026-09-22 ~ 2026-09-23",
  ]);
  await expect(page.locator(KV_VALUE).nth(6)).toHaveText("Isolation Forest");
});

test("추론 상세(실패)에서 재시도하면 닫히고 같은 조건의 새 Job이 맨 앞에 표시되며 실패한 Job은 남고 새 번호로 알림이 표시됨", async ({
  page,
}) => {
  await openInference(page);
  await openJobDetail(page, 0, true);
  await footerButton(page, DETAIL, "재시도").click();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("inf-2043 재시도 요청 — 원래 조건으로 다시 요청했습니다.");
  await expect(page.locator(`${JOB} [data-slot="job-card-title"]`)).toHaveText(["MICOM_COOLER · VAE", "ESW · IF"]);
  await failedOnlySwitch(page).click();
  await expect(page.locator(`${JOB} [data-slot="job-card-title"]`).nth(0)).toHaveText("MICOM_COOLER · VAE");
  await expect(page.locator(`${JOB} [data-slot="state-pill"]`).nth(0)).toHaveText("추론 중");
  await expect(page.locator(`${JOB} [data-slot="job-card-progress"]`).nth(0)).toHaveText("3%");
  await expect(page.locator(`${JOB} [data-slot="job-card-meta"]`).nth(0)).toHaveText("09-23 12:00 · 재시도");
  await openJobDetail(page, 0);
  expect((await texts(page, KV_VALUE)).slice(0, 7)).toEqual([
    "inf-2043",
    "추론 중",
    "2026-09-23 12:00:00 · –",
    "MICOM_COOLER",
    "Tabular VAE",
    "409",
    "2026-09-22 00:00 ~ 2026-09-23 06:00",
  ]);
});

test("추론 상세(실패)에서 추론 실행으로 이동을 Click하면 상세가 닫히고 추론 실행이 처음 값으로 열림", async ({ page }) => {
  await openInference(page);
  await openJobDetail(page, 1, true);
  await footerButton(page, DETAIL, "추론 실행으로 이동").click();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(RUN)).toBeVisible();
  await expect(page.locator(`${RUN} [data-slot="dialog-title"]`)).toHaveText("추론 실행");
  await expect(page.locator(DATE_TRIGGER)).toHaveText("2026-09-22 ~ 2026-09-23");
  await expect(page.locator(`${DEVICES} [data-slot="job-request-device-count"]`)).toHaveText("0 / 21");
  await expect.poll(() => focusIsInside(page, RUN)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator(RUN)).toHaveCount(0);
});

test("편성 × 호차의 Cell에 Mouse를 올렸을 때만 Tooltip이 Cursor를 따라가고 그 Cell의 Border는 연한 회색임", async ({ page }) => {
  await openInference(page);
  await openJobDetail(page, 0);
  await page.mouse.move(5, 5);
  await expect(page.locator(TOOLTIP)).toHaveCount(0);
  const cell = await box(page, HEAT_CELL, 0);
  const pointer = { x: cell.x + cell.width / 2 - 6, y: cell.y + cell.height / 2 };
  await page.mouse.move(pointer.x, pointer.y);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  expect(await tooltipLines(page)).toEqual(["편성 401 · 0호차", "이상 window 1"]);
  const bubble = await measure(page, TOOLTIP);
  expect(bubble.style.backgroundColor).toBe(await color(page, "var(--fg)"));
  expect(bubble.style.color).toBe(await color(page, "var(--card)"));
  expect(bubble.style.fontSize).toBe("12px");
  expect(bubble.style.lineHeight).toBe("16px");
  expect(bubble.style.fontWeight).toBe("600");
  expect(bubble.style.borderTopLeftRadius).toBe("6px");
  expect(bubble.style.paddingTop).toBe("6px");
  expect(bubble.style.paddingLeft).toBe("10px");
  expect(visibleShadow(bubble.style.boxShadow)).toBe("rgba(0, 0, 0, 0.2) 0px 4px 12px 0px");
  expect(bubble.height).toBeCloseTo(6 + 16 * 2 + 6, 1);
  expect(
    await page.locator(TOOLTIP).evaluate((popup) => [...popup.children].filter((child) => getComputedStyle(child).display !== "none").length),
  ).toBe(2);
  await expect.poll(async () => (await box(page, TOOLTIP)).y + (await box(page, TOOLTIP)).height).toBeCloseTo(pointer.y - 12, 0);
  const placed = await box(page, TOOLTIP);
  expect(placed.x + placed.width / 2).toBeCloseTo(pointer.x, 0);
  await page.mouse.move(pointer.x + 10, pointer.y);
  await expect.poll(async () => (await box(page, TOOLTIP)).x).toBeCloseTo(placed.x + 10, 0);
  await page.waitForTimeout(300);
  expect(visibleShadow(await styleOf(page, HEAT_CELL, "box-shadow", 0))).toBe(`${await color(page, "var(--muted)")} 0px 0px 0px 2px`);
  expect(visibleShadow(await styleOf(page, HEAT_CELL, "box-shadow", 1))).toBe("none");
  const other = await box(page, HEAT_CELL, 15);
  await page.mouse.move(other.x + other.width / 2, other.y + other.height / 2);
  await expect.poll(() => tooltipLines(page)).toEqual(["편성 402 · 5호차", "이상 window 0"]);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  await page.mouse.move(5, 5);
  await expect(page.locator(TOOLTIP)).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(visibleShadow(await styleOf(page, HEAT_CELL, "box-shadow", 15))).toBe("none");
});

test("Modal은 닫기 Button, 취소, 닫기, Esc로 닫히고 바깥을 Click해도 그대로이며 Focus가 Modal 안에 갇혔다가 연 위치로 돌아옴", async ({
  page,
}) => {
  await openInference(page);
  await openRun(page);
  await expect(page.locator(RUN)).toHaveAttribute("role", "dialog");
  expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("닫기");
  for (let step = 0; step < 30; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, RUN)).toBe(true);
  }
  for (let step = 0; step < 4; step += 1) {
    await pressTab(page, "Shift+Tab");
    expect(await focusIsInside(page, RUN)).toBe(true);
  }
  await page.mouse.click(10, 1070);
  await page.waitForTimeout(200);
  await expect(page.locator(RUN)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(RUN)).toHaveCount(0);
  await expect(runButton(page)).toBeFocused();
  await openRun(page);
  await footerButton(page, RUN, "취소").click();
  await expect(page.locator(RUN)).toHaveCount(0);
  await openRun(page);
  await page.locator(`${RUN} [data-slot="dialog-close"]`).click();
  await expect(page.locator(RUN)).toHaveCount(0);
  await expect(runButton(page)).toBeFocused();

  await openJobDetail(page, 1);
  await expect.poll(() => focusIsInside(page, DETAIL)).toBe(true);
  for (let step = 0; step < 3; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, DETAIL)).toBe(true);
  }
  await page.mouse.click(10, 1070);
  await page.waitForTimeout(200);
  await expect(page.locator(DETAIL)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB).nth(1)).toBeFocused();
  await openJobDetail(page, 1);
  await footerButton(page, DETAIL, "닫기").click();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB).nth(1)).toBeFocused();
  await openJobDetail(page, 1);
  await page.locator(`${DETAIL} [data-slot="dialog-close"]`).click();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB).nth(1)).toBeFocused();

  await page.locator(ROW).nth(4).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(DETAIL)).toBeVisible();
  await expect(page.locator(`${DETAIL} [data-slot="dialog-title"]`)).toHaveText("추론 상세 · FRU");
  await page.keyboard.press("Escape");
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(ROW).nth(4)).toBeFocused();

  await openJobDetail(page, 0, true);
  await expect.poll(() => focusIsInside(page, DETAIL)).toBe(true);
  for (let step = 0; step < 5; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, DETAIL)).toBe(true);
  }
  await footerButton(page, DETAIL, "닫기").click();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB).nth(0)).toBeFocused();
});

test("다크 Theme에서 Modal의 Color 확인", async ({ page }) => {
  await openInference(page);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator("html")).toHaveClass(/dark/);

  await openRun(page);
  expect((await measure(page, RUN)).style.backgroundColor).toBe(await color(page, "var(--dialog)"));
  await expectSection(page, FIELDS);
  await expectSection(page, DEVICES);
  expect((await measure(page, DATE_TRIGGER)).style.backgroundColor).toBe(await color(page, "var(--card)"));
  await page.keyboard.press("Escape");
  await expect(page.locator(RUN)).toHaveCount(0);

  await openJobDetail(page, 0);
  expect((await measure(page, DETAIL)).style.backgroundColor).toBe(await color(page, "var(--dialog)"));
  await expectSection(page, JOB_PANEL);
  await expectSection(page, RESULTS_PANEL);
  expect((await measure(page, SEGMENT_TABLE)).style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect((await measure(page, `${RESULTS_PANEL} thead [data-slot="table-row"]`)).style.backgroundColor).toBe(
    await color(page, "var(--muted)"),
  );
  expect((await measure(page, `${SEGMENT_ROW} td:nth-child(4)`, 0)).style.color).toBe(await color(page, "var(--danger)"));
  expect((await measure(page, `${SEGMENT_ROW} td:nth-child(4)`, 1)).style.color).toBe(
    await color(page, "var(--on-warning-subtle)"),
  );
  expect((await measure(page, `${WINDOW_ROW} [data-slot="anomaly-window-score"]`)).style.color).toBe(
    await color(page, "var(--danger)"),
  );
  expect((await measure(page, HEAT_CELL, 0)).style.backgroundColor).toBe(await color(page, "var(--danger)"));
  expect((await measure(page, HEAT_CELL, 1)).style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect((await measure(page, HEAT_CELL, 0)).style.color).toBe(await color(page, "var(--on-primary)"));
  expect((await measure(page, HEAT_HEADER)).style.color).toBe(await color(page, "var(--muted-fg)"));
  const cell = await box(page, HEAT_CELL, 0);
  await page.mouse.move(cell.x + cell.width / 2, cell.y + cell.height / 2);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  const bubble = await measure(page, TOOLTIP);
  expect(bubble.style.backgroundColor).toBe(await color(page, "var(--fg)"));
  expect(bubble.style.color).toBe(await color(page, "var(--card)"));
  await page.mouse.move(5, 5);
  await page.keyboard.press("Escape");
  await expect(page.locator(DETAIL)).toHaveCount(0);

  await openJobDetail(page, 0, true);
  const banner = (await measure(page, BANNER)).style;
  expect(banner.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect(banner.color).toBe(await color(page, "var(--on-danger-subtle)"));
  await expectSection(page, FAILED_PANEL, 0);
  await expectSection(page, FAILED_PANEL, 1);
  const footerButtons = `${DETAIL} [data-slot="dialog-footer"] [data-slot="action-button"]`;
  expect((await measure(page, footerButtons, 0)).style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect((await measure(page, footerButtons, 2)).style.backgroundColor).toBe(await color(page, "var(--primary)"));
});

test("기본 Font 크기를 2배로 하면 Modal의 크기도 2배가 됨", async ({ page }) => {
  await openInference(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page.waitForTimeout(400);
  const maxWidth = 1920 - 128;
  const maxHeight = 1080 - 128;

  await openRun(page);
  await page.waitForTimeout(400);
  const runFrame = await box(page, RUN);
  expect([runFrame.width, runFrame.height]).toEqual([maxWidth, maxHeight]);
  expect((await box(page, DATE_TRIGGER)).width).toBe(612);
  await page.keyboard.press("Escape");
  await expect(page.locator(RUN)).toHaveCount(0);

  await page.locator(JOB).nth(0).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(HEATMAP)).toBeVisible();
  await page.waitForTimeout(400);
  const frame = await box(page, DETAIL);
  expect([frame.width, frame.height]).toEqual([maxWidth, maxHeight]);
  const frameStyle = (await measure(page, DETAIL)).style;
  expect(frameStyle.paddingTop).toBe("32px");
  expect(frameStyle.borderTopWidth).toBe("2px");
  expect((await box(page, JOB_PANEL)).width).toBe(JOB_PANEL_WIDTH * 2);
  expect((await box(page, `${DETAIL} [data-slot="key-value-row"]`)).height).toBe(KEY_VALUE_HEIGHT * 2);
  expect((await box(page, `${RESULTS_PANEL} thead [data-slot="table-row"]`)).height).toBe(88);
  expect((await box(page, SEGMENT_ROW)).height).toBe(96);
  expect((await box(page, WINDOW_ROW)).height).toBe(88);
  expect((await box(page, HEATMAP)).width).toBe(HEATMAP_WIDTH * 2);
  expect((await box(page, HEAT_CELL)).height).toBe(HEAT_CELL_HEIGHT * 2);
  expect((await measure(page, HEAT_CELL)).style.borderTopLeftRadius).toBe("8px");
  expect((await measure(page, EYEBROW)).style.fontSize).toBe("22px");
  const cell = await box(page, HEAT_CELL, 0);
  const pointer = { x: cell.x + cell.width / 2, y: cell.y + cell.height / 2 };
  await page.mouse.move(pointer.x, pointer.y);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  const bubble = await measure(page, TOOLTIP);
  expect(bubble.style.fontSize).toBe("24px");
  expect(bubble.style.paddingLeft).toBe("20px");
  await expect.poll(async () => (await box(page, TOOLTIP)).y + (await box(page, TOOLTIP)).height).toBeCloseTo(pointer.y - 24, 0);
  await page.mouse.move(5, 5);
  await page.keyboard.press("Escape");
  await expect(page.locator(DETAIL)).toHaveCount(0);

  await openJobDetail(page, 0, true);
  await page.waitForTimeout(400);
  expect((await box(page, DETAIL)).width).toBe(maxWidth);
  expect((await measure(page, BANNER)).style.paddingLeft).toBe("32px");
  expect((await box(page, `${BANNER} svg`)).width).toBe(36);
});

test("움직임 줄이기를 켜면 Modal은 Fade만 적용되고 Tooltip은 크기와 위치 변화 없이 Fade만 적용됨", async ({ page }) => {
  await openInference(page);
  await openRun(page);
  expect(await enterMotion(page, RUN)).toEqual(["enter", "0.1s", "1", "0"]);
  await page.keyboard.press("Escape");
  await expect(page.locator(RUN)).toHaveCount(0);
  await openJobDetail(page, 0);
  expect(await enterMotion(page, DETAIL)).toEqual(["enter", "0.1s", "1", "0"]);
  const cell = await box(page, HEAT_CELL, 0);
  await page.mouse.move(cell.x + cell.width / 2, cell.y + cell.height / 2);
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  const [name, , scale, opacity] = await enterMotion(page, TOOLTIP);
  expect([name, scale, opacity]).toEqual(["enter", "1", "0"]);
  expect((await enterTranslate(page, TOOLTIP))[1]).toMatch(/^(0|0px|0rem|calc\(0\*100%\))$/);
});

test.describe("움직임 줄이기를 끈 화면", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("Tooltip은 기본 동작대로 0.95 크기에서 아래에서 나타나고 Cell의 Border는 0.1초임", async ({ page }) => {
    await openInference(page);
    await page.locator(JOB).nth(0).click();
    await expect(page.locator(HEATMAP)).toBeVisible();
    await page.waitForTimeout(400);
    const cell = await box(page, HEAT_CELL, 0);
    await page.mouse.move(cell.x + cell.width / 2, cell.y + cell.height / 2);
    await expect(page.locator(TOOLTIP)).toHaveCount(1);
    const [name, , scale, opacity] = await enterMotion(page, TOOLTIP);
    expect([name, scale, opacity]).toEqual(["enter", ".95", "0"]);
    const [, translateY] = await enterTranslate(page, TOOLTIP);
    expect(translateY).not.toMatch(/^(0|0px|0rem|calc\(0\*100%\))?$/);
    expect(translateY).not.toContain("-");
    expect(await styleOf(page, HEAT_CELL, "transition-duration")).toBe("0.1s");
    expect(await styleOf(page, HEAT_CELL, "transition-property")).toBe("box-shadow");
  });
});

const SCALE_SCENES: { name: string; modalSlots: number; open: (page: Page) => Promise<void> }[] = [
  {
    name: "추론 실행",
    modalSlots: 60,
    open: async (page) => {
      await runButton(page).focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(RUN)).toBeVisible();
    },
  },
  {
    name: "추론 상세(성공 · 히트맵)",
    modalSlots: 280,
    open: async (page) => {
      await page.locator(JOB).nth(0).focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(HEATMAP)).toBeVisible();
    },
  },
  {
    name: "추론 상세(실패)",
    modalSlots: 30,
    open: async (page) => {
      await failedOnlySwitch(page).focus();
      await page.keyboard.press("Space");
      await expect(page.locator(JOB)).toHaveCount(2);
      await page.locator(JOB).nth(0).focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(BANNER)).toBeVisible();
    },
  },
];

for (const scene of SCALE_SCENES) {
  test(`3840×2160 화면의 Modal은 1920×1080 화면의 2배 (${scene.name})`, async ({ page }) => {
    const openScene = async (width: number, height: number) => {
      await openInference(page, width, height);
      await expect(page.locator('[data-slot="session-chip-remaining"]')).not.toHaveText("--:--");
      await page.mouse.move(0, 0);
      await scene.open(page);
      await page.waitForTimeout(600);
      await expect(page.locator(TOOLTIP)).toHaveCount(0);
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

test("계산 함수는 Job 요청 폼(추론 실행과 학습 예약이 같이 씀)의 처음 값, 보낼 수 없는 이유의 순서, 바뀐 Input, 넘길 값을 계산함", () => {
  expect(createTrainingScheduleDraft).toBe(createJobRequestDraft);
  expect(findTrainingScheduleProblem).toBe(findJobRequestProblem);
  expect(trainingScheduleProblemField).toBe(jobRequestProblemField);
  expect(toTrainingScheduleInput).toBe(toJobRequestInput);
  const options = {
    defaultPeriod: { from: "2026-09-22", to: "2026-09-23" },
    selectablePeriod: { from: null, to: null },
    defaultStartTime: "00:00:00",
    defaultEndTime: "23:59:59",
    modelCodes: ["IF", "SVM", "VAE", "PCA"],
    defaultModelCode: null,
    formations: ["401", "402"],
    defaultFormation: null,
    defaultDeviceCodes: ["ATC", "FRU"],
    unavailableDeviceCodes: ["FRU", "IDBC"],
  };
  const draft = createJobRequestDraft(options);
  expect(draft).toEqual({
    period: { from: "2026-09-22", to: "2026-09-23" },
    startTime: "00:00:00",
    endTime: "23:59:59",
    modelCode: null,
    formation: null,
    deviceCodes: ["ATC"],
  });
  expect(findJobRequestProblem(draft)).toBe("missingModel");
  const withModel = { ...draft, modelCode: "VAE" };
  expect(findJobRequestProblem({ ...withModel, period: { from: "2026-09-22", to: null } })).toBe("missingPeriod");
  expect(findJobRequestProblem({ ...withModel, period: { from: "2026-09-23", to: "2026-09-22" } })).toBe("reversedPeriod");
  expect(findJobRequestProblem({ ...withModel, deviceCodes: [] })).toBe("missingDevices");
  expect(findJobRequestProblem(withModel)).toBeNull();
  expect(["missingModel", "missingPeriod", "reversedPeriod", "missingDevices"].map((problem) => jobRequestProblemField(problem as never))).toEqual([
    "model",
    "period",
    "period",
    "devices",
  ]);
  expect(hasJobRequestFieldChanged("model", draft, withModel)).toBe(true);
  expect(hasJobRequestFieldChanged("period", draft, withModel)).toBe(false);
  expect(hasJobRequestFieldChanged("devices", draft, { ...draft, deviceCodes: ["ECU"] })).toBe(true);
  expect(toJobRequestInput({ ...withModel, startTime: " 09:30 ", endTime: "  " })).toEqual({
    modelCode: "VAE",
    deviceCodes: ["ATC"],
    formation: null,
    period: { from: "2026-09-22", to: "2026-09-23" },
    startTime: "09:30:00",
    endTime: null,
  });
  expect(toJobRequestInput(draft)).toBeNull();
});

test("계산 함수에서 재학습 설정의 학습 예약에 쓰는 변경 Input 판정도 재학습 설정용 이름으로 같은 공용 함수를 가리킴", () => {
  expect(hasTrainingScheduleFieldChanged).toBe(hasJobRequestFieldChanged);
});

test("Mock 조회 함수는 추론 실행 선택지와 Job 상세(성공, 진행 중, 실패, 결과 Row를 만든 Job, 없는 Job)를 반환함", async () => {
  const day = (daysAgo: number) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - daysAgo);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const today = day(0);
  const yesterday = day(1);
  const runOptions = await fetchInferenceRunOptions();
  expect(runOptions.defaultPeriod).toEqual({ from: yesterday, to: today });
  expect(runOptions.unavailableDeviceCodes).toEqual(["FRU", "IDBC"]);

  const succeeded = await fetchInferenceJobDetail("inf-2000");
  expect([succeeded.status, succeeded.deviceCode, succeeded.modelCode, succeeded.formation, succeeded.createdAt]).toEqual([
    "succeeded",
    "TRACTION_MOTOR",
    "SVM",
    "410",
    `${today}T13:11:00`,
  ]);
  expect(succeeded.requestedPeriod).toEqual({ from: yesterday, to: today });
  expect([succeeded.requestedStartTime, succeeded.requestedEndTime, succeeded.windowSeconds]).toEqual(["00:00:00", "06:00:00", 60]);
  expect(succeeded.segments).toEqual(["default", "unit_a"]);
  expect(succeeded.trainedModel).toEqual({ stage: "production", version: `${day(3).replaceAll("-", "")}T111321` });
  if (succeeded.status === "failed") throw new Error("성공 작업이 실패로 옴");
  expect(succeeded.endedAt).toBe(`${today}T13:30:00`);
  expect(succeeded.autoAlarmCount).toBe(2);
  expect(succeeded.segmentResults).toEqual([
    { segment: "default", windowCount: 180, anomalyWindowCount: 61, threshold: 0.043, anomalyRateLevel: "danger" },
    { segment: "unit_a", windowCount: 120, anomalyWindowCount: 14, threshold: 0.0415, anomalyRateLevel: "warning" },
  ]);
  expect(succeeded.anomalyWindows).toHaveLength(6);
  expect(succeeded.anomalyWindows[0]).toEqual({
    startAt: `${yesterday}T14:04:00`,
    endAt: `${yesterday}T14:05:00`,
    segment: "default",
    formation: "401",
    car: 1,
    score: 0.6,
  });
  expect(succeeded.carHeatmap.formations).toHaveLength(21);
  expect(succeeded.carHeatmap.cars).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(succeeded.carHeatmap.counts.map((row) => row.reduce((sum, count) => sum + count, 0))).toEqual([
    2, 1, 2, 1, ...Array.from({ length: 17 }, () => 1),
  ]);

  const running = await fetchInferenceJobDetail("inf-2002");
  expect(running.status === "running" ? running.endedAt : "아님").toBeNull();

  const failed = await fetchInferenceJobDetail("inf-2006");
  expect(failed.status === "failed" ? [failed.endedAt, failed.failureMessage] : null).toEqual([
    `${today}T17:03:00`,
    `추론 실패 — 편성 409의 ${yesterday} ~ ${today.slice(5)} 구간 센서 데이터 중 62%가 비어 있어 window를 만들 수 없습니다. 기간을 바꾸거나 수집 상태를 확인한 뒤 다시 시도하세요.`,
  ]);
  const noFormation = await fetchInferenceJobDetail("inf-2005");
  expect([noFormation.status, noFormation.formation]).toEqual(["failed", null]);

  const results = await fetchInferenceResults({ modelCode: null, deviceCode: null, period: { from: null, to: null }, page: 1 });
  expect(new Set(results.rows.map((row) => row.jobId)).size).toBe(results.rows.length);
  const first = results.rows[0];
  const fromRow = await fetchInferenceJobDetail(first.jobId);
  expect([fromRow.id, fromRow.deviceCode, fromRow.modelCode, fromRow.formation, fromRow.createdAt]).toEqual([
    first.jobId,
    "BMS",
    "VAE",
    "412",
    first.inferredAt,
  ]);
  if (fromRow.status === "failed") throw new Error("결과 줄의 작업이 실패로 옴");
  expect(fromRow.segmentResults.map((result) => [result.windowCount, result.anomalyWindowCount, result.threshold])).toEqual([
    [240, 22, 0.043],
    [120, 5, 0.0415],
  ]);
  expect(fromRow.autoAlarmCount).toBe(1);

  await expect(fetchInferenceJobDetail("inf-0000")).rejects.toThrow("추론 작업이 없습니다: inf-0000");
});
