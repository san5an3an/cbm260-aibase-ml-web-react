import { expect, test, type Page } from "@playwright/test";
import { loginTrainConfig } from "../src/config/system";
import { pickLoginTrainNumbers } from "../src/lib/loginTrainNumbers";
import { safeNextPath } from "../src/lib/safeNextPath";
import { MOCK_TODAY, color, measure } from "./helpers/measure";
import { box, enterMotion, enterTranslate, styleOf } from "./helpers/modal";

test.use({ contextOptions: { reducedMotion: "reduce" }, storageState: { cookies: [], origins: [] } });

const SCREEN = '[data-slot="login-screen"]';
const CARD = '[data-slot="login-card"]';
const BRAND = '[data-slot="login-brand"]';
const FORM_AREA = '[data-slot="login-form-area"]';
const TITLE = '[data-slot="login-title"]';
const DESCRIPTION = '[data-slot="login-description"]';
const SYSTEM_NAME = '[data-slot="login-system-name"]';
const EYEBROW = '[data-slot="login-eyebrow"]';
const LOGO = '[data-slot="login-logo"]';
const PHOTO = '[data-slot="login-brand-photo"]';
const LINE_TRACK = '[data-slot="login-line-track"]';
const STATION = '[data-slot="login-line-station"]';
const TRAIN = '[data-slot="login-train"]';
const TRAIN_RUN = '[data-slot="login-train-run"]';
const TRAIN_NUMBER = `${TRAIN} [data-slot="train-number"]`;
const TRAIN_FORMATION = `${TRAIN} [data-slot="train-formation"]`;
const TRAIN_SHELL = `${TRAIN} [data-slot="train-shell"]`;
const TRAIN_WINDOW = `${TRAIN} [data-slot="train-window"]`;
const TRAIN_HEADLIGHT = `${TRAIN} [data-slot="train-headlight"]`;
const ID_INPUT = '[data-slot="login-id-input"]';
const PASSWORD_INPUT = '[data-slot="login-password-input"]';
const PASSWORD_GROUP = '[data-slot="login-password-group"]';
const TOGGLE = '[data-slot="login-password-toggle"]';
const SUBMIT = '[data-slot="login-submit"]';
const FAILURE = `${FORM_AREA} [data-slot="alert-banner"]`;
const FIELD_ERROR = `${FORM_AREA} [data-slot="field-error"]`;
const REMAINING = '[data-slot="session-chip-remaining"]';

const FAILED_TEXT = "로그인하지 못했습니다. 아이디와 비밀번호를 확인한 뒤 다시 시도하세요.";
const DEFAULT_SCREEN = "/dashboard/fleet";

interface MockAuth {
  delayMs: number;
  fail: boolean;
  requestedIds: string[];
}

type MockAuthHost = { cbmMockAuth?: Partial<MockAuth> };

interface TrainNumbers {
  trainNumber: string;
  formation: string;
}

type LoginTrainHost = { cbmMockLoginTrain?: Partial<TrainNumbers> };

const FIXED_TRAIN: TrainNumbers = { trainNumber: "4001", formation: "401" };

async function openLogin(
  page: Page,
  {
    path = "/login",
    width = 1920,
    height = 1080,
    auth,
    train = FIXED_TRAIN,
  }: { path?: string; width?: number; height?: number; auth?: Partial<MockAuth>; train?: Partial<TrainNumbers> | null } = {},
): Promise<void> {
  await page.clock.setFixedTime(MOCK_TODAY);
  await page.setViewportSize({ width, height });
  await page.context().clearCookies();
  if (auth) {
    await page.addInitScript((value) => {
      (window as unknown as MockAuthHost).cbmMockAuth = value;
    }, auth);
  }
  if (train) {
    await page.addInitScript((value) => {
      (window as unknown as LoginTrainHost).cbmMockLoginTrain = value;
    }, train);
  }
  await page.goto(path);
  await expect(page.locator(ID_INPUT)).toBeFocused();
}

async function requestedIds(page: Page): Promise<string[]> {
  return page.evaluate(() => [...((window as unknown as MockAuthHost).cbmMockAuth?.requestedIds ?? [])]);
}

async function setMockAuth(page: Page, settings: Partial<MockAuth>): Promise<void> {
  await page.evaluate((value) => {
    const host = window as unknown as MockAuthHost;
    host.cbmMockAuth = Object.assign(host.cbmMockAuth ?? {}, value);
  }, settings);
}

async function waitForLine(page: Page): Promise<void> {
  await expect.poll(() => styleOf(page, LINE_TRACK, "transform")).toBe("none");
}

async function screenRects(page: Page): Promise<{ slot: string; rect: number[] }[]> {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector) as Element;
    return [root, ...root.querySelectorAll("[data-slot]")].map((element) => {
      const rect = element.getBoundingClientRect();
      return { slot: element.getAttribute("data-slot") ?? "", rect: [rect.x, rect.y, rect.width, rect.height] };
    });
  }, SCREEN);
}

