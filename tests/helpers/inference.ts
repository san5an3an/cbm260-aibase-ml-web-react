import type { Page } from "@playwright/test";
import { MOCK_TODAY, openFixedScreen } from "./measure";

const INFERENCE_PATH = "/info/inference";
export const INFERENCE_RESULT_ROW = '[data-slot="inference-results-card"] tbody [data-slot="table-row"]';

export async function openInference(
  page: Page,
  width = 1920,
  height = 1080,
  today: Date = MOCK_TODAY,
): Promise<void> {
  await openFixedScreen(page, INFERENCE_PATH, INFERENCE_RESULT_ROW, width, height, today);
}
