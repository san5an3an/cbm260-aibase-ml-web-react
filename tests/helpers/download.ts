import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";

export interface DownloadedCsv {
  fileName: string;
  hasByteOrderMark: boolean;
  lines: string[];
  endsWithLineEnd: boolean;
  hasBareLineBreak: boolean;
}

export async function downloadCsv(page: Page, selector: string, index = 0): Promise<DownloadedCsv> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(selector).nth(index).click(),
  ]);
  const bytes = await readFile(await download.path());
  const hasByteOrderMark = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const parts = bytes.subarray(hasByteOrderMark ? 3 : 0).toString("utf8").split("\r\n");
  const endsWithLineEnd = parts.at(-1) === "";
  const lines = endsWithLineEnd ? parts.slice(0, -1) : parts;
  return {
    fileName: download.suggestedFilename(),
    hasByteOrderMark,
    lines,
    endsWithLineEnd,
    hasBareLineBreak: lines.some((line) => /[\r\n]/.test(line)),
  };
}
