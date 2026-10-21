import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { LOGIN_ACCOUNT_COOKIE, readLoginAccount } from "../src/lib/loginAccount";
import { MOCK_TODAY } from "./helpers/measure";

test.use({ contextOptions: { reducedMotion: "reduce" }, storageState: { cookies: [], origins: [] } });

const LOGIN_SCREEN = '[data-slot="login-screen"]';
const ID_INPUT = '[data-slot="login-id-input"]';
const PASSWORD_INPUT = '[data-slot="login-password-input"]';
const SHELL = '[data-slot="left-rail"]';
const REMAINING = '[data-slot="session-chip-remaining"]';
const EXPIRED = '[data-dialog="session-expired"]';
const WARNING = '[data-dialog="session-expiry-warning"]';
const LOGOUT = '[data-dialog="logout-confirm"]';
const LOGOUT_ACTION = `${LOGOUT} [data-slot="alert-dialog-action"]`;
const POWER = '[data-slot="left-rail"] [data-slot="rail-button"][title="모니터링 종료"]';
const ERROR_TOAST = '[data-slot="toast-viewport"] [data-tone="error"]';
const DEFAULT_SCREEN = "/dashboard/fleet";
const PASSWORD = "secret-pw!";

const START = MOCK_TODAY.getTime();
const EXPIRY = START + 600 * 1000;

interface Frame {
  path: string;
  login: boolean;
  shell: boolean;
}

