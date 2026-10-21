import { expect, test, type Page } from "@playwright/test";
import {
  changeModelConfigUse,
  fetchModelConfigs,
  saveModelConfig,
} from "../src/services/modelConfigs";
import { measure, openFixedScreen } from "./helpers/measure";
import { requestedActions, setMockActions } from "./helpers/mockActions";
import { box, boxes, confirmDialog, modal, texts } from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const PATH = "/model/config";
const CARD = '[data-slot="model-config-list-card"]';
const ROW = `${CARD} tbody [data-slot="table-row"]`;
const FILTER = '[data-slot="model-config-filter-bar"]';
const CONFIG = modal("model-config");
const DELETE = confirmDialog("model-config-delete");
const UNSAVED = confirmDialog("model-config-unsaved");
const TOAST = '[data-slot="toast"]:not([data-ending-style])';
const TITLE = `${CONFIG} [data-slot="dialog-title"]`;

const COLUMN_WIDTHS = [200, 90, 120, 140, 110, 190, 170, 200];

const field = (page: Page, label: string) =>
  page.locator(CONFIG).getByRole("textbox", { name: label, exact: true });
const rowButton = (page: Page, index: number, name: string) =>
  page.locator(ROW).nth(index).getByRole("button", { name, exact: true });

async function openConfigScreen(page: Page): Promise<void> {
  await openFixedScreen(page, PATH, ROW);
}

test("1920 화면의 조건 Row, Table, Page 번호의 위치, 크기, 값", async ({ page }) => {
  await openConfigScreen(page);
  const triggers = await boxes(page, `${FILTER} [data-slot="select-trigger"]`);
  expect(triggers.map((item) => [Math.round(item.width), Math.round(item.height)])).toEqual([
    [190, 32],
    [150, 32],
    [170, 32],
  ]);
  expect(await texts(page, `${FILTER} [data-slot="select-trigger"]`)).toEqual([
    "장치 (전체)",
    "모델 (전체)",
    "사용 여부 (전체)",
  ]);
  const filterBar = await box(page, FILTER);
  const newButton = await box(page, `${FILTER} > button:last-child`);
  expect(Math.round(filterBar.x + filterBar.width - 17 - (newButton.x + newButton.width))).toBe(0);
  const card = await measure(page, CARD);
  expect([card.style.paddingTop, card.style.paddingLeft, card.style.borderTopLeftRadius]).toEqual(["16px", "18px", "16px"]);
  await expect(page.locator(`${CARD} [data-slot="section-card-title"]`)).toHaveText("모델 커스텀 설정");
  await expect(page.locator(`${CARD} [data-slot="model-config-count"]`)).toHaveText("12건");
  const header = await box(page, `${CARD} thead [data-slot="table-row"]`);
  expect(Math.round(header.height)).toBe(44);
  await expect(page.locator(ROW)).toHaveCount(10);
  const firstRow = await box(page, ROW);
  expect(Math.round(firstRow.height)).toBe(52);
  const cells = await boxes(page, `${ROW}:first-child td`);
  expect(cells.slice(1).map((cell) => Math.round(cell.width))).toEqual(COLUMN_WIDTHS);
  expect(cells[0].width).toBeGreaterThanOrEqual(220);
  expect(await texts(page, `${ROW}:first-child td`)).toEqual([
    "AXLE_BEARING IF 프로파일민감도 조정본",
    "AXLE_BEARING",
    "IF",
    "default",
    "99.9",
    "60",
    "미사용",
    "2026-09-23 15:00",
    "수정복제삭제",
  ]);
  const switchTrack = await box(page, `${ROW}:first-child [data-slot="switch"]`);
  expect([Math.round(switchTrack.width), Math.round(switchTrack.height)]).toEqual([40, 24]);
  const editButton = await box(page, `${ROW}:first-child td:last-child button`);
  expect(Math.round(editButton.height)).toBe(30);
  await expect(page.getByRole("navigation", { name: "모델 커스텀 설정 쪽 이동" })).toContainText("2");
});

