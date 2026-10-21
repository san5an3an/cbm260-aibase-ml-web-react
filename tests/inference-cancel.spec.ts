import { expect, test, type Page } from "@playwright/test";
import { cancelInferenceJob, fetchInferenceJobs } from "../src/services/inference";
import { INFERENCE_RESULT_ROW, openInference } from "./helpers/inference";
import { color, delayMockResponses, measure } from "./helpers/measure";
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

test.use({ contextOptions: { reducedMotion: "reduce" } });

const FILTER = '[data-slot="inference-filter-bar"]';
const JOBS = '[data-slot="inference-jobs-card"]';
const JOB = '[data-slot="inference-job-list"] [data-slot="job-card"]';
const JOB_TITLE = `${JOB} [data-slot="job-card-title"]`;
const ROW = INFERENCE_RESULT_ROW;
const TOAST = '[data-slot="toast"]';
const RUN = modal("inference-run");
const DETAIL = modal("inference-detail");
const FOOTER = `${DETAIL} [data-slot="dialog-footer"]`;
const FOOTER_BUTTON = `${FOOTER} [data-slot="action-button"]`;
const KV_VALUE = `${DETAIL} [data-slot="key-value-row-value"]`;
const DEVICE_ITEM = `${RUN} [data-slot="job-request-device-list"] [data-slot="checkbox-item"]`;
const SEGMENT_ITEM = `${RUN} [data-slot="toggle-group-item"]`;
const CONFIRM = confirmDialog("inference-job-cancel");
const CONFIRM_ACTION = `${CONFIRM} [data-slot="alert-dialog-action"]`;
const CONFIRM_DISMISS = `${CONFIRM} [data-slot="alert-dialog-cancel"]`;

const SEED_TITLES = ["TRACTION_MOTOR · SVM", "ECU · VAE", "MICOM_AIRPURIFIER · PCA", "VVVF · IF"];
const SEED_JOB_IDS = ["inf-2000", "inf-2003", "inf-2002", "inf-2004"];
const RUNNING_INDEX = 2;
const SEED_ROW_COUNT = 9;
const CONFIRM_WIDTH = 520;
const RUNNING_CANCEL = { name: "cancelInferenceJob", target: "inf-2002" };

const cancelButton = (page: Page) => footerButton(page, DETAIL, "추론 취소");
const runButton = (page: Page) =>
  page.locator(`${FILTER} [data-slot="action-button"]`, { hasText: "추론 실행" });
const failedOnlySwitch = (page: Page) => page.locator(JOBS).getByRole("switch", { name: "실패만 보기" });

async function openJobDetail(page: Page, index: number): Promise<void> {
  await page.locator(JOB).nth(index).click();
  await expect(page.locator(DETAIL)).toBeVisible();
  await expect(page.locator(KV_VALUE).first()).toBeVisible();
}

async function runOneDevice(page: Page): Promise<void> {
  await runButton(page).click();
  await expect(page.locator(RUN)).toBeVisible();
  await page.locator(SEGMENT_ITEM).nth(0).click();
  await page.locator(`${DEVICE_ITEM} [data-slot="checkbox"]`).nth(0).click();
  await footerButton(page, RUN, "추론 실행").click();
  await expect(page.locator(RUN)).toHaveCount(0);
}

async function shownJobIds(page: Page): Promise<string[]> {
  const ids: string[] = [];
  const count = await page.locator(JOB).count();
  for (let index = 0; index < count; index += 1) {
    await openJobDetail(page, index);
    ids.push((await page.locator(KV_VALUE).nth(0).textContent()) ?? "");
    await page.keyboard.press("Escape");
    await expect(page.locator(DETAIL)).toHaveCount(0);
  }
  return ids;
}

