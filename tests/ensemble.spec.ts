import { expect, test, type Page } from "@playwright/test";
import { downloadCsv } from "./helpers/download";
import { color, MOCK_TODAY, openFixedScreen } from "./helpers/measure";
import { requestedActions, setMockActions } from "./helpers/mockActions";
import { box, boxes, confirmDialog, footerButton, modal, texts } from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const PATH = "/model/ensemble";
const FILTER = '[data-slot="ensemble-filter-bar"]';
const JOBS = '[data-slot="ensemble-jobs-card"]';
const JOB = `${JOBS} [data-slot="job-card"]`;
const JOB_TITLE = `${JOB} [data-slot="job-card-title"]`;
const VERDICT = '[data-slot="ensemble-verdict-card"]';
const MODEL_ROW = '[data-slot="ensemble-model-row"]';
const CONSENSUS_PERCENT = '[data-slot="ensemble-consensus-percent"]';
const TOAST = '[data-slot="toast"]';
const RUN = modal("ensemble-run");
const DETAIL = modal("ensemble-detail");
const ALARM = modal("alarm-create");
const CONFIRM = confirmDialog("ensemble-job-cancel");

const SEED_TITLES = [
  "PISC · SVM·IF·VAE",
  "TCMS · SVM·IF·VAE",
  "MICOM_COOLER · SVM·IF·VAE",
  "DCU · SVM·IF·VAE",
  "SIV · SVM·IF·VAE",
];

async function openEnsemble(page: Page, width = 1920, height = 1080): Promise<void> {
  await openFixedScreen(page, PATH, `${VERDICT} ${MODEL_ROW}`, width, height, MOCK_TODAY);
}

async function rowCells(page: Page, selector: string): Promise<string[][]> {
  return page.locator(selector).evaluateAll((rows) =>
    rows.map((row) => [...row.children].map((cell) => (cell as HTMLElement).innerText.replace(/\n/g, " ").trim())),
  );
}

