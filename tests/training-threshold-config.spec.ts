import { expect, test, type Page } from "@playwright/test";
import { modelConfigParamTypes } from "../src/domain/labels/modelConfigParamType";
import {
  addModelConfigRow,
  changeModelConfigModel,
  createModelConfigDraft,
  createNewModelConfigDraft,
  findModelConfigParamProblem,
  findModelConfigProblems,
  hasModelConfigProblem,
  isModelConfigDraftChanged,
  removeModelConfigRow,
  toModelConfigInput,
  type ModelConfigInput,
} from "../src/domain/modelConfig";
import {
  fetchModelConfigOptions,
  fetchModelConfigProfile,
  saveModelConfig,
} from "../src/services/modelConfigs";
import { color, measure } from "./helpers/measure";
import { requestedActions, setMockActions } from "./helpers/mockActions";
import {
  box,
  boxes,
  collectSlotRects,
  confirmDialog,
  doubledMismatches,
  enterMotion,
  expectModalFrame,
  expectSection,
  expectSentenceLines,
  focusIsInside,
  footerButton,
  iconShape,
  modal,
  pressTab,
  shownIconShape,
  styleOf,
  texts,
} from "./helpers/modal";
import { TRAINING_RESULT_ROW, openTraining } from "./helpers/training";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const ROW = TRAINING_RESULT_ROW;
const TOAST = '[data-slot="toast"]:not([data-ending-style])';
const RESULT_DETAIL = modal("training-result-detail");
const CONFIG = modal("model-config");
const UNSAVED = confirmDialog("model-config-unsaved");
const FIELDS = `${CONFIG} [data-slot="model-config-fields"]`;
const ROWS_PANEL = `${CONFIG} [data-slot="model-config-rows"]`;
const FORM_ROW = `${FIELDS} [data-slot="form-row"]`;
const PARAMS = `${CONFIG} [data-slot="model-config-row-list"][data-list="params"]`;
const WEIGHTS = `${CONFIG} [data-slot="model-config-row-list"][data-list="sensorWeights"]`;
const PARAM_ROW = `${PARAMS} [data-slot="model-config-row"]`;
const WEIGHT_ROW = `${WEIGHTS} [data-slot="model-config-row"]`;
const BANNER = `${CONFIG} [data-slot="alert-banner"]`;
const FIELD_ERROR = `${CONFIG} [data-slot="field-error"]`;
const SEGMENTED = `${FIELDS} [data-slot="segmented"]`;
const PAGE_ERROR = "재학습 설정을 불러오지 못했습니다.";

const FIGMA = {
  width: 1500,
  height: 900,
  panelWidth: 726,
  labelColumn: 110,
  labelGap: 16,
  controlWidth: 562,
  rowHeights: [40, 40, 54, 40, 54, 40, 40, 46, 40],
  rowGap: 10,
  shortInput: 160,
  paramParts: [200, 336, 96, 32],
  partGap: 8,
  bannerHeight: 44,
  warningHeight: 64,
  addHeight: 36,
};
const SHELL_BODY_TOP = 17 + 36 + 14;
const PANEL_TOP = SHELL_BODY_TOP + FIGMA.bannerHeight + 14;
const PANEL_HEIGHT = FIGMA.height - 17 * 2 - 36 - 14 * 2 - 32 - FIGMA.bannerHeight - 14;

const LOADED_BANNER =
  "재학습 결과(AXLE_BEARING · IF · default · 2026-09-23 09:12, 임계치 0.5277)에서 열었습니다. 같은 장치·모델·세그먼트 프로파일이 있어 그 설정을 불러왔습니다.";
const NEW_BANNER =
  "재학습 결과(AXLE_BEARING · SVM · default · 2026-09-22 10:12, 임계치 -1.2758)에서 열었습니다. 같은 장치·모델·세그먼트 프로파일이 없어 새 설정으로 채웠습니다.";
const WARNING_BANNER =
  "윈도우 · 학습 방식 · 센서 가중치는 저장·표시되지만 현재 재학습 파이프라인에는 반영되지 않습니다.\n실제 반영은 하이퍼파라미터와 임계 백분위뿐입니다.";
const IF_PRESET = [
  ["n_estimators", "200", "int"],
  ["max_samples", "256", "int"],
  ["contamination", "auto", "str"],
];
const SVM_PRESET = [
  ["nu", "0.05", "float"],
  ["kernel", "rbf", "str"],
  ["gamma", "scale", "str"],
];
const SEED_WEIGHTS = [
  ["압축기 흡입압력", "1.5", "float"],
  ["냉각수 유량", "0.8", "float"],
];

const field = (page: Page, label: string) =>
  page.locator(CONFIG).getByRole("textbox", { name: label, exact: true });

async function openThresholdFromRow(page: Page, index: number): Promise<void> {
  await page.locator(ROW).nth(index).getByRole("button", { name: "임계치 관리" }).click();
  await expect(page.locator(FIELDS)).toBeVisible();
}

async function openThresholdFromDetail(page: Page, index: number): Promise<void> {
  await page.locator(ROW).nth(index).click();
  await expect(page.locator(RESULT_DETAIL)).toBeVisible();
  await footerButton(page, RESULT_DETAIL, "임계치 관리 (모델 커스텀)").click();
  await expect(page.locator(RESULT_DETAIL)).toHaveCount(0);
  await expect(page.locator(FIELDS)).toBeVisible();
}

async function rowValues(page: Page, rowSelector: string): Promise<string[][]> {
  return page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)].map((row) => [
        ...[...row.querySelectorAll<HTMLInputElement>('input[data-slot="text-input"]')].map(
          (input) => input.value,
        ),
        row.querySelector('[data-slot="select-trigger"]')?.textContent?.trim() ?? "",
      ]),
    rowSelector,
  );
}

interface FormExpectation {
  name: string;
  device: string;
  model: string;
  segment: string;
  percentile: string;
  windowSeconds: string;
  method: string;
  use: "Y" | "N";
  description: string;
  params: string[][];
  weights: string[][];
}

async function expectForm(page: Page, expected: FormExpectation): Promise<void> {
  await expect(field(page, "설정 명")).toHaveValue(expected.name);
  await expect(page.locator(`${FIELDS} [data-slot="select-trigger"]`)).toHaveText(expected.device);
  await expect(page.locator(`${SEGMENTED} [aria-pressed="true"]`)).toHaveText([
    expected.model,
    expected.method,
  ]);
  await expect(field(page, "세그먼트")).toHaveValue(expected.segment);
  await expect(field(page, "임계 백분위")).toHaveValue(expected.percentile);
  await expect(field(page, "윈도우(초)")).toHaveValue(expected.windowSeconds);
  await expect(page.locator(FIELDS).getByRole("switch")).toHaveAttribute(
    "aria-checked",
    expected.use === "Y" ? "true" : "false",
  );
  await expect(page.locator(`${FIELDS} [data-slot="switch-control"]`)).toHaveText(
    expected.use === "Y" ? "Y · 다음 재학습에 자동 적용" : "N · 보관 (켜면 기존 Y는 N으로)",
  );
  await expect(field(page, "설명")).toHaveValue(expected.description);
  expect(await rowValues(page, PARAM_ROW)).toEqual(expected.params);
  expect(await rowValues(page, WEIGHT_ROW)).toEqual(expected.weights);
  await expect(page.locator(`${CONFIG} [data-slot="model-config-params-note"]`)).toHaveText(
    `${expected.model} · 저장 시 범위 검증`,
  );
}

const LOADED_FORM: FormExpectation = {
  name: "AXLE_BEARING IF 프로파일",
  device: "AXLE_BEARING",
  model: "IF",
  segment: "default",
  percentile: "99.9",
  windowSeconds: "60",
  method: "reservoir",
  use: "N",
  description: "민감도 조정본",
  params: IF_PRESET,
  weights: SEED_WEIGHTS,
};

