import { expect, test, type Page } from "@playwright/test";
import { PAGE_GAP, listPageItems } from "../src/lib/pagination";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const ELLIPSIS = "…";

function shownRow(page: number, pageCount: number): string {
  return listPageItems(page, pageCount)
    .map((item) => (item === PAGE_GAP ? ELLIPSIS : String(item)))
    .join(" ");
}

test("Page 번호 Row의 번호와 줄임표, 전체 Page 수와 현재 Page에 따른 Table", () => {
  const table: [number, number, string][] = [
    [1, 1, "1"],
    [2, 1, "1 2"],
    [2, 2, "1 2"],
    [7, 1, "1 2 3 4 5 6 7"],
    [7, 2, "1 2 3 4 5 6 7"],
    [7, 4, "1 2 3 4 5 6 7"],
    [7, 6, "1 2 3 4 5 6 7"],
    [7, 7, "1 2 3 4 5 6 7"],
    [8, 1, "1 2 3 … 8"],
    [8, 2, "1 2 3 … 8"],
    [8, 4, "1 … 4 … 8"],
    [8, 5, "1 … 5 … 8"],
    [8, 7, "1 … 6 7 8"],
    [8, 8, "1 … 6 7 8"],
    [9, 1, "1 2 3 … 9"],
    [9, 2, "1 2 3 … 9"],
    [9, 5, "1 … 5 … 9"],
    [9, 8, "1 … 7 8 9"],
    [9, 9, "1 … 7 8 9"],
    [10, 1, "1 2 3 … 10"],
    [10, 2, "1 2 3 … 10"],
    [10, 5, "1 … 5 … 10"],
    [10, 6, "1 … 6 … 10"],
    [10, 9, "1 … 8 9 10"],
    [10, 10, "1 … 8 9 10"],
    [100, 1, "1 2 3 … 100"],
    [100, 2, "1 2 3 … 100"],
    [100, 50, "1 … 50 … 100"],
    [100, 99, "1 … 98 99 100"],
    [100, 100, "1 … 98 99 100"],
    [10, 3, "1 2 3 … 10"],
    [10, 4, "1 … 4 … 10"],
    [10, 7, "1 … 7 … 10"],
    [10, 8, "1 … 8 9 10"],
    [100, 3, "1 2 3 … 100"],
    [100, 4, "1 … 4 … 100"],
    [100, 97, "1 … 97 … 100"],
    [100, 98, "1 … 98 99 100"],
  ];
  for (const [pageCount, page, expected] of table) {
    expect(shownRow(page, pageCount), `전체 ${pageCount}쪽 · 현재 ${page}쪽`).toBe(expected);
  }

  expect(listPageItems(1, 0)).toEqual([]);
  expect(shownRow(0, 10)).toBe("1 2 3 … 10");
  expect(shownRow(11, 10)).toBe("1 … 8 9 10");
});

test("Page 번호 Row는 Page를 옮겨도 Cell 수가 같고 줄임표는 둘 이상을 가림", () => {
  const broken: string[] = [];
  for (let pageCount = 1; pageCount <= 120; pageCount += 1) {
    const lengths = new Set<number>();
    for (let page = 1; page <= pageCount; page += 1) {
      const where = `전체 ${pageCount}쪽 · 현재 ${page}쪽`;
      const items = listPageItems(page, pageCount);
      lengths.add(items.length);
      const numbers = items.filter((item) => item !== PAGE_GAP);
      if (numbers[0] !== 1 || numbers[numbers.length - 1] !== pageCount || !numbers.includes(page)) {
        broken.push(`${where}: 처음 · 끝 · 현재 쪽 가운데 빠진 것이 있음`);
      }
      items.forEach((item, index) => {
        const before = items[index - 1];
        const next = items[index + 1];
        if (item === PAGE_GAP) {
          if (typeof before !== "number" || typeof next !== "number" || next - before - 1 < 2) {
            broken.push(`${where}: ${index + 1}번째 칸의 줄임표가 둘 이상을 가리지 않음`);
          }
        } else if (typeof next === "number" && next !== item + 1) {
          broken.push(`${where}: ${item} 다음이 ${next}`);
        }
      });
    }
    const expectedLength = pageCount <= 7 ? pageCount : 5;
    if (lengths.size !== 1 || !lengths.has(expectedLength)) {
      broken.push(`전체 ${pageCount}쪽: 칸 수 ${[...lengths].join(" · ")}`);
    }
  }
  expect(broken).toEqual([]);
});

const SCREENS = [
  {
    name: "03 알람 워크리스트",
    path: "/dashboard/alarms",
    ready: '[data-slot="chart-stack-segment"]',
    card: '[data-slot="alarm-worklist-card"]',
    label: "알람 워크리스트 쪽 이동",
    pageCount: 10,
    firstRow: ["1", "2", "3", ELLIPSIS, "10"],
  },
  {
    name: "02 일자별 상세",
    path: "/dashboard/timeline",
    ready: '[data-slot="chart-bar"]',
    card: '[data-slot="daily-detail-card"]',
    label: "일자별 상세 쪽 이동",
    pageCount: 6,
    firstRow: ["1", "2", "3", "4", "5", "6"],
  },
];