test("모델 비교 Page의 조건 Row, Job Card, 판정 Card의 위치와 값 확인", async ({ page }) => {
  await openEnsemble(page);
  expect((await box(page, FILTER)).height).toBe(66);
  await expect(page.locator(`${FILTER} [data-slot="ensemble-filter-guide"]`)).toHaveText(
    "SVM · IF · VAE 3종을 한 번에 실행해 window별 이상 판정을 다수결(any / all)로 비교합니다",
  );
  const jobs = await box(page, JOBS);
  const verdict = await box(page, VERDICT);
  expect(jobs.width).toBeCloseTo(440, 0);
  expect(verdict.x - (jobs.x + jobs.width)).toBeCloseTo(14, 0);
  expect(verdict.y - ((await box(page, FILTER)).y + 66)).toBeCloseTo(14, 0);
  expect(await texts(page, JOB_TITLE)).toEqual(SEED_TITLES);
  await expect(page.locator(JOB).first()).toHaveAttribute("aria-current", "true");
  await expect(page.locator('[data-slot="ensemble-job-retry"]')).toHaveCount(2);
  for (const item of await page.locator('[data-slot="ensemble-job-item"]:has([data-slot="ensemble-job-retry"])').all()) {
    const card = await item.locator('[data-slot="job-card"]').boundingBox();
    const retry = await item.locator('[data-slot="ensemble-job-retry"]').boundingBox();
    expect(card && retry).toBeTruthy();
    expect(retry!.x).toBeGreaterThan(card!.x);
    expect(retry!.x + retry!.width).toBeLessThanOrEqual(card!.x + card!.width);
    expect(retry!.y).toBeGreaterThan(card!.y);
    expect(retry!.y + retry!.height).toBeLessThanOrEqual(card!.y + card!.height);
    const pill = await item.locator('[data-slot="job-card"] [data-slot="state-pill"]').boundingBox();
    expect(retry!.height).toBe(pill!.height);
    expect(retry!.y).toBe(pill!.y);
    expect(retry!.x + retry!.width).toBeLessThan(pill!.x);
    expect(await item.locator('[data-slot="action-button"]').getAttribute("data-variant")).toBe("primary");
  }
  await expect(page.locator('[data-slot="ensemble-job-item"]').nth(1).locator('[data-slot="ensemble-job-retry"]')).toBeVisible();
  await expect(page.locator(`${JOB} [data-slot="job-card-meta"]`).nth(1)).toHaveText("09-23 17:31 · 저장된 모델이 없습니다: device=TCMS");
  await expect(page.locator(`${JOB} [data-slot="job-card-meta"]`).first()).toHaveText("09-23 18:36 · 편성 415 · 09-22 ~ 09-23");

  await expect(page.locator(`${VERDICT} [data-slot="section-card-title"]`)).toHaveText("앙상블 판정 · PISC · 편성 415");
  expect(await rowCells(page, `${VERDICT} [data-slot="ensemble-verdict-meta"]`)).toEqual([
    ["Job ens-2005", "생성 2026-09-23 18:36 · 종료 18:40", "세그먼트 default · 전체 180 window"],
  ]);
  expect(await rowCells(page, `${VERDICT} ${MODEL_ROW}`)).toEqual([
    ["IF Isolation Forest", "30 / 180", "", "16.7%", "0.5200"],
    ["SVM One-Class SVM", "34 / 180", "", "18.9%", "-1.2500"],
    ["VAE Tabular VAE", "38 / 180", "", "21.1%", "0.0430"],
  ]);
  const rows = await boxes(page, `${VERDICT} ${MODEL_ROW}`);
  expect(rows.map((row) => row.height)).toEqual([56, 56, 56]);
  expect((await box(page, `${VERDICT} [data-slot="ensemble-model-table-head"]`)).height).toBe(44);
  const track = await box(page, `${VERDICT} [data-slot="ensemble-rate-bar"]`);
  const fill = await box(page, `${VERDICT} [data-slot="ensemble-rate-bar-fill"]`);
  expect(track.height).toBe(10);
  expect(fill.width / track.width).toBeCloseTo(30 / 180 / 0.27, 2);
  const percentColors = await page.locator(`${VERDICT} ${MODEL_ROW} > :nth-child(4)`).evaluateAll((cells) => cells.map((cell) => getComputedStyle(cell).color));
  expect(percentColors[0]).toBe(await color(page, "var(--on-warning-subtle)"));
  expect(percentColors[2]).toBe(await color(page, "var(--danger)"));
  expect(await texts(page, `${VERDICT} ${CONSENSUS_PERCENT}`)).toEqual(["21.0%", "16.0%"]);
});

test("모델 비교 Page에서 1440 너비일 때 Job Card의 Width는 360임", async ({ page }) => {
  await openEnsemble(page, 1440, 900);
  expect((await box(page, JOBS)).width).toBeCloseTo(360, 0);
});

