import { expect, test, type Page } from "@playwright/test";
import type { DeviceFailureAlert } from "../src/domain/deviceFailure";
import {
  EMPTY_ALERT_QUEUE,
  reduceAlertQueue,
  type AlertQueueAction,
} from "../src/components/pages/monitoring-shell/useDeviceFailureAlerts";
import { color, measure, openFixedScreen } from "./helpers/measure";
import {
  box,
  confirmDialog,
  enterMotion,
  focusIsInside,
  iconShape,
  modal,
  pressTab,
  shownIconShape,
  styleOf,
  texts,
} from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const DIALOG = '[data-dialog="device-failure"]';
const OVERLAY = '[data-overlay="device-failure"]';
const HEADER = `${DIALOG} [data-slot="device-failure-header"]`;
const ICON = `${DIALOG} [data-slot="device-failure-icon"]`;
const EYEBROW = `${DIALOG} [data-slot="device-failure-eyebrow"]`;
const TITLE = `${DIALOG} [data-slot="alert-dialog-title"]`;
const BODY = `${DIALOG} [data-slot="device-failure-body"]`;
const DESCRIPTION = `${DIALOG} [data-slot="alert-dialog-description"]`;
const MESSAGE = `${DIALOG} [data-slot="device-failure-message"]`;
const FIELDS = `${DIALOG} [data-slot="device-failure-fields"]`;
const ROW = `${DIALOG} [data-slot="device-failure-row"]`;
const LABEL = `${DIALOG} [data-slot="device-failure-label"]`;
const VALUE = `${DIALOG} [data-slot="device-failure-value"]`;
const CONFIRM = `${DIALOG} [data-slot="device-failure-confirm"]`;

const TRAINING_ROW = '[data-slot="training-results-card"] tbody [data-slot="table-row"]';
const ALARM_SEGMENT = '[data-slot="chart-stack-segment"]';
const ALARM_FILTER_BUTTON = '[data-slot="alarm-filter-bar"] [data-slot="action-button"]';
const ALARM_ROW = '[data-slot="alarm-worklist-card"] tbody [data-slot="table-row"]';
const SEARCHING = '[data-slot="searching-overlay"]';
const TOAST_VIEWPORT = '[data-slot="toast-viewport"]';
const ERROR_TOAST = `${TOAST_VIEWPORT} [data-tone="error"]`;

const MESSAGE_TEXT = "재학습·추론 작업 중 아래 장치의 고장이 감지되었습니다.\n내용을 확인한 뒤 조치해 주세요.";
const SAMPLE_LABELS = ["장치명", "고장일시", "고장사유"];
const SAMPLE_REASON =
  "센서 통신 두절 — 모터 권선온도 센서가 30초 이상 응답하지 않아 진행 중이던 재학습이 중단되었습니다.";
const SAMPLE_VALUES = ["TRACTION_MOTOR", "2026-09-23 13:12:47", SAMPLE_REASON];
const SECOND_ALERT: Partial<DeviceFailureAlert> = {
  id: "failure-b",
  deviceCode: "AXLE_BEARING",
  failedAt: "2026-09-23T13:20:05",
  reason: "진동 센서 값 범위 이탈 — 축 베어링 진동이 기준의 3배를 넘어 진행 중이던 추론이 중단되었습니다.",
};
const ACKNOWLEDGE_FAILED_TEXT = "고장 알림을 확인 처리하지 못했습니다.";
const FIGMA_SHADOW =
  "0 16px 48px rgba(20,32,52,.24), 0 12px 64px rgba(217,48,54,.38), 0 0 0 6px rgba(217,48,54,.2)";

interface MockDeviceFailures {
  emit: (alerts?: readonly Partial<DeviceFailureAlert>[]) => void;
  requestedIds: string[];
  acknowledgedIds: string[];
  failAcknowledge: boolean;
  acknowledgeDelayMs: number;
}

type MockHost = { cbmMockDeviceFailures: MockDeviceFailures };

async function waitForSubscription(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as Partial<MockHost>).cbmMockDeviceFailures?.emit === "function",
  );
}

async function emitAlerts(page: Page, alerts?: readonly Partial<DeviceFailureAlert>[]): Promise<void> {
  await waitForSubscription(page);
  await page.evaluate((value) => (window as unknown as MockHost).cbmMockDeviceFailures.emit(value), alerts);
}

async function setMock(
  page: Page,
  settings: Partial<Pick<MockDeviceFailures, "failAcknowledge" | "acknowledgeDelayMs">>,
): Promise<void> {
  await waitForSubscription(page);
  await page.evaluate(
    (value) => Object.assign((window as unknown as MockHost).cbmMockDeviceFailures, value),
    settings,
  );
}

async function mockRecord(page: Page): Promise<{ requestedIds: string[]; acknowledgedIds: string[] }> {
  return page.evaluate(() => {
    const hook = (window as unknown as MockHost).cbmMockDeviceFailures;
    return { requestedIds: [...hook.requestedIds], acknowledgedIds: [...hook.acknowledgedIds] };
  });
}

async function waitForDialogSettled(page: Page): Promise<void> {
  await expect(page.locator(DIALOG)).toBeVisible();
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => {
          const target = (animation.effect as KeyframeEffect | null)?.target;
          return target instanceof Element && target.closest('[data-dialog], [data-overlay]') !== null;
        })
        .map((animation) => animation.finished),
    ),
  );
}

async function topmostIsInside(page: Page, point: { x: number; y: number }, selector: string): Promise<boolean> {
  return page.evaluate(
    ({ point, selector }) => document.elementFromPoint(point.x, point.y)?.closest(selector) != null,
    { point, selector },
  );
}

