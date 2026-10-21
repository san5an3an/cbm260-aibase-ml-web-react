import { expect, test, type Page } from "@playwright/test";
import { measure, openFixedScreen, pickOption } from "./helpers/measure";
import { requestedActions } from "./helpers/mockActions";

const PATH = "/model/threshold";
const ROOT = '[data-slot="threshold-tuning"]';
const FILTER = '[data-slot="threshold-tuning-filter-bar"]';
const KPI = '[data-slot="threshold-tuning-kpi-row"] [data-slot="kpi-stat"]';
const BAR = '[data-slot="threshold-histogram-bar"]';
const TARGET = '[data-slot="threshold-apply-target"]';
const DIALOG = '[data-dialog="threshold-apply-existing"]';

async function open(page: Page, width = 1920, height = 1080) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFixedScreen(page, PATH, BAR, width, height);
}

async function kpiTexts(page: Page) {
  return page
    .locator(KPI)
    .evaluateAll((elements) =>
      elements.map((element) =>
        ["kpi-stat-label", "kpi-stat-value", "kpi-stat-unit"]
          .map((slot) => element.querySelector(`[data-slot="${slot}"]`)?.textContent ?? "")
          .join("|"),
      ),
    );
}

async function choose(page: Page, label: string, option: string) {
  await page.locator(FILTER).getByRole("combobox", { name: label }).click();
  await pickOption(page, option);
}

test("1920 화면의 조건 Row, KPI 여섯 개, Card의 위치와 크기", async ({ page }) => {
  await open(page);
  const bar = await measure(page, FILTER);
  expect(bar.style.paddingTop).toBe("16px");
  expect(bar.style.borderTopLeftRadius).toBe("16px");
  const triggers = page.locator(`${FILTER} [data-slot="select-trigger"]`);
  expect((await triggers.nth(0).boundingBox())?.width).toBeCloseTo(190, 0);
  expect((await triggers.nth(1).boundingBox())?.width).toBeCloseTo(120, 0);
  expect((await triggers.nth(0).boundingBox())?.height).toBeCloseTo(32, 0);
  const segment = await measure(page, `${FILTER} [data-slot="text-input"]`);
  expect(segment.width).toBeCloseTo(220, 0);
  await expect(page.locator('[data-slot="threshold-tuning-window-count"]')).toHaveText(
    "학습 특징벡터 14,516 window 기준",
  );
  const row = await measure(page, '[data-slot="threshold-tuning-kpi-row"]');
  expect(row.height).toBeCloseTo(112, 0);
  expect(row.style.columnGap).toBe("14px");
  const kpi = await measure(page, KPI);
  expect(kpi.style.borderLeftWidth).toBe("4px");
  expect(kpi.style.borderTopLeftRadius).toBe("12px");
  expect(await kpiTexts(page)).toEqual([
    "저장 임계값|0.8000|",
    "미리보기 임계값|0.9874|",
    "백분위|99.9|%",
    "학습 데이터 초과|0.10|%",
    "운영 이상 비율|0.42 → 0.61|%",
    "운영 이상 window|1,230|/ 201,600",
  ]);
  const card = await measure(page, '[data-slot="threshold-preview-card"]');
  expect(card.style.paddingLeft).toBe("18px");
  expect(card.style.borderTopLeftRadius).toBe("16px");
  const root = await page.locator(ROOT).boundingBox();
  const cardBox = await page.locator('[data-slot="threshold-preview-card"]').boundingBox();
  expect(Math.abs((cardBox!.y + cardBox!.height) - (root!.y + root!.height))).toBeLessThan(1);
  await expect(page.locator(TARGET)).toHaveText(
    "적용 대상: AXLE_BEARING IF 프로파일 · 사용 N · 현재 99.9%",
  );
});