async function addLoginCookie(context: BrowserContext, value = "operator"): Promise<void> {
  await context.addCookies([
    { name: LOGIN_ACCOUNT_COOKIE, value, domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" },
  ]);
}

async function loginCookie(context: BrowserContext) {
  return (await context.cookies()).find((cookie) => cookie.name === LOGIN_ACCOUNT_COOKIE);
}

async function submitLogin(page: Page, id = "operator"): Promise<void> {
  await expect(page.locator(ID_INPUT)).toBeFocused();
  await page.locator(ID_INPUT).fill(id);
  await page.locator(PASSWORD_INPUT).fill(PASSWORD);
  await page.keyboard.press("Enter");
}

async function recordFrames(page: Page): Promise<Frame[]> {
  const frames: Frame[] = [];
  await page.exposeBinding("cbmRecordFrame", (_source, frame: Frame) => {
    frames.push(frame);
  });
  await page.addInitScript(() => {
    let last = "";
    const record = () => {
      const root = document.documentElement;
      const hidden = root === null || getComputedStyle(root).visibility === "hidden";
      const shown = (selector: string) =>
        !hidden && [...document.querySelectorAll(selector)].some((element) => element.checkVisibility({ visibilityProperty: true }));
      const frame = { path: location.pathname, login: shown('[data-slot="login-screen"]'), shell: shown('[data-slot="left-rail"]') };
      const text = JSON.stringify(frame);
      if (text !== last) {
        last = text;
        (window as unknown as { cbmRecordFrame?: (value: typeof frame) => void }).cbmRecordFrame?.(frame);
      }
      requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  return frames;
}

async function probe(page: Page, path: string): Promise<{ status: number; location: string | null; cacheControl: string | null }> {
  const response = await page.request.get(path, { maxRedirects: 0 });
  const location = response.headers()["location"] ?? null;
  const target = location === null ? null : new URL(location, response.url());
  if (target !== null) expect(target.origin, path).toBe(new URL(response.url()).origin);
  return {
    status: response.status(),
    location: target === null ? null : `${target.pathname}${target.search}`,
    cacheControl: response.headers()["cache-control"] ?? null,
  };
}

test("Cookie 없이 화면 주소를 열면 화면을 한 번도 그리지 않고 /login?next=<경로+조회 조건>으로 이동하고, Login하면 그 화면이 열리며 새 Session은 10:00임", async ({ page, context }) => {
  const watched = "/dashboard/alarms?from=guard&page=2";
  const frames = await recordFrames(page);
  await page.goto(watched);
  await expect(page).toHaveURL(/\/login\?next=/);
  const url = new URL(page.url());
  expect(url.pathname).toBe("/login");
  expect(url.searchParams.get("next")).toBe(watched);
  await expect(page.locator(LOGIN_SCREEN)).toBeVisible();
  await expect(page.locator(SHELL)).toHaveCount(0);
  expect(await loginCookie(context)).toBeUndefined();
  await expect.poll(() => frames.some((frame) => frame.login)).toBe(true);
  expect(frames.filter((frame) => frame.shell || frame.path !== "/login")).toEqual([]);

  await submitLogin(page);
  await expect(page).toHaveURL(watched);
  await expect(page.locator(SHELL)).toBeVisible();
  await expect(page.locator(REMAINING)).toHaveText("10:00");
});

test("proxy의 분기 확인, Cookie 없음: /는 Login, 화면 주소는 next, Login Page, 이미지는 그대로 / Cookie 있음: /와 Login Page는 next 또는 플릿 개요, 안전하지 않은 next는 플릿 개요, 보여 주는 문서는 보관하지 않음", async ({ page, context }) => {
  expect(await probe(page, "/")).toEqual({ status: 307, location: "/login", cacheControl: null });
  for (const path of ["/dashboard/fleet", "/dashboard/timeline", "/info/training", "/model/threshold", "/dashboard/measures?status=open&page=3"]) {
    const result = await probe(page, path);
    expect(result.status, path).toBe(307);
    expect(result.location, path).toBe(`/login?next=${encodeURIComponent(path)}`);
  }
  expect(await probe(page, "/login")).toEqual({ status: 200, location: null, cacheControl: "private, no-store" });
  expect(await probe(page, "/login?next=%2Fdashboard%2Falarms")).toEqual({ status: 200, location: null, cacheControl: "private, no-store" });
  for (const path of ["/login-train.webp", "/seoulMetro_logo.svg", "/favicon.ico"]) {
    expect((await probe(page, path)).status, path).toBe(200);
  }

  await addLoginCookie(context);
  expect(await probe(page, "/")).toEqual({ status: 307, location: DEFAULT_SCREEN, cacheControl: null });
  expect(await probe(page, "/login")).toEqual({ status: 307, location: DEFAULT_SCREEN, cacheControl: null });
  expect((await probe(page, `/login?next=${encodeURIComponent("/dashboard/alarms?from=login&page=3")}`)).location).toBe("/dashboard/alarms?from=login&page=3");
  for (const next of ["//evil.com", "https://evil.com/dashboard/alarms", "/\\evil.com", "javascript:alert(1)", "/login", "/login?next=%2Fdashboard%2Falarms"]) {
    expect((await probe(page, `/login?next=${encodeURIComponent(next)}`)).location, next).toBe(DEFAULT_SCREEN);
  }
  expect(await probe(page, "/dashboard/timeline?from=a")).toEqual({ status: 200, location: null, cacheControl: "private, no-store" });
});

test("Login하면 아이디만 든 Browser Session Cookie가 만들어지고, 만료 시각 없음(-1), path /, SameSite Lax이며 비밀번호는 어디에도 없음", async ({ page, context }) => {
  await page.goto("/login");
  await submitLogin(page, "  user.01@cbm  ");
  await expect(page).toHaveURL(DEFAULT_SCREEN);
  const cookie = await loginCookie(context);
  expect(cookie).toMatchObject({
    value: encodeURIComponent("user.01@cbm"),
    domain: "localhost",
    path: "/",
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  });
  expect(await page.evaluate(() => document.cookie)).toContain(`${encodeURIComponent("user.01@cbm")}`);
  expect(readLoginAccount(await page.evaluate(() => document.cookie))).toBe("user.01@cbm");
  expect(JSON.stringify(await context.storageState())).not.toContain(PASSWORD);
  expect(await page.evaluate((password) => document.documentElement.outerHTML.includes(password), PASSWORD)).toBe(false);
});

test("Login 뒤 새Logo침, /, /login 열기, 뒤로가기에서 Login Page가 한 번도 그려지지 않음", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator(ID_INPUT)).toBeFocused();
  await page.goto("/dashboard/timeline");
  await submitLogin(page);
  await expect(page).toHaveURL("/dashboard/timeline");
  await expect(page.locator(SHELL)).toBeVisible();
  const frames = await recordFrames(page);

  await page.reload();
  await expect(page).toHaveURL("/dashboard/timeline");
  await expect(page.locator(SHELL)).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(DEFAULT_SCREEN);
  await page.goto("/login");
  await expect(page).toHaveURL(DEFAULT_SCREEN);
  await page.goto(`/login?next=${encodeURIComponent("/dashboard/measures")}`);
  await expect(page).toHaveURL("/dashboard/measures");

  for (const expected of [DEFAULT_SCREEN, DEFAULT_SCREEN, "/dashboard/timeline", DEFAULT_SCREEN]) {
    await page.goBack();
    await expect(page).toHaveURL(expected);
    await expect(page.locator(SHELL)).toBeVisible();
  }
  expect(frames.some((frame) => frame.path === "/dashboard/measures" && frame.shell)).toBe(true);
  expect(frames.filter((frame) => frame.login)).toEqual([]);
  expect(frames.filter((frame) => frame.path === "/login")).toEqual([]);
});

test("Login Page에서 Login한 뒤 뒤로가기를 하면 Login Page 기록은 플릿 개요로 바뀌어 남지 않음(앱 밖으로 나감)", async ({ page }) => {
  await page.goto("/login");
  await submitLogin(page);
  await expect(page).toHaveURL(DEFAULT_SCREEN);
  await page.goBack();
  await expect(page).toHaveURL("about:blank");
  await page.goForward();
  await expect(page).toHaveURL(DEFAULT_SCREEN);
  await expect(page.locator(SHELL)).toBeVisible();
  await expect(page.locator(LOGIN_SCREEN)).toHaveCount(0);
});

test("Cookie가 있을 때 /login을 열면 문서가 열릴 때부터 어떤 이미지에도 Login Page가 한 번도 보이지 않고 Server가 307로 넘김", async ({ page, context }) => {
  await addLoginCookie(context);
  const frames = await recordFrames(page);
  const documents: string[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "document") documents.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  await page.goto(`/login?next=${encodeURIComponent("/dashboard/measures")}`);
  await expect(page).toHaveURL("/dashboard/measures");
  await expect(page.locator(SHELL)).toBeVisible();
  await expect.poll(() => frames.some((frame) => frame.path === "/dashboard/measures" && frame.shell)).toBe(true);
  expect(frames.filter((frame) => frame.login || frame.path === "/login")).toEqual([]);
  expect(documents).toEqual(["307 /login", "200 /dashboard/measures"]);
});

test("모니터링 종료에 성공하면 Cookie를 지우고, 플릿 개요 주소를 열면 Login Page가 열리며, 뒤로가기에도 화면이 다시 보이지 않음", async ({ page, context }) => {
  await addLoginCookie(context);
  await page.goto(DEFAULT_SCREEN);
  await expect(page.locator(REMAINING)).toHaveText("10:00");
  await page.getByRole("link", { name: "알람/이벤트" }).click();
  await expect(page).toHaveURL("/dashboard/alarms");
  const frames = await recordFrames(page);

  await page.locator(POWER).click();
  await page.locator(LOGOUT_ACTION).click();
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent("/dashboard/alarms")}`);
  expect(await loginCookie(context)).toBeUndefined();

  await page.goBack();
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(DEFAULT_SCREEN)}`);
  await expect(page.locator(ID_INPUT)).toBeFocused();
  await page.goto(DEFAULT_SCREEN);
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(DEFAULT_SCREEN)}`);
  await expect.poll(() => frames.some((frame) => frame.login)).toBe(true);
  expect(frames.filter((frame) => frame.shell)).toEqual([]);
});

test("모니터링 종료에 실패하면 실패 알림이 표시되고 Cookie는 남으며 새Logo침해도 그 화면임", async ({ page, context }) => {
  await addLoginCookie(context);
  await page.addInitScript(() => {
    (window as unknown as { cbmMockAuth?: { failLogout: boolean } }).cbmMockAuth = { failLogout: true };
  });
  await page.goto(DEFAULT_SCREEN);
  await expect(page.locator(REMAINING)).toHaveText("10:00");
  await page.locator(POWER).click();
  await page.locator(LOGOUT_ACTION).click();
  await expect(page.locator(ERROR_TOAST)).toHaveText("모니터링을 종료하지 못했습니다.");
  await expect(page).toHaveURL(DEFAULT_SCREEN);
  expect((await loginCookie(context))?.value).toBe("operator");
  await page.reload();
  await expect(page).toHaveURL(DEFAULT_SCREEN);
  await expect(page.locator(SHELL)).toBeVisible();
});

test("Session 만료에서 1분 전 경고까지는 Cookie가 남고, 만료 Dialog이 뜨면 지우며, Dialog을 띄운 채 새Logo침하면 Login Page(next=보던 주소)가 열림", async ({ page, context }) => {
  await addLoginCookie(context);
  const watched = "/dashboard/timeline?from=expired";
  await page.clock.setFixedTime(START);
  await page.goto(watched);
  await expect(page.locator(REMAINING)).toHaveText("10:00");

  await page.clock.setFixedTime(EXPIRY - 60 * 1000);
  await expect(page.locator(WARNING)).toBeVisible();
  expect((await loginCookie(context))?.value).toBe("operator");

  await page.clock.setFixedTime(EXPIRY);
  await expect(page.locator(EXPIRED)).toBeVisible();
  await expect.poll(() => loginCookie(context)).toBeUndefined();
  await expect(page).toHaveURL(watched);

  await page.reload();
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(watched)}`);
  await expect(page.locator(ID_INPUT)).toBeFocused();
  await expect(page.locator(SHELL)).toHaveCount(0);
});