async function centerOf(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const found = await box(page, selector);
  return { x: found.x + found.width / 2, y: found.y + found.height / 2 };
}

async function expectFocusTrapped(page: Page): Promise<void> {
  await expect(page.locator(CONFIRM)).toBeFocused();
  for (const key of ["Tab", "Tab", "Shift+Tab", "Shift+Tab", "Tab"] as const) {
    await pressTab(page, key);
    await expect(page.locator(CONFIRM)).toBeFocused();
  }
}

function shadowLayers(boxShadow: string): number[][] {
  return boxShadow
    .split(/,\s*(?=rgba?\(|color\()/)
    .map((layer) => {
      const rgba = /rgba?\(([^)]+)\)/.exec(layer);
      const srgb = /color\(srgb ([^)]+)\)/.exec(layer);
      const channels = (rgba ?? srgb)?.[1].split(/[\s,/]+/).filter(Boolean).map(Number) ?? [];
      const scale = srgb ? 255 : 1;
      const rgb = channels.slice(0, 3).map((channel) => channel * scale);
      const lengths = [...layer.replace(/(rgba?|color)\([^)]*\)/, "").matchAll(/(-?[\d.]+)px/g)].map(
        (match) => Number(match[1]),
      );
      return [...lengths, ...rgb, channels[3] ?? 1];
    })
    .filter((layer) => layer.slice(0, 4).some((length) => length !== 0));
}

function channelsOf(value: string): number[] {
  return shadowLayers(`${value} 0px 0px 1px 0px`)[0].slice(4);
}

function expectNumbersClose(actual: number[][], expected: number[][]): void {
  expect(actual.length).toBe(expected.length);
  actual.forEach((layer, row) => {
    expect(layer.length).toBe(expected[row].length);
    layer.forEach((value, column) => {
      expect(Math.abs(value - expected[row][column]), `[${row}][${column}] ${value} ≠ ${expected[row][column]}`).toBeLessThan(0.6);
    });
  });
}

async function computedShadow(page: Page, value: string): Promise<string> {
  return page.evaluate((value) => {
    const probe = document.createElement("div");
    probe.style.boxShadow = value;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).boxShadow;
    probe.remove();
    return resolved;
  }, value);
}

async function openTrainingScreen(page: Page, width = 1920, height = 1080): Promise<void> {
  await openFixedScreen(page, "/info/training", TRAINING_ROW, width, height);
}

test("test hook을 호출하지 않으면 어느 화면에서도 Dialog이 뜨지 않고 수신만 시작함", async ({ page }) => {
  const screens = [
    ["/dashboard/fleet", '[data-slot="fleet-overview"]'],
    ["/dashboard/alarms", ALARM_SEGMENT],
    ["/dashboard/measures", '[data-slot="sensor-frequency-ranking-card"]'],
    ["/info/training", TRAINING_ROW],
    ["/info/inference", '[data-slot="inference-job-list"] [data-slot="job-card"]'],
    ["/model/config", '[data-slot="model-config-list-card"] tbody [data-slot="table-row"]'],
  ] as const;
  for (const [path, ready] of screens) {
    await openFixedScreen(page, path, ready);
    await waitForSubscription(page);
    await page.waitForTimeout(500);
    await expect(page.locator(DIALOG), path).toHaveCount(0);
    await expect(page.locator(OVERLAY), path).toHaveCount(0);
    expect(await mockRecord(page), path).toEqual({ requestedIds: [], acknowledgedIds: [] });
  }
});

test("test hook으로 샘플을 보내면 디자인의 Text, 이름, 값 Row 셋, 확인 Button, 경고 Icon이 alertdialog로 읽힘", async ({ page }) => {
  await openTrainingScreen(page);
  await emitAlerts(page);

  const dialog = page.getByRole("alertdialog", { name: "장치 고장이 감지되었습니다" });
  await expect(dialog).toBeVisible();
  await expect(page.locator(EYEBROW)).toHaveText("장치 고장 알림 · DEVICE FAILURE");
  await expect(page.locator(TITLE)).toHaveText("장치 고장이 감지되었습니다");
  expect(await page.locator(MESSAGE).innerText()).toBe(MESSAGE_TEXT);
  expect(await texts(page, LABEL)).toEqual(SAMPLE_LABELS);
  expect(await texts(page, VALUE)).toEqual(SAMPLE_VALUES);
  expect(await page.locator(ROW).evaluateAll((rows) => rows.map((row) => row.getAttribute("data-tone")))).toEqual([
    "emphasis",
    "normal",
    "danger",
  ]);
  await expect(dialog.getByRole("button")).toHaveCount(1);
  await expect(page.locator(CONFIRM)).toHaveText("확인");
  expect(await shownIconShape(page, ICON)).toBe(iconShape("WarningAmber"));
  await expect(page.locator(`${ICON} svg`)).toHaveAttribute("aria-hidden", "true");
  await expect(dialog).toHaveAccessibleDescription(
    /재학습·추론 작업 중 아래 장치의 고장이 감지되었습니다\..*장치명.*TRACTION_MOTOR.*고장일시.*2026-09-23 13:12:47.*고장사유.*센서 통신 두절/,
  );
  expect(await page.locator(`${FIELDS}`).evaluate((element) => element.tagName)).toBe("DL");
  expect(await page.locator(LABEL).first().evaluate((element) => element.tagName)).toBe("DT");
  expect(await page.locator(VALUE).first().evaluate((element) => element.tagName)).toBe("DD");
  await expect(page.locator(CONFIRM)).toBeFocused();
});