test("모델 비교 상세의 판정 Modal 크기, 이상 구간, window 띠, Tooltip 확인", async ({ page }) => {
  await openEnsemble(page);
  await page.locator(JOB).nth(0).click();
  await expect(page.locator(DETAIL)).toBeVisible();
  await expect(page.locator(`${DETAIL} [data-slot="dialog-title"]`)).toHaveText("앙상블 상세 · PISC · 편성 415");
  const frame = await box(page, DETAIL);
  expect([frame.width, frame.height]).toEqual([1700, 900]);
  expect((await box(page, `${DETAIL} [data-slot="ensemble-detail-job"]`)).width).toBe(440);
  expect(await texts(page, `${DETAIL} [data-slot="ensemble-detail-job"] [data-slot="key-value-row-value"]`)).toEqual([
    "ens-2005", "2026-09-23 18:36 · 18:40", "PISC", "SVM · IF · VAE (3종 고정)", "415", "2026-09-22 ~ 2026-09-23", "default · 전체 180 window", "60",
  ]);
  expect(await rowCells(page, `${DETAIL} [data-slot="ensemble-segment-row"]`)).toEqual([
    ["window 20 – 27", "8개", "3 / 3", "3모델 일치"],
    ["window 28 – 30", "3개", "VAE·SVM (+IF 1)", "일부 모델"],
    ["window 61 – 68", "8개", "3 / 3", "3모델 일치"],
    ["window 69 – 71", "3개", "VAE (+SVM 2)", "일부 모델"],
    ["window 110 – 116", "7개", "3 / 3", "3모델 일치"],
    ["window 117 – 119", "3개", "VAE", "일부 모델"],
    ["window 150 – 155", "6개", "3 / 3", "3모델 일치"],
  ]);
  expect((await rowCells(page, `${DETAIL} [data-slot="ensemble-strip-row"]`)).map((row) => [row[0], row[2]])).toEqual([
    ["IF", "30"], ["SVM", "34"], ["VAE", "38"], ["ANY", "38"], ["ALL", "29"],
  ]);
  expect(await texts(page, `${DETAIL} [data-slot="ensemble-strip-tick"]`)).toEqual(["0", "30", "60", "90", "120", "150", "180"]);
  const block = await box(page, `${DETAIL} [data-slot="ensemble-strip-block"]`);
  const stripTrack = await page.locator(`${DETAIL} [data-slot="ensemble-strip-block"]`).first().evaluate((el) => el.parentElement!.getBoundingClientRect().toJSON());
  expect((block.x - stripTrack.x) / stripTrack.width).toBeCloseTo(20 / 180, 3);
  expect(block.width / stripTrack.width).toBeCloseTo(9 / 180, 3);
  await page.mouse.move(block.x + block.width / 2, block.y + block.height / 2);
  await expect(page.locator('[data-slot="cursor-tooltip"]')).toHaveText("IF · window 20 – 28이상 9개");
  expect(await texts(page, `${DETAIL} [data-slot="dialog-footer"] [data-slot="action-button"]`)).toEqual(["CSV 내보내기", "알람으로 등록", "닫기"]);
  expect(await texts(page, `${DETAIL} ${CONSENSUS_PERCENT}`)).toEqual(["21.0%", "16.0%"]);
  await footerButton(page, DETAIL, "닫기").click();
  await expect(page.locator(DETAIL)).toHaveCount(0);
});

test("모델 비교 상세의 CSV 내려받기와 Alarm 등록에 채운 값 확인", async ({ page }) => {
  await openEnsemble(page);
  await page.locator(JOB).nth(0).click();
  const csv = await downloadCsv(page, `${DETAIL} [data-slot="dialog-footer"] [data-slot="action-button"]`, 0);
  expect(csv.hasByteOrderMark).toBe(true);
  expect(csv.lines).toEqual([
    "판정,이상 window,전체 window,이상 비율,임계값",
    "IF,30,180,16.7%,0.5200",
    "SVM,34,180,18.9%,-1.2500",
    "VAE,38,180,21.1%,0.0430",
    "ANY,38,180,21.0%,-",
    "ALL,29,180,16.0%,-",
  ]);
  expect(await requestedActions(page)).toEqual([{ name: "exportEnsembleJobCsv", target: "ens-2005" }]);
  await footerButton(page, DETAIL, "알람으로 등록").click();
  await expect(page.locator(ALARM)).toBeVisible();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  const alarm = page.locator(ALARM);
  await expect(alarm.getByRole("textbox", { name: "편성" })).toHaveValue("415");
  await expect(alarm.getByRole("textbox", { name: "이상비율" })).toHaveValue("16.0");
  await expect(alarm.getByRole("textbox", { name: "발생시각" })).toHaveValue("2026-09-23 18:36:00");
  await expect(alarm.getByRole("textbox", { name: "코멘트" })).toHaveValue("앙상블 ens-2005 · ALL 일치 구간");
});

