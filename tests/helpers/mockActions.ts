import type { Page } from "@playwright/test";

export interface MockActionRequest {
  name: string;
  target: string;
}

type MockActionsHost = {
  cbmMockActions?: { delayMs?: number; failNames?: string[]; requested?: MockActionRequest[] };
};

export async function setMockActions(
  page: Page,
  value: { delayMs?: number; failNames?: string[] },
): Promise<void> {
  await page.evaluate((next) => {
    const host = window as unknown as MockActionsHost;
    host.cbmMockActions = { ...next, requested: host.cbmMockActions?.requested ?? [] };
  }, value);
}

export async function requestedActions(page: Page): Promise<MockActionRequest[]> {
  return page.evaluate(() => [
    ...((window as unknown as MockActionsHost).cbmMockActions?.requested ?? []),
  ]);
}