test("1920×1080에서 Dialog, 헤더, Icon, 안내, 이름, 값 Row, Button, Overlay의 치수, Font, Color 확인", async ({ page }) => {
  await openTrainingScreen(page);
  await emitAlerts(page);
  await waitForDialogSettled(page);

  const frame = await box(page, DIALOG);
  expect(frame).toEqual({ x: 680, y: 320, width: 560, height: 440 });
  const frameStyle = (await measure(page, DIALOG)).style;
  expect(frameStyle.backgroundColor).toBe(await color(page, "#f7f9fb"));
  expect(frameStyle.backgroundColor).toBe(await color(page, "var(--surface-low)"));
  expect(frameStyle.borderTopWidth).toBe("2px");
  expect(frameStyle.borderLeftWidth).toBe("2px");
  expect(frameStyle.borderBottomWidth).toBe("2px");
  expect(frameStyle.borderTopColor).toBe(await color(page, "#d93036"));
  expect(frameStyle.borderTopLeftRadius).toBe("16px");
  expect(await styleOf(page, DIALOG, "overflow-x")).toBe("hidden");
  expect(await styleOf(page, DIALOG, "overflow-y")).toBe("hidden");
  expect(await styleOf(page, DIALOG, "z-index")).toBe("80");
  expectNumbersClose(shadowLayers(frameStyle.boxShadow), shadowLayers(await computedShadow(page, FIGMA_SHADOW)));

  const overlay = await measure(page, OVERLAY);
  expect([overlay.width, overlay.height]).toEqual([1920, 1080]);
  expect(overlay.style.backgroundColor).toBe("rgba(0, 0, 0, 0.8)");
  expect(await styleOf(page, OVERLAY, "backdrop-filter")).toBe("none");
  expect(await styleOf(page, OVERLAY, "z-index")).toBe("80");

  const header = await box(page, HEADER);
  expect(header).toEqual({ x: 682, y: 322, width: 556, height: 88 });
  const headerStyle = (await measure(page, HEADER)).style;
  expect(headerStyle.backgroundColor).toBe(await color(page, "#d93036"));
  expect([headerStyle.paddingTop, headerStyle.paddingRight, headerStyle.paddingBottom, headerStyle.paddingLeft]).toEqual([
    "20px",
    "24px",
    "20px",
    "24px",
  ]);
  expect(headerStyle.columnGap).toBe("14px");
  expect(headerStyle.color).toBe(await color(page, "#ffffff"));

  const icon = await box(page, ICON);
  expect(icon).toEqual({ x: 706, y: 342, width: 48, height: 48 });
  expect(parseFloat(await styleOf(page, ICON, "border-top-left-radius"))).toBeGreaterThanOrEqual(24);
  expectNumbersClose([channelsOf(await styleOf(page, ICON, "background-color"))], [[255, 255, 255, 0.18]]);
  const svg = await box(page, `${ICON} svg`);
  expect([svg.width, svg.height]).toEqual([26, 26]);
  expect([svg.x, svg.y]).toEqual([icon.x + 11, icon.y + 11]);
  expect(await styleOf(page, `${ICON} svg`, "color")).toBe(await color(page, "#ffffff"));

  const eyebrow = await measure(page, EYEBROW);
  const eyebrowBox = await box(page, EYEBROW);
  expect([eyebrow.style.fontSize, eyebrow.style.lineHeight, eyebrow.style.fontWeight]).toEqual(["12px", "16px", "600"]);
  expect(eyebrow.style.letterSpacing).toBe("0.5px");
  expect(eyebrow.style.opacity).toBe("0.85");
  expect(eyebrow.style.color).toBe(await color(page, "#ffffff"));
  expect(eyebrowBox.x).toBe(icon.x + 48 + 14);
  expect(eyebrowBox.height).toBe(16);
  const title = await measure(page, TITLE);
  const titleBox = await box(page, TITLE);
  expect([title.style.fontSize, title.style.lineHeight, title.style.fontWeight]).toEqual(["22px", "28px", "700"]);
  expect(title.style.letterSpacing).toBe("normal");
  expect(title.style.color).toBe(await color(page, "#ffffff"));
  expect(titleBox.x).toBe(eyebrowBox.x);
  expect(titleBox.y).toBe(eyebrowBox.y + 16 + 2);
  expect(titleBox.height).toBe(28);
  expect(eyebrowBox.y).toBe(header.y + (88 - 46) / 2);

  const bodyStyle = (await measure(page, BODY)).style;
  expect([bodyStyle.paddingTop, bodyStyle.paddingRight, bodyStyle.paddingBottom, bodyStyle.paddingLeft]).toEqual([
    "20px",
    "24px",
    "24px",
    "24px",
  ]);
  expect(bodyStyle.rowGap).toBe("16px");

  const message = await measure(page, MESSAGE);
  const messageBox = await box(page, MESSAGE);
  expect([message.style.fontSize, message.style.lineHeight, message.style.fontWeight]).toEqual(["14px", "20px", "400"]);
  expect(message.style.letterSpacing).toBe("0.25px");
  expect(message.style.color).toBe(await color(page, "#506579"));
  expect(messageBox).toEqual({ x: 706, y: 430, width: 508, height: 40 });

  const fields = await measure(page, FIELDS);
  const fieldsBox = await box(page, FIELDS);
  expect(fieldsBox).toEqual({ x: 706, y: 486, width: 508, height: 184 });
  expect(fields.style.backgroundColor).toBe(await color(page, "#ffffff"));
  expect(fields.style.borderTopWidth).toBe("1px");
  expect(fields.style.borderTopColor).toBe(await color(page, "#dce3ea"));
  expect(fields.style.borderTopLeftRadius).toBe("12px");
  expect([fields.style.paddingTop, fields.style.paddingRight, fields.style.paddingBottom, fields.style.paddingLeft]).toEqual([
    "2px",
    "16px",
    "2px",
    "16px",
  ]);

  const rows = await page.locator(ROW).count();
  expect(rows).toBe(3);
  const rowHeights: number[] = [];
  for (let index = 0; index < rows; index += 1) {
    const row = await measure(page, ROW, index);
    rowHeights.push(row.height);
    expect(row.style.columnGap).toBe("16px");
    expect([row.style.paddingTop, row.style.paddingBottom, row.style.paddingLeft]).toEqual(["14px", "14px", "0px"]);
    expect(row.style.borderBottomWidth).toBe(index === rows - 1 ? "0px" : "1px");
    if (index < rows - 1) expect(row.style.borderBottomColor).toBe(await color(page, "#dce3ea"));
  }
  expect(rowHeights).toEqual([56 + 1, 52 + 1, 68]);
  expect((await box(page, ROW, 0)).y).toBe(fieldsBox.y + 1 + 2);

  for (let index = 0; index < rows; index += 1) {
    const label = await measure(page, LABEL, index);
    expect(label.width).toBe(72);
    expect([label.style.fontSize, label.style.lineHeight, label.style.fontWeight]).toEqual(["14px", "20px", "500"]);
    expect(label.style.letterSpacing).toBe("0.1px");
    expect(label.style.color).toBe(await color(page, "#506579"));
    expect((await box(page, LABEL, index)).x).toBe(fieldsBox.x + 1 + 16);
    expect((await box(page, VALUE, index)).x).toBe(fieldsBox.x + 1 + 16 + 72 + 16);
  }

  const device = await measure(page, VALUE, 0);
  expect([device.style.fontSize, device.style.lineHeight, device.style.fontWeight]).toEqual(["22px", "28px", "700"]);
  expect(device.style.color).toBe(await color(page, "#0b1f2e"));
  const failedAt = await measure(page, VALUE, 1);
  expect([failedAt.style.fontSize, failedAt.style.lineHeight, failedAt.style.fontWeight]).toEqual(["16px", "24px", "500"]);
  expect(failedAt.style.letterSpacing).toBe("0.15px");
  expect(failedAt.style.color).toBe(await color(page, "#0b1f2e"));
  const reason = await measure(page, VALUE, 2);
  expect([reason.style.fontSize, reason.style.lineHeight, reason.style.fontWeight]).toEqual(["14px", "20px", "500"]);
  expect(reason.style.letterSpacing).toBe("0.25px");
  expect(reason.style.color).toBe(await color(page, "#b42328"));
  expect(reason.style.color).toBe(await color(page, "var(--on-danger-subtle)"));
  expect(reason.height).toBe(40);

  for (const index of [0, 1]) {
    const label = await box(page, LABEL, index);
    const value = await box(page, VALUE, index);
    expect(label.y + label.height / 2).toBeCloseTo(value.y + value.height / 2, 1);
  }
  expect((await box(page, LABEL, 2)).y).toBe((await box(page, VALUE, 2)).y);

  const confirm = await measure(page, CONFIRM);
  const confirmBox = await box(page, CONFIRM);
  expect(confirmBox).toEqual({ x: 706, y: 686, width: 508, height: 48 });
  expect(confirm.style.backgroundColor).toBe(await color(page, "#d93036"));
  expect(confirm.style.borderTopLeftRadius).toBe("8px");
  expect(confirm.style.borderTopWidth).toBe("0px");
  expect([confirm.style.fontSize, confirm.style.lineHeight, confirm.style.fontWeight]).toEqual(["16px", "24px", "700"]);
  expect(confirm.style.letterSpacing).toBe("0.15px");
  expect(confirm.style.color).toBe(await color(page, "#ffffff"));
  expect(confirmBox.y + confirmBox.height).toBe(frame.y + frame.height - 2 - 24);
});