test("모델 비교 상세(실패)의 Width 1000, 실패 띠, 재시도가 새 Job을 만들고 다시 호출함", async ({ page }) => {
  await openEnsemble(page);
  await page.locator(JOB).nth(1).click();
  await expect(page.locator(`${DETAIL} [data-slot="dialog-title"]`)).toHaveText("앙상블 상세 · ens-2004 · 실패");
  expect((await box(page, DETAIL)).width).toBe(1000);
  await expect(page.locator(`${DETAIL} [data-slot="alert-banner"]`)).toContainText("앙상블 추론 실패 — 저장된 모델이 없습니다: device=TCMS.");
  expect(await texts(page, `${DETAIL} [data-slot="key-value-row-label"]`)).toEqual(["Job ID", "상태", "생성 · 종료", "장치", "사용 모델", "편성", "추론 기간"]);
  expect(await texts(page, `${DETAIL} [data-slot="dialog-footer"] [data-slot="action-button"]`)).toEqual(["닫기", "재시도"]);
  await footerButton(page, DETAIL, "재시도").click();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(TOAST).last()).toHaveText("ens-2006 재시도 요청 — 원래 조건으로 다시 요청했습니다.");
  await expect(page.locator(JOB_TITLE).first()).toHaveText("TCMS · SVM·IF·VAE");
  await expect(page.locator(`${JOB} [data-slot="state-pill"]`).first()).toHaveText("추론 중");
  expect(await requestedActions(page)).toEqual([{ name: "retryEnsembleJob", target: "ens-2004" }]);
});

test("모델 비교에서 재시도가 실패하면 실패 알림만 띄우고 List는 그대로임", async ({ page }) => {
  await openEnsemble(page);
  await setMockActions(page, { failNames: ["retryEnsembleJob"] });
  await page.locator('[data-slot="ensemble-job-retry"] [data-slot="action-button"]').first().click();
  await expect(page.locator(TOAST).last()).toHaveText("재시도를 요청하지 못했습니다.");
  expect(await texts(page, JOB_TITLE)).toEqual(SEED_TITLES);
});

test("모델 비교의 Ensemble 실행에서 잠긴 Model, 장치 확인, Request 뒤 예약 Card, 취소 확인", async ({ page }) => {
  await openEnsemble(page);
  await page.locator(`${FILTER} [data-slot="action-button"]`).click();
  await expect(page.locator(`${RUN} [data-slot="dialog-title"]`)).toHaveText("앙상블 실행");
  await expect(page.locator(`${RUN} [data-slot="ensemble-run-models"]`)).toHaveText("SVM · IF · VAE");
  await expect(page.locator(`${RUN} [data-slot="ensemble-run-models-note"]`)).toHaveText("모델은 SVM · IF · VAE 3종 고정입니다 (수정 불가)");
  await expect(page.locator(`${RUN} [data-slot="modal-footnote"]`)).toHaveText("세 모델 모두 학습본이 있는 장치만 실행됩니다");
  await footerButton(page, RUN, "앙상블 실행").click();
  await expect(page.locator(`${RUN} [role="alert"]`)).toHaveText("추론 대상 장치를 선택하세요");
  await page.locator(`${RUN} [data-slot="job-request-device-list"] [data-slot="checkbox-item"]`).first().click();
  await footerButton(page, RUN, "앙상블 실행").click();
  await expect(page.locator(RUN)).toHaveCount(0);
  await expect(page.locator(TOAST).last()).toHaveText("요청 완료 — ens-2006 / QUEUED");
  await expect(page.locator(`${JOB} [data-slot="state-pill"]`).first()).toHaveText("예약");
  expect((await requestedActions(page)).map((item) => item.name)).toEqual(["runEnsemble"]);

  await page.locator(JOB).first().click();
  await expect(page.locator(`${DETAIL} [data-slot="dialog-title"]`)).toHaveText("앙상블 상세 · ens-2006");
  await footerButton(page, DETAIL, "앙상블 취소").click();
  await expect(page.locator(CONFIRM)).toBeVisible();
  await page.locator(`${CONFIRM} [data-slot="alert-dialog-action"]`).dblclick();
  await expect(page.locator(DETAIL)).toHaveCount(0);
  await expect(page.locator(TOAST).last()).toHaveText("ens-2006 앙상블 추론을 취소했습니다.");
  expect(await texts(page, JOB_TITLE)).toEqual(SEED_TITLES);
  expect((await requestedActions(page)).filter((item) => item.name === "cancelEnsembleJob")).toEqual([
    { name: "cancelEnsembleJob", target: "ens-2006" },
  ]);
});

