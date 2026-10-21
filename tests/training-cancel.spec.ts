import { expect, test, type Page } from "@playwright/test";
import { cancelTrainingJob, fetchTrainingJobs } from "../src/services/training";
import { color, measure } from "./helpers/measure";
import { requestedActions, setMockActions } from "./helpers/mockActions";
import {
  box,
  confirmDialog,
  expectButton,
  focusIsInside,
  focusedSlot,
  footerButton,
  iconShape,
  modal,
  pressTab,
  shownIconShape,
} from "./helpers/modal";
import { openTraining } from "./helpers/training";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const FILTER = '[data-slot="training-filter-bar"]';
const KPI = '[data-slot="training-kpi-row"] [data-slot="kpi-stat"]';
const KPI_VALUE = `${KPI} [data-slot="kpi-stat-value"]`;
const KPI_DESCRIPTION = `${KPI} [data-slot="kpi-stat-description"]`;
const JOB = '[data-slot="training-job-list"] [data-slot="job-card"]';
const JOB_TITLE = `${JOB} [data-slot="job-card-title"]`;
const TOAST = '[data-slot="toast"]';
const JOB_DETAIL = modal("training-job-detail");
const FOOTER = `${JOB_DETAIL} [data-slot="dialog-footer"]`;
const FOOTER_BUTTON = `${FOOTER} [data-slot="action-button"]`;
const FOOTNOTE = `${JOB_DETAIL} [data-slot="modal-footnote"]`;
const CONFIRM = confirmDialog("training-job-cancel");
const CONFIRM_ACTION = `${CONFIRM} [data-slot="alert-dialog-action"]`;
const CONFIRM_DISMISS = `${CONFIRM} [data-slot="alert-dialog-cancel"]`;
const SCHEDULE = modal("training-schedule");

const SEED_JOB_IDS = ["trn-1000", "trn-1001", "trn-1002", "trn-1003", "trn-1004", "trn-1005"];
const CONFIRM_WIDTH = 520;

const cancelButton = (page: Page) => footerButton(page, JOB_DETAIL, "학습 취소");

async function openJob(page: Page, index: number): Promise<void> {
  await page.locator(JOB).nth(index).click();
  await expect(page.locator(JOB_DETAIL)).toBeVisible();
  await expect(
    page.locator(`${JOB_DETAIL} [data-slot="key-value-row-value"]`).nth(9),
  ).not.toHaveText("–");
}

async function shownJobIds(page: Page): Promise<string[]> {
  const ids: string[] = [];
  const count = await page.locator(JOB).count();
  for (let index = 0; index < count; index += 1) {
    await openJob(page, index);
    const title = (await page.locator(`${JOB_DETAIL} [data-slot="dialog-title"]`).textContent()) ?? "";
    ids.push(title.replace("학습 상세 · ", ""));
    await page.keyboard.press("Escape");
    await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  }
  return ids;
}

test("학습 취소 Button은 예약과 진행 중(학습, 전처리)에만 아래 왼쪽에 위험 Button으로 있고 성공과 실패에는 없으며 닫기는 그대로임", async ({
  page,
}) => {
  await openTraining(page);
  for (const index of [0, 1, 4]) {
    await openJob(page, index);
    await expect(page.locator(`${JOB_DETAIL} [data-slot="dialog-title"]`)).toHaveText(
      `학습 상세 · ${SEED_JOB_IDS[index]}`,
    );
    await expect(page.locator(FOOTER_BUTTON)).toHaveText(["학습 취소", "닫기"]);
    await expectButton(page, FOOTER_BUTTON, {
      height: 32,
      paddingX: 16,
      weight: "600",
      background: "var(--danger)",
      text: "var(--danger-fg)",
    });
    await expect(page.locator(FOOTER_BUTTON).nth(0)).toHaveAttribute("data-variant", "danger");
    await expect(page.locator(`${FOOTER_BUTTON} svg`)).toHaveCount(0);
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
    const footer = await box(page, FOOTER);
    const cancel = await box(page, FOOTER_BUTTON, 0);
    const close = await box(page, FOOTER_BUTTON, 1);
    const footnote = await box(page, FOOTNOTE);
    expect(cancel.x).toBeCloseTo(footer.x, 1);
    expect(footnote.x).toBeCloseTo(cancel.x + cancel.width + 8, 1);
    expect(close.x + close.width).toBeCloseTo(footer.x + footer.width, 1);
    expect(footnote.height).toBeLessThanOrEqual(16);
    await expect(page.locator(FOOTNOTE)).toHaveText(
      "실패 시 오류 메시지가 이 자리에 표시됩니다 · 완료되면 결과(세그먼트·window·특징 수)가 표시됩니다",
    );
    await page.keyboard.press("Escape");
    await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  }

  for (const index of [2, 3]) {
    await openJob(page, index);
    await expect(page.locator(FOOTER_BUTTON)).toHaveText(["닫기"]);
    await page.keyboard.press("Escape");
    await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  }
  await openJob(page, 5);
  await expect(page.locator(FOOTER_BUTTON)).toHaveText(["닫기", "재시도"]);
  await expect(cancelButton(page)).toHaveCount(0);
});

