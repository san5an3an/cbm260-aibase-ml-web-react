import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import { color, measure, visibleShadow } from "./measure";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MODAL_PADDING = 16;
export const MODAL_GAP = 14;
export const MODAL_BORDER = 1;
export const MODAL_RADIUS = 16;
export const MODAL_VIEWPORT_MARGIN = 32;
export const MODAL_HEADER_HEIGHT = 36;
export const MODAL_FOOTER_HEIGHT = 32;
export const MODAL_SHADOW = "rgba(0, 0, 0, 0.3) 0px 24px 64px 0px";
export const SECTION_PADDING_X = 18;
export const SECTION_PADDING_Y = 16;

export const modal = (name: string) => `[data-modal="${name}"]`;
export const confirmDialog = (name: string) => `[data-dialog="${name}"]`;

export const frameHeight = (bodyHeight: number) =>
  MODAL_HEADER_HEIGHT + MODAL_GAP * 2 + MODAL_FOOTER_HEIGHT + (MODAL_PADDING + MODAL_BORDER) * 2 + bodyHeight;

export const footerButton = (page: Page, root: string, label: string) =>
  page.locator(`${root} [data-slot="dialog-footer"]`).getByRole("button", { name: label, exact: true });

export async function boxes(page: Page, selector: string): Promise<Box[]> {
  return page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)].map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    selector,
  );
}

export async function box(page: Page, selector: string, index = 0): Promise<Box> {
  const found = (await boxes(page, selector))[index];
  if (!found) throw new Error(`요소 없음: ${selector} [${index}]`);
  return found;
}

export async function texts(page: Page, selector: string): Promise<string[]> {
  return page.evaluate(
    (selector) => [...document.querySelectorAll(selector)].map((element) => element.textContent ?? ""),
    selector,
  );
}

export function iconShape(name: string): string {
  const source = readFileSync(
    join(process.cwd(), "node_modules", "@mui", "icons-material", `${name}Rounded.js`),
    "utf8",
  );
  const shape = /d: "([^"]+)"/.exec(source)?.[1];
  if (!shape) throw new Error(`아이콘 모양 없음: ${name}`);
  return shape;
}

export async function shownIconShape(page: Page, selector: string, index = 0): Promise<string> {
  return page.evaluate(
    ({ selector, index }) =>
      document.querySelectorAll(selector)[index]?.querySelector("path")?.getAttribute("d") ?? "",
    { selector, index },
  );
}

export async function styleOf(
  page: Page,
  selector: string,
  property: string,
  index = 0,
): Promise<string> {
  return page.evaluate(
    ({ selector, property, index }) => {
      const element = document.querySelectorAll(selector)[index];
      if (!element) throw new Error(`요소 없음: ${selector} [${index}]`);
      return getComputedStyle(element).getPropertyValue(property);
    },
    { selector, property, index },
  );
}

interface ModalFrameExpectation {
  width: number;
  height: number;
  title: string;
  overlayColor?: string;
  scale?: number;
}