test("조건을 고르고 검색하면 맞는 Row만 표시되고 초기화하면 전부 표시됨", async ({ page }) => {
  await openConfigScreen(page);
  await page.locator(`${FILTER} [data-slot="select-trigger"]`).nth(1).click();
  await page.getByRole("option", { name: "SVM", exact: true }).click();
  await page.locator(`${FILTER} [data-slot="select-trigger"]`).nth(2).click();
  await page.getByRole("option", { name: "Y · 재학습 자동적용" }).click();
  await page.locator(FILTER).getByRole("button", { name: "검색" }).click();
  await expect(page.locator(`${CARD} [data-slot="model-config-count"]`)).toHaveText("2건");
  expect(await texts(page, `${ROW} td:nth-child(3)`)).toEqual(["SVM", "SVM"]);
  await page.locator(FILTER).getByRole("button", { name: "초기화" }).click();
  await expect(page.locator(`${CARD} [data-slot="model-config-count"]`)).toHaveText("12건");
});

test("모델 커스텀 수정은 그 Row의 값으로 열고 저장하면 List에 반영되며, 바꾼 채 닫으면 변경 취소 확인이 표시됨", async ({ page }) => {
  await openConfigScreen(page);
  await rowButton(page, 0, "수정").click();
  await expect(page.locator(TITLE)).toHaveText("모델 설정 수정");
  await expect(field(page, "설정 명")).toHaveValue("AXLE_BEARING IF 프로파일");
  await expect(field(page, "임계 백분위")).toHaveValue("99.9");
  await field(page, "임계 백분위").fill("95");
  await page.keyboard.press("Escape");
  await expect(page.locator(UNSAVED)).toBeVisible();
  await page.locator(UNSAVED).getByRole("button", { name: "취소" }).click();
  await page.locator(CONFIG).getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.locator(CONFIG)).toBeHidden();
  await expect(page.locator(TOAST)).toHaveText("저장되었습니다.");
  await expect(page.locator(`${ROW}:first-child td:nth-child(5)`)).toHaveText("95.0");
  const saves = (await requestedActions(page)).filter((item) => item.name === "saveModelConfig");
  expect(saves).toEqual([{ name: "saveModelConfig", target: "cfg-1" }]);
});

test("모델 커스텀 복제는 이름에 복사본, 사용 N으로 열고 새 Row로 생성함", async ({ page }) => {
  await openConfigScreen(page);
  await rowButton(page, 1, "복제").click();
  await expect(page.locator(TITLE)).toHaveText("새 설정 (복제)");
  await expect(field(page, "설정 명")).toHaveValue("TRACTION_MOTOR SVM 프로파일 복사본");
  await expect(page.locator(CONFIG).getByRole("switch")).not.toBeChecked();
  await page.locator(CONFIG).getByRole("button", { name: "생성", exact: true }).click();
  await expect(page.locator(CONFIG)).toBeHidden();
  await expect(page.locator(`${CARD} [data-slot="model-config-count"]`)).toHaveText("13건");
  await expect(page.locator(`${ROW}:first-child [data-slot="model-config-name"]`)).toHaveText(
    "TRACTION_MOTOR SVM 프로파일 복사본",
  );
  await expect(page.locator(`${ROW}:nth-child(3) td:nth-child(7)`)).toHaveText("사용");
});