test("Esc나 Overlay Click으로는 닫히지 않고 Tab도 Dialog 안에 머물며, 확인을 Click하면 그 번호로 확인을 보낸 뒤 닫힘", async ({ page }) => {
  await openTrainingScreen(page);
  await emitAlerts(page, [{ id: "failure-1" }]);
  await waitForDialogSettled(page);
  await expectFocusTrapped(page);

  await page.keyboard.press("Escape");
  for (const point of [
    { x: 36, y: 540 },
    { x: 1700, y: 28 },
    { x: 300, y: 900 },
  ]) {
    expect(await topmostIsInside(page, point, OVERLAY)).toBe(true);
    await page.mouse.click(point.x, point.y);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect(page.locator(OVERLAY)).toBeVisible();
  expect(await mockRecord(page)).toEqual({ requestedIds: [], acknowledgedIds: [] });
  await pressTab(page);
  expect(await focusIsInside(page, DIALOG)).toBe(true);

  await page.locator(CONFIRM).click();
  await expect(page.locator(DIALOG)).toHaveCount(0);
  await expect(page.locator(OVERLAY)).toHaveCount(0);
  expect(await mockRecord(page)).toEqual({ requestedIds: ["failure-1"], acknowledgedIds: ["failure-1"] });
});

test("여러 건은 받은 순서대로 한 건씩 표시되고, 확인하면 다음 알림이 표시되며, 같은 번호를 다시 받아도 한 번만 표시되고, 확인한 번호는 다시 띄우지 않음", async ({ page }) => {
  await openTrainingScreen(page);
  await emitAlerts(page, [{ id: "failure-a" }, SECOND_ALERT]);
  await waitForDialogSettled(page);
  expect(await texts(page, VALUE)).toEqual(SAMPLE_VALUES);
  await emitAlerts(page, [{ id: "failure-a" }, SECOND_ALERT, SECOND_ALERT]);
  await page.locator(DIALOG).evaluate((element) => element.setAttribute("data-first-popup", ""));
  await page.keyboard.press("Enter");
  await expect(page.locator(`${VALUE}`).first()).toHaveText("AXLE_BEARING");
  expect(await texts(page, VALUE)).toEqual([
    "AXLE_BEARING",
    "2026-09-23 13:20:05",
    SECOND_ALERT.reason,
  ]);
  await expect(page.locator(`${DIALOG}[data-first-popup]`)).toHaveCount(1);
  await expect(page.locator(CONFIRM)).toBeFocused();
  expect(await mockRecord(page)).toEqual({ requestedIds: ["failure-a"], acknowledgedIds: ["failure-a"] });

  await page.locator(CONFIRM).click();
  await expect(page.locator(DIALOG)).toHaveCount(0);
  expect(await mockRecord(page)).toEqual({
    requestedIds: ["failure-a", "failure-b"],
    acknowledgedIds: ["failure-a", "failure-b"],
  });

  await emitAlerts(page, [{ id: "failure-a" }, SECOND_ALERT]);
  await page.waitForTimeout(500);
  await expect(page.locator(DIALOG)).toHaveCount(0);
});

test("대기열 규칙은 받은 순서를 따르고, 한 번에 받은 목록 안과 목록 사이의 같은 번호는 한 번만 표시하며, 확인한 번호는 빼고 다시 받아도 버림", () => {
  const alert = (id: string): DeviceFailureAlert => ({
    id,
    deviceCode: "TRACTION_MOTOR",
    failedAt: "2026-09-23T13:12:47",
    reason: id,
  });
  const actions: AlertQueueAction[] = [
    { type: "received", alerts: [alert("a"), alert("b"), alert("b")] },
    { type: "received", alerts: [alert("a"), alert("c")] },
  ];
  const received = actions.reduce(reduceAlertQueue, EMPTY_ALERT_QUEUE);
  expect(received.queue.map((item) => item.id)).toEqual(["a", "b", "c"]);

  const acknowledged = reduceAlertQueue(received, { type: "acknowledged", id: "a" });
  expect(acknowledged.queue.map((item) => item.id)).toEqual(["b", "c"]);
  const resent = reduceAlertQueue(acknowledged, { type: "received", alerts: [alert("a"), alert("d")] });
  expect(resent.queue.map((item) => item.id)).toEqual(["b", "c", "d"]);
  expect(reduceAlertQueue(resent, { type: "received", alerts: [alert("b")] })).toBe(resent);
});

test("Server가 이름까지 보낸 Row는 화면 List의 Row 다음에 받은 순서대로 표시되고, Row가 많아 Dialog이 넘치면 안쪽만 Scroll되며 확인 Button은 보임", async ({ page }) => {
  await openTrainingScreen(page);
  await emitAlerts(page, [
    {
      id: "failure-d",
      details: [
        { label: "편성", value: "405" },
        { label: "모델", value: "Isolation Forest" },
      ],
    },
  ]);
  await waitForDialogSettled(page);
  expect(await texts(page, LABEL)).toEqual([...SAMPLE_LABELS, "편성", "모델"]);
  expect(await texts(page, VALUE)).toEqual([...SAMPLE_VALUES, "405", "Isolation Forest"]);
  expect(await page.locator(ROW).evaluateAll((rows) => rows.map((row) => row.getAttribute("data-tone")))).toEqual([
    "emphasis",
    "normal",
    "danger",
    "normal",
    "normal",
  ]);
  expect((await measure(page, LABEL, 4)).width).toBe(72);
  expect((await measure(page, ROW, 2)).style.borderBottomWidth).toBe("1px");
  expect((await measure(page, ROW, 4)).style.borderBottomWidth).toBe("0px");
  const frame = await box(page, DIALOG);
  expect(frame.height).toBe(440 + (1 + 52) * 2);
  expect(frame.y).toBe((1080 - frame.height) / 2);

  await page.locator(CONFIRM).click();
  await expect(page.locator(DIALOG)).toHaveCount(0);

  await emitAlerts(page, [
    {
      id: "failure-many",
      details: Array.from({ length: 30 }, (_, index) => ({ label: `항목 ${index + 1}`, value: `값 ${index + 1}` })),
    },
  ]);
  await waitForDialogSettled(page);
  const tall = await box(page, DIALOG);
  expect(tall.height).toBe(1080 - 64);
  const confirm = await box(page, CONFIRM);
  expect(confirm.height).toBe(48);
  expect(confirm.y + confirm.height).toBe(tall.y + tall.height - 2 - 24);
  expect(await page.locator(DESCRIPTION).evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  expect((await box(page, HEADER)).height).toBe(88);
});

test("확인 Request가 실패하면 Dialog은 그대로이고, 기다리는 동안만 Button을 막고 Focus는 남기며, 다시 Click하면 다시 보냄", async ({ page }) => {
  await openTrainingScreen(page);
  await setMock(page, { failAcknowledge: true, acknowledgeDelayMs: 600 });
  await emitAlerts(page, [{ id: "failure-f" }]);
  await waitForDialogSettled(page);

  await page.locator(CONFIRM).click();
  await expect(page.locator(CONFIRM)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(CONFIRM)).toBeFocused();
  await expect(page.locator(CONFIRM)).toHaveCSS("opacity", "0.7");
  await page.locator(CONFIRM).dispatchEvent("click");
  await page.keyboard.press("Enter");
  await expect(page.locator(CONFIRM)).not.toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect(page.locator(CONFIRM)).toBeFocused();
  expect(await texts(page, VALUE)).toEqual(SAMPLE_VALUES);
  expect(await mockRecord(page)).toEqual({ requestedIds: ["failure-f"], acknowledgedIds: [] });

  await setMock(page, { failAcknowledge: false, acknowledgeDelayMs: 0 });
  await page.locator(CONFIRM).click();
  await expect(page.locator(DIALOG)).toHaveCount(0);
  expect(await mockRecord(page)).toEqual({
    requestedIds: ["failure-f", "failure-f"],
    acknowledgedIds: ["failure-f"],
  });
});

test("확인 Request가 실패하면 오른쪽 아래 실패 알림이 Dialog과 Overlay 위에 보이고 Dialog과 Focus는 그대로임", async ({ page }) => {
  await openTrainingScreen(page);
  await setMock(page, { failAcknowledge: true });
  await emitAlerts(page, [{ id: "failure-t" }]);
  await waitForDialogSettled(page);
  await expect(page.locator(ERROR_TOAST)).toHaveCount(0);

  await page.locator(CONFIRM).click();
  await expect(page.locator(ERROR_TOAST)).toHaveText(ACKNOWLEDGE_FAILED_TEXT);
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect(page.locator(CONFIRM)).toBeFocused();
  await expect
    .poll(() =>
      page.evaluate((selector) => {
        const toast = document.querySelector(selector);
        if (!toast) return "알림 없음";
        const rect = toast.getBoundingClientRect();
        const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return top?.closest(selector) === toast ? "알림" : (top?.getAttribute("data-slot") ?? top?.tagName ?? "없음");
      }, ERROR_TOAST),
      { timeout: 2_000 },
    )
    .toBe("알림");
  expect(await styleOf(page, TOAST_VIEWPORT, "z-index")).toBe("90");
  expect(await styleOf(page, DIALOG, "z-index")).toBe("80");
  expect(await styleOf(page, OVERLAY, "z-index")).toBe("80");
  await expect.poll(async () => {
    const found = await box(page, ERROR_TOAST);
    return [found.x + found.width, found.y + found.height];
  }).toEqual([1920 - 24, 1080 - 24]);
  const frame = await box(page, DIALOG);
  expect((await box(page, ERROR_TOAST)).y).toBeGreaterThan(frame.y + frame.height);
  expect(
    await page.locator(ERROR_TOAST).evaluate((element) => element.closest('[aria-hidden="true"]') === null),
  ).toBe(true);
  expect(await mockRecord(page)).toEqual({ requestedIds: ["failure-t"], acknowledgedIds: [] });

  await setMock(page, { failAcknowledge: false });
  await page.locator(CONFIRM).click();
  await expect(page.locator(DIALOG)).toHaveCount(0);
  expect(await mockRecord(page)).toEqual({
    requestedIds: ["failure-t", "failure-t"],
    acknowledgedIds: ["failure-t"],
  });
});

async function renderedLines(page: Page, selector: string, index: number): Promise<string[]> {
  return page.locator(selector).nth(index).evaluate((element) => {
    const text = element.firstChild as Text;
    const range = document.createRange();
    const lines = [""];
    let lastTop: number | null = null;
    for (let offset = 0; offset < text.length; offset += 1) {
      range.setStart(text, offset);
      range.setEnd(text, offset + 1);
      const rect = range.getClientRects()[0];
      if (rect && lastTop !== null && rect.top > lastTop + 1) lines.push("");
      if (rect) lastTop = rect.top;
      lines[lines.length - 1] += text.data[offset];
    }
    return lines;
  });
}

test("긴 고장사유는 낱말 가운데서 끊지 않고 공백에서만 줄을 바꿈, 두 번째 샘플", async ({ page }) => {
  await openTrainingScreen(page);
  await emitAlerts(page, [SECOND_ALERT]);
  await waitForDialogSettled(page);
  const lines = await renderedLines(page, VALUE, 2);
  expect(lines).toEqual([
    "진동 센서 값 범위 이탈 — 축 베어링 진동이 기준의 3배를 넘어 ",
    "진행 중이던 추론이 중단되었습니다.",
  ]);
  expect(await styleOf(page, VALUE, "word-break", 2)).toBe("keep-all");
  await page.locator(CONFIRM).click();
  await emitAlerts(page, [{ id: "failure-k" }]);
  await expect(page.locator(VALUE).first()).toHaveText("TRACTION_MOTOR");
  const sampleLines = await renderedLines(page, VALUE, 2);
  expect(sampleLines.slice(0, -1).every((line) => line.endsWith(" "))).toBe(true);
  expect(sampleLines.join("")).toBe(SAMPLE_REASON);
  expect(sampleLines).toHaveLength(2);
});

async function expectOnTopOf(
  page: Page,
  behind: string,
  behindPoint: { x: number; y: number },
  alertId: string,
): Promise<void> {
  await page.evaluate(() => document.activeElement?.setAttribute("data-focused-before-alert", ""));
  await emitAlerts(page, [{ id: alertId }]);
  await waitForDialogSettled(page);
  expect(await topmostIsInside(page, await centerOf(page, CONFIRM), CONFIRM)).toBe(true);
  expect(await topmostIsInside(page, behindPoint, `${DIALOG}, ${OVERLAY}`)).toBe(true);
  expect(
    await page.locator(behind).first().evaluate((element) => element.closest('[aria-hidden="true"]') !== null),
  ).toBe(true);
  await expectFocusTrapped(page);
  await page.keyboard.press("Escape");
  await page.mouse.click(behindPoint.x, behindPoint.y);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect(page.locator(behind).first()).toBeVisible();

  await page.locator(CONFIRM).click();
  await expect(page.locator(DIALOG)).toHaveCount(0);
  await expect(page.locator(behind).first()).toBeVisible();
  expect(
    await page.locator(behind).first().evaluate((element) => element.closest('[aria-hidden="true"]') !== null),
  ).toBe(false);
  expect(await mockRecord(page)).toEqual({ requestedIds: [alertId], acknowledgedIds: [alertId] });
}

test("알람/이벤트의 Alarm 등록 Modal 위에서 맨 앞에 표시되고, Focus는 Dialog 안에 있으며, Modal은 막히고, 확인 뒤 Modal은 그대로이고 Focus가 Modal의 원래 위치로 돌아감", async ({ page }) => {
  const create = modal("alarm-create");
  await openFixedScreen(page, "/dashboard/alarms", ALARM_SEGMENT);
  await page.locator(ALARM_FILTER_BUTTON).nth(2).click();
  await expect(page.locator(create)).toBeVisible();
  await expect.poll(() => focusIsInside(page, create)).toBe(true);
  const createBox = await box(page, create);
  await expectOnTopOf(page, create, { x: createBox.x + 40, y: createBox.y + 40 }, "failure-m");
  await expect(page.locator("[data-focused-before-alert]")).toBeFocused();
  expect(await focusIsInside(page, create)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator(create)).toHaveCount(0);
});

test("알람/이벤트의 Alarm 규칙 Modal(바깥을 Click하면 닫히는 Modal) 위에서 Overlay나 확인 Button을 Click해도 뒤의 Modal이 닫히지 않음", async ({ page }) => {
  const rules = modal("alarm-rules");
  await openFixedScreen(page, "/dashboard/alarms", ALARM_SEGMENT);
  await page.locator(ALARM_FILTER_BUTTON).nth(1).click();
  await expect(page.locator(rules)).toBeVisible();
  await expectOnTopOf(page, rules, { x: 1880, y: 60 }, "failure-r");
  await expect(page.locator("[data-focused-before-alert]")).toBeFocused();
  await page.mouse.click(1880, 60);
  await expect(page.locator(rules)).toHaveCount(0);
});

test("알람/이벤트의 확인 Dialog(Alarm 삭제) 위에서 맨 앞에 표시되고, 확인 뒤 Dialog는 그대로이고 Focus가 돌아감", async ({ page }) => {
  const remove = confirmDialog("alarm-delete");
  await openFixedScreen(page, "/dashboard/alarms", ALARM_SEGMENT);
  await page.locator(ALARM_ROW).nth(9).locator('[data-slot="action-button"]').nth(1).click();
  await expect(page.locator(remove)).toBeVisible();
  const removeBox = await box(page, remove);
  await expectOnTopOf(page, remove, { x: removeBox.x + 20, y: removeBox.y + 20 }, "failure-c");
  await expect(page.locator("[data-focused-before-alert]")).toBeFocused();
  expect(await focusIsInside(page, remove)).toBe(true);
});

test("펼친 전체 Menu 위에서 맨 앞에 표시되고, Esc가 Menu를 닫지 않으며, 확인 뒤 Menu는 그대로임", async ({ page }) => {
  const menuButton = '[data-slot="rail-button"][title="메뉴"]';
  await openTrainingScreen(page);
  await page.locator(menuButton).click();
  await expect(page.locator(menuButton)).toHaveAttribute("aria-expanded", "true");
  const sidebar = '[data-slot="sidebar"]';
  await expect(page.locator(sidebar).first()).toBeVisible();
  const sidebarBox = await box(page, `${sidebar} [data-slot="sidebar-inner"]`);
  await emitAlerts(page, [{ id: "failure-n" }]);
  await waitForDialogSettled(page);
  expect(await topmostIsInside(page, { x: sidebarBox.x + 60, y: sidebarBox.y + 200 }, OVERLAY)).toBe(true);
  expect(await topmostIsInside(page, await centerOf(page, CONFIRM), CONFIRM)).toBe(true);
  await expectFocusTrapped(page);
  await page.keyboard.press("Escape");
  await page.mouse.click(sidebarBox.x + 60, sidebarBox.y + 200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await expect(page.locator(menuButton)).toHaveAttribute("aria-expanded", "true");
  await page.locator(CONFIRM).click();
  await expect(page.locator(DIALOG)).toHaveCount(0);
  await expect(page.locator(menuButton)).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator(menuButton)).toHaveAttribute("aria-expanded", "false");
});

test("느린 검색의 Overlay 위에서 맨 앞에 표시되고 Click할 수 있으며, Esc가 검색을 취소하지 않고, Overlay가 닫혀도 Focus는 Dialog에 남음", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { cbmMockLatency: { searchMs: number } }).cbmMockLatency = { searchMs: 3000 };
  });
  await openTrainingScreen(page);
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.locator(SEARCHING)).toBeVisible();
  const cancel = await centerOf(page, `${SEARCHING} [data-slot="action-button"]`);

  await emitAlerts(page, [{ id: "failure-s1" }, { ...SECOND_ALERT, id: "failure-s2" }]);
  await waitForDialogSettled(page);
  expect(await topmostIsInside(page, await centerOf(page, CONFIRM), CONFIRM)).toBe(true);
  expect(await topmostIsInside(page, cancel, `${DIALOG}, ${OVERLAY}`)).toBe(true);
  expect(await styleOf(page, '[data-overlay="searching"]', "z-index")).toBe("60");
  await expect(page.locator(CONFIRM)).toBeFocused();
  await page.keyboard.press("Escape");
  await page.mouse.click(cancel.x, cancel.y + 300);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await expect(page.locator(SEARCHING)).toBeVisible();

  await page.locator(CONFIRM).click();
  await expect(page.locator(VALUE).first()).toHaveText("AXLE_BEARING");
  await expect(page.locator(SEARCHING)).toBeVisible();
  expect(await mockRecord(page)).toEqual({ requestedIds: ["failure-s1"], acknowledgedIds: ["failure-s1"] });

  await expect(page.locator(SEARCHING)).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator(DIALOG)).toBeVisible();
  await expect(page.locator(CONFIRM)).toBeFocused();
  await page.locator(CONFIRM).click();
  await expect(page.locator(DIALOG)).toHaveCount(0);
});