test("분포에서 학습 Bar 64, 운영 계단선, 미리보기 임계값을 넘는 Cell 1, 선 위치, Tooltip 확인", async ({ page }) => {
  await open(page);
  await expect(page.locator(BAR)).toHaveCount(64);
  const step = await page.locator('[data-slot="threshold-operating-line"] path').getAttribute("d");
  expect(step?.match(/H/g)?.length).toBe(64);
  const over = await page
    .locator('[data-slot="threshold-histogram-bar-fill"]')
    .evaluateAll((elements) =>
      elements.filter((element) => (element as HTMLElement).style.backgroundImage.includes("--danger")).length,
    );
  expect(over).toBe(1);
  const plot = (await page.locator('[data-slot="threshold-histogram-plot"]').boundingBox())!;
  const preview = (await page.locator('[data-slot="threshold-preview-line"]').boundingBox())!;
  const saved = (await page.locator('[data-slot="threshold-saved-line"]').boundingBox())!;
  expect(preview.x - plot.x).toBeCloseTo(plot.width * 0.9874, 0);
  expect(saved.x - plot.x).toBeCloseTo(plot.width * 0.8, 0);
  await expect(page.locator('[data-slot="threshold-preview-pill"]')).toHaveText("미리보기 0.9874");
  await expect(page.locator('[data-slot="threshold-saved-pill"]')).toHaveText("저장 0.8000");
  await page.locator(BAR).nth(63).hover();
  await expect(page.getByText("점수 0.984 ~ 1.000")).toBeVisible();
  await expect(page.getByText(/학습 .* · 운영 .* · 미리보기 임계 초과/)).toBeVisible();
  const dimmed = await page
    .locator('[data-slot="threshold-histogram-bar-fill"]')
    .evaluateAll((elements) => elements.filter((element) => getComputedStyle(element).opacity === "0.55").length);
  expect(dimmed).toBe(63);
});

test("백분위는 Slider Keyboard 조작이나 Input으로 바꾸면 미리보기를 다시 계산하고 범위에 맞춤", async ({ page }) => {
  await open(page);
  await page.getByRole("slider", { name: "임계 백분위" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`).nth(2)).toHaveText("99.8");
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`).nth(1)).toHaveText("0.9748");
  const input = page.getByRole("textbox", { name: "임계 백분위 입력" });
  await input.fill("95");
  await input.blur();
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`).nth(1)).toHaveText("0.7055");
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`).nth(3)).toHaveText("5.00");
  await expect(input).toHaveValue("95.0");
  await input.fill("80");
  await input.blur();
  await expect(input).toHaveValue("90.0");
  await expect(page.locator(`${KPI} [data-slot="kpi-stat-value"]`).nth(1)).toHaveText("0.6168");
  await input.fill("abc");
  await input.blur();
  await expect(input).toHaveValue("90.0");
});

test("불러오기에서 장치를 안 고르면 경고가 표시되고, 고르면 그 범위로 다시 불러옴", async ({ page }) => {
  await open(page);
  await choose(page, "장치", "장치 선택");
  await page.getByRole("button", { name: "불러오기" }).click();
  await expect(page.locator('[data-slot="threshold-tuning-device-error"]')).toHaveText("장치를 선택하세요.");
  await choose(page, "장치", "ECU");
  await expect(page.locator('[data-slot="threshold-tuning-device-error"]')).toHaveCount(0);
  await choose(page, "모델", "VAE");
  await page.getByRole("button", { name: "불러오기" }).click();
  await expect(page.getByText("ECU · VAE 분포를 불러왔습니다.")).toBeVisible();
  await expect(page.locator(TARGET)).toHaveText("적용 대상: ECU VAE 프로파일 · 사용 Y · 현재 99.3%");
  await expect(page.locator('[data-slot="threshold-tuning-window-count"]')).not.toHaveText(/14,516/);
});

test("임계 튜닝 기존 Profile 반영은 확인 문구, 취소, 반영하면 저장하고 대상을 다시 호출함", async ({ page }) => {
  await open(page);
  const input = page.getByRole("textbox", { name: "임계 백분위 입력" });
  await input.fill("95");
  await input.blur();
  await page.getByRole("button", { name: "기존 프로파일에 반영" }).click();
  const dialog = page.locator(DIALOG);
  await expect(dialog.getByText("기존 프로파일에 반영할까요?")).toBeVisible();
  await expect(
    dialog.getByText(
      "AXLE_BEARING IF 프로파일의 임계 백분위를 99.9%에서 95%로 바꿉니다. 사용 여부(N)는 그대로이며, 다음 재학습부터 적용됩니다.",
    ),
  ).toBeVisible();
  const frame = (await dialog.boundingBox())!;
  expect(frame.width).toBeCloseTo(520, 0);
  await dialog.getByRole("button", { name: "취소" }).click();
  await expect(dialog).toHaveCount(0);
  expect(await requestedActions(page)).toEqual([]);
  await page.getByRole("button", { name: "기존 프로파일에 반영" }).click();
  await page.locator(DIALOG).getByRole("button", { name: "반영" }).click();
  await expect(page.getByText("저장되었습니다.")).toBeVisible();
  await expect(page.locator(DIALOG)).toHaveCount(0);
  expect(await requestedActions(page)).toEqual([{ name: "saveModelConfig", target: "cfg-1" }]);
  await expect(page.locator(TARGET)).toHaveText("적용 대상: AXLE_BEARING IF 프로파일 · 사용 N · 현재 95.0%");
});

