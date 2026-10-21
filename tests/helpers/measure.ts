import { expect, type Page } from "@playwright/test";

export interface Measured {
  width: number;
  height: number;
  style: Record<string, string>;
}

const STYLE_PROPERTIES = [
  "backgroundColor",
  "color",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "columnGap",
  "rowGap",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderTopLeftRadius",
  "boxShadow",
  "opacity",
  "letterSpacing",
  "textAlign",
  "borderLeftWidth",
  "borderLeftColor",
  "borderTopStyle",
  "minWidth",
  "minHeight",
] as const;

export async function measure(page: Page, selector: string, index = 0): Promise<Measured> {
  return page.evaluate(
    ({ selector, index, properties }) => {
      const element = document.querySelectorAll<HTMLElement>(selector)[index];
      if (!element) throw new Error(`요소 없음: ${selector} [${index}]`);
      const rect = element.getBoundingClientRect();
      const computed = getComputedStyle(element);
      const style: Record<string, string> = {};
      for (const property of properties) {
        style[property] = computed[property];
      }
      return { width: rect.width, height: rect.height, style };
    },
    { selector, index, properties: [...STYLE_PROPERTIES] },
  );
}

export async function color(page: Page, value: string): Promise<string> {
  return page.evaluate((value) => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = value;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return resolved;
  }, value);
}

export function visibleShadow(boxShadow: string): string {
  return boxShadow
    .split(/,\s*(?=rgba?\()/)
    .filter((layer) => !layer.endsWith(" 0px 0px 0px 0px"))
    .join(", ");
}

export const MOCK_TODAY = new Date(2026, 8, 23, 12, 0, 0);

export async function openFixedScreen(
  page: Page,
  path: string,
  readySelector: string,
  width = 1920,
  height = 1080,
  today: Date = MOCK_TODAY,
): Promise<void> {
  await page.clock.setFixedTime(today);
  await page.setViewportSize({ width, height });
  await page.goto(path);
  await expect(page.locator(readySelector).first()).toBeVisible();
}

export function isoDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export async function hoveredStyle(page: Page, selector: string, index = 0) {
  await page.locator(selector).nth(index).hover();
  await page.waitForTimeout(300);
  return page.evaluate(
    ({ selector, index }) => {
      const style = getComputedStyle(document.querySelectorAll(selector)[index] as Element);
      return {
        background: style.backgroundColor,
        text: style.color,
        shadow: style.boxShadow,
        decoration: style.textDecorationLine,
      };
    },
    { selector, index },
  );
}

export async function pickOption(page: Page, name: string): Promise<void> {
  await page
    .locator('[data-slot="select-content"][data-open]')
    .getByRole("option", { name, exact: true })
    .click();
}

export function calendarDayCell(calendar: string, isoDate: string): string {
  return `${calendar} td[data-day="${isoDate}"]:not([data-outside])`;
}

export async function watchDisabled(page: Page, name: string, selector: string): Promise<void> {
  await page.evaluate(
    ({ name, selector }) => {
      const target = document.querySelector(selector) as Element;
      const changes: (string | null)[] = [];
      const observer = new MutationObserver(() => changes.push(target.getAttribute("aria-disabled")));
      observer.observe(target, { attributes: true, attributeFilter: ["aria-disabled"] });
      const store = window as unknown as Record<string, () => (string | null)[]>;
      store[`stopWatching_${name}`] = () => {
        observer.disconnect();
        return changes;
      };
    },
    { name, selector },
  );
}

export async function stopWatchingDisabled(page: Page, name: string): Promise<(string | null)[]> {
  return page.evaluate(
    (name) => (window as unknown as Record<string, () => (string | null)[]>)[`stopWatching_${name}`](),
    name,
  );
}

export async function watchDisabledWithin(page: Page, name: string, selector: string): Promise<void> {
  await page.evaluate(
    ({ name, selector }) => {
      const container = document.querySelector(selector) as Element;
      const changes: (string | null)[] = [];
      const observer = new MutationObserver((records) => {
        for (const record of records) changes.push((record.target as Element).getAttribute("aria-disabled"));
      });
      observer.observe(container, { attributes: true, attributeFilter: ["aria-disabled"], subtree: true });
      const store = window as unknown as Record<string, () => (string | null)[]>;
      store[`stopWatching_${name}`] = () => {
        observer.disconnect();
        return changes;
      };
    },
    { name, selector },
  );
}

export interface DisabledLook {
  disabled: string | null;
  opacity: string;
  pointerEvents: string;
  reachable: boolean;
}

export async function watchDisabledLook(page: Page, name: string, selector: string): Promise<void> {
  await page.evaluate(
    ({ name, selector }) => {
      const target = document.querySelector(selector) as HTMLElement;
      const looks: DisabledLook[] = [];
      const observer = new MutationObserver(() => {
        const style = getComputedStyle(target);
        const rect = target.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        looks.push({
          disabled: target.getAttribute("aria-disabled"),
          opacity: style.opacity,
          pointerEvents: style.pointerEvents,
          reachable: hit !== null && target.contains(hit),
        });
      });
      observer.observe(target, { attributes: true, attributeFilter: ["aria-disabled"] });
      const store = window as unknown as Record<string, () => DisabledLook[]>;
      store[`stopWatchingLook_${name}`] = () => {
        observer.disconnect();
        return looks;
      };
    },
    { name, selector },
  );
}

export async function stopWatchingDisabledLook(page: Page, name: string): Promise<DisabledLook[]> {
  return page.evaluate(
    (name) => (window as unknown as Record<string, () => DisabledLook[]>)[`stopWatchingLook_${name}`](),
    name,
  );
}

export async function delayMockResponses(page: Page, searchMs: number): Promise<void> {
  await page.evaluate((value) => {
    (window as unknown as { cbmMockLatency: { searchMs: number } }).cbmMockLatency = { searchMs: value };
  }, searchMs);
}

export interface LockAfterClick {
  early: { disabled: string | null; opacity: string } | null;
  lockedAfterMs: number | null;
}

export async function watchLockAfterClick(page: Page, name: string, selector: string, earlyMs = 100): Promise<void> {
  await page.evaluate(
    ({ name, selector, earlyMs }) => {
      const record: LockAfterClick = { early: null, lockedAfterMs: null };
      (window as unknown as Record<string, LockAfterClick>)[`lockAfterClick_${name}`] = record;
      document.addEventListener(
        "click",
        () => {
          const clickedAt = performance.now();
          const target = document.querySelector(selector) as HTMLElement;
          setTimeout(() => {
            record.early = { disabled: target.getAttribute("aria-disabled"), opacity: getComputedStyle(target).opacity };
          }, earlyMs);
          const observer = new MutationObserver(() => {
            if (target.getAttribute("aria-disabled") !== "true") return;
            record.lockedAfterMs = performance.now() - clickedAt;
            observer.disconnect();
          });
          observer.observe(target, { attributes: true, attributeFilter: ["aria-disabled"] });
        },
        { capture: true, once: true },
      );
    },
    { name, selector, earlyMs },
  );
}

export async function lockAfterClick(page: Page, name: string): Promise<LockAfterClick> {
  return page.evaluate(
    (name) => ({ ...(window as unknown as Record<string, LockAfterClick>)[`lockAfterClick_${name}`] }),
    name,
  );
}

export async function pressable(page: Page, selector: string): Promise<boolean[]> {
  return page.evaluate(
    (selector) =>
      [...document.querySelectorAll<HTMLElement>(selector)].map((element) => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        const isLocked =
          element.getAttribute("aria-disabled") === "true" || (element as HTMLButtonElement).disabled === true;
        return !isLocked && hit !== null && element.contains(hit);
      }),
    selector,
  );
}