test("다른 Tab에서 모니터링 종료하면 이 Tab의 Menu 이동(미리 받아 둔 화면, Request 없음)도 화면을 그리지 않고 Login Page로 이동함", async ({ page, context }) => {
  await addLoginCookie(context);
  const frames = await recordFrames(page);
  await page.goto(DEFAULT_SCREEN);
  await expect(page.locator(REMAINING)).toHaveText("10:00");
  await expect.poll(() => frames.some((frame) => frame.path === DEFAULT_SCREEN && frame.shell)).toBe(true);

  const other = await context.newPage();
  await other.goto(DEFAULT_SCREEN);
  await other.locator(POWER).click();
  await other.locator(LOGOUT_ACTION).click();
  await expect(other).toHaveURL(/\/login\?next=/);
  expect(await loginCookie(context)).toBeUndefined();

  await page.getByRole("link", { name: "이상 타임라인" }).click();
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent("/dashboard/timeline")}`);
  await expect(page.locator(ID_INPUT)).toBeFocused();
  expect(frames.filter((frame) => frame.path === "/dashboard/timeline" && frame.shell)).toEqual([]);

  await submitLogin(page);
  await expect(page).toHaveURL("/dashboard/timeline");
  await expect(page.locator(SHELL)).toBeVisible();
});

test("Browser가 보관한 문서로 proxy를 건너뛰어도 종료 뒤 화면 문서는 Login Page로, Login한 뒤 Login Page 문서는 Login 뒤 갈 주소로 이동함", async ({ page, context }) => {
  await addLoginCookie(context);
  const screenHtml = await (await page.request.get(DEFAULT_SCREEN)).text();
  await context.clearCookies();
  await page.route((url) => url.pathname === DEFAULT_SCREEN && !url.searchParams.has("_rsc"), (route) =>
    route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: screenHtml }), { times: 1 });
  await page.goto(DEFAULT_SCREEN);
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(DEFAULT_SCREEN)}`);
  await expect(page.locator(ID_INPUT)).toBeFocused();

  const next = "/dashboard/measures?page=2";
  const loginHtml = await (await page.request.get(`/login?next=${encodeURIComponent(next)}`)).text();
  await addLoginCookie(context);
  await page.route((url) => url.pathname === "/login", (route) =>
    route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: loginHtml }), { times: 1 });
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await expect(page).toHaveURL(next);
  await expect(page.locator(SHELL)).toBeVisible();
});