async function setMockLatency(page: Page, value: Record<string, unknown>): Promise<void> {
  await page.evaluate((latency) => {
    (window as unknown as { cbmMockLatency: unknown }).cbmMockLatency = latency;
  }, value);
}

test("⚙로 열면 같은 장치, Model, Segment Profile을 불러와 Bar, Input, Row를 그 값으로 채움", async ({
  page,
}) => {
  await openTraining(page);
  await openThresholdFromRow(page, 0);
  await expect(page.locator(`${CONFIG} [data-slot="dialog-title"]`)).toHaveText(
    "모델 설정 수정 · 재학습 결과에서 열림",
  );
  await expect(page.locator(BANNER)).toHaveText([LOADED_BANNER, WARNING_BANNER]);
  await expectForm(page, LOADED_FORM);
  await expect(page.locator(`${FORM_ROW} [data-slot="field-label"]`)).toHaveText([
    "설정 명*",
    "장치*",
    "모델*",
    "세그먼트",
    "임계 백분위*",
    "윈도우(초)",
    "학습 방식",
    "사용 여부",
    "설명",
  ]);
  await expect(page.locator(`${CONFIG} [data-slot="field-hint"]`)).toHaveText([
    "모델을 바꾸면 하이퍼파라미터가 그 모델 프리셋으로 채워집니다",
    "90 – 100 · 낮출수록 민감 (알람 ↑)",
    "켜면 같은 장치·모델·세그먼트의 기존 Y 프로파일은 N으로 바뀝니다",
  ]);
  await expect(page.locator(`${CONFIG} [data-slot="state-pill"]`)).toHaveText([
    "학습 미반영",
    "학습 미반영",
    "학습 미반영",
  ]);
  await expect(page.locator(`${CONFIG} [data-slot="model-config-row-list-header"] h3`)).toHaveText([
    "하이퍼파라미터",
    "센서 가중치",
  ]);
  await expect(page.locator(`${CONFIG} [data-slot="add-row-button"]`)).toHaveText([
    "파라미터 추가",
    "가중치 추가",
  ]);
  await expect(page.locator(`${CONFIG} [data-slot="model-config-note"]`)).toHaveText(
    "수정 중에 닫으면 저장 안 됨 확인을 띄웁니다",
  );
  await expect(page.locator(`${CONFIG} [data-slot="dialog-footer"] button`)).toHaveText([
    "취소",
    "저장",
  ]);
  await expect(page.locator(ROW).nth(0)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
});

test("결과 상세의 임계치 관리로 열면 같은 범위 Profile이 없는 결과는 결과와 그 Model의 프리셋으로 새로 채움", async ({
  page,
}) => {
  await openTraining(page);
  await openThresholdFromDetail(page, 1);
  await expect(page.locator(BANNER).first()).toHaveText(NEW_BANNER);
  await expectForm(page, {
    name: "AXLE_BEARING SVM 프로파일",
    device: "AXLE_BEARING",
    model: "SVM",
    segment: "default",
    percentile: "99.5",
    windowSeconds: "60",
    method: "reservoir",
    use: "N",
    description: "",
    params: SVM_PRESET,
    weights: [],
  });
  await page.keyboard.press("Escape");
  await expect(page.locator(CONFIG)).toHaveCount(0);
  await expect(page.locator(UNSAVED)).toHaveCount(0);

  await openThresholdFromRow(page, 3);
  await expect(page.locator(BANNER).first()).toHaveText(
    "재학습 결과(AXLE_BEARING · IF · unit_a · 2026-09-22 09:12, 임계치 0.4914)에서 열었습니다. 같은 장치·모델·세그먼트 프로파일이 없어 새 설정으로 채웠습니다.",
  );
  await expect(field(page, "설정 명")).toHaveValue("AXLE_BEARING IF 프로파일");
  await expect(field(page, "세그먼트")).toHaveValue("unit_a");
  await expect(field(page, "임계 백분위")).toHaveValue("99.5");
  expect(await rowValues(page, PARAM_ROW)).toEqual(IF_PRESET);
  await expect(page.locator(ROW).nth(3)).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("Escape");
  await openThresholdFromDetail(page, 0);
  await expect(page.locator(BANNER).first()).toHaveText(LOADED_BANNER);
  await expectForm(page, LOADED_FORM);
});

test("치수 대조(1920×1080)로 Modal, Group 726, Label 110, Input 562, Row 40 / 54, 오른쪽 Row, 아래 영역을 확인", async ({
  page,
}) => {
  await openTraining(page);
  await openThresholdFromRow(page, 0);
  const { frame } = await expectModalFrame(page, "model-config", {
    width: FIGMA.width,
    height: FIGMA.height,
    title: "모델 설정 수정 · 재학습 결과에서 열림",
  });
  expect([frame.x, frame.y]).toEqual([210, 90]);
  const at = (target: { x: number; y: number; width: number; height: number }) => [
    Math.round((target.x - frame.x) * 100) / 100,
    Math.round((target.y - frame.y) * 100) / 100,
    Math.round(target.width * 100) / 100,
    Math.round(target.height * 100) / 100,
  ];

  const banner = await measure(page, BANNER, 0);
  expect(at(await box(page, BANNER, 0))).toEqual([17, SHELL_BODY_TOP, 1466, FIGMA.bannerHeight]);
  expect(banner.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(banner.style.borderTopLeftRadius).toBe("10px");
  expect([banner.style.paddingTop, banner.style.paddingLeft]).toEqual(["12px", "14px"]);
  expect(banner.style.columnGap).toBe("10px");
  expect((await box(page, `${BANNER} svg`, 0)).width).toBe(18);
  expect(await styleOf(page, `${BANNER} svg`, "color", 0)).toBe(
    await color(page, "var(--brand-line4-text)"),
  );
  expect(await shownIconShape(page, BANNER, 0)).toBe(iconShape("Info"));
  const bannerText = (await measure(page, `${BANNER} [data-slot="alert-description"]`, 0)).style;
  expect([bannerText.fontSize, bannerText.lineHeight, bannerText.fontWeight]).toEqual([
    "14px",
    "20px",
    "500",
  ]);
  expect(bannerText.color).toBe(await color(page, "var(--fg)"));

  expect(at(await box(page, FIELDS))).toEqual([17, PANEL_TOP, FIGMA.panelWidth, PANEL_HEIGHT]);
  expect(at(await box(page, ROWS_PANEL))).toEqual([
    17 + FIGMA.panelWidth + 14,
    PANEL_TOP,
    FIGMA.panelWidth,
    PANEL_HEIGHT,
  ]);
  await expectSection(page, FIELDS);
  await expectSection(page, ROWS_PANEL);

  const rows = await boxes(page, FORM_ROW);
  expect(rows.map((row) => row.height)).toEqual(FIGMA.rowHeights);
  let rowTop = PANEL_TOP + 1 + 16;
  for (const row of rows) {
    expect(at(row)).toEqual([36, rowTop, 688, row.height]);
    rowTop += row.height + FIGMA.rowGap;
  }
  const contents = await boxes(page, `${FORM_ROW} > [data-slot="field-content"]`);
  for (const [index, content] of contents.entries()) {
    expect(content.x - rows[index].x).toBe(FIGMA.labelColumn + FIGMA.labelGap);
    expect(content.width).toBe(FIGMA.controlWidth);
  }
  const labels = await boxes(page, `${FORM_ROW} > [data-slot="field-label"]`);
  expect(labels.map((label) => label.height)).toEqual(Array(9).fill(40));
  const label = (await measure(page, `${FORM_ROW} > [data-slot="field-label"]`)).style;
  expect([label.fontSize, label.lineHeight, label.fontWeight]).toEqual(["14px", "20px", "700"]);
  expect(label.color).toBe(await color(page, "var(--fg)"));
  expect(await styleOf(page, `${FORM_ROW} > [data-slot="field-label"] span`, "color")).toBe(
    await color(page, "var(--danger)"),
  );
  expect((await boxes(page, `${FIELDS} [data-slot="text-input"]`)).map((input) => [input.width, input.height])).toEqual([
    [562, 32],
    [562, 32],
    [FIGMA.shortInput, 32],
    [FIGMA.shortInput, 32],
    [562, 32],
  ]);
  const device = await box(page, `${FIELDS} [data-slot="select-trigger"]`);
  expect([device.width, device.height]).toEqual([562, 32]);
  expect((await boxes(page, SEGMENTED)).map((segmented) => segmented.height)).toEqual([32, 32]);
  const pills = await boxes(page, `${FIELDS} [data-slot="state-pill"]`);
  const pillHosts = await boxes(page, `${FIELDS} [data-slot="model-config-not-applied"] > :first-child`);
  for (const [index, pill] of pills.entries()) {
    expect(pill.height).toBe(24);
    expect(pill.x - (pillHosts[index].x + pillHosts[index].width)).toBeCloseTo(10, 1);
  }
  const pill = (await measure(page, `${FIELDS} [data-slot="state-pill"]`)).style;
  expect(pill.backgroundColor).toBe(await color(page, "var(--caution-subtle)"));
  expect(pill.color).toBe(await color(page, "var(--on-caution-subtle)"));
  expect([pill.fontSize, pill.fontWeight, pill.borderTopLeftRadius]).toEqual(["12px", "600", "12px"]);
  const hints = await boxes(page, `${FIELDS} [data-slot="field-hint"]`);
  expect(hints.map((hint) => hint.height)).toEqual([22, 22, 22]);
  const hint = (await measure(page, `${FIELDS} [data-slot="field-hint"]`)).style;
  expect([hint.fontSize, hint.lineHeight, hint.fontWeight, hint.paddingTop]).toEqual([
    "12px",
    "16px",
    "400",
    "6px",
  ]);
  expect(hint.color).toBe(await color(page, "var(--muted-fg)"));
  expect(hint.columnGap).toBe("6px");
  expect((await box(page, `${FIELDS} [data-slot="field-hint"] svg`)).width).toBe(14);
  expect(await shownIconShape(page, `${FIELDS} [data-slot="field-hint"]`)).toBe(iconShape("Info"));
  const switchBox = await box(page, `${FIELDS} [data-slot="switch"]`);
  expect([switchBox.width, switchBox.height]).toEqual([44, 24]);
  expect((await measure(page, `${FIELDS} [data-slot="switch-control"]`)).style.fontWeight).toBe("500");

  const panelContentTop = PANEL_TOP + 1 + 16;
  const headers = await boxes(page, `${CONFIG} [data-slot="model-config-row-list-header"]`);
  expect(headers.map(at)).toEqual([
    [776, panelContentTop, 688, 20],
    [776, panelContentTop + 202, 688, 24],
  ]);
  const paramRows = await boxes(page, PARAM_ROW);
  expect(paramRows.map(at)).toEqual([0, 1, 2].map((index) => [776, panelContentTop + 28 + index * 40, 688, 32]));
  const parts = await page.evaluate((selector) => {
    const row = document.querySelector(selector)?.firstElementChild;
    return [...(row?.children ?? [])]
      .filter((part) => part.getBoundingClientRect().width > 1)
      .map((part) => {
        const rect = part.getBoundingClientRect();
        return [rect.x, rect.width];
      });
  }, PARAM_ROW);
  expect(parts.map(([, width]) => width)).toEqual(FIGMA.paramParts);
  for (let index = 1; index < parts.length; index += 1) {
    expect(parts[index][0] - (parts[index - 1][0] + parts[index - 1][1])).toBe(FIGMA.partGap);
  }
  const addButtons = await boxes(page, `${CONFIG} [data-slot="add-row-button"]`);
  expect(addButtons.map((button) => [at(button)[1], button.height])).toEqual([
    [panelContentTop + 148, FIGMA.addHeight],
    [panelContentTop + 202 + 32 + 2 * 40, FIGMA.addHeight],
  ]);
  const add = (await measure(page, `${CONFIG} [data-slot="add-row-button"]`)).style;
  expect(add.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(add.borderTopStyle).toBe("dashed");
  expect(add.borderTopColor).toBe(await color(page, "var(--brand-line4)"));
  expect(add.color).toBe(await color(page, "var(--brand-line4-text)"));
  expect([add.fontSize, add.fontWeight, add.paddingLeft, add.columnGap, add.borderTopLeftRadius]).toEqual([
    "14px",
    "700",
    "12px",
    "6px",
    "8px",
  ]);
  expect((await box(page, `${CONFIG} [data-slot="add-row-button"] svg`)).width).toBe(16);
  expect(await shownIconShape(page, `${CONFIG} [data-slot="add-row-button"]`)).toBe(iconShape("Add"));
  const paramNote = (await measure(page, `${CONFIG} [data-slot="model-config-params-note"]`)).style;
  expect([paramNote.fontSize, paramNote.lineHeight]).toEqual(["12px", "16px"]);
  expect(paramNote.color).toBe(await color(page, "var(--muted-fg)"));
  const warning = await box(page, BANNER, 1);
  expect(at(warning)).toEqual([
    776,
    PANEL_TOP + PANEL_HEIGHT - 1 - 16 - FIGMA.warningHeight,
    688,
    FIGMA.warningHeight,
  ]);
  const warningStyle = (await measure(page, BANNER, 1)).style;
  expect(warningStyle.backgroundColor).toBe(await color(page, "var(--warning-subtle)"));
  expect(warningStyle.color).toBe(await color(page, "var(--on-warning-subtle)"));
  expect(warningStyle.borderTopLeftRadius).toBe("10px");
  expect(await styleOf(page, `${BANNER} svg`, "color", 1)).toBe(
    await color(page, "var(--warning-strong)"),
  );
  expect((await box(page, `${BANNER} svg`, 1)).width).toBe(18);
  expect(await shownIconShape(page, BANNER, 1)).toBe(iconShape("WarningAmber"));

  const note = (await measure(page, `${CONFIG} [data-slot="model-config-note"]`)).style;
  expect([note.fontSize, note.lineHeight]).toEqual(["12px", "16px"]);
  expect(note.color).toBe(await color(page, "var(--muted-fg)"));
  const cancel = await measure(page, `${CONFIG} [data-slot="dialog-footer"] button`, 0);
  const save = await measure(page, `${CONFIG} [data-slot="dialog-footer"] button`, 1);
  expect([cancel.height, save.height]).toEqual([32, 32]);
  expect(cancel.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(cancel.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(save.style.backgroundColor).toBe(await color(page, "var(--primary)"));
  expect(save.style.color).toBe(await color(page, "var(--on-primary)"));
  expect([cancel.style.paddingLeft, save.style.paddingLeft]).toEqual(["16px", "16px"]);
  expect((await box(page, `${CONFIG} [data-slot="dialog-footer"] button svg`)).width).toBe(16);
  expect(await shownIconShape(page, `${CONFIG} [data-slot="dialog-footer"] button:last-child`)).toBe(
    iconShape("Check"),
  );
});

test("Model을 바꾸면 하이퍼파라미터가 그 Model 프리셋으로 다시 채워지고 다른 Input은 그대로임", async ({
  page,
}) => {
  await openTraining(page);
  await openThresholdFromRow(page, 0);
  await field(page, "설정 명").fill("바꾼 이름");
  await page.locator(FIELDS).getByRole("button", { name: "VAE", exact: true }).click();
  expect(await rowValues(page, PARAM_ROW)).toEqual([
    ["epochs", "50", "int"],
    ["batch_size", "256", "int"],
    ["latent_dim", "8", "int"],
    ["lr", "0.001", "float"],
    ["beta", "1.0", "float"],
    ["dropout", "0.1", "float"],
  ]);
  await expect(page.locator(`${CONFIG} [data-slot="model-config-params-note"]`)).toHaveText(
    "VAE · 저장 시 범위 검증",
  );
  await page.locator(FIELDS).getByRole("button", { name: "PCA", exact: true }).click();
  expect(await rowValues(page, PARAM_ROW)).toEqual([["n_components", "0.95", "float"]]);
  await page.locator(FIELDS).getByRole("button", { name: "SVM", exact: true }).click();
  expect(await rowValues(page, PARAM_ROW)).toEqual(SVM_PRESET);
  await page.locator(CONFIG).getByLabel("하이퍼파라미터 1 값", { exact: true }).fill("0.5");
  await page.locator(FIELDS).getByRole("button", { name: "IF", exact: true }).click();
  expect(await rowValues(page, PARAM_ROW)).toEqual(IF_PRESET);
  await expect(field(page, "설정 명")).toHaveValue("바꾼 이름");
  expect(await rowValues(page, WEIGHT_ROW)).toEqual(SEED_WEIGHTS);
});

test("검증에서 설정 명과 임계 백분위는 저장을 Click한 뒤, 하이퍼파라미터는 값 Input에서 나간 뒤에도 표시되고 고치면 사라짐", async ({
  page,
}) => {
  await openTraining(page);
  await openThresholdFromRow(page, 0);
  await field(page, "설정 명").fill("   ");
  await field(page, "임계 백분위").fill("89.9");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
  const firstValue = page.locator(CONFIG).getByLabel("하이퍼파라미터 1 값", { exact: true });
  await firstValue.fill("abc");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
  await firstValue.blur();
  await expect(page.locator(FIELD_ERROR)).toHaveText(["n_estimators는 1 ~ 100000 사이 정수여야 합니다"]);
  await expect(firstValue).toHaveAttribute("aria-invalid", "true");
  expect((await measure(page, `${PARAM_ROW} input[data-slot="text-input"]`, 1)).style.borderTopWidth).toBe("2px");
  const errorStyle = (await measure(page, FIELD_ERROR)).style;
  expect(errorStyle.color).toBe(await color(page, "var(--danger)"));
  expect(errorStyle.fontWeight).toBe("700");

  await footerButton(page, CONFIG, "저장").click();
  await expect(page.locator(FIELD_ERROR)).toHaveText([
    "설정 명을 입력하세요",
    "임계 백분위는 90 ~ 100 사이여야 합니다",
    "n_estimators는 1 ~ 100000 사이 정수여야 합니다",
  ]);
  await expect(page.locator(`${FIELDS} [data-slot="field-hint"]`)).toHaveText([
    "모델을 바꾸면 하이퍼파라미터가 그 모델 프리셋으로 채워집니다",
    "켜면 같은 장치·모델·세그먼트의 기존 Y 프로파일은 N으로 바뀝니다",
  ]);
  await expect(field(page, "설정 명")).toHaveAttribute("aria-invalid", "true");
  await expect(field(page, "임계 백분위")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(TOAST)).toHaveText("파라미터 범위 오류 — n_estimators는 1 ~ 100000 사이 정수여야 합니다");
  await expect(page.locator(TOAST)).toHaveAttribute("data-tone", "error");
  await expect(page.locator(CONFIG)).toBeVisible();

  await field(page, "설정 명").fill("새 이름");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(2);
  for (const bad of ["100.01", "", "abc"]) {
    await field(page, "임계 백분위").fill(bad);
    await expect(page.locator(FIELD_ERROR).first()).toHaveText("임계 백분위는 90 ~ 100 사이여야 합니다");
  }
  for (const good of ["90", "100", "99.95"]) {
    await field(page, "임계 백분위").fill(good);
    await expect(page.locator(FIELD_ERROR)).toHaveText(["n_estimators는 1 ~ 100000 사이 정수여야 합니다"]);
  }
  await firstValue.fill("200.5");
  await expect(page.locator(FIELD_ERROR)).toHaveText(["n_estimators는 1 ~ 100000 사이 정수여야 합니다"]);
  await firstValue.fill("0");
  await expect(page.locator(FIELD_ERROR)).toHaveText(["n_estimators는 1 ~ 100000 사이 정수여야 합니다"]);
  await firstValue.fill("1500");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);

  await page.locator(PARAMS).getByRole("button", { name: "파라미터 추가" }).click();
  await page.locator(CONFIG).getByLabel("하이퍼파라미터 4 키", { exact: true }).fill("depth");
  const fourthValue = page.locator(CONFIG).getByLabel("하이퍼파라미터 4 값", { exact: true });
  await fourthValue.fill("1.5");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
  await page.locator(CONFIG).getByRole("combobox", { name: "하이퍼파라미터 4 형식" }).click();
  await page.getByRole("option", { name: "int", exact: true }).click();
  await expect(page.locator(FIELD_ERROR)).toHaveText(["depth는 int 형식이어야 합니다"]);
  await page.locator(CONFIG).getByRole("combobox", { name: "하이퍼파라미터 4 형식" }).click();
  await page.getByRole("option", { name: "bool", exact: true }).click();
  await expect(page.locator(FIELD_ERROR)).toHaveText(["depth는 bool 형식이어야 합니다"]);
  await fourthValue.fill("true");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
  await fourthValue.fill("yes");
  await footerButton(page, CONFIG, "저장").click();
  await expect(page.locator(TOAST)).toHaveText("파라미터 범위 오류 — depth는 bool 형식이어야 합니다");
  await expect(page.locator(CONFIG)).toBeVisible();
  await page.locator(CONFIG).getByRole("combobox", { name: "하이퍼파라미터 4 형식" }).click();
  await page.getByRole("option", { name: "str", exact: true }).click();
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
});

test("Row 추가와 삭제에서 맨 아래 빈 Row(형식 float)에 Focus가 가고, 삭제한 Row의 오류는 다른 Row로 옮겨 가지 않음", async ({
  page,
}) => {
  await openTraining(page);
  await openThresholdFromRow(page, 0);
  await page.locator(PARAMS).getByRole("button", { name: "파라미터 추가" }).click();
  expect(await rowValues(page, PARAM_ROW)).toEqual([...IF_PRESET, ["", "", "float"]]);
  await expect(page.locator(CONFIG).getByLabel("하이퍼파라미터 4 키", { exact: true })).toBeFocused();
  await expect(page.locator(`${PARAM_ROW} input[data-slot="text-input"]`).nth(6)).toHaveAttribute("placeholder", "키");
  await expect(page.locator(`${PARAM_ROW} input[data-slot="text-input"]`).nth(7)).toHaveAttribute("placeholder", "값");
  await page.keyboard.type("seed");
  await page.locator(WEIGHTS).getByRole("button", { name: "가중치 추가" }).click();
  expect(await rowValues(page, WEIGHT_ROW)).toEqual([...SEED_WEIGHTS, ["", "", "float"]]);
  await expect(page.locator(CONFIG).getByLabel("센서 가중치 3 센서명", { exact: true })).toBeFocused();
  await expect(page.locator(`${WEIGHT_ROW} input[data-slot="text-input"]`).nth(4)).toHaveAttribute("placeholder", "센서명");

  const firstValue = page.locator(CONFIG).getByLabel("하이퍼파라미터 1 값", { exact: true });
  await firstValue.fill("0");
  await firstValue.blur();
  await expect(page.locator(FIELD_ERROR)).toHaveCount(1);
  await page.locator(PARAM_ROW).nth(0).getByRole("button", { name: "삭제" }).click();
  expect(await rowValues(page, PARAM_ROW)).toEqual([
    ["max_samples", "256", "int"],
    ["contamination", "auto", "str"],
    ["seed", "", "float"],
  ]);
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
  for (let count = 3; count > 0; count -= 1) {
    await page.locator(WEIGHT_ROW).nth(0).getByRole("button", { name: "삭제" }).click();
    await expect(page.locator(WEIGHT_ROW)).toHaveCount(count - 1);
  }
  await expect(page.locator(WEIGHTS).getByRole("button", { name: "가중치 추가" })).toBeVisible();
  const remove = await box(page, `${PARAM_ROW} [data-slot="icon-button"]`);
  expect([remove.width, remove.height]).toEqual([32, 32]);
  expect((await box(page, `${PARAM_ROW} [data-slot="icon-button"] svg`)).width).toBe(16);
  expect(await shownIconShape(page, `${PARAM_ROW} [data-slot="icon-button"]`)).toBe(iconShape("Close"));
});

test("값 Input에 틀린 값을 넣은 채 바로 파라미터 추가, 아래 Row 삭제, 가중치 추가를 Click해도 Click이 빗나가지 않고, 오류 Row는 Click한 뒤에 표시됨", async ({
  page,
}) => {
  await openTraining(page);
  await openThresholdFromRow(page, 0);
  const valueInput = (index: number) =>
    page.locator(CONFIG).getByLabel(`하이퍼파라미터 ${index} 값`, { exact: true });

  await valueInput(1).fill("0");
  await expect(valueInput(1)).toBeFocused();
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
  await page.locator(PARAMS).getByRole("button", { name: "파라미터 추가" }).click();
  expect(await rowValues(page, PARAM_ROW)).toEqual([
    ["n_estimators", "0", "int"],
    ...IF_PRESET.slice(1),
    ["", "", "float"],
  ]);
  await expect(page.locator(CONFIG).getByLabel("하이퍼파라미터 4 키", { exact: true })).toBeFocused();
  await expect(page.locator(FIELD_ERROR)).toHaveText(["n_estimators는 1 ~ 100000 사이 정수여야 합니다"]);

  await valueInput(2).fill("0");
  await expect(valueInput(2)).toBeFocused();
  await expect(page.locator(FIELD_ERROR)).toHaveCount(1);
  await page.locator(PARAM_ROW).nth(2).getByRole("button", { name: "삭제" }).click();
  expect(await rowValues(page, PARAM_ROW)).toEqual([
    ["n_estimators", "0", "int"],
    ["max_samples", "0", "int"],
    ["", "", "float"],
  ]);
  await expect(page.locator(FIELD_ERROR)).toHaveText([
    "n_estimators는 1 ~ 100000 사이 정수여야 합니다",
    "max_samples는 1 ~ 1000000 사이 정수여야 합니다",
  ]);

  await page.locator(CONFIG).getByLabel("하이퍼파라미터 3 키", { exact: true }).fill("depth");
  await valueInput(3).fill("x");
  await expect(valueInput(3)).toBeFocused();
  await expect(page.locator(FIELD_ERROR)).toHaveCount(2);
  await page.locator(WEIGHTS).getByRole("button", { name: "가중치 추가" }).click();
  expect(await rowValues(page, WEIGHT_ROW)).toEqual([...SEED_WEIGHTS, ["", "", "float"]]);
  await expect(page.locator(CONFIG).getByLabel("센서 가중치 3 센서명", { exact: true })).toBeFocused();
  await expect(page.locator(FIELD_ERROR)).toHaveText([
    "n_estimators는 1 ~ 100000 사이 정수여야 합니다",
    "max_samples는 1 ~ 1000000 사이 정수여야 합니다",
    "depth는 float 형식이어야 합니다",
  ]);
});

test("닫기에서 안 바뀌면 취소, ✕, Esc로 바로 닫히고 바뀌면 저장 안 됨 확인(취소는 그대로, 확인은 버리고 닫음)이 표시되며, 바깥 Click은 항상 무시함", async ({
  page,
}) => {
  await openTraining(page);
  const closers: { name: string; close: () => Promise<void> }[] = [
    { name: "취소", close: () => footerButton(page, CONFIG, "취소").click() },
    { name: "닫기", close: () => page.locator(`${CONFIG} [data-slot="dialog-close"]`).click() },
    { name: "Esc", close: () => page.keyboard.press("Escape") },
  ];
  for (const closer of closers) {
    await openThresholdFromRow(page, 0);
    await closer.close();
    await expect(page.locator(CONFIG), closer.name).toHaveCount(0);
    await expect(page.locator(UNSAVED)).toHaveCount(0);
  }
  await openThresholdFromRow(page, 0);
  await page.mouse.click(10, 1070);
  await page.waitForTimeout(300);
  await expect(page.locator(CONFIG)).toBeVisible();
  await expect(page.locator(UNSAVED)).toHaveCount(0);
  await field(page, "세그먼트").fill("default_b");
  await page.mouse.click(10, 1070);
  await page.waitForTimeout(300);
  await expect(page.locator(CONFIG)).toBeVisible();
  await expect(page.locator(UNSAVED)).toHaveCount(0);
  await expect(field(page, "세그먼트")).toHaveValue("default_b");
  await field(page, "세그먼트").fill("default");
  await page.keyboard.press("Escape");
  await expect(page.locator(CONFIG)).toHaveCount(0);
  await openThresholdFromRow(page, 0);
  await field(page, "임계 백분위").fill("99.5");
  await field(page, "임계 백분위").fill("99.9");
  await page.keyboard.press("Escape");
  await expect(page.locator(CONFIG)).toHaveCount(0);

  await openThresholdFromRow(page, 0);
  await field(page, "설정 명").fill("AXLE_BEARING IF 프로파일 v2");
  for (const closer of closers) {
    await closer.close();
    await expect(page.locator(UNSAVED), closer.name).toBeVisible();
    await expect(page.locator(`${UNSAVED} [data-slot="alert-dialog-title"]`)).toHaveText(
      "저장하지 않은 변경사항이 있습니다",
    );
    await expect(page.locator(`${UNSAVED} [data-slot="alert-dialog-description"]`)).toHaveText(
      "AXLE_BEARING IF 프로파일 v2의 임계 백분위·하이퍼파라미터 수정 내용이 저장되지 않았습니다.\n닫으면 변경사항이 사라집니다.",
    );
    await expect(page.locator(`${UNSAVED} button`)).toHaveText(["취소", "확인"]);
    await page.keyboard.press("Escape");
    await expect(page.locator(UNSAVED)).toHaveCount(0);
    await expect(page.locator(CONFIG)).toBeVisible();
    await expect(field(page, "설정 명")).toHaveValue("AXLE_BEARING IF 프로파일 v2");
  }
  await footerButton(page, CONFIG, "취소").click();
  await page.locator(UNSAVED).getByRole("button", { name: "취소" }).click();
  await expect(page.locator(UNSAVED)).toHaveCount(0);
  await expect(page.locator(CONFIG)).toBeVisible();
  await field(page, "설정 명").fill("");
  await page.keyboard.press("Escape");
  await expect(page.locator(`${UNSAVED} [data-slot="alert-dialog-description"]`)).toHaveText(
    "이 설정의 임계 백분위·하이퍼파라미터 수정 내용이 저장되지 않았습니다.\n닫으면 변경사항이 사라집니다.",
  );
  await expectSentenceLines(page, `${UNSAVED} [data-slot="alert-dialog-description"]`, {
    sentences: 2,
    lineHeight: 20,
  });
  await page.locator(UNSAVED).getByRole("button", { name: "확인" }).click();
  await expect(page.locator(UNSAVED)).toHaveCount(0);
  await expect(page.locator(CONFIG)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveCount(0);
  await openThresholdFromRow(page, 0);
  await expectForm(page, LOADED_FORM);
  await page.locator(WEIGHTS).getByRole("button", { name: "가중치 추가" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(UNSAVED)).toBeVisible();
});

test("저장에 성공하면 닫고 \"저장되었습니다.\" 표시, 결과 Table은 다시 호출하지 않으며, 다시 열면 저장한 값이고 없던 Profile은 새로 만들어져 다음엔 불러옴", async ({
  page,
}) => {
  await openTraining(page);
  const rowTexts = await texts(page, ROW);
  await setMockLatency(page, { failNames: ["trainingResults", "trainingSummary", "trainingJobs"] });
  await openThresholdFromRow(page, 0);
  await field(page, "임계 백분위").fill("99.5");
  await page.locator(FIELDS).getByRole("switch").click();
  await expect(page.locator(`${FIELDS} [data-slot="switch-control"]`)).toHaveText("Y · 다음 재학습에 자동 적용");
  await page.locator(CONFIG).getByLabel("하이퍼파라미터 1 값", { exact: true }).fill("1500");
  await footerButton(page, CONFIG, "저장").click();
  await expect(page.locator(CONFIG)).toHaveCount(0);
  await expect(page.locator(UNSAVED)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("저장되었습니다.");
  await expect(page.locator(TOAST)).toHaveAttribute("data-tone", "success");
  await page.waitForTimeout(400);
  await expect(page.getByText(PAGE_ERROR)).toHaveCount(0);
  expect(await texts(page, ROW)).toEqual(rowTexts);
  await openThresholdFromRow(page, 0);
  await expect(page.locator(BANNER).first()).toHaveText(LOADED_BANNER);
  await expectForm(page, {
    ...LOADED_FORM,
    percentile: "99.5",
    use: "Y",
    params: [["n_estimators", "1500", "int"], ...IF_PRESET.slice(1)],
  });
  await page.keyboard.press("Escape");

  await openThresholdFromRow(page, 1);
  await expect(page.locator(BANNER).first()).toHaveText(NEW_BANNER);
  await field(page, "설명").fill("  SVM 민감도  ");
  await footerButton(page, CONFIG, "저장").click();
  await expect(page.locator(CONFIG)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("저장되었습니다.");
  await openThresholdFromRow(page, 1);
  await expect(page.locator(BANNER).first()).toHaveText(
    NEW_BANNER.replace("프로파일이 없어 새 설정으로 채웠습니다.", "프로파일이 있어 그 설정을 불러왔습니다."),
  );
  await expect(field(page, "설정 명")).toHaveValue("AXLE_BEARING SVM 프로파일");
  await expect(field(page, "설명")).toHaveValue("SVM 민감도");
  await expect(page.getByText(PAGE_ERROR)).toHaveCount(0);
});

test("저장 실패 시 기다리는 동안 저장, 취소, 닫기, Esc가 막히고, 실패하면 Toast가 표시되며 Modal과 고친 값은 그대로임", async ({
  page,
}) => {
  await openTraining(page);
  await openThresholdFromRow(page, 0);
  await setMockActions(page, { delayMs: 800, failNames: ["saveModelConfig"] });
  await field(page, "임계 백분위").fill("99");
  const save = footerButton(page, CONFIG, "저장");
  const cancel = footerButton(page, CONFIG, "취소");
  await save.click();
  await expect(save).toHaveAttribute("aria-disabled", "true");
  await expect(cancel).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await page.locator(`${CONFIG} [data-slot="dialog-close"]`).click({ force: true });
  await expect(page.locator(UNSAVED)).toHaveCount(0);
  await expect(page.locator(CONFIG)).toBeVisible();
  await expect(page.locator(TOAST)).toHaveText("저장 실패: 더미 실행 실패: saveModelConfig");
  await expect(page.locator(TOAST)).toHaveAttribute("data-tone", "error");
  await expect(page.locator(CONFIG)).toBeVisible();
  await expect(field(page, "임계 백분위")).toHaveValue("99");
  await expect(save).not.toHaveAttribute("aria-disabled", "true");
  await expect(cancel).not.toHaveAttribute("aria-disabled", "true");

  await setMockActions(page, { delayMs: 800 });
  await save.click();
  await expect(save).toHaveAttribute("aria-disabled", "true");
  await expect(cancel).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(CONFIG)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("저장되었습니다.");
  expect((await requestedActions(page)).map((request) => request.name)).toEqual([
    "saveModelConfig",
    "saveModelConfig",
  ]);
  await openThresholdFromRow(page, 0);
  await expect(field(page, "임계 백분위")).toHaveValue("99");
});

test("Profile 조회 중 기다리는 동안 불러오는 중이 표시되고, 실패하면 Modal 안에 실패 모습과 다시 시도가 표시되며 화면은 그대로임", async ({
  page,
}) => {
  await openTraining(page);
  await setMockActions(page, { delayMs: 600, failNames: ["modelConfigProfile"] });
  await page.locator(ROW).nth(0).getByRole("button", { name: "임계치 관리" }).click();
  await expect(page.locator(`${CONFIG} [data-slot="skeleton-panel"]`)).toHaveText("모델 설정을 불러오는 중…");
  await expect(footerButton(page, CONFIG, "저장")).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(`${CONFIG} [role="alert"]`)).toContainText("모델 설정을 불러오지 못했습니다");
  await expect(page.getByText(PAGE_ERROR)).toHaveCount(0);
  await setMockActions(page, { delayMs: 0 });
  await page.locator(CONFIG).getByRole("button", { name: "다시 시도" }).click();
  await expect(page.locator(FIELDS)).toBeVisible();
  await expectForm(page, LOADED_FORM);
});

test("Keyboard에서 열면 닫기 Button에 Focus, Tab은 Modal 안에서 순환, Esc로 닫으면 ⚙로 돌아가고, 확인 위의 Esc는 확인만 닫음", async ({
  page,
}) => {
  await openTraining(page);
  const gear = page.locator(ROW).nth(0).getByRole("button", { name: "임계치 관리" });
  await gear.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(FIELDS)).toBeVisible();
  await expect(page.locator(CONFIG)).toHaveAttribute("role", "dialog");
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.getAttribute("aria-label")))
    .toBe("닫기");
  for (let step = 0; step < 45; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, CONFIG)).toBe(true);
  }
  for (let step = 0; step < 10; step += 1) {
    await pressTab(page, "Shift+Tab");
    expect(await focusIsInside(page, CONFIG)).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(CONFIG)).toHaveCount(0);
  await expect(gear).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator(FIELDS)).toBeVisible();
  await field(page, "세그먼트").focus();
  await page.keyboard.type("_b");
  await page.keyboard.press("Escape");
  await expect(page.locator(UNSAVED)).toBeVisible();
  await expect.poll(() => focusIsInside(page, UNSAVED)).toBe(true);
  for (let step = 0; step < 4; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, UNSAVED)).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(UNSAVED)).toHaveCount(0);
  await expect(page.locator(CONFIG)).toBeVisible();
  await expect.poll(() => focusIsInside(page, CONFIG)).toBe(true);
  await expect(field(page, "세그먼트")).toHaveValue("default_b");
});