test("취소 확인은 정해진 Text, Icon, Button으로 상세 위에 겹쳐 표시되고, 돌아가기와 Esc는 확인만 닫고 Job은 그대로임", async ({
  page,
}) => {
  await openTraining(page);
  await expect(page.locator(KPI_VALUE).nth(2)).toHaveText("3");
  await openJob(page, 4);
  await cancelButton(page).click();

  await expect(page.locator(CONFIRM)).toBeVisible();
  await expect(page.locator(CONFIRM)).toHaveAttribute("role", "alertdialog");
  await expect(page.locator(`${CONFIRM} [data-slot="alert-dialog-title"]`)).toHaveText(
    "정말 취소하시겠습니까?",
  );
  await expect(page.locator(`${CONFIRM} [data-slot="alert-dialog-description"]`)).toHaveText(
    "해당 작업은 되돌릴 수 없습니다.",
  );
  await expect(page.locator(CONFIRM_DISMISS)).toHaveText("돌아가기");
  await expect(page.locator(CONFIRM_ACTION)).toHaveText("학습 취소");
  const media = await measure(page, `${CONFIRM} [data-slot="alert-dialog-media"]`);
  expect(media.style.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect(media.style.color).toBe(await color(page, "var(--danger)"));
  expect(await shownIconShape(page, `${CONFIRM} [data-slot="alert-dialog-media"]`)).toBe(
    iconShape("Cancel"),
  );
  await expectButton(page, CONFIRM_ACTION, {
    height: 40,
    paddingX: 16,
    weight: "600",
    background: "var(--danger)",
    text: "var(--on-primary)",
  });
  await expectButton(page, CONFIRM_DISMISS, {
    height: 40,
    paddingX: 16,
    weight: "600",
    background: "var(--card)",
    text: "var(--fg)",
    border: "var(--border)",
  });
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("창 크기 없음");
  const frame = await box(page, CONFIRM);
  expect(frame.width).toBe(CONFIRM_WIDTH);
  expect(frame.x).toBeCloseTo((viewport.width - CONFIRM_WIDTH) / 2, 1);
  await expect(page.locator(JOB_DETAIL)).toBeVisible();
  expect(
    await page.evaluate(() => {
      const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      return top?.closest("[data-dialog]")?.getAttribute("data-dialog") ?? null;
    }),
  ).toBe("training-job-cancel");

  await page.mouse.click(40, 40);
  await page.waitForTimeout(200);
  await expect(page.locator(CONFIRM)).toBeVisible();
  await page.locator(CONFIRM_DISMISS).click();
  await expect(page.locator(CONFIRM)).toHaveCount(0);
  await expect(page.locator(JOB_DETAIL)).toBeVisible();
  await expect(page.locator(JOB)).toHaveCount(6);
  await expect(page.locator(TOAST)).toHaveCount(0);
  await cancelButton(page).click();
  await expect(page.locator(CONFIRM)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(CONFIRM)).toHaveCount(0);
  await expect(page.locator(JOB_DETAIL)).toBeVisible();
  await footerButton(page, JOB_DETAIL, "닫기").click();
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB)).toHaveCount(6);
  await expect(page.locator(KPI_VALUE).nth(2)).toHaveText("3");
  await expect(page.locator(KPI_DESCRIPTION).nth(2)).toHaveText("예약 1 · 전처리 1 · 학습 1");
  expect(await shownJobIds(page)).toEqual(SEED_JOB_IDS);
});

