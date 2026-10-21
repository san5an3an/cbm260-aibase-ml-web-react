import type { Page } from "@playwright/test";
import { MOCK_TODAY, openFixedScreen } from "./measure";

const TRAINING_PATH = "/info/training";
export const TRAINING_RESULT_ROW = '[data-slot="training-results-card"] tbody [data-slot="table-row"]';

export async function openTraining(
  page: Page,
  width = 1920,
  height = 1080,
  today: Date = MOCK_TODAY,
): Promise<void> {
  await openFixedScreen(page, TRAINING_PATH, TRAINING_RESULT_ROW, width, height, today);
}
