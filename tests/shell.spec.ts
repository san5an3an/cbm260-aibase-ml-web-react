import { expect, test, type Page } from "@playwright/test";
import { color, measure, visibleShadow } from "./helpers/measure";

test.use({ contextOptions: { reducedMotion: "reduce" } });

async function openFleet(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto("/dashboard/fleet");
  await expect(page.locator('[data-slot="session-chip-remaining"]')).not.toHaveText("--:--");
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`공통 Layout의 크기와 Color (${viewport.width}×${viewport.height}, 라이트)`, async ({ page }) => {
    await openFleet(page, viewport.width, viewport.height);

    const shell = await measure(page, '[data-slot="monitoring-shell"]');
    expect(shell.width).toBe(viewport.width);
    expect(shell.height).toBe(viewport.height);
    expect(shell.style.backgroundColor).toBe(await color(page, "var(--bg)"));
    expect(shell.style.color).toBe(await color(page, "var(--fg)"));

    const rail = await measure(page, '[data-slot="left-rail"]');
    expect(rail.width).toBe(72);
    expect(rail.height).toBe(viewport.height);
    expect(rail.style.paddingTop).toBe("29px");
    expect(rail.style.paddingBottom).toBe("20px");
    expect(rail.style.rowGap).toBe("16px");
    expect(rail.style.borderRightWidth).toBe("1px");
    expect(rail.style.borderRightColor).toBe(await color(page, "var(--rail-border)"));
    expect(rail.style.backgroundColor).toBe(await color(page, "var(--rail-bg)"));

    const logo = await measure(page, '[data-slot="left-rail"] img');
    expect(logo.width).toBe(32);
    expect(logo.height).toBe(32);
    expect(logo.style.marginTop).toBe("-4px");
    expect(logo.style.marginBottom).toBe("13px");

    const menuButton = await measure(page, '[data-slot="rail-button"][title="메뉴"]');
    expect(menuButton.width).toBe(42);
    expect(menuButton.height).toBe(42);
    expect(menuButton.style.borderTopLeftRadius).toBe("10px");
    expect(menuButton.style.color).toBe(await color(page, "var(--icon)"));
    const menuIcon = await measure(page, '[data-slot="rail-button"][title="메뉴"] svg');
    expect(menuIcon.width).toBe(24);
    expect(menuIcon.height).toBe(24);

    const activeLink = await measure(page, '[data-slot="rail-link"][aria-current="page"]');
    expect(activeLink.width).toBe(42);
    expect(activeLink.height).toBe(42);
    expect(activeLink.style.borderTopLeftRadius).toBe("10px");
    expect(activeLink.style.backgroundColor).toBe(await color(page, "var(--rail-active)"));
    expect(activeLink.style.color).toBe(await color(page, "var(--on-primary)"));

    const idleLink = await measure(page, '[data-slot="rail-link"]:not([aria-current])');
    expect(idleLink.width).toBe(42);
    expect(idleLink.style.backgroundColor).toBe(await color(page, "transparent"));
    expect(idleLink.style.color).toBe(await color(page, "var(--icon)"));

    const powerButton = await measure(page, '[data-slot="rail-button"][title="모니터링 종료"]');
    expect(powerButton.width).toBe(42);
    expect(powerButton.height).toBe(42);
    expect(powerButton.style.backgroundColor).toBe(await color(page, "var(--rail-power)"));
    expect(powerButton.style.color).toBe(await color(page, "var(--danger-fg)"));

    const topBar = await measure(page, '[data-slot="top-bar"]');
    expect(topBar.width).toBe(viewport.width - 72);
    expect(topBar.height).toBe(58);
    expect(topBar.style.paddingLeft).toBe("20px");
    expect(topBar.style.paddingRight).toBe("20px");
    expect(topBar.style.columnGap).toBe("16px");
    expect(topBar.style.borderBottomWidth).toBe("1px");
    expect(topBar.style.borderBottomColor).toBe(await color(page, "var(--rail-border)"));
    expect(topBar.style.backgroundColor).toBe(await color(page, "var(--rail-bg)"));

    const home = await measure(page, '[data-slot="top-bar-home"]');
    expect(home.width).toBe(30);
    expect(home.height).toBe(30);
    expect(home.style.borderTopLeftRadius).toBe("8px");
    expect(home.style.backgroundColor).toBe(await color(page, "var(--rail-active)"));
    expect(home.style.color).toBe(await color(page, "var(--on-primary)"));
    const homeIcon = await measure(page, '[data-slot="top-bar-home"] svg');
    expect(homeIcon.width).toBe(20);

    const title = await measure(page, '[data-slot="top-bar-title"]');
    expect(title.style.fontSize).toBe("22px");
    expect(title.style.lineHeight).toBe("28px");
    expect(title.style.fontWeight).toBe("700");

    const divider = await measure(page, '[data-slot="top-bar-divider"]');
    expect(divider.width).toBe(1);
    expect(divider.height).toBe(22);
    expect(divider.style.opacity).toBe("0.6");
    expect(divider.style.backgroundColor).toBe(await color(page, "var(--border-strong)"));

    const systemName = await measure(page, '[data-slot="top-bar-system-name"]');
    expect(systemName.style.fontSize).toBe("16px");
    expect(systemName.style.fontWeight).toBe("500");
    expect(systemName.style.color).toBe(await color(page, "var(--muted-fg)"));

    const clock = await measure(page, '[data-slot="clock-chip"]');
    expect(clock.height).toBe(32);
    expect(clock.style.paddingLeft).toBe("12px");
    expect(clock.style.paddingRight).toBe("12px");
    expect(clock.style.columnGap).toBe("8px");
    expect(clock.style.borderTopLeftRadius).toBe("8px");
    expect(clock.style.fontSize).toBe("14px");
    expect(clock.style.fontWeight).toBe("600");
    expect(clock.style.backgroundColor).toBe(await color(page, "var(--card)"));
    const clockIcon = await measure(page, '[data-slot="clock-chip"] svg');
    expect(clockIcon.width).toBe(18);

    const themeButton = await measure(page, '[data-slot="theme-toggle-button"]');
    expect(themeButton.width).toBe(32);
    expect(themeButton.height).toBe(32);
    expect(themeButton.style.borderTopLeftRadius).toBe("8px");
    expect(themeButton.style.backgroundColor).toBe(await color(page, "var(--card)"));
    const themeIcon = await measure(page, '[data-slot="theme-toggle-button"] svg');
    expect(themeIcon.width).toBe(22);

    const live = await measure(page, '[data-slot="live-status-chip"]');
    expect(live.height).toBe(32);
    expect(live.style.paddingLeft).toBe("12px");
    expect(live.style.columnGap).toBe("6px");
    expect(live.style.borderTopLeftRadius).toBe("8px");
    expect(live.style.borderTopWidth).toBe("1px");
    expect(live.style.borderTopColor).toBe(await color(page, "var(--success)"));
    expect(live.style.color).toBe(await color(page, "var(--on-success-subtle)"));
    expect(live.style.fontSize).toBe("12px");
    expect(live.style.fontWeight).toBe("600");
    const liveDot = await measure(page, '[data-slot="live-dot"]');
    expect(liveDot.width).toBe(6);
    expect(liveDot.height).toBe(6);

    const pageBar = await measure(page, '[data-slot="page-bar"]');
    expect(pageBar.height).toBe(32);
    expect(pageBar.width).toBe(viewport.width - 72 - 28);
    expect(pageBar.style.marginTop).toBe("14px");
    expect(pageBar.style.marginLeft).toBe("14px");
    expect(pageBar.style.marginRight).toBe("14px");
    expect(pageBar.style.marginBottom).toBe("0px");
    expect(pageBar.style.columnGap).toBe("12px");

    const breadcrumb = await measure(page, '[data-slot="group-breadcrumb"]');
    expect(breadcrumb.style.fontSize).toBe("14px");
    expect(breadcrumb.style.columnGap).toBe("6px");
    const breadcrumbIcon = await measure(page, '[data-slot="group-breadcrumb"] svg');
    expect(breadcrumbIcon.width).toBe(18);
    expect(breadcrumbIcon.style.color).toBe(await color(page, "var(--muted-fg)"));

    const tabs = await measure(page, '[data-slot="screen-tabs"]');
    expect(tabs.height).toBe(32);
    expect(tabs.style.paddingTop).toBe("2px");
    expect(tabs.style.columnGap).toBe("2px");
    expect(tabs.style.borderTopLeftRadius).toBe("8px");
    expect(tabs.style.borderTopWidth).toBe("1px");
    expect(tabs.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(tabs.style.backgroundColor).toBe(await color(page, "var(--muted)"));
    expect(tabs.width).toBe(144 * 4 + 2 * 3 + 2 * 2 + 1 * 2);

    const activeTab = await measure(page, '[data-slot="screen-tab"][aria-current="page"]');
    expect(activeTab.width).toBe(144);
    expect(activeTab.height).toBe(26);
    expect(activeTab.style.paddingLeft).toBe("12px");
    expect(activeTab.style.borderTopLeftRadius).toBe("6px");
    expect(activeTab.style.fontSize).toBe("14px");
    expect(activeTab.style.fontWeight).toBe("700");
    expect(activeTab.style.columnGap).toBe("10px");
    expect(activeTab.style.color).toBe(await color(page, "var(--fg)"));

    const indicator = await measure(page, '[data-slot="screen-tab-indicator"]');
    expect(indicator.width).toBe(144);
    expect(indicator.height).toBe(26);
    expect(indicator.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(visibleShadow(indicator.style.boxShadow)).toBe("rgba(11, 31, 46, 0.14) 0px 1px 2px 0px");

    const tabDot = await measure(page, '[data-slot="screen-tab-dot"]');
    expect(tabDot.width).toBe(6);
    expect(tabDot.style.backgroundColor).toBe(await color(page, "var(--brand-line4)"));

    const idleTab = await measure(page, '[data-slot="screen-tab"]:not([aria-current])');
    expect(idleTab.width).toBe(144);
    expect(idleTab.height).toBe(26);
    expect(idleTab.style.fontWeight).toBe("500");
    expect(idleTab.style.backgroundColor).toBe(await color(page, "transparent"));

    const session = await measure(page, '[data-slot="session-chip"]');
    expect(session.height).toBe(32);
    expect(session.style.paddingLeft).toBe("12px");
    expect(session.style.paddingRight).toBe("4px");
    expect(session.style.columnGap).toBe("8px");
    expect(session.style.borderTopLeftRadius).toBe("8px");
    expect(session.style.borderTopWidth).toBe("1px");
    expect(session.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(session.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(session.style.fontSize).toBe("12px");
    expect(session.style.color).toBe(await color(page, "var(--muted-fg)"));
    const sessionIcon = await measure(page, '[data-slot="session-chip"] svg');
    expect(sessionIcon.width).toBe(16);

    const remaining = await measure(page, '[data-slot="session-chip-remaining"]');
    expect(remaining.style.fontSize).toBe("14px");
    expect(remaining.style.fontWeight).toBe("700");
    expect(remaining.style.color).toBe(await color(page, "var(--fg)"));

    const extendButton = await measure(page, '[data-slot="session-chip"] button');
    expect(extendButton.height).toBe(24);
    expect(extendButton.style.paddingLeft).toBe("10px");
    expect(extendButton.style.paddingRight).toBe("10px");
    expect(extendButton.style.borderTopLeftRadius).toBe("6px");
    expect(extendButton.style.borderTopWidth).toBe("1px");
    expect(extendButton.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(extendButton.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(extendButton.style.fontSize).toBe("12px");
    expect(extendButton.style.fontWeight).toBe("600");

    const main = await measure(page, '[data-slot="monitoring-main"]');
    expect(main.style.paddingTop).toBe("14px");
    expect(main.style.paddingLeft).toBe("14px");
    expect(main.height).toBe(viewport.height - 58 - 14 - 32);
  });
}

test("Dialog이 최소 크기보다 작아도 Layout은 1440×800을 유지함", async ({ page }) => {
  await openFleet(page, 1280, 720);

  const shell = await measure(page, '[data-slot="monitoring-shell"]');
  expect(shell.width).toBe(1440);
  expect(shell.height).toBe(800);
});

test("다크 Theme에서 공통 Layout의 Color", async ({ page }) => {
  await openFleet(page, 1920, 1080);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  const rail = await measure(page, '[data-slot="left-rail"]');
  expect(rail.style.backgroundColor).toBe(await color(page, "#0b1f2e"));
  expect(rail.style.borderRightColor).toBe(await color(page, "#264159"));

  const activeLink = await measure(page, '[data-slot="rail-link"][aria-current="page"]');
  expect(activeLink.style.backgroundColor).toBe(await color(page, "#007cb3"));

  const powerButton = await measure(page, '[data-slot="rail-button"][title="모니터링 종료"]');
  expect(powerButton.style.backgroundColor).toBe(await color(page, "#d93036"));
  expect(powerButton.style.color).toBe(await color(page, "#2a0a0b"));

  const clock = await measure(page, '[data-slot="clock-chip"]');
  expect(clock.style.backgroundColor).toBe(await color(page, "#0b1f2e"));

  const tabs = await measure(page, '[data-slot="screen-tabs"]');
  expect(tabs.style.backgroundColor).toBe(await color(page, "#142a3d"));
  expect(tabs.style.borderTopColor).toBe(await color(page, "#264159"));

  const extendButton = await measure(page, '[data-slot="session-chip"] button');
  expect(extendButton.style.backgroundColor).toBe(await color(page, "#0b1f2e"));
  expect(extendButton.style.borderTopColor).toBe(await color(page, "#264159"));

  const shell = await measure(page, '[data-slot="monitoring-shell"]');
  expect(shell.style.backgroundColor).toBe(await color(page, "#07151f"));
  expect(shell.style.color).toBe(await color(page, "#f1f4f8"));
});

test("기본 Font 크기를 2배로 하면 크기와 Border도 2배임", async ({ page }) => {
  await openFleet(page, 1920, 1080);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page.waitForTimeout(400);

  const rail = await measure(page, '[data-slot="left-rail"]');
  expect(rail.width).toBe(144);
  expect(rail.style.borderRightWidth).toBe("2px");
  expect(rail.style.paddingTop).toBe("58px");

  const menuButton = await measure(page, '[data-slot="rail-button"][title="메뉴"]');
  expect(menuButton.width).toBe(84);
  expect(menuButton.style.borderTopLeftRadius).toBe("20px");
  const menuIcon = await measure(page, '[data-slot="rail-button"][title="메뉴"] svg');
  expect(menuIcon.width).toBe(48);

  const topBar = await measure(page, '[data-slot="top-bar"]');
  expect(topBar.height).toBe(116);
  expect(topBar.style.borderBottomWidth).toBe("2px");

  const divider = await measure(page, '[data-slot="top-bar-divider"]');
  expect(divider.width).toBe(2);

  const activeTab = await measure(page, '[data-slot="screen-tab"][aria-current="page"]');
  expect(activeTab.width).toBe(288);
  expect(activeTab.height).toBe(52);
  expect(activeTab.style.fontSize).toBe("28px");

  const indicator = await measure(page, '[data-slot="screen-tab-indicator"]');
  expect(visibleShadow(indicator.style.boxShadow)).toBe("rgba(11, 31, 46, 0.14) 0px 2px 4px 0px");

  const tabs = await measure(page, '[data-slot="screen-tabs"]');
  expect(tabs.style.borderTopWidth).toBe("2px");

  const extendButton = await measure(page, '[data-slot="session-chip"] button');
  expect(extendButton.height).toBe(48);
  expect(extendButton.style.borderTopWidth).toBe("2px");

  const shell = await measure(page, '[data-slot="monitoring-shell"]');
  expect(shell.width).toBe(2880);
});

test("Tab과 Rail로 화면 이동", async ({ page }) => {
  await openFleet(page, 1920, 1080);

  await page.getByRole("link", { name: "알람/이벤트" }).click();
  await expect(page).toHaveURL("/dashboard/alarms");
  await expect(page.locator('[data-slot="screen-tab"][aria-current="page"]')).toHaveText(
    "알람/이벤트",
  );
  await expect(page.locator('[data-slot="screen-tab-indicator"]')).toHaveCount(1);

  await page.locator('[data-slot="rail-link"][title="CBM 모델"]').click();
  await expect(page).toHaveURL("/model/config");
  await expect(page.locator('[data-slot="top-bar-title"]')).toHaveText("CBM 모델");
  await expect(page.locator('[data-slot="screen-tab"]')).toHaveText([
    "모델 커스텀",
    "모델 비교",
    "임계 튜닝",
    "모델 진단",
  ]);
  await expect(page.locator('[data-slot="rail-link"][aria-current="page"]')).toHaveAttribute(
    "title",
    "CBM 모델",
  );

  await page.locator('[data-slot="rail-link"][title="CBM 정보"]').click();
  await expect(page).toHaveURL("/info/training");
  await expect(page.locator('[data-slot="screen-tab"]')).toHaveCount(3);
});

test("시계 형식과 Session 연장", async ({ page }) => {
  await openFleet(page, 1920, 1080);

  await expect(page.locator('[data-slot="clock-chip"]')).toHaveText(
    /^\d{4}-\d{2}-\d{2} \([일월화수목금토]\) \d{2}:\d{2}:\d{2}$/,
  );

  const remaining = page.locator('[data-slot="session-chip-remaining"]');
  await expect(remaining).toHaveText(/^(10:00|09:5\d)$/);
  await expect(remaining).toHaveText(/^09:5[0-7]$/, { timeout: 15_000 });
  await page.getByRole("button", { name: "연장" }).click();
  await expect(remaining).toHaveText(/^(10:00|09:59)$/);
});

const MENU_BUTTON = '[data-slot="rail-button"][title="메뉴"]';
const SIDEBAR = '[data-slot="sidebar-container"]';
const BACKDROP = '[data-slot="navigation-sidebar-backdrop"]';
const MENU_ITEM = '[data-slot="sidebar-menu-button"]';
const RAIL_WIDTH = 72;
const SIDEBAR_WIDTH = 256;

async function rectOf(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

test("상단 Bar의 홈 Button은 어느 화면에서나 플릿 개요로 이동함", async ({ page }) => {
  const home = page.locator('[data-slot="top-bar-home"]');
  for (const path of ["/dashboard/timeline", "/info/inference", "/model/threshold"]) {
    await page.goto(path);
    await expect(home).toHaveAttribute("href", "/dashboard/fleet");
    await expect(home).toHaveAttribute("aria-label", "홈");
    await home.click();
    await expect(page).toHaveURL("/dashboard/fleet");
    await expect(page.locator('[data-slot="screen-tab"][aria-current="page"]')).toHaveText("플릿 개요");
  }

  await page.goto("/model/config");
  await home.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/dashboard/fleet");
});

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
]) {
  test(`Menu Button을 Click하면 Rail 오른쪽 구역 위에 전체 Menu가 표시되고 그 구역은 흐려짐 (${viewport.width}×${viewport.height})`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/dashboard/timeline");
    await expect(page.locator('[data-slot="chart-bar"]').first()).toBeVisible();
    const menuButton = page.locator(MENU_BUTTON);

    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(SIDEBAR)).toHaveAttribute("inert", "");
    await expect(page.locator(SIDEBAR)).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByRole("link", { name: "이상 타임라인" })).toHaveCount(1);
    const closed = await rectOf(page, SIDEBAR);
    expect(closed.x + closed.width).toBeLessThanOrEqual(RAIL_WIDTH);
    const closedBackdrop = await measure(page, BACKDROP);
    expect(closedBackdrop.style.opacity).toBe("0");
    await expect(page.locator('[data-slot="monitoring-body-content"]')).not.toHaveAttribute("inert");

    const topBarBefore = await rectOf(page, '[data-slot="top-bar"]');
    const mainBefore = await rectOf(page, '[data-slot="monitoring-main"]');
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(SIDEBAR)).not.toHaveAttribute("inert");
    await expect(page.locator(SIDEBAR)).not.toHaveAttribute("aria-hidden");
    await expect(page.getByRole("navigation", { name: "전체 메뉴" })).toHaveCount(1);
    await expect.poll(async () => (await rectOf(page, SIDEBAR)).x).toBe(RAIL_WIDTH);
    const sidebar = await rectOf(page, SIDEBAR);
    expect(sidebar.y).toBe(0);
    expect(sidebar.width).toBe(SIDEBAR_WIDTH);
    expect(sidebar.height).toBe(viewport.height);
    expect(await rectOf(page, '[data-slot="top-bar"]')).toEqual(topBarBefore);
    expect(await rectOf(page, '[data-slot="monitoring-main"]')).toEqual(mainBefore);
    const controls = await menuButton.getAttribute("aria-controls");
    expect(await page.locator(SIDEBAR).getAttribute("id")).toBe(controls);

    const backdrop = await rectOf(page, BACKDROP);
    expect(backdrop).toEqual({
      x: RAIL_WIDTH,
      y: 0,
      width: viewport.width - RAIL_WIDTH,
      height: viewport.height,
    });
    const body = await rectOf(page, '[data-slot="monitoring-body"]');
    expect(backdrop).toEqual(body);
    const rail = await rectOf(page, '[data-slot="left-rail"]');
    expect(rail.x + rail.width).toBe(backdrop.x);
    const backdropStyle = await page.locator(BACKDROP).evaluate((element) => {
      const style = getComputedStyle(element);
      return { filter: style.backdropFilter, opacity: style.opacity };
    });
    expect(backdropStyle.filter).toBe("blur(4px)");
    await expect.poll(() => measure(page, BACKDROP).then((box) => box.style.opacity)).toBe("1");

    const topmost = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-slot]")?.getAttribute("data-slot"),
      { x: RAIL_WIDTH + 400, y: 300 },
    );
    expect(topmost).toBe("navigation-sidebar-backdrop");
    await expect(page.locator('[data-slot="monitoring-body-content"]')).toHaveAttribute("inert", "");

    const header = await measure(page, '[data-slot="sidebar-header"]');
    expect(header.height).toBe(58);
    expect(header.style.borderBottomWidth).toBe("1px");
    expect(header.style.borderBottomColor).toBe(await color(page, "var(--rail-border)"));
    await expect(page.locator('[data-slot="navigation-sidebar-title"]')).toHaveText("전체 메뉴");
    const title = await measure(page, '[data-slot="navigation-sidebar-title"]');
    expect(title.style.fontSize).toBe("16px");
    expect(title.style.fontWeight).toBe("700");

    const inner = await measure(page, '[data-slot="sidebar-inner"]');
    expect(inner.style.backgroundColor).toBe(await color(page, "var(--rail-bg)"));
    const container = await measure(page, SIDEBAR);
    expect(container.style.borderRightWidth).toBe("1px");
    expect(container.style.borderRightColor).toBe(await color(page, "var(--rail-border)"));

    await expect(page.locator('[data-slot="sidebar-group-label"]')).toHaveText([
      "CBM 대시보드",
      "CBM 정보",
      "CBM 모델",
    ]);
    await expect(page.locator(MENU_ITEM)).toHaveText([
      "플릿 개요",
      "이상 타임라인",
      "알람/이벤트",
      "조치 관리",
      "재학습 설정",
      "추론",
      "이상 감지 내역",
      "모델 커스텀",
      "모델 비교",
      "임계 튜닝",
      "모델 진단",
    ]);
    const label = await measure(page, '[data-slot="sidebar-group-label"]');
    expect(label.height).toBe(32);
    expect(label.style.fontSize).toBe("12px");
    expect(label.style.color).toBe(await color(page, "var(--muted-fg)"));
    const labelIcon = await measure(page, '[data-slot="sidebar-group-label"] svg');
    expect(labelIcon.width).toBe(16);

    const item = await measure(page, MENU_ITEM, 0);
    expect(item.height).toBe(36);
    expect(item.style.fontSize).toBe("14px");
    expect(item.style.paddingLeft).toBe("32px");
    expect(item.style.fontWeight).toBe("400");
    expect(item.style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    await expect(page.locator(`${MENU_ITEM}[aria-current="page"]`)).toHaveText("이상 타임라인");
    const active = await measure(page, `${MENU_ITEM}[aria-current="page"]`);
    expect(active.style.backgroundColor).toBe(await color(page, "var(--rail-active)"));
    expect(active.style.color).toBe(await color(page, "var(--on-primary)"));
    expect(active.style.fontWeight).toBe("600");
  });
}