async function expectCancelFooter(page: Page): Promise<void> {
  await expect(page.locator(FOOTER_BUTTON)).toHaveText(["추론 취소", "닫기"]);
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
    { height: 32, paddingX: 16, weight: "600", background: "var(--primary)", text: "var(--on-primary)" },
    1,
  );
  const footer = await box(page, FOOTER);
  const cancel = await box(page, FOOTER_BUTTON, 0);
  const close = await box(page, FOOTER_BUTTON, 1);
  expect(cancel.x).toBeCloseTo(footer.x, 1);
  expect(cancel.y).toBeCloseTo(close.y, 1);
  expect(close.x + close.width).toBeCloseTo(footer.x + footer.width, 1);
}

test("추론 취소 Button은 요청됨과 추론 중일 때만 바닥 왼쪽에 위험 Button으로 표시되고 성공, 실패, 결과 Row의 Job에는 없음", async ({
  page,
}) => {
  await openInference(page);
  await runOneDevice(page);
  for (const [index, id, status] of [
    [0, "inf-2043", "예약"],
    [3, "inf-2002", "추론 중"],
  ] as const) {
    await openJobDetail(page, index);
    await expect(page.locator(KV_VALUE).nth(0)).toHaveText(id);
    await expect(page.locator(KV_VALUE).nth(1)).toHaveText(status);
    await expectCancelFooter(page);
    await page.keyboard.press("Escape");
    await expect(page.locator(DETAIL)).toHaveCount(0);
  }
  for (const index of [1, 2]) {
    await openJobDetail(page, index);
    await expect(page.locator(KV_VALUE).nth(1)).toHaveText("성공");
    await expect(page.locator(FOOTER_BUTTON)).toHaveText(["닫기"]);
    await page.keyboard.press("Escape");
    await expect(page.locator(DETAIL)).toHaveCount(0);
  }
  await page.locator(ROW).nth(0).click();
  await expect(page.locator(KV_VALUE).nth(0)).toHaveText("inf-1999");
  await expect(page.locator(KV_VALUE).nth(1)).toHaveText("성공");
  await expect(page.locator(FOOTER_BUTTON)).toHaveText(["닫기"]);
  await page.keyboard.press("Escape");
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await failedOnlySwitch(page).click();
  for (const index of [0, 1]) {
    await openJobDetail(page, index);
    await expect(page.locator(FOOTER_BUTTON)).toHaveText(["추론 실행으로 이동", "닫기", "재시도"]);
    await expect(cancelButton(page)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.locator(DETAIL)).toHaveCount(0);
  }
});

test("취소 확인은 정해진 Text, Icon, Button으로 상세 위에 겹쳐 표시되고, 돌아가기와 Esc는 확인만 닫고 Job은 그대로임", async ({
  page,
}) => {
  await openInference(page);
  await openJobDetail(page, RUNNING_INDEX);
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
  await expect(page.locator(CONFIRM_ACTION)).toHaveText("추론 취소");
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
  await expect(page.locator(DETAIL)).toBeVisible();
  expect(
    await page.evaluate(() => {
      const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      return top?.closest("[data-dialog]")?.getAttribute("data-dialog") ?? null;
    }),
  ).toBe("inference-job-cancel");

  await page.mouse.click(40, 40);
  await page.waitForTimeout(200);
  await expect(page.locator(CONFIRM)).toBeVisible();
  await page.locator(CONFIRM_DISMISS).click();
  await expect(page.locator(CONFIRM)).toHaveCount(0);
  await expect(page.locator(DETAIL)).toBeVisible();
  await expect(page.locator(JOB)).toHaveCount(4);
  await expect(page.locator(TOAST)).toHaveCount(0);
  await cancelButton(page).click();
  await expect(page.locator(CONFIRM)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(CONFIRM)).toHaveCount(0);
  await expect(page.locator(DETAIL)).toBeVisible();
  await footerButton(page, DETAIL, "닫기").click();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB_TITLE)).toHaveText(SEED_TITLES);
  await expect(page.locator(ROW)).toHaveCount(SEED_ROW_COUNT);
  expect(await shownJobIds(page)).toEqual(SEED_JOB_IDS);
});