export async function expectModalFrame(
  page: Page,
  name: string,
  expected: ModalFrameExpectation,
): Promise<{ frame: Box; header: Box; contentWidth: number }> {
  const scale = expected.scale ?? 1;
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("창 크기 없음");
  const root = modal(name);
  await expect(page.locator(root)).toBeVisible();

  const overlayIndex = (await boxes(page, '[data-slot="dialog-overlay"]')).length - 1;
  const overlay = await measure(page, '[data-slot="dialog-overlay"]', overlayIndex);
  expect(overlay.width).toBe(viewport.width);
  expect(overlay.height).toBe(viewport.height);
  expect(overlay.style.backgroundColor).toBe(
    await color(page, expected.overlayColor ?? "var(--scrim)"),
  );
  expect(await styleOf(page, '[data-slot="dialog-overlay"]', "backdrop-filter", overlayIndex)).toBe(
    "none",
  );

  const frame = await box(page, root);
  expect(frame.width).toBeCloseTo(expected.width * scale, 1);
  expect(frame.height).toBeCloseTo(expected.height * scale, 1);
  expect(frame.x).toBeCloseTo((viewport.width - frame.width) / 2, 1);
  expect(frame.y).toBeCloseTo((viewport.height - frame.height) / 2, 1);

  const frameStyle = (await measure(page, root)).style;
  expect(frameStyle.backgroundColor).toBe(await color(page, "var(--dialog)"));
  expect(frameStyle.borderTopWidth).toBe(`${MODAL_BORDER * scale}px`);
  expect(frameStyle.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(frameStyle.borderTopLeftRadius).toBe(`${MODAL_RADIUS * scale}px`);
  expect(frameStyle.paddingTop).toBe(`${MODAL_PADDING * scale}px`);
  expect(frameStyle.paddingLeft).toBe(`${MODAL_PADDING * scale}px`);
  expect(frameStyle.rowGap).toBe(`${MODAL_GAP * scale}px`);
  if (scale === 1) expect(visibleShadow(frameStyle.boxShadow)).toBe(MODAL_SHADOW);
  expect(await styleOf(page, root, "max-height")).toBe(
    `${viewport.height - MODAL_VIEWPORT_MARGIN * 2 * scale}px`,
  );
  expect(await styleOf(page, root, "max-width")).toBe(
    `${viewport.width - MODAL_VIEWPORT_MARGIN * 2 * scale}px`,
  );

  const inset = (MODAL_BORDER + MODAL_PADDING) * scale;
  const contentWidth = frame.width - inset * 2;
  const header = await box(page, `${root} [data-slot="dialog-header"]`);
  expect(header.x).toBeCloseTo(frame.x + inset, 1);
  expect(header.y).toBeCloseTo(frame.y + inset, 1);
  expect(header.width).toBeCloseTo(contentWidth, 1);
  expect(header.height).toBeCloseTo(MODAL_HEADER_HEIGHT * scale, 1);

  const title = await measure(page, `${root} [data-slot="dialog-title"]`);
  await expect(page.locator(`${root} [data-slot="dialog-title"]`)).toHaveText(expected.title);
  expect(title.style.fontSize).toBe(`${22 * scale}px`);
  expect(title.style.lineHeight).toBe(`${28 * scale}px`);
  expect(title.style.fontWeight).toBe("700");
  expect(title.style.color).toBe(await color(page, "var(--fg)"));

  const closeSelector = `${root} [data-slot="dialog-header"] [data-slot="dialog-close"]`;
  const close = await measure(page, closeSelector);
  const closeBox = await box(page, closeSelector);
  await expect(page.locator(closeSelector)).toHaveAttribute("aria-label", "닫기");
  expect(close.width).toBeCloseTo(32 * scale, 1);
  expect(close.height).toBeCloseTo(32 * scale, 1);
  expect(closeBox.x + closeBox.width).toBeCloseTo(header.x + header.width, 1);
  expect(closeBox.y).toBeCloseTo(header.y + (header.height - closeBox.height) / 2, 1);
  expect(close.style.borderTopLeftRadius).toBe(`${6 * scale}px`);
  expect(close.style.borderTopWidth).toBe("0px");
  expect(close.style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(close.style.color).toBe(await color(page, "var(--fg)"));
  const closeIcon = await box(page, `${closeSelector} svg`);
  expect(closeIcon.width).toBeCloseTo(20 * scale, 1);
  expect(await shownIconShape(page, closeSelector)).toBe(iconShape("Close"));

  const footerSelector = `${root} [data-slot="dialog-footer"]`;
  const footer = await box(page, footerSelector);
  expect(footer.x).toBeCloseTo(header.x, 1);
  expect(footer.width).toBeCloseTo(contentWidth, 1);
  expect(footer.height).toBeCloseTo(MODAL_FOOTER_HEIGHT * scale, 1);
  expect(footer.y + footer.height).toBeCloseTo(frame.y + frame.height - inset, 1);
  expect((await measure(page, footerSelector)).style.columnGap).toBe(`${8 * scale}px`);

  return { frame, header, contentWidth };
}

export async function expectButton(
  page: Page,
  selector: string,
  expected: {
    height: number;
    paddingX: number;
    weight: string;
    background: string;
    text: string;
    border?: string;
    scale?: number;
  },
  index = 0,
): Promise<void> {
  const scale = expected.scale ?? 1;
  const button = await measure(page, selector, index);
  expect(button.height).toBeCloseTo(expected.height * scale, 1);
  expect(button.style.paddingLeft).toBe(`${expected.paddingX * scale}px`);
  expect(button.style.paddingRight).toBe(`${expected.paddingX * scale}px`);
  expect(button.style.fontSize).toBe(`${14 * scale}px`);
  expect(button.style.fontWeight).toBe(expected.weight);
  expect(button.style.borderTopLeftRadius).toBe(`${6 * scale}px`);
  expect(button.style.backgroundColor).toBe(await color(page, expected.background));
  expect(button.style.color).toBe(await color(page, expected.text));
  if (expected.border) {
    expect(button.style.borderTopWidth).toBe(`${scale}px`);
    expect(button.style.borderTopColor).toBe(await color(page, expected.border));
  } else {
    expect(button.style.borderTopWidth).toBe("0px");
    expect(button.style.borderRightWidth).toBe("0px");
  }
}

export async function expectSection(page: Page, selector: string, index = 0): Promise<void> {
  const section = (await measure(page, selector, index)).style;
  expect(section.backgroundColor).toBe(await color(page, "var(--surface-low)"));
  expect(section.borderTopWidth).toBe("1px");
  expect(section.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(section.borderTopLeftRadius).toBe("12px");
  expect(section.paddingTop).toBe(`${SECTION_PADDING_Y}px`);
  expect(section.paddingLeft).toBe(`${SECTION_PADDING_X}px`);
}

export async function focusIsInside(page: Page, selector: string): Promise<boolean> {
  return page.evaluate(
    (selector) => document.querySelector(selector)?.contains(document.activeElement) ?? false,
    selector,
  );
}

export async function pressTab(page: Page, key: "Tab" | "Shift+Tab" = "Tab"): Promise<void> {
  await page.keyboard.press(key);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

export interface SlotRect {
  slot: string;
  isSvgText: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function collectSlotRects(page: Page): Promise<SlotRect[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-slot]")].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        slot: element.dataset.slot ?? "",
        isSvgText: element instanceof SVGTextElement,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }),
  );
}

export function doubledMismatches(base: SlotRect[], doubled: SlotRect[]): string[] {
  const TOLERANCE = 0.5;
  const mismatches: string[] = [];
  base.forEach((rect, index) => {
    const target = doubled[index];
    for (const key of ["x", "y", "width", "height"] as const) {
      if (rect.isSvgText && key === "height") continue;
      if (Math.abs(target[key] - rect[key] * 2) > TOLERANCE) {
        mismatches.push(`${rect.slot}[${index}].${key}: ${rect[key]} → ${target[key]}`);
      }
    }
  });
  return mismatches;
}

export async function focusedSlot(page: Page): Promise<string> {
  return page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.slot ?? "");
}