test("새 Profile로 저장, Profile이 없을 때 반영", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "새 프로파일로 저장 (N)" }).click();
  await expect(page.getByText("설정 저장됨 (미사용 상태). 모델 커스텀에서 사용(Y)으로 활성화하세요.")).toBeVisible();
  expect(await requestedActions(page)).toEqual([{ name: "saveModelConfig", target: "new" }]);
  await expect(page.locator(TARGET)).toHaveText("적용 대상: 임계튜닝 p99.9 · 사용 N · 현재 99.9%");
  await choose(page, "모델", "SVM");
  await page.getByRole("button", { name: "불러오기" }).click();
  await expect(page.locator(TARGET)).toHaveText("적용 대상: AXLE_BEARING SVM 프로파일 없음");
  await page.getByRole("button", { name: "기존 프로파일에 반영" }).click();
  await expect(page.getByText("같은 장치·모델·세그먼트 프로파일이 없습니다. 새 프로파일로 저장하세요.")).toBeVisible();
  await expect(page.locator(DIALOG)).toHaveCount(0);
});

test("1440 Width, 다크 Theme, 2배 화면", async ({ page }) => {
  await open(page, 1440, 900);
  const root = (await page.locator(ROOT).boundingBox())!;
  const kpis = page.locator(KPI);
  expect((await kpis.nth(5).boundingBox())!.x + (await kpis.nth(5).boundingBox())!.width).toBeLessThanOrEqual(root.x + root.width + 0.5);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const card = await measure(page, '[data-slot="threshold-preview-card"]');
  expect(card.style.backgroundColor).not.toBe("rgb(255, 255, 255)");
  await open(page, 3840, 2160);
  const row = await measure(page, '[data-slot="threshold-tuning-kpi-row"]');
  expect(row.height).toBeCloseTo(224, 0);
});

test("백분위에서 Slider를 Drag하는 동안 미리보기 선이 학습 분포 어림값(≈)으로 따라 움직이고, 놓으면 다시 계산한 값으로 바뀜", async ({ page }) => {
  await open(page);
  const line = page.locator('[data-slot="threshold-preview-line"]');
  const pill = page.locator('[data-slot="threshold-preview-pill"]');
  const before = (await line.boundingBox())!.x;
  const thumb = (await page.getByRole("slider", { name: "임계 백분위" }).boundingBox())!;
  await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
  await page.mouse.down();
  await page.mouse.move(thumb.x - 600, thumb.y + thumb.height / 2, { steps: 8 });
  await expect.poll(async () => (await line.boundingBox())!.x).toBeLessThan(before - 50);
  await expect(pill).toContainText("≈");
  await page.mouse.up();
  await expect(pill).not.toContainText("≈");
  expect((await line.boundingBox())!.x).toBeLessThan(before - 50);
});

test("불러오기 Toast는 분포 Response가 성공한 뒤에만 표시되고, 실패하면 표시하지 않음", async ({ page }) => {
  const LOADED = "ECU · VAE 분포를 불러왔습니다.";
  await open(page);
  await choose(page, "장치", "ECU");
  await choose(page, "모델", "VAE");
  await page.evaluate(() => {
    (window as unknown as { cbmMockLatency: object }).cbmMockLatency = { searchMs: 1000 };
  });
  await page.getByRole("button", { name: "불러오기" }).click();
  await page.waitForTimeout(500);
  expect(await page.getByText(LOADED).count()).toBe(0);
  expect(await page.locator('[data-slot="threshold-tuning-window-count"]').textContent()).toMatch(/14,516/);
  await expect(page.getByText(LOADED)).toBeVisible();
  await expect(page.locator('[data-slot="threshold-tuning-window-count"]')).not.toHaveText(/14,516/);

  await page.reload();
  await expect(page.locator(BAR).first()).toBeVisible();
  await choose(page, "장치", "ECU");
  await choose(page, "모델", "VAE");
  await page.evaluate(() => {
    (window as unknown as { cbmMockLatency: object }).cbmMockLatency = { failNames: ["thresholdDistribution"] };
  });
  await page.getByRole("button", { name: "불러오기" }).click();
  await expect(page.getByText("임계 튜닝을 불러오지 못했습니다.")).toBeVisible();
  await page.waitForTimeout(300);
  expect(await page.getByText(LOADED).count()).toBe(0);
});