test("요청됨 Job을 취소하면 확인과 상세가 닫히고 그 Job이 List에서 사라지며 알림이 표시됨", async ({
  page,
}) => {
  await openInference(page);
  await runOneDevice(page);
  await expect(page.locator(JOB_TITLE)).toHaveText(["ATC · IF", ...SEED_TITLES.slice(0, 3)]);
  await openJobDetail(page, 0);
  await cancelButton(page).click();
  await page.locator(CONFIRM_ACTION).click();

  await expect(page.locator(CONFIRM)).toHaveCount(0);
  await expect(page.locator(DETAIL)).toHaveCount(0);
  const canceled = page.locator(TOAST).filter({ hasText: "inf-2043 추론을 취소했습니다." });
  await expect(canceled).toBeVisible();
  await expect(canceled).toHaveAttribute("data-tone", "success");
  await expect(page.locator(JOB_TITLE)).toHaveText(SEED_TITLES);
  await expect(page.locator(ROW)).toHaveCount(SEED_ROW_COUNT);
  expect(await shownJobIds(page)).toEqual(SEED_JOB_IDS);
});

test("추론 중 Job도 취소되어 List에서 사라지고 실패 Job과 결과 Table은 그대로임", async ({
  page,
}) => {
  await openInference(page);
  await openJobDetail(page, RUNNING_INDEX);
  await expect(page.locator(KV_VALUE).nth(0)).toHaveText("inf-2002");
  await cancelButton(page).click();
  await page.locator(CONFIRM_ACTION).click();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(TOAST)).toHaveText("inf-2002 추론을 취소했습니다.");
  await expect(page.locator(TOAST)).toHaveAttribute("data-tone", "success");
  await expect(page.locator(JOB_TITLE)).toHaveText(["TRACTION_MOTOR · SVM", "ECU · VAE", "VVVF · IF"]);
  await expect(page.locator(ROW)).toHaveCount(SEED_ROW_COUNT);
  await failedOnlySwitch(page).click();
  await expect(page.locator(JOB_TITLE)).toHaveText(["MICOM_COOLER · VAE", "ESW · IF"]);
});

test("취소한 뒤 새로 실행해도 번호가 겹치지 않고 지운 수만큼 번호를 건너뜀", async ({ page }) => {
  await openInference(page);
  await runOneDevice(page);
  await expect(page.locator(TOAST)).toHaveText("추론 요청 완료 — inf-2043 / QUEUED");
  await openJobDetail(page, 3);
  await expect(page.locator(KV_VALUE).nth(0)).toHaveText("inf-2002");
  await cancelButton(page).click();
  await page.locator(CONFIRM_ACTION).click();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await runOneDevice(page);
  await expect(page.locator(TOAST).filter({ hasText: "추론 요청 완료" }).last()).toHaveText(
    "추론 요청 완료 — inf-2044 / QUEUED",
  );
  const ids = await shownJobIds(page);
  expect(ids).toEqual(["inf-2044", "inf-2043", "inf-2000", "inf-2003"]);
  expect(new Set(ids).size).toBe(ids.length);
});

test("취소한 뒤 Job List와 결과 Table을 둘 다 다시 호출하고, 받는 동안 Card와 Row가 옅게 잠김", async ({
  page,
}) => {
  await openInference(page);
  await openJobDetail(page, RUNNING_INDEX);
  await cancelButton(page).click();
  await delayMockResponses(page, 1500);
  await page.locator(CONFIRM_ACTION).click();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB).nth(0)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(ROW).nth(0)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(JOB)).toHaveCount(3, { timeout: 5000 });
  await expect(page.locator(ROW).nth(0)).toHaveAttribute("aria-disabled", "false", { timeout: 5000 });
  await expect(page.locator(JOB).nth(0)).not.toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(ROW)).toHaveCount(SEED_ROW_COUNT);
});