test("⚙는 Request 중과 결과를 다시 받는 동안 막히며, 막힌 동안 Click해도 열리지 않음", async ({ page }) => {
  await openTraining(page);
  const gear = page.locator(ROW).nth(0).getByRole("button", { name: "임계치 관리" });
  await expect(gear).not.toHaveAttribute("aria-disabled", "true");
  await setMockLatency(page, { searchMs: 1500 });
  await page.locator('[data-slot="training-results-card"] [data-slot="select-trigger"]').click();
  await page.getByRole("option", { name: "50개씩", exact: true }).click();
  await expect(gear).toHaveAttribute("aria-disabled", "true");
  await gear.click({ force: true });
  await page.waitForTimeout(200);
  await expect(page.locator(CONFIG)).toHaveCount(0);
  await expect(gear).not.toHaveAttribute("aria-disabled", "true");
  await gear.click();
  await expect(page.locator(FIELDS)).toBeVisible();
});

test("다크 Theme의 Color", async ({ page }) => {
  await openTraining(page);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await openThresholdFromRow(page, 0);
  expect((await measure(page, CONFIG)).style.backgroundColor).toBe(await color(page, "var(--dialog)"));
  await expectSection(page, FIELDS);
  await expectSection(page, ROWS_PANEL);
  const banner = (await measure(page, BANNER, 0)).style;
  expect(banner.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(banner.color).toBe(await color(page, "var(--fg)"));
  const warning = (await measure(page, BANNER, 1)).style;
  expect(warning.backgroundColor).toBe(await color(page, "var(--warning-subtle)"));
  expect(warning.color).toBe(await color(page, "var(--on-warning-subtle)"));
  expect(await styleOf(page, `${BANNER} svg`, "color", 1)).toBe(await color(page, "var(--warning-strong)"));
  const input = (await measure(page, `${FIELDS} [data-slot="text-input"]`)).style;
  expect(input.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(input.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(input.color).toBe(await color(page, "var(--fg)"));
  const pill = (await measure(page, `${CONFIG} [data-slot="state-pill"]`)).style;
  expect(pill.backgroundColor).toBe(await color(page, "var(--caution-subtle)"));
  expect(pill.color).toBe(await color(page, "var(--on-caution-subtle)"));
  const add = (await measure(page, `${CONFIG} [data-slot="add-row-button"]`)).style;
  expect(add.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(add.borderTopColor).toBe(await color(page, "var(--brand-line4)"));
  expect(add.color).toBe(await color(page, "var(--brand-line4-text)"));
  expect((await measure(page, `${FIELDS} [data-slot="field-hint"]`)).style.color).toBe(
    await color(page, "var(--muted-fg)"),
  );
  expect((await measure(page, `${CONFIG} [data-slot="model-config-note"]`)).style.color).toBe(
    await color(page, "var(--muted-fg)"),
  );
  await field(page, "설정 명").fill("");
  await footerButton(page, CONFIG, "저장").click();
  expect((await measure(page, FIELD_ERROR)).style.color).toBe(await color(page, "var(--danger)"));
  await page.keyboard.press("Escape");
  await expect(page.locator(UNSAVED)).toBeVisible();
  expect((await measure(page, UNSAVED)).style.backgroundColor).toBe(await color(page, "var(--surface-low)"));
  expect(
    (await measure(page, `${UNSAVED} [data-slot="alert-dialog-media"]`)).style.backgroundColor,
  ).toBe(await color(page, "var(--caution-subtle)"));
});

test("3840×2160 화면의 Modal은 1920×1080 화면의 정확히 2배임", async ({ page }) => {
  const openScene = async (width: number, height: number) => {
    await openTraining(page, width, height);
    await expect(page.locator('[data-slot="session-chip-remaining"]')).not.toHaveText("--:--");
    await page.mouse.move(0, 0);
    await openThresholdFromRow(page, 0);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(600);
  };
  await openScene(1920, 1080);
  const base = await collectSlotRects(page);
  await openScene(3840, 2160);
  const doubled = await collectSlotRects(page);
  expect(doubled.map((rect) => rect.slot)).toEqual(base.map((rect) => rect.slot));
  const firstOverlay = base.findIndex((rect) => rect.slot.endsWith("dialog-overlay"));
  expect(firstOverlay).toBeGreaterThan(0);
  expect(base.length - firstOverlay).toBeGreaterThanOrEqual(100);
  expect(doubledMismatches(base, doubled)).toEqual([]);
  const frame = await box(page, CONFIG);
  expect([frame.width, frame.height]).toEqual([3000, 1800]);
});

async function addedRowStartStyle(page: Page): Promise<string[]> {
  return page.evaluate(
    ({ list, row }) =>
      new Promise<string[]>((resolve) => {
        const button = document.querySelector<HTMLButtonElement>(`${list} [data-slot="add-row-button"]`);
        button?.click();
        requestAnimationFrame(() => {
          const rows = document.querySelectorAll<HTMLElement>(row);
          const added = rows[rows.length - 1];
          resolve([added.style.transform, getComputedStyle(added).opacity]);
        });
      }),
    { list: PARAMS, row: PARAM_ROW },
  );
}

test("움직임 줄이기를 켜면 Modal은 Fade만 적용되고, 추가한 Row도 위치 이동 없이 Fade만 적용됨", async ({ page }) => {
  await openTraining(page);
  await page.locator(ROW).nth(0).getByRole("button", { name: "임계치 관리" }).click();
  expect(await enterMotion(page, CONFIG)).toEqual(["enter", "0.1s", "1", "0"]);
  await expect(page.locator(FIELDS)).toBeVisible();
  await page.waitForTimeout(300);
  const [transform, opacity] = await addedRowStartStyle(page);
  expect(transform === "" || transform === "none").toBe(true);
  expect(Number(opacity)).toBeLessThan(1);
  await expect(page.locator(PARAM_ROW).nth(3)).toHaveCSS("opacity", "1");
});

test.describe("움직임 줄이기를 끈 화면", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("Modal은 기본 움직임이고, 추가한 Row는 4 위에서 내려오며 나타남", async ({ page }) => {
    await openTraining(page);
    await page.locator(ROW).nth(0).getByRole("button", { name: "임계치 관리" }).click();
    expect(await enterMotion(page, CONFIG)).toEqual(["enter", "0.1s", ".95", "0"]);
    await expect(page.locator(FIELDS)).toBeVisible();
    await page.waitForTimeout(400);
    const [transform, opacity] = await addedRowStartStyle(page);
    expect(transform).toMatch(/translateY\(-?[0-9.]+(rem|px)\)/);
    expect(transform).not.toBe("translateY(0rem)");
    expect(Number(opacity)).toBeLessThan(1);
    await expect(page.locator(PARAM_ROW).nth(3)).toHaveCSS("opacity", "1");
    await expect(page.locator(PARAM_ROW).nth(3)).toHaveCSS("transform", "none");
  });
});

test("계산 함수의 프리셋 다시 채우기, Row 번호, 범위, 형식, 백분위 경계, 바뀜 판정, 넘길 값", async () => {
  const options = await fetchModelConfigOptions();
  const scope = { deviceCode: "BMS", modelCode: "VAE", segment: "default" };
  const draft = createNewModelConfigDraft(options, scope, "BMS VAE 프로파일");
  expect(draft.params.map((row) => [row.key, row.value, row.type, row.rowId])).toEqual([
    ["epochs", "50", "int", 0],
    ["batch_size", "256", "int", 1],
    ["latent_dim", "8", "int", 2],
    ["lr", "0.001", "float", 3],
    ["beta", "1.0", "float", 4],
    ["dropout", "0.1", "float", 5],
  ]);
  expect([draft.nextRowId, draft.thresholdPercentile, draft.windowSeconds, draft.use, draft.trainingMethod]).toEqual([
    6,
    "99.5",
    "60",
    "N",
    "reservoir",
  ]);
  const pca = changeModelConfigModel(draft, "PCA", options);
  expect(pca.params.map((row) => [row.key, row.rowId])).toEqual([["n_components", 6]]);
  expect(pca.nextRowId).toBe(7);
  expect(changeModelConfigModel(draft, "XGB", options).params).toEqual([]);
  const added = addModelConfigRow(pca, "sensorWeights", options.defaults.addedRowType);
  expect(added.sensorWeights).toEqual([{ key: "", value: "", type: "float", rowId: 7 }]);
  const removed = removeModelConfigRow(added, "params", 6);
  expect(removed.params).toEqual([]);
  expect(addModelConfigRow(removed, "params", "int").params[0].rowId).toBe(8);

  const ranges = options.paramRanges;
  const problem = (key: string, value: string, type: "int" | "float" | "str" | "bool" = "float") =>
    findModelConfigParamProblem({ key, value, type }, ranges);
  expect(problem("epochs", "1", "int")).toBeNull();
  expect(problem("epochs", "1000", "int")).toBeNull();
  expect(problem("epochs", "1001", "int")?.reason).toBe("outOfRange");
  expect(problem("epochs", "2.5", "int")?.reason).toBe("outOfRange");
  expect(problem("epochs", "", "int")?.reason).toBe("outOfRange");
  expect(problem("lr", "0", "float")).toBeNull();
  expect(problem("lr", "1.01", "float")?.reason).toBe("outOfRange");
  expect(problem(" nu ", "0.5")).toBeNull();
  expect(problem("nu", "abc", "str")?.reason).toBe("outOfRange");
  expect(problem("n_components", "0.95")).toBeNull();
  expect(problem("constructor", "x", "str")).toBeNull();
  expect(problem("custom", "")).toBeNull();
  expect(problem("custom", "3", "int")).toBeNull();
  expect(problem("custom", "-3", "int")).toBeNull();
  expect(problem("custom", "3.0", "int")).toEqual({ reason: "typeMismatch", key: "custom", type: "int" });
  expect(problem("custom", "1e-3", "float")).toBeNull();
  expect(problem("custom", "1.2.3", "float")?.reason).toBe("typeMismatch");
  expect(problem("custom", "true", "bool")).toBeNull();
  expect(problem("custom", "True", "bool")?.reason).toBe("typeMismatch");
  expect(problem("custom", "anything", "str")).toBeNull();
  expect(modelConfigParamTypes).toEqual(["int", "float", "str", "bool"]);

  const withPercentile = (thresholdPercentile: string) =>
    findModelConfigProblems({ ...draft, thresholdPercentile }, options).isPercentileOutOfRange;
  expect(["90", "100", " 99.5 ", "95"].map(withPercentile)).toEqual([false, false, false, false]);
  expect(["89.99", "100.01", "", "abc", "-95"].map(withPercentile)).toEqual([true, true, true, true, true]);
  expect(findModelConfigProblems({ ...draft, name: "  " }, options).isNameMissing).toBe(true);
  expect(hasModelConfigProblem(findModelConfigProblems(draft, options))).toBe(false);

  expect(isModelConfigDraftChanged(draft, { ...draft })).toBe(false);
  expect(isModelConfigDraftChanged(draft, { ...draft, segment: "x" })).toBe(true);
  expect(isModelConfigDraftChanged(draft, changeModelConfigModel(draft, "VAE", options))).toBe(false);
  expect(isModelConfigDraftChanged(draft, addModelConfigRow(draft, "params", "float"))).toBe(true);

  const input = toModelConfigInput(
    {
      ...draft,
      name: "  BMS VAE  ",
      segment: "  ",
      windowSeconds: "abc",
      description: "   ",
      thresholdPercentile: " 99 ",
      params: [{ key: " lr ", value: " 0.01 ", type: "float", rowId: 0 }],
    },
    null,
    options,
  );
  expect(input).toEqual({
    id: null,
    name: "BMS VAE",
    description: null,
    deviceCode: "BMS",
    modelCode: "VAE",
    segment: "default",
    thresholdPercentile: 99,
    windowSeconds: 60,
    trainingMethod: "reservoir",
    use: "N",
    params: [{ key: "lr", value: "0.01", type: "float" }],
    sensorWeights: [],
  });
  expect(toModelConfigInput({ ...draft, name: "" }, null, options)).toBeNull();
});

test("Mock 연결 함수의 선택지, Profile 조회, 저장(새로 만듦, 고침, 사용 Y 규칙, 없는 번호)", async () => {
  const options = await fetchModelConfigOptions();
  expect(options.modelCodes).toEqual(["IF", "SVM", "VAE", "PCA"]);
  expect(options.trainingMethods).toEqual(["full", "reservoir"]);
  expect(options.percentileRange).toEqual({ min: 90, max: 100 });
  expect(Object.keys(options.presets)).toEqual(["IF", "SVM", "VAE", "PCA"]);
  expect(options.presets.IF.map((param) => [param.key, param.value, param.type])).toEqual(IF_PRESET);
  expect(Object.keys(options.paramRanges)).toEqual([
    "epochs",
    "batch_size",
    "latent_dim",
    "n_estimators",
    "max_samples",
    "n_components",
    "lr",
    "beta",
    "dropout",
    "nu",
  ]);
  expect(options.defaults).toEqual({
    deviceCode: "ATC",
    modelCode: "IF",
    segment: "default",
    thresholdPercentile: 99.5,
    windowSeconds: 60,
    trainingMethod: "reservoir",
    use: "N",
    sensorWeights: [],
    addedRowType: "float",
  });
  (options.presets.IF as unknown as { value: string }[])[0].value = "1";
  expect((await fetchModelConfigOptions()).presets.IF[0].value).toBe("200");

  const loaded = await fetchModelConfigProfile({ deviceCode: "AXLE_BEARING", modelCode: "IF", segment: "default" });
  expect(loaded).toMatchObject({
    id: "cfg-1",
    name: "AXLE_BEARING IF 프로파일",
    description: "민감도 조정본",
    thresholdPercentile: 99.9,
    windowSeconds: 60,
    trainingMethod: "reservoir",
    use: "N",
  });
  expect(loaded?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T15:00:00$/);
  expect(await fetchModelConfigProfile({ deviceCode: "AXLE_BEARING", modelCode: "SVM", segment: "default" })).toBeNull();
  expect(await fetchModelConfigProfile({ deviceCode: "AXLE_BEARING", modelCode: "IF", segment: "unit_a" })).toBeNull();
  const controller = new AbortController();
  controller.abort();
  await expect(
    fetchModelConfigProfile({ deviceCode: "AXLE_BEARING", modelCode: "IF", segment: "default" }, { signal: controller.signal }),
  ).rejects.toThrow();

  const scope = { deviceCode: "ESW", modelCode: "IF", segment: "zz-test" };
  const base: ModelConfigInput = {
    id: null,
    ...scope,
    name: "첫째",
    description: null,
    thresholdPercentile: 99,
    windowSeconds: 60,
    trainingMethod: "full",
    use: "Y",
    params: [],
    sensorWeights: [],
  };
  const firstId = await saveModelConfig(base);
  expect((await fetchModelConfigProfile(scope))?.name).toBe("첫째");
  const secondId = await saveModelConfig({ ...base, name: "둘째" });
  expect(secondId).not.toBe(firstId);
  expect((await fetchModelConfigProfile(scope))?.name).toBe("둘째");
  expect(await saveModelConfig({ ...base, id: secondId, name: "둘째", use: "N" })).toBe(secondId);
  const afterBothN = await fetchModelConfigProfile(scope);
  expect([afterBothN?.name, afterBothN?.use]).toEqual(["둘째", "N"]);
  await saveModelConfig({ ...base, id: firstId, name: "첫째", use: "Y" });
  await saveModelConfig({ ...base, name: "셋째", use: "N" });
  expect((await fetchModelConfigProfile(scope))?.name).toBe("첫째");
  await saveModelConfig({ ...base, id: firstId, name: "첫째 고침", thresholdPercentile: 95.5, description: "메모" });
  expect(await fetchModelConfigProfile(scope)).toMatchObject({
    id: firstId,
    name: "첫째 고침",
    thresholdPercentile: 95.5,
    description: "메모",
  });
  await expect(saveModelConfig({ ...base, id: "cfg-999" })).rejects.toThrow("프로파일 없음: cfg-999");
  const saved = await fetchModelConfigProfile(scope);
  if (saved === null) throw new Error("저장한 프로파일 없음");
  const duplicate = createModelConfigDraft(saved, { name: `${saved.name} 복사본`, use: "N" });
  expect([duplicate.name, duplicate.use, duplicate.description]).toEqual(["첫째 고침 복사본", "N", "메모"]);
});
