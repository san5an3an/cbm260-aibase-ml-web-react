import { expect, test, type Page } from "@playwright/test";

const SEGMENT = '[data-slot="chart-stack-segment"]';
const FILTER_BUTTON = '[data-slot="alarm-filter-bar"] [data-slot="action-button"]';
const TABLE = '[data-slot="alarm-rules-table"]';
const HEAD = `${TABLE} [data-slot="alarm-rules-head"]`;
const HEAD_ITEMS = `${HEAD} > *`;
const BODY_CELLS = `${TABLE} [data-slot="alarm-rules-grid"] > [data-slot="rule-cell"]`;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function openRules(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto("/dashboard/alarms");
  await expect(page.locator(SEGMENT).first()).toBeVisible();
  await page.locator(FILTER_BUTTON).nth(1).click();
  await expect(page.locator(TABLE)).toBeVisible();
}

async function headRects(page: Page): Promise<Rect[]> {
  return page.locator(HEAD_ITEMS).evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  );
}

async function scrollTable(page: Page, top: number): Promise<number> {
  return page.locator(TABLE).evaluate((table, value) => {
    table.scrollTop = value;
    return table.scrollTop;
  }, top);
}

for (const [width, height] of [
  [1920, 1080],
  [1440, 900],
]) {
  test(`Alarm 규칙 Table을 Scroll해도 첫 Row(전체 규칙, Model 이름)는 Table 위에 붙어 있고 아래 Row만 그 뒤로 지나감 (${width}×${height})`, async ({ page }) => {
    await openRules(page, width, height);
    await expect(page.locator(HEAD_ITEMS)).toHaveCount(5);
    await expect(page.locator(HEAD_ITEMS).nth(1)).toHaveText("IF");
    const before = await headRects(page);
    const firstRowBefore = (await page.locator(BODY_CELLS).first().boundingBox()) as Rect;

    const maxScroll = await page.locator(TABLE).evaluate((table) => table.scrollHeight - table.clientHeight);
    expect(maxScroll).toBeGreaterThan(100);
    for (const top of [120, maxScroll]) {
      expect(await scrollTable(page, top)).toBe(top);
      await expect.poll(() => headRects(page)).toEqual(before);
      const firstRow = (await page.locator(BODY_CELLS).first().boundingBox()) as Rect;
      expect(firstRow.y).toBeCloseTo(firstRowBefore.y - top, 0);
    }

    const tableRect = (await page.locator(TABLE).boundingBox()) as Rect;
    const hits = await page.evaluate(
      ({ points, head }) =>
        points.map(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest(head))),
      { points: before.map((rect) => [rect.x + rect.width / 2, rect.y + rect.height - 4]), head: HEAD },
    );
    expect(hits).toEqual([true, true, true, true, true]);
    const bandHits = await page.evaluate(
      ({ x, y, cell }) => Boolean(document.elementFromPoint(x, y)?.closest(cell)),
      { x: before[1].x + before[1].width / 2, y: tableRect.y + 6, cell: '[data-slot="rule-cell"]' },
    );
    expect(bandHits).toBe(false);
  });
}