test("bfcache로 되살아난 화면(pageshow persisted)은 Login 표시가 맞지 않으면 이동하고 맞으면 그대로임", async ({ page, context }) => {
  const restore = (target: Page, persisted: boolean) =>
    target.evaluate((value) => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: value })), persisted);

  await addLoginCookie(context);
  await page.goto(DEFAULT_SCREEN);
  await expect(page.locator(REMAINING)).toHaveText("10:00");
  await restore(page, true);
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(DEFAULT_SCREEN);
  await context.clearCookies();
  await restore(page, false);
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(DEFAULT_SCREEN);
  await restore(page, true);
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(DEFAULT_SCREEN)}`);

  await page.goto(`/login?next=${encodeURIComponent("/dashboard/alarms")}`);
  await expect(page.locator(ID_INPUT)).toBeFocused();
  await addLoginCookie(context);
  await restore(page, true);
  await expect(page).toHaveURL("/dashboard/alarms");
  await expect(page.locator(SHELL)).toBeVisible();
});

test("Cookie Text에서 Login 아이디를 읽는 규칙은 이름이 같은 것만 읽고, 빈 값은 없음으로 보며, 풀 수 없는 값은 그대로 둠", () => {
  expect(readLoginAccount(`a=1; ${LOGIN_ACCOUNT_COOKIE}=user.01%40cbm; b=2`)).toBe("user.01@cbm");
  expect(readLoginAccount(`${LOGIN_ACCOUNT_COOKIE}=operator`)).toBe("operator");
  expect(readLoginAccount("")).toBeNull();
  expect(readLoginAccount(`${LOGIN_ACCOUNT_COOKIE}=`)).toBeNull();
  expect(readLoginAccount(`x${LOGIN_ACCOUNT_COOKIE}=operator; ${LOGIN_ACCOUNT_COOKIE}x=operator`)).toBeNull();
  expect(readLoginAccount(`${LOGIN_ACCOUNT_COOKIE}=%E0%A4%A`)).toBe("%E0%A4%A");
});