test("모델 비교 상세 조회가 실패하면 판정 Card 안에만 실패 문구가 표시되고 화면은 그대로임", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { cbmMockActions: { failNames: string[] } }).cbmMockActions = { failNames: ["ensembleJobDetail"] };
  });
  await openFixedScreen(page, PATH, JOB, 1920, 1080, MOCK_TODAY);
  await expect(page.locator(VERDICT)).toContainText("앙상블 판정을 불러오지 못했습니다.");
  expect(await texts(page, JOB_TITLE)).toEqual(SEED_TITLES);
});

test("모델 비교에서 실패 사유가 긴 Card에 Mouse를 올리면 넘친 만큼 왼쪽으로 흘러 끝까지 보이고, 떼면 돌아옴", async ({ page }) => {
  await openEnsemble(page);
  const meta = page.locator('[data-slot="ensemble-job-item"]', { hasText: "DCU" }).locator('[data-slot="job-card-meta"] [data-slot="marquee-text"]');
  const overflow = await meta.evaluate((box) => (box.firstElementChild as HTMLElement).scrollWidth - box.clientWidth);
  expect(overflow).toBeGreaterThan(0);
  await expect(meta).toHaveAttribute("data-overflowing", "");
  await meta.hover();
  await expect
    .poll(() =>
      meta.evaluate((box) => {
        const text = (box.firstElementChild as HTMLElement).getBoundingClientRect();
        return Math.round(text.right - box.getBoundingClientRect().right);
      }),
    )
    .toBe(0);
  await page.mouse.move(0, 0);
  await expect
    .poll(() => meta.evaluate((box) => Math.round((box.firstElementChild as HTMLElement).getBoundingClientRect().left - box.getBoundingClientRect().left)))
    .toBe(0);
});

test("모델 비교에서 Job이 하나도 없을 때 판정 Card는 Loading 중이 아니라 고를 Job이 없다는 빈 상태로 표시됨", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { cbmMockEnsemble?: { emptyJobs?: boolean } }).cbmMockEnsemble = { emptyJobs: true };
  });
  await openFixedScreen(page, PATH, `${JOBS} [data-slot="empty-state"]`, 1920, 1080, MOCK_TODAY);
  await expect(page.locator(JOB)).toHaveCount(0);
  const empty = `${VERDICT} [data-slot="empty-state"]`;
  await expect(page.locator(`${empty} [data-slot="empty-state-title"]`)).toHaveText("고를 앙상블 작업이 없습니다");
  await expect(page.locator(`${empty} [data-slot="empty-state-description"]`)).toHaveText(
    "앙상블 실행으로 작업을 요청하면 판정이 표시됩니다.",
  );
  await expect(page.locator(VERDICT)).not.toContainText("앙상블 판정을 불러오는 중…");
});

test("모델 비교 상세 조회가 실패한 뒤 같은 Job을 다시 Click하면 상세를 다시 호출함", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { cbmMockActions: { failNames: string[] } }).cbmMockActions = { failNames: ["ensembleJobDetail"] };
  });
  await openFixedScreen(page, PATH, JOB, 1920, 1080, MOCK_TODAY);
  await expect(page.locator(VERDICT)).toContainText("앙상블 판정을 불러오지 못했습니다.");
  await setMockActions(page, { failNames: [] });
  await page.locator(JOB).first().click();
  await expect(page.locator(`${DETAIL} [data-slot="dialog-title"]`)).toHaveText("앙상블 상세 · PISC · 편성 415");
  await expect(page.locator(`${DETAIL} ${MODEL_ROW}`).first()).toBeVisible();
  await expect(page.locator(`${VERDICT} ${MODEL_ROW}`).first()).toBeVisible();
  await expect(page.locator(VERDICT)).not.toContainText("앙상블 판정을 불러오지 못했습니다.");
});