test("취소 확인에서 예약 Job을 취소하면 확인과 상세가 닫히고 그 Job이 List에서 사라지며 KPI에 반영되고 Toast가 표시됨", async ({
  page,
}) => {
  await openTraining(page);
  await openJob(page, 4);
  await cancelButton(page).click();
  await page.locator(CONFIRM_ACTION).click();

  await expect(page.locator(CONFIRM)).toHaveCount(0);
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("trn-1004 학습을 취소했습니다.");
  await expect(page.locator(TOAST)).toHaveAttribute("data-tone", "success");
  await expect(page.locator(JOB)).toHaveCount(5);
  await expect(page.locator(JOB_TITLE)).toHaveText([
    "DRIVING_GEAR · IF",
    "ECU · SVM",
    "DCU · VAE",
    "TCMS · PCA",
    "MICOM_COOLER · SVM",
  ]);
  await expect(page.locator(KPI_VALUE).nth(2)).toHaveText("2");
  await expect(page.locator(KPI_DESCRIPTION).nth(2)).toHaveText("예약 0 · 전처리 1 · 학습 1");
  await expect(page.locator(KPI_VALUE).nth(4)).toHaveText("1");
  expect(await shownJobIds(page)).toEqual(["trn-1000", "trn-1001", "trn-1002", "trn-1003", "trn-1005"]);
});