test("1920×1080에서 가운데 Card(왼쪽 기관, 시스템, 호선, 오른쪽 양식)의 배치, Text, Color, Label과 Input 연결, 처음 Focus는 아이디임", async ({ page }) => {
  await openLogin(page);
  await waitForLine(page);

  const card = await box(page, CARD);
  expect(card).toEqual({ x: 480, y: 268, width: 960, height: 544 });
  const cardStyle = (await measure(page, CARD)).style;
  expect(cardStyle.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(cardStyle.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(cardStyle.borderTopLeftRadius).toBe("16px");
  expect((await measure(page, '[data-slot="login-screen"]')).style.backgroundColor).toBe(await color(page, "var(--bg)"));

  const brand = await measure(page, BRAND);
  expect([brand.width, brand.height]).toEqual([416, 542]);
  expect(brand.style.backgroundColor).toBe(await color(page, "var(--rail-bg)"));
  expect(brand.style.paddingTop).toBe("48px");
  expect(brand.style.borderRightColor).toBe(await color(page, "var(--border)"));
  const logo = await box(page, LOGO);
  expect([logo.x, logo.y, logo.height]).toEqual([529, 555, 32]);
  expect((await box(page, EYEBROW)).y - (logo.y + logo.height)).toBe(24);
  expect(logo.width).toBeCloseTo((32 * 654.15) / 155.95, 1);
  await expect(page.getByRole("img", { name: "서울교통공사" })).toHaveCount(1);
  await expect(page.locator(BRAND)).not.toContainText("서울교통공사");
  const logoFills = await page.locator(`${LOGO} g`).evaluateAll((groups) => groups.map((group) => getComputedStyle(group).fill));
  expect(logoFills).toEqual([await color(page, "#17298c"), await color(page, "#6e7071")]);
  const photo = page.locator(PHOTO);
  await expect(photo).toHaveAttribute("aria-hidden", "true");
  await expect(photo.locator("img")).toHaveAttribute("alt", "");
  expect(await photo.locator("img").evaluate((element) => getComputedStyle(element).filter)).toBe("brightness(1.15)");
  const photoBox = await box(page, PHOTO);
  expect([photoBox.x, photoBox.y, photoBox.width]).toEqual([481, 269, 415]);
  expect(photoBox.height).toBeCloseTo((415 * 669) / 1000, 0);
  expect(photoBox.y + photoBox.height).toBeLessThanOrEqual(logo.y);
  const photoStyle = await photo.evaluate((element) => {
    const style = getComputedStyle(element);
    return { mask: style.maskImage, opacity: style.opacity, zIndex: style.zIndex, pointerEvents: style.pointerEvents };
  });
  expect(photoStyle).toEqual({
    mask: "linear-gradient(rgb(0, 0, 0) 0%, rgb(0, 0, 0) 22%, rgba(0, 0, 0, 0.85) 40%, rgba(0, 0, 0, 0.55) 60%, rgba(0, 0, 0, 0.25) 80%, rgba(0, 0, 0, 0) 100%)",
    opacity: "1",
    zIndex: "-10",
    pointerEvents: "none",
  });
  await expect(page.locator(EYEBROW)).toHaveText("CONDITION-BASED MAINTENANCE");
  await expect(page.locator(SYSTEM_NAME)).toHaveText("4호선 CBM 260칸 모니터링 시스템");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("4호선 CBM 260칸 모니터링 시스템");
  const systemName = await measure(page, SYSTEM_NAME);
  expect([systemName.style.fontSize, systemName.style.lineHeight, systemName.style.fontWeight]).toEqual(["28px", "36px", "700"]);
  expect(systemName.height).toBe(72);
  expect((await measure(page, EYEBROW)).style.color).toBe(await color(page, "var(--brand-line4-text)"));
  expect((await measure(page, LINE_TRACK)).style.backgroundColor).toBe(await color(page, "var(--brand-line4)"));
  const stations = await page.locator(STATION).count();
  expect(stations).toBe(5);
  const track = await box(page, LINE_TRACK);
  const first = await box(page, STATION, 0);
  const last = await box(page, STATION, 4);
  expect(track.x).toBe(first.x + first.width / 2);
  expect(track.x + track.width).toBe(last.x + last.width / 2);
  expect(track.y + track.height / 2).toBe(first.y + first.height / 2);
  expect((await measure(page, STATION)).style.borderTopColor).toBe(await color(page, "var(--brand-line4)"));

  const train = await box(page, TRAIN);
  expect(train).toEqual({ x: 822.65625, y: 726.5, width: 44, height: 42 });
  const shell = await box(page, TRAIN_SHELL);
  expect(shell.x + shell.width / 2).toBeCloseTo(last.x + last.width / 2, 1);
  expect(shell.width).toBeCloseTo(38.333, 1);
  expect(shell.height).toBeCloseTo(21, 1);
  expect(shell.y + shell.height / 2).toBeCloseTo(last.y + last.height / 2, 1);
  expect(shell.y + shell.height / 2).toBeCloseTo(track.y + track.height / 2, 1);
  const headlight = await box(page, TRAIN_HEADLIGHT);
  expect(headlight.x + headlight.width).toBeCloseTo(train.x + 0.167 + 43.667, 1);
  expect(headlight.x).toBeLessThan(shell.x + shell.width);
  expect(train.y).toBeGreaterThanOrEqual((await box(page, SYSTEM_NAME)).y + systemName.height);
  const nameLineRight = await page.locator(SYSTEM_NAME).evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = [...range.getClientRects()];
    const lastBottom = Math.max(...rects.map((rect) => rect.bottom));
    return Math.max(...rects.filter((rect) => rect.bottom === lastBottom).map((rect) => rect.right));
  });
  const trainNumber = await box(page, TRAIN_NUMBER);
  expect(trainNumber.x).toBeGreaterThan(nameLineRight + 16);
  await expect(page.locator(TRAIN_NUMBER)).toHaveText("4001");
  await expect(page.locator(TRAIN_FORMATION)).toHaveText("401");
  const numberStyle = (await measure(page, TRAIN_NUMBER)).style;
  expect([numberStyle.fontSize, numberStyle.lineHeight, numberStyle.fontWeight, numberStyle.color]).toEqual(["14px", "20px", "500", await color(page, "var(--fg)")]);
  expect(trainNumber.x + trainNumber.width / 2).toBeCloseTo(train.x + train.width / 2, 0);
  const formationStyle = (await measure(page, TRAIN_FORMATION)).style;
  expect([formationStyle.fontSize, formationStyle.lineHeight, formationStyle.fontWeight, formationStyle.color]).toEqual(["14px", "20px", "600", await color(page, "#fff")]);
  const formation = await box(page, TRAIN_FORMATION);
  expect(formation.x + formation.width / 2).toBeCloseTo(shell.x + shell.width / 2, 0);
  const fillOf = (selector: string) => page.locator(selector).first().evaluate((element) => getComputedStyle(element).fill);
  expect(await fillOf(TRAIN_SHELL)).toBe(await color(page, "var(--brand-line4)"));
  expect(await fillOf(TRAIN_SHELL)).toBe(await color(page, "#00a4e3"));
  await expect(page.locator(TRAIN_WINDOW)).toHaveCount(4);
  expect(await fillOf(TRAIN_WINDOW)).toBe(await color(page, "#fff"));
  const window0 = await box(page, TRAIN_WINDOW);
  expect(window0.width).toBeCloseTo(6, 1);
  expect(window0.height).toBeCloseTo(3, 1);
  const headlightStops = await page.locator(TRAIN_HEADLIGHT).evaluate((element) => {
    const gradient = document.getElementById((element.getAttribute("fill") ?? "").slice(5, -1));
    return [...(gradient?.querySelectorAll("stop") ?? [])].map((stop) => [getComputedStyle(stop).stopColor, getComputedStyle(stop).stopOpacity]);
  });
  expect(headlightStops).toEqual([
    [await color(page, "var(--train-headlight-strong)"), "1"],
    [await color(page, "var(--train-headlight)"), "1"],
    [await color(page, "var(--train-headlight-fade)"), "0"],
  ]);
  expect(headlightStops.map(([stop]) => stop)).toEqual([await color(page, "#cc8100"), await color(page, "#e1b500"), await color(page, "#f9ebb3")]);
  await expect(page.locator(TRAIN)).toHaveAttribute("aria-hidden", "true");
  const brandTree = await page.locator(BRAND).ariaSnapshot();
  expect(brandTree).toContain("서울교통공사");
  expect(brandTree).not.toContain("4001");
  expect(brandTree).not.toContain("401");

  await expect(page.getByRole("heading", { level: 2 })).toHaveText("로그인");
  const title = await measure(page, TITLE);
  expect([title.style.fontSize, title.style.lineHeight, title.style.fontWeight]).toEqual(["22px", "28px", "700"]);
  await expect(page.locator(DESCRIPTION)).toHaveText("아이디와 비밀번호를 입력하세요.");
  expect((await measure(page, DESCRIPTION)).style.color).toBe(await color(page, "var(--muted-fg)"));
  const idInput = await box(page, ID_INPUT);
  const passwordGroup = await box(page, PASSWORD_GROUP);
  const submit = await box(page, SUBMIT);
  expect([idInput.height, passwordGroup.height, submit.height]).toEqual([44, 44, 44]);
  expect(idInput.width).toBe(414);
  expect([passwordGroup.x, passwordGroup.width, submit.x, submit.width]).toEqual([idInput.x, 414, idInput.x, 414]);
  expect(idInput.x).toBe(480 + 1 + 416 + 64);
  const formTop = (await box(page, TITLE)).y;
  expect(Math.abs(formTop - card.y - (card.y + card.height - (submit.y + submit.height)))).toBeLessThanOrEqual(1);
  expect((await measure(page, ID_INPUT)).style.fontSize).toBe("16px");
  const submitStyle = (await measure(page, SUBMIT)).style;
  expect(submitStyle.backgroundColor).toBe(await color(page, "var(--primary)"));
  expect(submitStyle.color).toBe(await color(page, "var(--on-primary)"));
  expect([submitStyle.fontSize, submitStyle.fontWeight]).toEqual(["16px", "600"]);
  await expect(page.locator(SUBMIT)).toHaveText("로그인");
  await expect(page.locator(SUBMIT)).toHaveAttribute("type", "submit");

  await expect(page.getByLabel("아이디", { exact: true })).toHaveAttribute("data-slot", "login-id-input");
  await expect(page.getByLabel("비밀번호", { exact: true })).toHaveAttribute("data-slot", "login-password-input");
  await expect(page.locator(ID_INPUT)).toHaveAttribute("autocomplete", "username");
  await expect(page.locator(PASSWORD_INPUT)).toHaveAttribute("autocomplete", "current-password");
  await expect(page.locator(PASSWORD_INPUT)).toHaveAttribute("type", "password");
  await expect(page.locator(ID_INPUT)).toBeFocused();
  const ring = await color(page, "var(--brand-line4)");
  await expect.poll(async () => (await measure(page, ID_INPUT)).style.borderTopColor).toBe(ring);

  await expect(page.locator('[data-slot="clock-chip"]')).toHaveText("2026-09-23 (수) 12:00:00");
  await expect(page.locator('[data-slot="theme-toggle-button"]')).toBeVisible();
  await expect(page.locator('[data-slot="left-rail"], [data-slot="top-bar"], [data-slot="session-chip"]')).toHaveCount(0);
});

