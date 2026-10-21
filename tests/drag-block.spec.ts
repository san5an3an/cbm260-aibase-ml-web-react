import { expect, test, type Page } from "@playwright/test";

const ID_INPUT = '[data-slot="login-id-input"]';

async function openLogin(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/login");
  await expect(page.locator(ID_INPUT)).toBeFocused();
}

async function dragAcross(page: Page, selector: string): Promise<void> {
  const box = await page.locator(selector).first().boundingBox();
  if (box === null) throw new Error(`${selector} 가 보이지 않음`);
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2, y, { steps: 10 });
  await page.mouse.up();
}

async function dragStartBlocked(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).first().evaluate((element) => {
    const event = new DragEvent("dragstart", { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  });
}

test("화면 Text는 Drag로 고를 수 없고, Input의 Text는 그대로 고를 수 있음", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/dashboard/fleet");
  await expect(page.locator('[data-slot="fleet-overview"]')).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).userSelect)).toBe("none");

  for (const selector of ['[data-slot="top-bar-title"]', '[data-slot="section-card-title"]']) {
    await dragAcross(page, selector);
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? ""), selector).toBe("");
  }

  await page.goto("/dashboard/timeline");
  for (const selector of ['[data-slot="timeline-filter-bar"] button', '[data-slot="chart-rate-tick"]', '[data-slot="chart-date-tick"]']) {
    await expect(page.locator(selector).first()).toBeVisible();
    await dragAcross(page, selector);
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? ""), selector).toBe("");
  }

  await openLogin(page);
  await page.locator(ID_INPUT).fill("operator_0123456789");
  await dragAcross(page, ID_INPUT);
  const selected = await page.locator(ID_INPUT).evaluate((input: HTMLInputElement) => [input.selectionStart, input.selectionEnd]);
  expect(selected[1]! - selected[0]!).toBeGreaterThan(0);
});

test("이미지와 Text를 Drag해서 옮길 수 없고, Input을 뺀 곳에서 Drag 시작이 막힘", async ({ page }) => {
  await openLogin(page);
  expect(await dragStartBlocked(page, "img")).toBe(true);
  expect(await dragStartBlocked(page, '[data-slot="login-id-field"] label')).toBe(true);
  expect(await dragStartBlocked(page, ID_INPUT)).toBe(false);
});