test("취소 확인에서 진행 중 Job(학습, 전처리 단계)도 취소되어 List에서 사라지고 KPI에 반영됨", async ({
  page,
}) => {
  await openTraining(page);
  await openJob(page, 0);
  await cancelButton(page).click();
  await page.locator(CONFIRM_ACTION).click();
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("trn-1000 학습을 취소했습니다.");
  await expect(page.locator(JOB)).toHaveCount(5);
  await expect(page.locator(KPI_VALUE).nth(2)).toHaveText("2");
  await expect(page.locator(KPI_DESCRIPTION).nth(2)).toHaveText("예약 1 · 전처리 1 · 학습 0");
  await openJob(page, 0);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="dialog-title"]`)).toHaveText(
    "학습 상세 · trn-1001",
  );
  await cancelButton(page).click();
  await page.locator(CONFIRM_ACTION).click();
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await expect(page.locator(TOAST).filter({ hasText: "trn-1001 학습을 취소했습니다." })).toBeVisible();
  await expect(page.locator(JOB)).toHaveCount(4);
  await expect(page.locator(JOB_TITLE)).toHaveText([
    "DCU · VAE",
    "TCMS · PCA",
    "UNVR · IF",
    "MICOM_COOLER · SVM",
  ]);
  await expect(page.locator(KPI_VALUE).nth(2)).toHaveText("1");
  await expect(page.locator(KPI_DESCRIPTION).nth(2)).toHaveText("예약 1 · 전처리 0 · 학습 0");
});

test("취소한 뒤 새로 예약해도 지운 Job의 번호를 다시 쓰지 않아 실패 Job trn-1005와 겹치지 않음", async ({
  page,
}) => {
  await openTraining(page);
  await openJob(page, 4);
  await cancelButton(page).click();
  await page.locator(CONFIRM_ACTION).click();
  await expect(page.locator(JOB)).toHaveCount(5);

  await page.locator(FILTER).getByRole("button", { name: "학습 예약", exact: true }).click();
  await expect(page.locator(SCHEDULE)).toBeVisible();
  await page.locator(`${SCHEDULE} [data-slot="toggle-group-item"]`).nth(2).click();
  await footerButton(page, SCHEDULE, "예약").click();
  await expect(page.locator(SCHEDULE)).toHaveCount(0);
  await expect(page.locator(TOAST).filter({ hasText: "학습 예약 완료" })).toHaveText(
    "학습 예약 완료 — trn-1006 / QUEUED",
  );
  await expect(page.locator(JOB)).toHaveCount(7);
  const ids = await shownJobIds(page);
  expect(ids).toEqual([
    "trn-1006",
    "trn-1006-1",
    "trn-1000",
    "trn-1001",
    "trn-1002",
    "trn-1003",
    "trn-1005",
  ]);
  expect(new Set(ids).size).toBe(ids.length);
});

test("Request 중과 실패 시 기다리는 동안 학습 취소, 돌아가기, Esc를 받지 않고, 실패하면 실패 Toast가 표시되며 Dialog와 Job은 그대로이고 다시 Click하면 취소됨", async ({
  page,
}) => {
  await openTraining(page);
  await openJob(page, 4);
  await cancelButton(page).click();
  await expect(page.locator(CONFIRM)).toBeVisible();
  await setMockActions(page, { delayMs: 2500, failNames: ["cancelTrainingJob"] });
  await page.locator(CONFIRM_ACTION).click();

  await expect(page.locator(CONFIRM_ACTION)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(CONFIRM_ACTION)).toBeFocused();
  await expect(page.locator(FOOTER_BUTTON).nth(0)).toHaveAttribute("aria-disabled", "true");
  await page.locator(CONFIRM_DISMISS).click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await expect(page.locator(CONFIRM)).toBeVisible();
  await expect(page.locator(JOB_DETAIL)).toBeVisible();
  await expect(
    page.locator(`${FILTER} [data-slot="action-button"]`, { hasText: "학습 예약" }),
  ).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(JOB).nth(0)).toHaveAttribute("aria-disabled", "true");

  const failedToast = page.locator(TOAST).filter({ hasText: "학습 취소를 요청하지 못했습니다." });
  await expect(failedToast).toBeVisible({ timeout: 6000 });
  await expect(failedToast).toHaveAttribute("data-tone", "error");
  await expect(page.locator(CONFIRM)).toBeVisible();
  await expect(page.locator(JOB_DETAIL)).toBeVisible();
  await expect(page.locator(CONFIRM_ACTION)).not.toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(JOB)).toHaveCount(6);
  await expect(page.locator(KPI_VALUE).nth(2)).toHaveText("3");

  await setMockActions(page, { delayMs: 800 });
  await page.locator(CONFIRM_ACTION).click();
  await expect(page.locator(CONFIRM_ACTION)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(CONFIRM)).toHaveCount(0, { timeout: 6000 });
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await expect(page.locator(TOAST).filter({ hasText: "trn-1004 학습을 취소했습니다." })).toBeVisible();
  await expect(page.locator(JOB)).toHaveCount(5);
  await expect(page.locator(KPI_VALUE).nth(2)).toHaveText("2");
});

test("Keyboard에서 Enter로 확인을 열고 Focus는 확인 안에서 순환하며, Esc는 확인만 닫고 학습 취소로 돌아오고, Enter로 취소함", async ({
  page,
}) => {
  await openTraining(page);
  await openJob(page, 4);
  await cancelButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(CONFIRM)).toBeVisible();
  await expect.poll(() => focusIsInside(page, CONFIRM)).toBe(true);
  for (let step = 0; step < 4; step += 1) {
    await pressTab(page);
    expect(await focusIsInside(page, CONFIRM)).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(CONFIRM)).toHaveCount(0);
  await expect(page.locator(JOB_DETAIL)).toBeVisible();
  await expect(cancelButton(page)).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator(CONFIRM)).toBeVisible();
  await expect.poll(() => focusIsInside(page, CONFIRM)).toBe(true);
  for (let step = 0; step < 3 && (await focusedSlot(page)) !== "alert-dialog-action"; step += 1) {
    await pressTab(page);
  }
  expect(await focusedSlot(page)).toBe("alert-dialog-action");
  await page.keyboard.press("Enter");
  await expect(page.locator(CONFIRM)).toHaveCount(0);
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB)).toHaveCount(5);
  await expect(page.locator(TOAST)).toHaveText("trn-1004 학습을 취소했습니다.");
});

test("다크 Theme에서 학습 취소 Button과 확인 Dialog의 Color", async ({ page }) => {
  await openTraining(page);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator("html")).toHaveClass(/dark/);
  const token = (name: string) => color(page, `var(--${name})`);

  await openJob(page, 1);
  const cancel = await measure(page, FOOTER_BUTTON, 0);
  expect(cancel.style.backgroundColor).toBe(await token("danger"));
  expect(cancel.style.color).toBe(await token("danger-fg"));
  await cancelButton(page).click();
  await expect(page.locator(CONFIRM)).toBeVisible();
  const overlays = page.locator('[data-slot="alert-dialog-overlay"]');
  expect(
    await overlays.last().evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe(await token("scrim"));
  const frame = (await measure(page, CONFIRM)).style;
  expect(frame.backgroundColor).toBe(await token("surface-low"));
  expect(frame.borderTopColor).toBe(await token("border"));
  const media = (await measure(page, `${CONFIRM} [data-slot="alert-dialog-media"]`)).style;
  expect(media.backgroundColor).toBe(await token("danger-subtle"));
  expect(media.color).toBe(await token("danger"));
  expect((await measure(page, `${CONFIRM} [data-slot="alert-dialog-title"]`)).style.color).toBe(
    await token("fg"),
  );
  expect(
    (await measure(page, `${CONFIRM} [data-slot="alert-dialog-description"]`)).style.color,
  ).toBe(await token("muted-fg"));
  const dismiss = (await measure(page, CONFIRM_DISMISS)).style;
  expect(dismiss.backgroundColor).toBe(await token("card"));
  expect(dismiss.borderTopColor).toBe(await token("border"));
  expect(dismiss.color).toBe(await token("fg"));
  const action = (await measure(page, CONFIRM_ACTION)).style;
  expect(action.backgroundColor).toBe(await token("danger"));
  expect(action.color).toBe(await token("on-primary"));
  await page.locator(CONFIRM_ACTION).click();
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB)).toHaveCount(5);
});

test("Mock 실행 함수는 끝난 Job(성공, 실패)과 없는 Job은 취소할 수 없고 List는 그대로임", async () => {
  const before = (await fetchTrainingJobs()).map((job) => job.id);
  await expect(cancelTrainingJob("trn-1002")).rejects.toThrow("취소할 수 없는 학습 작업: trn-1002");
  await expect(cancelTrainingJob("trn-1005")).rejects.toThrow("취소할 수 없는 학습 작업: trn-1005");
  await expect(cancelTrainingJob("trn-9999")).rejects.toThrow("취소할 수 없는 학습 작업: trn-9999");
  expect((await fetchTrainingJobs()).map((job) => job.id)).toEqual(before);
});

const QUEUED_CANCEL = { name: "cancelTrainingJob", target: "trn-1004" };

test("Request 횟수는 확인 한 번에 Request 한 번이고, 학습 취소, 돌아가기, Esc, 상세 닫기로는 Request 0임", async ({
  page,
}) => {
  await openTraining(page);
  await openJob(page, 4);
  await cancelButton(page).click();
  await page.locator(CONFIRM_DISMISS).click();
  await expect(page.locator(CONFIRM)).toHaveCount(0);
  await cancelButton(page).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(CONFIRM)).toHaveCount(0);
  await footerButton(page, JOB_DETAIL, "닫기").click();
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  expect(await requestedActions(page)).toEqual([]);

  await openJob(page, 4);
  await cancelButton(page).click();
  expect(await requestedActions(page)).toEqual([]);
  await page.locator(CONFIRM_ACTION).click();
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB)).toHaveCount(5);
  expect(await requestedActions(page)).toEqual([QUEUED_CANCEL]);
});

test("Request 횟수는 확인을 겹쳐 Click해도 Request 한 번임(기다리는 동안, 바로 응답할 때)", async ({ page }) => {
  await openTraining(page);
  await openJob(page, 4);
  await cancelButton(page).click();
  await setMockActions(page, { delayMs: 1500 });
  await page.locator(CONFIRM_ACTION).dblclick();
  await expect(page.locator(CONFIRM_ACTION)).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  await page.locator(CONFIRM_ACTION).click({ force: true });
  expect(await requestedActions(page)).toEqual([QUEUED_CANCEL]);
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator(JOB)).toHaveCount(5);
  expect(await requestedActions(page)).toEqual([QUEUED_CANCEL]);

  await setMockActions(page, { delayMs: 0 });
  await openJob(page, 0);
  await expect(page.locator(`${JOB_DETAIL} [data-slot="dialog-title"]`)).toHaveText(
    "학습 상세 · trn-1000",
  );
  await cancelButton(page).click();
  await page.locator(CONFIRM_ACTION).dblclick();
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB)).toHaveCount(4);
  await page.waitForTimeout(300);
  expect(await requestedActions(page)).toEqual([
    QUEUED_CANCEL,
    { name: "cancelTrainingJob", target: "trn-1000" },
  ]);
  await expect(page.locator(TOAST).filter({ hasText: "학습 취소를 요청하지 못했습니다." })).toHaveCount(0);
});

test("Request 횟수는 Response 전에는 List에서 사라지지 않고, 실패한 Request도 한 번으로 셈", async ({ page }) => {
  await openTraining(page);
  await openJob(page, 4);
  await cancelButton(page).click();
  await setMockActions(page, { delayMs: 300, failNames: ["cancelTrainingJob"] });
  await page.locator(CONFIRM_ACTION).click();
  await expect(page.locator(TOAST).filter({ hasText: "학습 취소를 요청하지 못했습니다." })).toBeVisible();
  expect(await requestedActions(page)).toEqual([QUEUED_CANCEL]);
  await expect(page.locator(JOB)).toHaveCount(6);

  await setMockActions(page, { delayMs: 2000 });
  await page.locator(CONFIRM_ACTION).click();
  await expect.poll(() => requestedActions(page)).toEqual([QUEUED_CANCEL, QUEUED_CANCEL]);
  await page.waitForTimeout(1000);
  await expect(page.locator(CONFIRM)).toBeVisible();
  await expect(page.locator(JOB_DETAIL)).toBeVisible();
  await expect(page.locator(JOB)).toHaveCount(6);
  await expect(page.locator(KPI_VALUE).nth(2)).toHaveText("3");
  await expect(page.locator(JOB_DETAIL)).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator(JOB)).toHaveCount(5);
  await expect(page.locator(KPI_VALUE).nth(2)).toHaveText("2");
  expect(await requestedActions(page)).toEqual([QUEUED_CANCEL, QUEUED_CANCEL]);
});