test("비밀번호 보기 Button을 Click하면 Text로 보이고 이름이 숨기기로 바뀌며, 다시 Click하면 가려짐", async ({ page }) => {
  await openLogin(page);
  await page.locator(PASSWORD_INPUT).fill("secret-pw");
  const toggle = page.locator(TOGGLE);
  await expect(toggle).toHaveAccessibleName("비밀번호 보기");
  await expect(toggle).toHaveAttribute("type", "button");
  await toggle.click();
  await expect(page.locator(PASSWORD_INPUT)).toHaveAttribute("type", "text");
  await expect(toggle).toHaveAccessibleName("비밀번호 숨기기");
  await expect(page.locator(PASSWORD_INPUT)).toHaveValue("secret-pw");
  await toggle.click();
  await expect(page.locator(PASSWORD_INPUT)).toHaveAttribute("type", "password");
  await expect(toggle).toHaveAccessibleName("비밀번호 보기");
  expect(await requestedIds(page)).toEqual([]);
  await expect(page).toHaveURL("/login");
});

test("비밀번호 보기 Button은 Input 안에서 오른쪽 Margin이 위쪽, 아래쪽 Margin과 같음(1920, 1440, 3840)", async ({ page }) => {
  for (const [width, height, inset] of [[1920, 1080, 5], [1440, 900, 5], [3840, 2160, 10]]) {
    await openLogin(page, { width, height });
    const gaps = await page.locator(TOGGLE).evaluate((button, groupSelector) => {
      const group = button.closest(groupSelector) as HTMLElement;
      const style = getComputedStyle(group);
      const outer = group.getBoundingClientRect();
      const inner = button.getBoundingClientRect();
      return {
        top: inner.top - outer.top - parseFloat(style.borderTopWidth),
        bottom: outer.bottom - parseFloat(style.borderBottomWidth) - inner.bottom,
        right: outer.right - parseFloat(style.borderRightWidth) - inner.right,
      };
    }, PASSWORD_GROUP);
    expect(gaps.top, `${width} 위`).toBeCloseTo(inset, 1);
    expect(gaps.bottom, `${width} 아래`).toBeCloseTo(inset, 1);
    expect(gaps.right, `${width} 오른쪽`).toBeCloseTo(inset, 1);
  }
});