test("다크 Theme에서 같은 Token의 다크 값 확인", async ({ page }) => {
  await openTrainingScreen(page);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await emitAlerts(page);
  await waitForDialogSettled(page);

  const frame = (await measure(page, DIALOG)).style;
  expect(frame.backgroundColor).toBe(await color(page, "var(--surface-low)"));
  expect(frame.backgroundColor).toBe(await color(page, "#0f2335"));
  expect(frame.borderTopColor).toBe(await color(page, "#ec5d62"));
  const danger = channelsOf(await color(page, "var(--danger)")).slice(0, 3);
  const glow = shadowLayers(frame.boxShadow);
  expectNumbersClose(
    glow.map((layer) => layer.slice(4)),
    [
      [20, 32, 52, 0.24],
      [...danger, 0.38],
      [...danger, 0.2],
    ],
  );
  const header = (await measure(page, HEADER)).style;
  expect(header.backgroundColor).toBe(await color(page, "var(--danger)"));
  expect(header.color).toBe(await color(page, "var(--danger-fg)"));
  expect(header.color).toBe(await color(page, "#2a0a0b"));
  for (const selector of [EYEBROW, TITLE, `${ICON} svg`]) {
    expect(await styleOf(page, selector, "color"), selector).toBe(await color(page, "var(--danger-fg)"));
  }
  expectNumbersClose([channelsOf(await styleOf(page, ICON, "background-color"))], [[42, 10, 11, 0.18]]);
  expect((await measure(page, MESSAGE)).style.color).toBe(await color(page, "var(--muted-fg)"));
  const fields = (await measure(page, FIELDS)).style;
  expect(fields.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(fields.borderTopColor).toBe(await color(page, "var(--border)"));
  expect((await measure(page, ROW, 0)).style.borderBottomColor).toBe(await color(page, "var(--border)"));
  expect((await measure(page, LABEL, 0)).style.color).toBe(await color(page, "var(--muted-fg)"));
  expect((await measure(page, VALUE, 0)).style.color).toBe(await color(page, "var(--fg)"));
  expect((await measure(page, VALUE, 1)).style.color).toBe(await color(page, "var(--fg)"));
  expect((await measure(page, VALUE, 2)).style.color).toBe(await color(page, "#ff9ea1"));
  const confirm = (await measure(page, CONFIRM)).style;
  expect(confirm.backgroundColor).toBe(await color(page, "var(--danger)"));
  expect(confirm.color).toBe(await color(page, "var(--danger-fg)"));
  expect((await measure(page, OVERLAY)).style.backgroundColor).toBe("rgba(0, 0, 0, 0.8)");
});

async function dialogRects(page: Page): Promise<{ slot: string; rect: number[] }[]> {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector) as Element;
    return [root, ...root.querySelectorAll("[data-slot]")].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        slot: element.getAttribute("data-slot") ?? "",
        rect: [rect.x, rect.y, rect.width, rect.height],
      };
    });
  }, DIALOG);
}