test("전체 Menu를 닫는 방법과 화면 이동", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/dashboard/timeline");
  const menuButton = page.locator(MENU_BUTTON);
  const isOpen = () => menuButton.getAttribute("aria-expanded");

  await menuButton.click();
  await expect.poll(isOpen).toBe("true");
  await menuButton.click();
  await expect.poll(isOpen).toBe("false");
  await expect(page.locator(SIDEBAR)).toHaveAttribute("inert", "");

  await menuButton.click();
  await expect.poll(isOpen).toBe("true");
  await page.mouse.click(RAIL_WIDTH + SIDEBAR_WIDTH + 400, 500);
  await expect.poll(isOpen).toBe("false");
  await expect(page).toHaveURL("/dashboard/timeline");

  await menuButton.click();
  await expect.poll(isOpen).toBe("true");
  await page.keyboard.press("Escape");
  await expect.poll(isOpen).toBe("false");

  await page.keyboard.press("Control+b");
  await expect.poll(isOpen).toBe("true");
  await page.keyboard.press("Control+b");
  await expect.poll(isOpen).toBe("false");

  await menuButton.click();
  await page.locator(MENU_ITEM, { hasText: "임계 튜닝" }).click();
  await expect(page).toHaveURL("/model/threshold");
  await expect.poll(isOpen).toBe("false");
  await expect(page.locator('[data-slot="top-bar-title"]')).toHaveText("CBM 모델");
  await expect(page.locator('[data-slot="rail-link"][aria-current="page"]')).toHaveAttribute(
    "title",
    "CBM 모델",
  );

  await menuButton.click();
  await expect(page.locator(`${MENU_ITEM}[aria-current="page"]`)).toHaveText("임계 튜닝");

  await page.locator('[data-slot="rail-link"][title="CBM 정보"]').click();
  await expect(page).toHaveURL("/info/training");

  await page.goto("/dashboard/fleet");
  await menuButton.focus();
  await page.keyboard.press("Enter");
  await expect.poll(isOpen).toBe("true");
  let reached = false;
  for (let step = 0; step < 8 && !reached; step += 1) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(
      () => document.activeElement?.getAttribute("data-slot") === "sidebar-menu-button",
    );
  }
  expect(reached).toBe(true);
  await page.keyboard.press("Escape");
  await expect.poll(isOpen).toBe("false");
});