test("Request 중 기다리는 동안 추론 취소, 돌아가기, Esc, 닫기를 받지 않고, 실패하면 실패 알림이 표시되며 Dialog과 Job은 그대로이고, 다시 Click하면 취소됨", async ({
  page,
}) => {
  await openInference(page);
  await openJobDetail(page, RUNNING_INDEX);
  await cancelButton(page).click();
  await expect(page.locator(CONFIRM)).toBeVisible();
  await setMockActions(page, { delayMs: 2500, failNames: ["cancelInferenceJob"] });
  await page.locator(CONFIRM_ACTION).click();

  await expect(page.locator(CONFIRM_ACTION)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(CONFIRM_ACTION)).toBeFocused();
  await expect(page.locator(FOOTER_BUTTON).nth(0)).toHaveAttribute("aria-disabled", "true");
  await page.locator(CONFIRM_DISMISS).click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await expect(page.locator(CONFIRM)).toBeVisible();
  await expect(page.locator(DETAIL)).toBeVisible();
  await expect(runButton(page)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(JOB).nth(0)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(ROW).nth(0)).toHaveAttribute("aria-disabled", "true");

  const failedToast = page.locator(TOAST).filter({ hasText: "추론 취소를 요청하지 못했습니다." });
  await expect(failedToast).toBeVisible({ timeout: 6000 });
  await expect(failedToast).toHaveAttribute("data-tone", "error");
  await expect(page.locator(CONFIRM)).toBeVisible();
  await expect(page.locator(DETAIL)).toBeVisible();
  await expect(page.locator(CONFIRM_ACTION)).not.toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(JOB_TITLE)).toHaveText(SEED_TITLES);

  await setMockActions(page, { delayMs: 800 });
  await page.locator(CONFIRM_ACTION).click();
  await expect(page.locator(CONFIRM_ACTION)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(CONFIRM)).toHaveCount(0, { timeout: 6000 });
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(TOAST).filter({ hasText: "inf-2002 추론을 취소했습니다." })).toBeVisible();
  await expect(page.locator(JOB)).toHaveCount(3);
});

test("Keyboard로 Enter를 눌러 확인을 열고 Focus는 확인 안에서 순환하며, Esc는 확인만 닫고 추론 취소로 돌아오며, Enter로 취소함", async ({
  page,
}) => {
  await openInference(page);
  await openJobDetail(page, RUNNING_INDEX);
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
  await expect(page.locator(DETAIL)).toBeVisible();
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
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB)).toHaveCount(3);
  await expect(page.locator(TOAST)).toHaveText("inf-2002 추론을 취소했습니다.");
});

test("다크 Theme에서 추론 취소 Button과 확인 Dialog의 Color 확인", async ({ page }) => {
  await openInference(page);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator("html")).toHaveClass(/dark/);
  const token = (name: string) => color(page, `var(--${name})`);

  await openJobDetail(page, RUNNING_INDEX);
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
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB)).toHaveCount(3);
});

test("확인 한 번에 Request 한 번이고, 추론 취소, 돌아가기, Esc, 상세 닫기로는 Request가 0건임", async ({
  page,
}) => {
  await openInference(page);
  await openJobDetail(page, RUNNING_INDEX);
  await cancelButton(page).click();
  await page.locator(CONFIRM_DISMISS).click();
  await expect(page.locator(CONFIRM)).toHaveCount(0);
  await cancelButton(page).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(CONFIRM)).toHaveCount(0);
  await footerButton(page, DETAIL, "닫기").click();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  expect(await requestedActions(page)).toEqual([]);

  await openJobDetail(page, RUNNING_INDEX);
  await cancelButton(page).click();
  expect(await requestedActions(page)).toEqual([]);
  await page.locator(CONFIRM_ACTION).click();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB)).toHaveCount(3);
  expect(await requestedActions(page)).toEqual([RUNNING_CANCEL]);
});