test("1440×900처럼 기준보다 작은 화면에서도 Card 크기가 그대로이고, 가운데에 있으며, 넘치지 않음", async ({ page }) => {
  await openLogin(page, { width: 1440, height: 900 });
  expect(await box(page, CARD)).toEqual({ x: 240, y: 178, width: 960, height: 544 });
  expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight])).toEqual([1440, 900]);
  expect((await box(page, '[data-slot="clock-chip"]')).y).toBeGreaterThanOrEqual(0);
});

test("3840×2160의 Login Page는 1920×1080의 화면을 정확히 2배로 표시함", async ({ page }) => {
  await openLogin(page);
  await waitForLine(page);
  const base = await screenRects(page);

  await openLogin(page, { width: 3840, height: 2160 });
  await waitForLine(page);
  const doubled = await screenRects(page);

  expect(doubled.map((item) => item.slot)).toEqual(base.map((item) => item.slot));
  const mismatches = base.flatMap((item, index) =>
    item.rect
      .map((value, axis) => [value, doubled[index].rect[axis]])
      .filter(([value, target]) => Math.abs(target - value * 2) > 0.5)
      .map(([value, target]) => `${item.slot}[${index}]: ${value} → ${target}`),
  );
  expect(mismatches).toEqual([]);
  expect(base.length).toBeGreaterThan(20);
  expect((await measure(page, TITLE)).style.fontSize).toBe("44px");
  expect((await box(page, CARD)).width).toBe(1920);
  const doubledTrain = await box(page, TRAIN);
  expect(doubledTrain.x).toBeCloseTo(822.65625 * 2, 0);
  expect([doubledTrain.y, doubledTrain.width, doubledTrain.height]).toEqual([726.5 * 2, 88, 84]);
  expect((await measure(page, TRAIN_NUMBER)).style.fontSize).toBe("28px");
});

test("빈 Input마다 오류, aria-invalid, aria-describedby가 표시되고, 첫 빈 Input으로 Focus가 가고, Request를 보내지 않으며, 공백만 든 아이디도 빈 Input으로 보고, 고친 Input의 오류만 사라짐", async ({ page }) => {
  await openLogin(page);
  await page.keyboard.press("Enter");
  await expect(page.locator(FIELD_ERROR)).toHaveText(["아이디를 입력하세요", "비밀번호를 입력하세요"]);
  await expect(page.locator(ID_INPUT)).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(PASSWORD_INPUT)).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(ID_INPUT)).toHaveAccessibleDescription("아이디를 입력하세요");
  await expect(page.locator(PASSWORD_INPUT)).toHaveAccessibleDescription("비밀번호를 입력하세요");
  const describedBy = await page.locator(ID_INPUT).getAttribute("aria-describedby");
  await expect(page.locator(`[id="${describedBy}"]`)).toHaveText("아이디를 입력하세요");
  await expect(page.locator(ID_INPUT)).toBeFocused();
  const danger = await color(page, "var(--danger)");
  await expect.poll(async () => (await measure(page, PASSWORD_GROUP)).style.borderTopColor).toBe(danger);
  expect((await measure(page, PASSWORD_GROUP)).style.borderTopWidth).toBe("2px");
  expect((await measure(page, FIELD_ERROR)).style.color).toBe(await color(page, "var(--danger)"));

  await page.locator(ID_INPUT).fill("   ");
  await expect(page.locator(FIELD_ERROR)).toHaveText(["비밀번호를 입력하세요"]);
  await expect(page.locator(ID_INPUT)).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(ID_INPUT)).not.toHaveAttribute("aria-describedby");
  await page.locator(SUBMIT).click();
  await expect(page.locator(FIELD_ERROR)).toHaveText(["아이디를 입력하세요", "비밀번호를 입력하세요"]);
  await expect(page.locator(ID_INPUT)).toBeFocused();

  await page.locator(ID_INPUT).fill("operator");
  await page.locator(SUBMIT).click();
  await expect(page.locator(FIELD_ERROR)).toHaveText(["비밀번호를 입력하세요"]);
  await expect(page.locator(PASSWORD_INPUT)).toBeFocused();
  expect(await requestedIds(page)).toEqual([]);
  await expect(page).toHaveURL("/login");
});