test("다크 Theme와 Font 크기 2배에서 전체 Menu", async ({ page }) => {
  await openFleet(page, 1920, 1080);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.locator(MENU_BUTTON).click();
  await expect.poll(async () => (await rectOf(page, SIDEBAR)).x).toBe(RAIL_WIDTH);

  const inner = await measure(page, '[data-slot="sidebar-inner"]');
  expect(inner.style.backgroundColor).toBe(await color(page, "var(--rail-bg)"));
  const container = await measure(page, SIDEBAR);
  expect(container.style.borderRightColor).toBe(await color(page, "var(--rail-border)"));
  const active = await measure(page, `${MENU_ITEM}[aria-current="page"]`);
  expect(active.style.backgroundColor).toBe(await color(page, "var(--rail-active)"));
  const idle = await measure(page, MENU_ITEM, 1);
  expect(idle.style.color).toBe(await color(page, "var(--fg)"));

  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page.waitForTimeout(400);
  const doubled = await rectOf(page, SIDEBAR);
  expect(doubled.x).toBe(RAIL_WIDTH * 2);
  expect(doubled.width).toBe(SIDEBAR_WIDTH * 2);
  const header = await measure(page, '[data-slot="sidebar-header"]');
  expect(header.height).toBe(116);
  const item = await measure(page, MENU_ITEM, 0);
  expect(item.height).toBe(72);
  const doubledContainer = await measure(page, SIDEBAR);
  expect(doubledContainer.style.borderRightWidth).toBe("2px");
  const filter = await page.locator(BACKDROP).evaluate((element) => getComputedStyle(element).backdropFilter);
  expect(filter).toBe("blur(8px)");
});