export async function truncation(page: Page, selector: string, index = 0): Promise<string[]> {
  return page.evaluate(
    ({ selector, index }) => {
      const element = document.querySelectorAll(selector)[index];
      if (!element) throw new Error(`요소 없음: ${selector} [${index}]`);
      const style = getComputedStyle(element);
      return [style.whiteSpace, style.overflowX, style.textOverflow];
    },
    { selector, index },
  );
}

export async function columnTexts(page: Page, rowSelector: string, column: number): Promise<string[]> {
  return page.evaluate(
    ({ rowSelector, column }) =>
      [...document.querySelectorAll(rowSelector)].map(
        (row) => row.querySelectorAll("td")[column]?.textContent ?? "",
      ),
    { rowSelector, column },
  );
}

export async function shownTableLines(page: Page, rowSelector: string, columnCount: number): Promise<string[]> {
  const columns = await Promise.all(
    Array.from({ length: columnCount }, (_, column) => columnTexts(page, rowSelector, column)),
  );
  return columns[0].map((_, row) => columns.map((cells) => cells[row]).join(","));
}

export async function normalLineHeight(page: Page, text: string, fontSize: number): Promise<number> {
  return page.evaluate(
    ({ text, fontSize }) => {
      const probe = document.createElement("span");
      probe.textContent = text;
      probe.style.cssText = `display:block;font-size:${fontSize}px;line-height:normal;position:absolute;visibility:hidden`;
      document.body.append(probe);
      const height = probe.getBoundingClientRect().height;
      probe.remove();
      return height;
    },
    { text, fontSize },
  );
}