test("모델 커스텀 새 설정은 빈 이름, IF 프리셋으로 열고 이름 없이 생성하면 오류가 표시됨", async ({ page }) => {
  await openConfigScreen(page);
  await page.locator(FILTER).getByRole("button", { name: "새 설정" }).click();
  await expect(page.locator(TITLE)).toHaveText("새 설정");
  await expect(field(page, "설정 명")).toHaveValue("");
  await expect(page.locator(CONFIG).getByLabel("하이퍼파라미터 1 키", { exact: true })).toHaveValue(
    "n_estimators",
  );
  await page.locator(CONFIG).getByRole("button", { name: "생성", exact: true }).click();
  await expect(page.locator(`${CONFIG} [data-slot="field-error"]`).first()).toHaveText(
    "설정 명을 입력하세요",
  );
  await field(page, "설정 명").fill("새 프로파일");
  await page.locator(CONFIG).getByRole("button", { name: "생성", exact: true }).click();
  await expect(page.locator(CONFIG)).toBeHidden();
  await expect(page.locator(`${ROW}:first-child td:nth-child(2)`)).toHaveText("ATC");
});

test("모델 커스텀 삭제는 사용 Y 안내를 묻고 지우면 Row가 빠지며, 실패하면 확인이 남음", async ({ page }) => {
  await openConfigScreen(page);
  await setMockActions(page, { failNames: ["deleteModelConfig"] });
  await rowButton(page, 1, "삭제").click();
  await expect(page.locator(DELETE)).toContainText("설정을 삭제할까요?");
  for (const sentence of [
    "TRACTION_MOTOR SVM 프로파일 설정이 삭제됩니다.",
    "사용 Y인 프로파일이라 다음 재학습부터는 기본 설정이 적용됩니다.",
    "삭제한 설정은 되돌릴 수 없습니다.",
  ]) {
    await expect(page.locator(DELETE)).toContainText(sentence);
  }
  await page.locator(DELETE).getByRole("button", { name: "삭제" }).click();
  await expect(page.locator(TOAST)).toHaveText("삭제하지 못했습니다.");
  await expect(page.locator(DELETE)).toBeVisible();
  await setMockActions(page, {});
  await page.locator(DELETE).getByRole("button", { name: "삭제" }).click();
  await expect(page.locator(DELETE)).toBeHidden();
  await expect(page.locator(`${CARD} [data-slot="model-config-count"]`)).toHaveText("11건");
  await expect(page.locator(`${ROW}:nth-child(2) [data-slot="model-config-name"]`)).toHaveText(
    "ECU VAE 프로파일",
  );
});

test("사용 Switch를 바꾸면 오른쪽 아래에 Toast가 표시되고 값이 바뀜", async ({ page }) => {
  await openConfigScreen(page);
  await page.locator(`${ROW}:first-child [data-slot="switch"]`).click();
  await expect(page.locator(`${CARD} [data-slot="model-config-message"]`)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText(
    "설정 AXLE_BEARING IF 프로파일을(를) 사용으로 바꿨습니다. 다음 재학습부터 적용됩니다.",
  );
  await expect(page.locator(`${ROW}:first-child td:nth-child(7)`)).toHaveText("사용");
  const changes = (await requestedActions(page)).filter((item) => item.name === "changeModelConfigUse");
  expect(changes).toEqual([{ name: "changeModelConfigUse", target: "cfg-1" }]);
});

test("연결 함수에서 사용 Y로 바꾸면 같은 범위의 다른 Y를 N으로 바꾸고, Page가 넘으면 빈 Row와 실제 Page 수를 반환함", async () => {
  const id = await saveModelConfig({
    id: null,
    name: "TCMS 둘째",
    description: null,
    deviceCode: "TCMS",
    modelCode: "SVM",
    segment: "default",
    thresholdPercentile: 99,
    windowSeconds: 60,
    trainingMethod: "full",
    use: "N",
    params: [],
    sensorWeights: [],
  });
  const change = await changeModelConfigUse(id, "Y");
  expect(change.turnedOff.map((config) => config.name)).toEqual(["TCMS SVM 프로파일"]);
  const page = await fetchModelConfigs({ deviceCode: null, modelCode: null, use: null, page: 9 });
  expect([page.rows.length, page.totalCount, page.pageCount]).toEqual([0, 13, 2]);
});