test("확인을 겹쳐 Click해도 Request는 한 번임(기다리는 동안, 바로 응답할 때 모두)", async ({ page }) => {
  await openInference(page);
  await openJobDetail(page, RUNNING_INDEX);
  await cancelButton(page).click();
  await setMockActions(page, { delayMs: 1500 });
  await page.locator(CONFIRM_ACTION).dblclick();
  await expect(page.locator(CONFIRM_ACTION)).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  await page.locator(CONFIRM_ACTION).click({ force: true });
  expect(await requestedActions(page)).toEqual([RUNNING_CANCEL]);
  await expect(page.locator(DETAIL)).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator(JOB)).toHaveCount(3);
  expect(await requestedActions(page)).toEqual([RUNNING_CANCEL]);

  await setMockActions(page, { delayMs: 0 });
  await runOneDevice(page);
  await openJobDetail(page, 0);
  await expect(page.locator(KV_VALUE).nth(0)).toHaveText("inf-2043");
  await cancelButton(page).click();
  await page.locator(CONFIRM_ACTION).dblclick();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(JOB_TITLE)).toHaveText(["TRACTION_MOTOR · SVM", "ECU · VAE", "VVVF · IF"]);
  await page.waitForTimeout(300);
  expect(await requestedActions(page)).toEqual([
    RUNNING_CANCEL,
    { name: "cancelInferenceJob", target: "inf-2043" },
  ]);
  await expect(page.locator(TOAST).filter({ hasText: "추론 취소를 요청하지 못했습니다." })).toHaveCount(0);
});

test("Response 전에는 List에서 사라지지 않고 실패한 Request도 한 번으로 집계됨", async ({ page }) => {
  await openInference(page);
  await openJobDetail(page, RUNNING_INDEX);
  await cancelButton(page).click();
  await setMockActions(page, { delayMs: 300, failNames: ["cancelInferenceJob"] });
  await page.locator(CONFIRM_ACTION).click();
  await expect(page.locator(TOAST).filter({ hasText: "추론 취소를 요청하지 못했습니다." })).toBeVisible();
  expect(await requestedActions(page)).toEqual([RUNNING_CANCEL]);
  await expect(page.locator(JOB_TITLE)).toHaveText(SEED_TITLES);

  await setMockActions(page, { delayMs: 2000 });
  await page.locator(CONFIRM_ACTION).click();
  await expect.poll(() => requestedActions(page)).toEqual([RUNNING_CANCEL, RUNNING_CANCEL]);
  await page.waitForTimeout(1000);
  await expect(page.locator(CONFIRM)).toBeVisible();
  await expect(page.locator(DETAIL)).toBeVisible();
  await expect(page.locator(JOB_TITLE)).toHaveText(SEED_TITLES);
  await expect(page.locator(DETAIL)).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator(JOB_TITLE)).toHaveText(["TRACTION_MOTOR · SVM", "ECU · VAE", "VVVF · IF"]);
  expect(await requestedActions(page)).toEqual([RUNNING_CANCEL, RUNNING_CANCEL]);
});

test("Mock 실행 함수는 끝난 Job(성공, 실패), 결과 Row의 Job, 없는 Job을 취소할 수 없고 List는 그대로임", async () => {
  const before = (await fetchInferenceJobs()).jobs.map((job) => job.id);
  await expect(cancelInferenceJob("inf-2000")).rejects.toThrow("취소할 수 없는 추론 작업: inf-2000");
  await expect(cancelInferenceJob("inf-2005")).rejects.toThrow("취소할 수 없는 추론 작업: inf-2005");
  await expect(cancelInferenceJob("inf-1999")).rejects.toThrow("취소할 수 없는 추론 작업: inf-1999");
  await expect(cancelInferenceJob("inf-9999")).rejects.toThrow("취소할 수 없는 추론 작업: inf-9999");
  expect((await fetchInferenceJobs()).jobs.map((job) => job.id)).toEqual(before);
});