test("3840×2160의 Dialog은 1920×1080의 Dialog을 정확히 2배로 표시함", async ({ page }) => {
  await openTrainingScreen(page);
  await emitAlerts(page);
  await waitForDialogSettled(page);
  const base = await dialogRects(page);

  await openTrainingScreen(page, 3840, 2160);
  await emitAlerts(page);
  await waitForDialogSettled(page);
  const doubled = await dialogRects(page);

  expect(doubled.map((item) => item.slot)).toEqual(base.map((item) => item.slot));
  const mismatches = base.flatMap((item, index) =>
    item.rect
      .map((value, axis) => [value, doubled[index].rect[axis]])
      .filter(([value, target]) => Math.abs(target - value * 2) > 0.5)
      .map(([value, target]) => `${item.slot}[${index}]: ${value} → ${target}`),
  );
  expect(mismatches).toEqual([]);
  expect(base.length).toBeGreaterThan(15);
  expect((await measure(page, TITLE)).style.fontSize).toBe("44px");
  expect((await measure(page, DIALOG)).style.borderTopWidth).toBe("4px");
});

test("움직임 줄이기를 켜면 Dialog은 크기 변화 없이 Fade만 적용되고 Overlay는 항상 Fade로 표시됨", async ({ page }) => {
  await openTrainingScreen(page);
  await emitAlerts(page);
  await expect(page.locator(DIALOG)).toBeVisible();
  expect(await enterMotion(page, DIALOG)).toEqual(["enter", "0.1s", "1", "0"]);
  expect(await enterMotion(page, OVERLAY)).toEqual(["enter", "0.1s", "1", "0"]);
});

test.describe("움직임 줄이기를 켜지 않은 화면", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("Dialog은 0.1초 동안 0.95 크기의 투명 상태에서 들어오고 Overlay는 Fade로 표시되며, 다른 Modal과 같은 움직임임", async ({ page }) => {
    await openTrainingScreen(page);
    await emitAlerts(page);
    await expect(page.locator(DIALOG)).toBeVisible();
    expect(await enterMotion(page, DIALOG)).toEqual(["enter", "0.1s", ".95", "0"]);
    expect(await enterMotion(page, OVERLAY)).toEqual(["enter", "0.1s", "1", "0"]);
    await waitForDialogSettled(page);
    expect(await box(page, DIALOG)).toEqual({ x: 680, y: 320, width: 560, height: 440 });
  });
});