async function openScreen(page: Page, screen: (typeof SCREENS)[number]): Promise<void> {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(screen.path);
  await expect(page.locator(screen.ready).first()).toBeVisible();
}

function parts(page: Page, card: string) {
  return {
    previous: page.locator(`${card} [data-slot="pagination-previous"]`),
    next: page.locator(`${card} [data-slot="pagination-next"]`),
    pages: page.locator(`${card} [data-slot="pagination-page"]`),
    current: page.locator(`${card} [data-slot="pagination-page"][aria-current="page"]`),
    slots: page.locator(`${card} :is([data-slot="pagination-page"], [data-slot="pagination-ellipsis"])`),
  };
}

for (const screen of SCREENS) {
  test(`Page 번호 Row는 List 안의 Button으로 읽힘 (${screen.name})`, async ({ page }) => {
    await openScreen(page, screen);
    const { slots } = parts(page, screen.card);
    await expect(slots).toHaveText(screen.firstRow);

    const nav = page.getByRole("navigation", { name: screen.label });
    await expect(nav.getByRole("list")).toHaveCount(1);
    await expect(nav.getByRole("listitem")).toHaveCount(screen.firstRow.length + 2);
    const numberCount = screen.firstRow.filter((label) => label !== ELLIPSIS).length;
    await expect(nav.getByRole("button")).toHaveCount(numberCount + 2);
    await expect(nav.getByRole("button", { name: "1", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("button", { name: "2", exact: true })).not.toHaveAttribute("aria-current");
    await expect(nav.getByRole("button", { name: "이전", exact: true })).toBeDisabled();
    await expect(nav.getByRole("button", { name: "다음", exact: true })).toBeEnabled();
  });

  test(`Page 번호 Row는 Keyboard로 누를 수 있음 (${screen.name})`, async ({ page }) => {
    await openScreen(page, screen);
    const { previous, next, pages, current } = parts(page, screen.card);
    await expect(current).toHaveText("1");

    await next.focus();
    await page.keyboard.press("Enter");
    await expect(current).toHaveText("2");
    await expect(next).toBeFocused();
    await page.keyboard.press("Space");
    await expect(current).toHaveText("3");

    await previous.focus();
    await page.keyboard.press("Space");
    await expect(current).toHaveText("2");
    await pages.first().focus();
    await page.keyboard.press("Enter");
    await expect(current).toHaveText("1");
    await expect(pages.first()).toBeFocused();

    await expect(previous).toBeDisabled();
    await page.keyboard.press("Shift+Tab");
    await expect(previous).not.toBeFocused();
    await previous.click({ force: true });
    await expect(current).toHaveText("1");
    await previous.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    await expect(current).toHaveText("1");

    await pages.last().focus();
    await page.keyboard.press("Tab");
    await expect(next).toBeFocused();

    await pages.last().focus();
    await page.keyboard.press("Enter");
    await expect(current).toHaveText(String(screen.pageCount));
    await expect(next).toBeDisabled();
    await expect(pages.last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(next).not.toBeFocused();
    await next.click({ force: true });
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(current).toHaveText(String(screen.pageCount));
    await expect(previous).toBeEnabled();
  });
}

test("Page를 옮겨도 Page 번호 Row의 Cell 수와 이전, 다음 Button의 위치가 그대로임 (알람/이벤트 Alarm 워크List)", async ({ page }) => {
  const screen = SCREENS[0];
  await openScreen(page, screen);
  const { previous, next, slots, current } = parts(page, screen.card);
  const rows = [
    "1 2 3 … 10",
    "1 2 3 … 10",
    "1 2 3 … 10",
    "1 … 4 … 10",
    "1 … 5 … 10",
    "1 … 6 … 10",
    "1 … 7 … 10",
    "1 … 8 9 10",
    "1 … 8 9 10",
    "1 … 8 9 10",
  ];
  const firstPrevious = await previous.boundingBox();
  const firstNext = await next.boundingBox();
  if (!firstPrevious || !firstNext) throw new Error("이전 · 다음 없음");

  for (const [index, row] of rows.entries()) {
    const where = `${index + 1}쪽`;
    await expect(current, where).toHaveText(String(index + 1));
    await expect(slots, where).toHaveText(row.split(" "));
    await expect(slots, where).toHaveCount(5);
    const previousBox = await previous.boundingBox();
    const nextBox = await next.boundingBox();
    expect(previousBox?.x, where).toBeCloseTo(firstPrevious.x, 1);
    expect(nextBox?.x, where).toBeCloseTo(firstNext.x, 1);
    expect(nextBox?.width, where).toBeCloseTo(firstNext.width, 1);
    if (index < rows.length - 1) await next.click();
  }

  const { pages } = parts(page, screen.card);
  await pages.first().click();
  await expect(slots).toHaveText(rows[0].split(" "));
  await next.click();
  await next.click();
  await next.click();
  await expect(slots).toHaveText(rows[3].split(" "));
  await pages.last().click();
  await expect(slots).toHaveText(rows[9].split(" "));
});