test("test hook으로 지연시키고 실패시키면 기다리는 동안 Button은 Text 그대로 막히고, 실패하면 Button 위에 실패 문구가 표시되며 Input은 그대로이고 다시 보내면 성공함", async ({ page }) => {
  await openLogin(page, { auth: { fail: true, delayMs: 800 } });
  await page.locator(ID_INPUT).fill("  operator  ");
  await page.locator(PASSWORD_INPUT).fill("secret-pw");
  await page.keyboard.press("Enter");

  const submit = page.locator(SUBMIT);
  await expect(submit).toHaveAttribute("aria-disabled", "true");
  await expect(submit).toHaveText("로그인");
  await expect(submit).toHaveCSS("opacity", "0.7");
  await page.keyboard.press("Enter");
  await submit.dispatchEvent("click");

  await expect(page.locator(FAILURE)).toHaveText(FAILED_TEXT);
  await expect(page.locator(FAILURE)).toHaveAttribute("role", "alert");
  expect((await measure(page, FAILURE)).style.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect((await box(page, FAILURE)).y + (await box(page, FAILURE)).height).toBeLessThan((await box(page, SUBMIT)).y);
  await expect(submit).not.toHaveAttribute("aria-disabled", "true");
  await expect(submit).toHaveCSS("opacity", "1");
  await expect(page.locator(ID_INPUT)).toHaveValue("  operator  ");
  await expect(page.locator(PASSWORD_INPUT)).toHaveValue("secret-pw");
  await expect(page.locator(FIELD_ERROR)).toHaveCount(0);
  expect(await requestedIds(page)).toEqual(["operator"]);
  await expect(page).toHaveURL("/login");

  await setMockAuth(page, { fail: false, delayMs: 0 });
  await submit.click();
  await expect(page).toHaveURL(DEFAULT_SCREEN);
  expect(await requestedIds(page)).toEqual(["operator", "operator"]);
});

test("성공하면 next의 같은 사이트 경로(조회 조건 포함)로 이동하고 공통 Layout의 새 Session은 10:00이며 입력한 비밀번호를 문서에 남기지 않음", async ({ page }) => {
  const next = "/dashboard/alarms?from=login&page=3";
  await openLogin(page, { path: `/login?next=${encodeURIComponent(next)}` });
  await page.locator(ID_INPUT).fill("operator");
  await page.locator(PASSWORD_INPUT).fill("secret-pw");
  await page.locator(SUBMIT).click();

  await expect(page).toHaveURL(next);
  await expect(page.locator(REMAINING)).toHaveText("10:00");
  await expect(page.locator('[data-slot="chart-stack-segment"]').first()).toBeVisible();
  expect(
    await page.evaluate(() => [...document.querySelectorAll("input")].some((input) => input.value === "secret-pw")),
  ).toBe(false);
  expect(await requestedIds(page)).toEqual(["operator"]);
});

test("안전하지 않은 next(다른 사이트, scheme, 역슬래시, Login Page, 없음)이면 첫 화면으로 이동함", async ({ page }) => {
  await page.route((url) => url.hostname !== "localhost", (route) => route.abort());
  const unsafe = [
    "//evil.com",
    "https://evil.com/dashboard/alarms",
    "http://localhost:3276/dashboard/alarms",
    "/\\evil.com",
    "javascript:alert(1)",
    " /dashboard/alarms",
    "/login?next=%2Fdashboard%2Falarms",
  ];
  for (const next of unsafe) {
    await openLogin(page, { path: `/login?next=${encodeURIComponent(next)}` });
    await page.locator(ID_INPUT).fill("operator");
    await page.locator(PASSWORD_INPUT).fill("secret-pw");
    await page.keyboard.press("Enter");
    await expect(page, next).toHaveURL(DEFAULT_SCREEN);
  }
  await openLogin(page);
  await page.locator(ID_INPUT).fill("operator");
  await page.locator(PASSWORD_INPUT).fill("secret-pw");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(DEFAULT_SCREEN);
});

test("next를 거르는 규칙은 같은 사이트 경로만 그대로 쓰고 그 밖은 대신할 주소를 씀", () => {
  const origin = "http://localhost:3276";
  const fallback = "/home";
  const kept = ["/dashboard/alarms", "/dashboard/alarms?from=login&page=3", "/info/training#top", "/a/b:c"];
  for (const next of kept) expect(safeNextPath(next, origin, fallback), next).toBe(next);
  const replaced = [
    null,
    "",
    "dashboard",
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "https://evil.com",
    "http://localhost:3276/dashboard",
    "javascript:alert(1)",
    " /dashboard",
  ];
  for (const next of replaced) expect(safeNextPath(next, origin, fallback), String(next)).toBe(fallback);
});

test("다크 Theme에서 Theme Button으로 바꾸면 같은 Token의 다크 값이 적용됨", async ({ page }) => {
  await openLogin(page);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  expect((await measure(page, SCREEN)).style.backgroundColor).toBe(await color(page, "#07151f"));
  const card = (await measure(page, CARD)).style;
  expect(card.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(card.backgroundColor).toBe(await color(page, "#0b1f2e"));
  expect(card.borderTopColor).toBe(await color(page, "#264159"));
  expect((await measure(page, BRAND)).style.backgroundColor).toBe(await color(page, "#0f2335"));
  const darkLogoFills = await page.locator(`${LOGO} g`).evaluateAll((groups) => groups.map((group) => getComputedStyle(group).fill));
  expect(darkLogoFills).toEqual([await color(page, "#f1f4f8"), await color(page, "#f1f4f8")]);
  expect(await page.locator(PHOTO).evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  expect((await measure(page, SYSTEM_NAME)).style.color).toBe(await color(page, "#f1f4f8"));
  expect((await measure(page, EYEBROW)).style.color).toBe(await color(page, "#4fc2ee"));
  expect((await measure(page, DESCRIPTION)).style.color).toBe(await color(page, "#9fb3c6"));
  expect((await measure(page, STATION)).style.backgroundColor).toBe(await color(page, "#0f2335"));
  expect(await page.locator(TRAIN_SHELL).evaluate((element) => getComputedStyle(element).fill)).toBe(await color(page, "#00a4e3"));
  expect((await measure(page, TRAIN_NUMBER)).style.color).toBe(await color(page, "#f1f4f8"));
  expect((await measure(page, TRAIN_FORMATION)).style.color).toBe(await color(page, "#fff"));
  expect(await page.locator(TRAIN_WINDOW).first().evaluate((element) => getComputedStyle(element).fill)).toBe(await color(page, "#fff"));
  const idInput = (await measure(page, ID_INPUT)).style;
  expect(idInput.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(idInput.color).toBe(await color(page, "#f1f4f8"));
  const darkBorder = await color(page, "#264159");
  await expect.poll(async () => (await measure(page, PASSWORD_GROUP)).style.borderTopColor).toBe(darkBorder);
  const submit = (await measure(page, SUBMIT)).style;
  expect(submit.backgroundColor).toBe(await color(page, "var(--primary)"));
  expect(submit.color).toBe(await color(page, "var(--on-primary)"));

  await setMockAuth(page, { fail: true });
  await page.locator(ID_INPUT).fill("operator");
  await page.locator(PASSWORD_INPUT).fill("secret-pw");
  await page.keyboard.press("Enter");
  await expect(page.locator(FAILURE)).toHaveText(FAILED_TEXT);
  const failure = (await measure(page, FAILURE)).style;
  expect(failure.backgroundColor).toBe(await color(page, "#3b1416"));
  expect(failure.color).toBe(await color(page, "#ff9ea1"));
});

async function recordLineScales(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const host = window as unknown as { lineScales: number[] };
    host.lineScales = [];
    const sample = () => {
      const track = document.querySelector('[data-slot="login-line-track"]');
      if (track) {
        const transform = getComputedStyle(track).transform;
        host.lineScales.push(transform === "none" ? 1 : Math.round(new DOMMatrix(transform).a * 1000) / 1000);
      }
      if (host.lineScales.length < 240) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function recordTrainFrames(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const host = window as unknown as { trainFrames: [number, number][] };
    host.trainFrames = [];
    const sample = () => {
      const train = document.querySelector('[data-slot="login-train"]');
      const track = document.querySelector('[data-slot="login-line-track"]');
      if (train && track) {
        const transform = getComputedStyle(track).transform;
        const scale = transform === "none" ? 1 : Math.round(new DOMMatrix(transform).a * 1000) / 1000;
        host.trainFrames.push([Math.round(train.getBoundingClientRect().x * 1000) / 1000, scale]);
      }
      if (host.trainFrames.length < 240) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function trainFrames(page: Page): Promise<[number, number][]> {
  await expect.poll(() => styleOf(page, TRAIN_RUN, "transform")).toBe("none");
  return page.evaluate(() => (window as unknown as { trainFrames: [number, number][] }).trainFrames);
}

async function trainTimeline(page: Page, steps: number): Promise<{ at: number; center: number; middle: number; circleMiddle: number; scale: number }[]> {
  await page.clock.install({ time: MOCK_TODAY });
  await page.clock.pauseAt(MOCK_TODAY);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/login");
  await expect(page.locator(TRAIN_FORMATION)).not.toHaveText("");
  const read = () =>
    page.evaluate(() => {
      const shell = (document.querySelector('[data-slot="train-shell"]') as Element).getBoundingClientRect();
      const circle = (document.querySelector('[data-slot="login-line-station"]') as Element).getBoundingClientRect();
      const transform = getComputedStyle(document.querySelector('[data-slot="login-line-track"]') as Element).transform;
      return {
        at: performance.now(),
        center: Math.round((shell.x + shell.width / 2) * 1000) / 1000,
        middle: Math.round((shell.y + shell.height / 2) * 1000) / 1000,
        circleMiddle: Math.round((circle.y + circle.height / 2) * 1000) / 1000,
        scale: transform === "none" ? 1 : Math.round(new DOMMatrix(transform).a * 1000) / 1000,
      };
    });
  const frames = [await read()];
  for (let step = 0; step < steps; step += 1) {
    await page.clock.runFor(16);
    frames.push(await read());
  }
  return frames;
}

async function lineScales(page: Page): Promise<number[]> {
  await page.waitForFunction(() => (window as unknown as { lineScales: number[] }).lineScales.slice(-1)[0] === 1);
  return page.evaluate(() => (window as unknown as { lineScales: number[] }).lineScales);
}

test("움직임 줄이기를 켜면 Card는 이동 없이 0.3초 Fade만 적용되고, 호선 선은 그어지지 않고 바로 다 보이며, 열차는 화면을 연 첫 이미지부터 멈춘 위치에 있음", async ({ page }) => {
  await recordLineScales(page);
  await recordTrainFrames(page);
  await openLogin(page);
  expect(await enterMotion(page, CARD)).toEqual(["enter", "0.3s", "1", "0"]);
  expect((await enterTranslate(page, CARD))[1]).toBe("calc(0*100%)");
  const scales = await lineScales(page);
  expect(scales.filter((scale) => scale > 0 && scale < 1)).toEqual([]);
  const lefts = (await trainFrames(page)).map(([left]) => left);
  expect(lefts.length).toBeGreaterThan(2);
  expect([...new Set(lefts)]).toEqual([822.656]);
});

test.describe("움직임 줄이기를 켜지 않은 화면", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("Card는 0.3초 동안 0.5rem 아래에서 떠오르며 Fade되고 호선 선은 왼쪽에서 한 번 그어지고 멈춤", async ({ page }) => {
    await recordLineScales(page);
    await openLogin(page);
    expect(await enterMotion(page, CARD)).toEqual(["enter", "0.3s", "1", "0"]);
    expect((await enterTranslate(page, CARD))[1]).toBe("calc(2*.25rem)");
    expect(await styleOf(page, CARD, "animation-timing-function")).toBe("cubic-bezier(0, 0, 0.2, 1)");
    expect(await styleOf(page, LINE_TRACK, "transform-origin")).toBe("0px 2px");
    const scales = await lineScales(page);
    const growing = scales.filter((scale) => scale > 0 && scale < 1);
    expect(growing.length).toBeGreaterThan(2);
    expect(growing).toEqual([...growing].sort((a, b) => a - b));
    expect(Math.max(...scales)).toBe(1);
    await page.waitForTimeout(500);
    expect(await styleOf(page, LINE_TRACK, "transform")).toBe("none");
  });

  test("열차 표시는 선이 다 그어진 뒤 첫 역에서 출발해 역마다 0.5초 ease-in-out으로 한 구간 이동하고 0.15초 정차하기를 반복해 다섯째 역에 멈춤", async ({ page }) => {
    const frames = await trainTimeline(page, 200);
    const stations = await page.locator(STATION).evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return rect.x + rect.width / 2;
      }),
    );
    const near = (center: number, station: number) => Math.abs(center - station) <= 0.05;
    expect(frames.filter((frame) => Math.abs(frame.middle - frame.circleMiddle) >= 0.1)).toEqual([]);
    const centers = frames.map((frame) => frame.center);
    expect(centers).toEqual([...centers].sort((a, b) => a - b));
    expect(near(centers[0], stations[0])).toBe(true);
    expect(near(centers[centers.length - 1], stations[4])).toBe(true);
    expect(await styleOf(page, TRAIN_RUN, "transform")).toBe("none");
    const stops = stations.map((station) => frames.filter((frame) => near(frame.center, station)));
    stops.forEach((stop, index) => expect(stop.length, `${index + 1}번째 역`).toBeGreaterThan(0));
    const arrivals = stops.map((stop) => stop[0].at);
    expect(arrivals).toEqual([...arrivals].sort((a, b) => a - b));
    const departure = frames.findIndex((frame) => !near(frame.center, stations[0]));
    expect(frames[departure - 1].scale).toBe(1);
    expect(frames.slice(0, departure).some((frame) => frame.scale < 1)).toBe(true);
    for (const index of [1, 2, 3]) {
      const dwell = stops[index][stops[index].length - 1].at - stops[index][0].at;
      expect(dwell, `${index + 1}번째 역에 선 시간`).toBeGreaterThanOrEqual(110);
      expect(dwell, `${index + 1}번째 역에 선 시간`).toBeLessThanOrEqual(220);
    }
    for (let hop = 0; hop < 4; hop += 1) {
      const from = frames.indexOf(stops[hop][stops[hop].length - 1]);
      const to = frames.indexOf(stops[hop + 1][0]);
      const span = frames[to].at - frames[from].at;
      expect(span, `${hop + 1} → ${hop + 2} 시간`).toBeGreaterThanOrEqual(440);
      expect(span, `${hop + 1} → ${hop + 2} 시간`).toBeLessThanOrEqual(520);
      const between = frames.slice(from + 1, to);
      expect(between.every((frame) => frame.center > stations[hop] && frame.center < stations[hop + 1])).toBe(true);
      const middle = between.reduce((best, frame) =>
        Math.abs(frame.at - (frames[from].at + span / 2)) < Math.abs(best.at - (frames[from].at + span / 2)) ? frame : best,
      );
      const progress = (middle.center - stations[hop]) / (stations[hop + 1] - stations[hop]);
      expect(progress, `${hop + 1} → ${hop + 2} 가운데 시각의 진행`).toBeGreaterThan(0.3);
      expect(progress, `${hop + 1} → ${hop + 2} 가운데 시각의 진행`).toBeLessThan(0.95);
      const speeds = frames.slice(from, to + 1).slice(1).map((frame, index) => frame.center - frames[from + index].center);
      const fastest = Math.max(...speeds);
      expect(speeds[0], `${hop + 1} → ${hop + 2} 출발`).toBeLessThan(fastest * 0.25);
      expect(speeds[speeds.length - 1], `${hop + 1} → ${hop + 2} 도착`).toBeLessThan(fastest * 0.25);
      const fastestAt = speeds.indexOf(fastest);
      expect(fastestAt).toBeGreaterThan(0);
      expect(fastestAt).toBeLessThan(speeds.length - 1);
    }
    expect(arrivals[4] - frames[departure - 1].at).toBeGreaterThanOrEqual(2350);
    expect(arrivals[4] - frames[departure - 1].at).toBeLessThanOrEqual(2470);
  });
});

test("열차 번호 이스터에그는 들어올 때마다(새Logo침, 다른 화면에서) 위쪽은 0001에서 9999(4자리, 앞 0 채움), 몸통은 4XX(401에서 426) 무작위로 바뀜", async ({ page }) => {
  const seen: TrainNumbers[] = [];
  for (let visit = 0; visit < 8; visit += 1) {
    if (visit === 0) {
      await openLogin(page, { train: null });
    } else if (visit % 2 === 1) {
      await page.reload();
    } else {
      await page.goto(DEFAULT_SCREEN);
      await page.goto("/login");
    }
    await expect(page.locator(TRAIN_FORMATION)).not.toHaveText("");
    seen.push({
      trainNumber: (await page.locator(TRAIN_NUMBER).textContent()) ?? "",
      formation: (await page.locator(TRAIN_FORMATION).textContent()) ?? "",
    });
  }
  for (const { trainNumber, formation } of seen) {
    expect(trainNumber).toMatch(/^\d{4}$/);
    expect(Number(trainNumber)).toBeGreaterThanOrEqual(1);
    expect(Number(trainNumber)).toBeLessThanOrEqual(9999);
    expect(formation).toMatch(/^4\d{2}$/);
    expect(Number(formation)).toBeGreaterThanOrEqual(401);
    expect(Number(formation)).toBeLessThanOrEqual(426);
  }
  expect(new Set(seen.map(({ trainNumber }) => trainNumber)).size).toBeGreaterThan(1);
  expect(new Set(seen.map(({ formation }) => formation)).size).toBeGreaterThan(1);
});

test("열차 번호를 고르는 규칙은 범위와 자릿수가 loginTrainConfig 한 곳에 있고, 무작위 0이면 맨 아래(0001), 1 바로 아래면 맨 위이며, 앞을 0으로 채우고, 편성 26개가 다 나옴", () => {
  expect(loginTrainConfig).toEqual({
    trainNumber: { min: 1, max: 9999, digits: 4 },
    formation: { min: 401, max: 426, digits: 3 },
  });
  expect(pickLoginTrainNumbers(loginTrainConfig, () => 0)).toEqual({ trainNumber: "0001", formation: "401" });
  expect(pickLoginTrainNumbers(loginTrainConfig, () => 0.9999999)).toEqual({ trainNumber: "9999", formation: "426" });
  expect(pickLoginTrainNumbers(loginTrainConfig, () => 0.05).trainNumber).toBe("0500");
  const picks = Array.from({ length: 3000 }, () => pickLoginTrainNumbers(loginTrainConfig));
  expect(picks.every(({ trainNumber, formation }) => /^\d{4}$/.test(trainNumber) && /^4\d{2}$/.test(formation))).toBe(true);
  const formations = new Set(picks.map(({ formation }) => Number(formation)));
  expect([...formations].sort((a, b) => a - b)).toEqual(Array.from({ length: 26 }, (_, index) => 401 + index));
});

test("test hook window.cbmMockLoginTrain은 넣은 번호가 그대로 쓰이고, 한 칸만 넣으면 다른 칸은 무작위임", async ({ page, context }) => {
  await openLogin(page, { train: { trainNumber: "4321", formation: "417" } });
  await expect(page.locator(TRAIN_NUMBER)).toHaveText("4321");
  await expect(page.locator(TRAIN_FORMATION)).toHaveText("417");
  const other = await context.newPage();
  await openLogin(other, { train: { formation: "426" } });
  await expect(other.locator(TRAIN_FORMATION)).toHaveText("426");
  await expect(other.locator(TRAIN_NUMBER)).toHaveText(/^\d{4}$/);
});

test("번호는 화면이 붙은 뒤 정해지므로 Server 이미지는 빈 상태이고, 다른 번호가 먼저 보이지 않으며, 빈 상태에서도 크기가 그대로이고, hydration 경고가 0건임", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  const html = await (await page.request.get("/login")).text();
  expect(html).toMatch(/data-slot="train-number"[^>]*><\/span>/);
  expect(html).toMatch(/data-slot="train-formation"[^>]*><\/span>/);
  await page.addInitScript(() => {
    const host = window as unknown as { trainTexts: [string, string, number][] };
    host.trainTexts = [];
    const sample = () => {
      const train = document.querySelector('[data-slot="login-train"]');
      if (train) {
        host.trainTexts.push([
          train.querySelector('[data-slot="train-number"]')?.textContent ?? "",
          train.querySelector('[data-slot="train-formation"]')?.textContent ?? "",
          train.getBoundingClientRect().height,
        ]);
      }
      if (host.trainTexts.length < 120) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await openLogin(page, { train: null });
  await expect(page.locator(TRAIN_FORMATION)).not.toHaveText("");
  await page.waitForFunction(() => (window as unknown as { trainTexts: unknown[] }).trainTexts.length >= 120);
  const texts = await page.evaluate(() => (window as unknown as { trainTexts: [string, string, number][] }).trainTexts);
  const shown = [(await page.locator(TRAIN_NUMBER).textContent()) ?? "", (await page.locator(TRAIN_FORMATION).textContent()) ?? ""];
  expect([...new Set(texts.map(([trainNumber]) => trainNumber))].filter(Boolean)).toEqual([shown[0]]);
  expect([...new Set(texts.map(([, formation]) => formation))].filter(Boolean)).toEqual([shown[1]]);
  expect([...new Set(texts.map(([, , height]) => height))]).toEqual([42]);
  expect(problems).toEqual([]);
});

test("열차 몸체의 가로와 세로 가운데가 다섯째 역 원의 가운데와 같고(오차 0.1 이내), 선이 몸체 가운데를 지나고 원은 몸체 뒤로 가려지며, 상단 번호는 몸체 위에 붙음(1920, 3840)", async ({ page }) => {
  for (const [width, height] of [[1920, 1080], [3840, 2160]]) {
    await openLogin(page, { width, height });
    await waitForLine(page);
    const shell = await box(page, TRAIN_SHELL);
    const circle = await box(page, STATION, 4);
    const track = await box(page, LINE_TRACK);
    expect(Math.abs(shell.y + shell.height / 2 - (circle.y + circle.height / 2)), `${width} 세로`).toBeLessThan(0.1);
    expect(Math.abs(shell.x + shell.width / 2 - (circle.x + circle.width / 2)), `${width} 가로`).toBeLessThan(0.1);
    expect(Math.abs(shell.y + shell.height / 2 - (track.y + track.height / 2)), `${width} 선`).toBeLessThan(0.1);
    expect(shell.y).toBeLessThan(circle.y);
    expect(shell.y + shell.height).toBeGreaterThan(circle.y + circle.height);
    const topAtCircle = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('[data-slot="login-train"]') !== null,
      [circle.x + circle.width / 2, circle.y + circle.height / 2],
    );
    expect(topAtCircle, `${width} 원 가운데의 맨 위 요소`).toBe(true);
    const number = await box(page, TRAIN_NUMBER);
    const body = await box(page, `${TRAIN} [data-slot="train-body"]`);
    expect(Math.abs(number.y + number.height - body.y), `${width} 번호 아래`).toBeLessThan(0.1);
  }
});