export async function enterMotion(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((selector) => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`요소 없음: ${selector}`);
    const style = getComputedStyle(element);
    return [
      style.animationName,
      style.animationDuration,
      style.getPropertyValue("--tw-enter-scale").trim(),
      style.getPropertyValue("--tw-enter-opacity").trim(),
    ];
  }, selector);
}

export async function enterTranslate(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((selector) => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`요소 없음: ${selector}`);
    const style = getComputedStyle(element);
    return [
      style.getPropertyValue("--tw-enter-translate-x").trim(),
      style.getPropertyValue("--tw-enter-translate-y").trim(),
    ];
  }, selector);
}

export type PressTarget = { selector: string; label: string } | { selector: string; index: number };

export async function textWhileClosing(
  page: Page,
  steps: { close: PressTarget; open: PressTarget; read: string },
): Promise<string[]> {
  return page.evaluate(async ({ close, open, read }) => {
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const press = (target: PressTarget) => {
      const candidates = [...document.querySelectorAll<HTMLElement>(target.selector)];
      const found =
        "label" in target
          ? candidates.find((element) => element.textContent?.trim() === target.label)
          : candidates[target.index];
      if (!found) throw new Error(`누를 요소 없음: ${JSON.stringify(target)}`);
      found.click();
    };
    press(close);
    await nextFrame();
    await nextFrame();
    document.getAnimations().forEach((animation) => animation.pause());
    press(open);
    await nextFrame();
    await nextFrame();
    const shown = [...document.querySelectorAll(read)].map((element) => element.textContent ?? "");
    document.getAnimations().forEach((animation) => animation.finish());
    return shown;
  }, steps);
}

export async function expectSentenceLines(
  page: Page,
  selector: string,
  expected: { sentences: number; lineHeight: number },
): Promise<void> {
  const element = page.locator(selector);
  const { sentences, lines } = await element.evaluate((node) => {
    const shown: string[] = [];
    let lastTop: number | null = null;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode as Text;
      for (let index = 0; index < text.length; index += 1) {
        const range = document.createRange();
        range.setStart(text, index);
        range.setEnd(text, index + 1);
        const rect = [...range.getClientRects()].find((item) => item.width > 0);
        if (!rect) continue;
        if (lastTop === null || rect.top > lastTop + rect.height / 2) {
          shown.push("");
          lastTop = rect.top;
        }
        shown[shown.length - 1] += text.data[index];
      }
    }
    return {
      sentences: (node.textContent ?? "").split("\n").map((line) => line.trim()),
      lines: shown.map((line) => line.trim()),
    };
  });
  expect(sentences).toHaveLength(expected.sentences);
  expect(lines).toEqual(sentences);
  expect((await element.boundingBox())?.height).toBe(expected.sentences * expected.lineHeight);
}