test.describe("움직임을 줄이지 않은 상태", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("전체 Menu는 ease-in-out으로 펼쳐지고 접힘", async ({ page }) => {
    await openFleet(page, 1920, 1080);
    const menuButton = page.locator(MENU_BUTTON);
    const transitionOf = (selector: string) =>
      page.locator(selector).evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.transitionProperty, style.transitionDuration, style.transitionTimingFunction];
      });

    const EASE_IN_OUT = "cubic-bezier(0.4, 0, 0.2, 1)";
    expect(await transitionOf(SIDEBAR)).toEqual(["left, right, width", "0.2s", EASE_IN_OUT]);
    expect(await transitionOf(BACKDROP)).toEqual(["opacity", "0.2s", EASE_IN_OUT]);

    await menuButton.click();
    const opening = (await rectOf(page, SIDEBAR)).x;
    expect(opening).toBeGreaterThanOrEqual(RAIL_WIDTH - SIDEBAR_WIDTH);
    expect(opening).toBeLessThan(RAIL_WIDTH);
    await expect.poll(async () => (await rectOf(page, SIDEBAR)).x).toBe(RAIL_WIDTH);
    expect(await transitionOf(SIDEBAR)).toEqual(["left, right, width", "0.2s", EASE_IN_OUT]);

    await menuButton.click();
    const closing = (await rectOf(page, SIDEBAR)).x;
    expect(closing).toBeGreaterThan(RAIL_WIDTH - SIDEBAR_WIDTH);
    await expect.poll(async () => (await rectOf(page, SIDEBAR)).x).toBe(RAIL_WIDTH - SIDEBAR_WIDTH);
  });
});

