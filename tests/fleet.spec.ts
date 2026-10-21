import { expect, test, type Page } from "@playwright/test";
import { color, measure, visibleShadow } from "./helpers/measure";

test.use({ contextOptions: { reducedMotion: "reduce" } });

const KPI = '[data-slot="kpi-flip-card"]';
const RISK = '[data-slot="risk-ranking-card"]';
const HISTORY = '[data-slot="anomaly-history-card"]';
const COVERAGE = '[data-slot="model-coverage-card"]';
const HEAD = '[data-slot="table-head"]';
const BODY_ROW = 'tbody [data-slot="table-row"]';

async function openFleet(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto("/dashboard/fleet");
  await expect(page.locator('[data-slot="fleet-overview"]')).toBeVisible();
}

for (const viewport of [
  { width: 1920, height: 1080, kpiWidth: 288, coverageWidth: 633.6 },
  { width: 1440, height: 900, kpiWidth: 232, coverageWidth: 480 },
]) {
  test(`플릿 개요의 Layout과 KPI Card 확인 (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await openFleet(page, viewport.width, viewport.height);

    const root = await measure(page, '[data-slot="fleet-overview"]');
    expect(root.style.columnGap).toBe("14px");
    expect(root.width).toBe(viewport.width - 72 - 28);
    expect(root.height).toBe(viewport.height - 58 - 14 - 32 - 28);

    const column = await measure(page, '[data-slot="fleet-kpi-column"]');
    expect(column.width).toBeCloseTo(viewport.kpiWidth, 1);
    expect(column.style.rowGap).toBe("14px");
    await expect(page.locator(KPI)).toHaveCount(5);

    const coverage = await measure(page, COVERAGE);
    expect(coverage.width).toBeCloseTo(viewport.coverageWidth, 1);

    const center = await measure(page, '[data-slot="fleet-overview-center"]');
    expect(center.style.minWidth).toBe("600px");
    expect(center.style.rowGap).toBe("10px");
    expect(center.width).toBeCloseTo(
      viewport.width - 72 - 28 - viewport.kpiWidth - viewport.coverageWidth - 28,
      1,
    );

    const card = await measure(page, KPI);
    expect(card.height).toBeGreaterThanOrEqual(120);
    expect(card.style.minHeight).toBe("120px");
    expect(card.style.borderTopWidth).toBe("1px");
    expect(card.style.borderTopColor).toBe(await color(page, "var(--border)"));
    expect(card.style.borderLeftWidth).toBe("5px");
    expect(card.style.borderLeftColor).toBe(await color(page, "var(--brand-line4)"));
    expect(card.style.borderTopLeftRadius).toBe("12px");
    expect(card.style.paddingTop).toBe("18px");
    expect(card.style.paddingRight).toBe("18px");
    expect(card.style.paddingBottom).toBe("17px");
    expect(card.style.paddingLeft).toBe("19px");
    expect(card.style.rowGap).toBe("8px");
    expect(card.style.backgroundColor).toBe(await color(page, "var(--card)"));
    expect(visibleShadow(card.style.boxShadow)).toBe("rgba(11, 31, 46, 0.08) 0px 1px 3px 0px");

    const accents = ["--brand-line4", "--brand-line4", "--warning", "--danger", "--border-strong"];
    for (const [index, token] of accents.entries()) {
      const item = await measure(page, KPI, index);
      expect(item.style.borderLeftColor).toBe(await color(page, `var(${token})`));
    }

    const label = await measure(page, '[data-slot="kpi-flip-card-label"]');
    expect(label.style.fontSize).toBe("16px");
    expect(label.style.lineHeight).toBe("18px");
    expect(label.style.fontWeight).toBe("700");

    const firstUnit = await measure(page, '[data-slot="kpi-flip-card-unit"]');
    const cardInnerWidth = viewport.kpiWidth - 1 - 5 - 19 - 18;
    const digit = await measure(page, '[data-slot="digit-tile"]');
    expect(digit.width).toBeCloseTo(Math.min(43, (cardInnerWidth - 4 * 4 - firstUnit.width) / 4), 1);
    expect(digit.height).toBe(69);
    expect(digit.style.borderTopLeftRadius).toBe("4px");
    expect(digit.style.fontSize).toBe("44px");
    expect(digit.style.lineHeight).toBe("44px");
    expect(digit.style.fontWeight).toBe("700");
    expect(digit.style.backgroundColor).toBe(await color(page, "var(--muted-strong)"));
    expect(digit.style.columnGap).toBe("normal");

    const dot = await measure(page, `${KPI}:nth-child(3) [data-slot="digit-tile"]`, 2);
    expect(dot.width).toBe(16);
    expect(dot.style.paddingBottom).toBe("6px");
    expect(dot.style.backgroundColor).toBe(await color(page, "transparent"));
    const colon = await measure(page, `${KPI}:nth-child(5) [data-slot="digit-tile"]`, 2);
    if (viewport.width === 1920) {
      expect(colon.width).toBe(16);
    } else {
      expect(colon.width).toBeLessThan(16);
    }
    expect(colon.style.paddingBottom).toBe("0px");

    const unit = await measure(page, '[data-slot="kpi-flip-card-unit"]');
    expect(unit.style.fontSize).toBe("16px");
    expect(unit.style.lineHeight).toBe("20px");
    expect(unit.style.paddingLeft).toBe("2px");
    expect(unit.style.paddingBottom).toBe("4px");
    expect(unit.style.color).toBe(await color(page, "var(--muted-fg)"));

    const description = await measure(page, '[data-slot="kpi-flip-card-description"]');
    expect(description.style.fontSize).toBe("12px");
    expect(description.style.lineHeight).toBe("16px");
    expect(description.style.color).toBe(await color(page, "var(--muted-fg)"));

    await expect(page.locator('[data-slot="kpi-flip-card-label"]')).toHaveText([
      "총 추론 건수",
      "커버 장치·세그먼트",
      "평균 이상비율 (최신)",
      "경보 (경고+위험)",
      "최근 추론",
    ]);
  });
}

test("위험 장치 랭킹 Card 확인", async ({ page }) => {
  await openFleet(page, 1920, 1080);

  const card = await measure(page, RISK);
  expect(card.style.borderTopWidth).toBe("1px");
  expect(card.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(card.style.borderTopLeftRadius).toBe("16px");
  expect(card.style.paddingTop).toBe("16px");
  expect(card.style.paddingLeft).toBe("18px");
  expect(card.style.paddingRight).toBe("18px");
  expect(card.style.paddingBottom).toBe("16px");
  expect(card.style.rowGap).toBe("14px");
  expect(card.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(visibleShadow(card.style.boxShadow)).toBe("rgba(11, 31, 46, 0.06) 0px 1px 3px 0px");

  const header = await measure(page, `${RISK} [data-slot="section-card-header"]`);
  expect(header.style.columnGap).toBe("12px");

  const eyebrow = await measure(page, `${RISK} [data-slot="section-card-eyebrow"]`);
  expect(eyebrow.style.fontSize).toBe("11px");
  expect(eyebrow.style.lineHeight).toBe("16px");
  expect(eyebrow.style.letterSpacing).toBe("0.6px");
  expect(eyebrow.style.fontWeight).toBe("700");
  expect(eyebrow.style.color).toBe(await color(page, "var(--brand-line4-text)"));

  const title = await measure(page, `${RISK} [data-slot="section-card-title"]`);
  expect(title.style.fontSize).toBe("16px");
  expect(title.style.lineHeight).toBe("22px");
  expect(title.style.fontWeight).toBe("700");
  await expect(page.locator(`${RISK} [data-slot="section-card-title"]`)).toHaveText(
    "위험 장치 랭킹 · 최신 이상비율 상위 10",
  );
  await expect(page.locator(`${RISK} [data-slot="section-card-header"]`)).toContainText(
    "위험 ≥ 20% · 경고 ≥ 10% · 주의 > 0% · 정상 0%",
  );

  const frame = await measure(page, `${RISK} [data-slot="data-table"]`);
  expect(frame.style.borderTopWidth).toBe("1px");
  expect(frame.style.borderTopLeftRadius).toBe("10px");
  expect(frame.style.borderTopColor).toBe(await color(page, "var(--border)"));

  const headRow = await measure(page, `${RISK} thead [data-slot="table-row"]`);
  expect(headRow.height).toBe(44);
  expect(headRow.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(headRow.style.borderBottomWidth).toBe("1px");
  const heads = [];
  for (let index = 0; index < 6; index += 1) {
    heads.push(await measure(page, `${RISK} ${HEAD}`, index));
  }
  expect(heads[0].width).toBe(96);
  expect(heads[2].width).toBe(92);
  expect(heads[4].width).toBe(100);
  expect(heads[5].width).toBe(160);
  expect(heads[1].width / heads[3].width).toBeCloseTo(1.2, 2);
  expect(heads[0].style.paddingLeft).toBe("16px");
  expect(heads[0].style.paddingRight).toBe("16px");
  expect(heads[0].style.fontSize).toBe("14px");
  expect(heads[0].style.fontWeight).toBe("400");
  expect(heads[4].style.textAlign).toBe("right");
  await expect(page.locator(`${RISK} ${HEAD}`)).toHaveText([
    "상태",
    "장치",
    "세그먼트",
    "이상비율",
    "이상 / 전체",
    "최근 추론",
  ]);

  await expect(page.locator(`${RISK} ${BODY_ROW}`)).toHaveCount(10);
  const firstRow = await measure(page, `${RISK} ${BODY_ROW}`, 0);
  expect(firstRow.height).toBe(36);
  expect(firstRow.style.borderBottomWidth).toBe("1px");
  expect(firstRow.style.fontSize).toBe("14px");
  expect(firstRow.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  const secondRow = await measure(page, `${RISK} ${BODY_ROW}`, 1);
  expect(secondRow.style.backgroundColor).toBe(await color(page, "transparent"));
  const lastRow = await measure(page, `${RISK} ${BODY_ROW}`, 9);
  expect(lastRow.height).toBe(36);
  expect(lastRow.style.borderBottomWidth).toBe("1px");

  const badge = await measure(page, `${RISK} [data-slot="status-badge"]`, 0);
  expect(badge.style.columnGap).toBe("8px");
  expect(badge.style.fontWeight).toBe("700");
  const levels = [
    { row: 0, label: "위험", chip: "--danger", chipText: "--danger-fg", fill: "--danger", track: "--danger-subtle", text: "--danger" },
    { row: 4, label: "경고", chip: "--warning-strong", chipText: "--warning-fg", fill: "--warning", track: "--warning-subtle", text: "--on-warning-subtle" },
    { row: 8, label: "주의", chip: "--caution", chipText: "--caution-fg", fill: "--caution", track: "--caution-subtle", text: "--on-caution-subtle" },
  ];
  for (const level of levels) {
    const chip = await measure(page, `${RISK} [data-slot="status-badge-chip"]`, level.row);
    expect(chip.width).toBe(20);
    expect(chip.height).toBe(20);
    expect(chip.style.borderTopLeftRadius).toBe("4px");
    expect(chip.style.fontSize).toBe("12px");
    expect(chip.style.fontWeight).toBe("700");
    expect(chip.style.backgroundColor).toBe(await color(page, `var(${level.chip})`));
    expect(chip.style.color).toBe(await color(page, `var(${level.chipText})`));
    await expect(page.locator(`${RISK} [data-slot="status-badge"]`).nth(level.row)).toContainText(
      level.label,
    );

    const track = await measure(page, `${RISK} [data-slot="ratio-bar-track"]`, level.row);
    expect(track.height).toBe(6);
    expect(track.width).toBeLessThanOrEqual(84);
    expect(track.style.borderTopLeftRadius).toBe("3px");
    expect(track.style.backgroundColor).toBe(await color(page, `var(${level.track})`));
    const fill = await measure(page, `${RISK} [data-slot="ratio-bar-fill"]`, level.row);
    expect(fill.height).toBe(6);
    expect(fill.style.backgroundColor).toBe(await color(page, `var(${level.fill})`));
    const ratioLabel = await measure(page, `${RISK} [data-slot="ratio-bar-label"]`, level.row);
    expect(ratioLabel.style.fontWeight).toBe("700");
    expect(ratioLabel.style.textAlign).toBe("right");
    expect(ratioLabel.style.color).toBe(await color(page, `var(${level.text})`));
  }

  const bar = await measure(page, `${RISK} [data-slot="ratio-bar"]`, 0);
  expect(bar.style.columnGap).toBe("12px");
  const track = await measure(page, `${RISK} [data-slot="ratio-bar-track"]`, 0);
  const fill = await measure(page, `${RISK} [data-slot="ratio-bar-fill"]`, 0);
  expect(fill.width / track.width).toBeCloseTo(0.85, 2);

  const cells = [];
  for (let index = 0; index < 6; index += 1) {
    cells.push(await measure(page, `${RISK} ${BODY_ROW}:first-child [data-slot="table-cell"]`, index));
  }
  expect(cells[1].style.paddingLeft).toBe("16px");
  expect(cells[1].style.paddingTop).toBe("0px");
  expect(cells[1].style.fontWeight).toBe("700");
  expect(cells[4].style.textAlign).toBe("right");
  expect(cells[5].style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(
    page.locator(`${RISK} ${BODY_ROW}:first-child [data-slot="table-cell"]`),
  ).toHaveText([/위험/, "MICOM_AIRPURIFIER", "default", "34%", "65 / 190", /^\d{4}-\d{2}-\d{2} 12:16:14$/]);

  await page.locator(`${RISK} ${BODY_ROW}`).nth(3).click();
  await expect(page.locator(`${RISK} ${BODY_ROW}`).nth(3)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(`${RISK} ${BODY_ROW}`).nth(0)).toHaveAttribute("aria-selected", "false");
});

test("이상 감지 내역 Card 확인", async ({ page }) => {
  await openFleet(page, 1920, 1080);

  const card = await measure(page, HISTORY);
  expect(card.style.minHeight).toBe("240px");
  expect(card.style.borderTopLeftRadius).toBe("16px");
  expect(card.style.paddingLeft).toBe("18px");
  await expect(page.locator(`${HISTORY} [data-slot="section-card-eyebrow"]`)).toHaveText(
    "ANOMALY HISTORY",
  );
  await expect(page.locator(`${HISTORY} [data-slot="section-card-title"]`)).toHaveText(
    "이상 감지 내역",
  );

  const deviceSelect = await measure(page, `${HISTORY} [data-slot="select-trigger"]`, 0);
  expect(deviceSelect.width).toBe(160);
  expect(deviceSelect.height).toBe(32);
  expect(deviceSelect.style.paddingLeft).toBe("12px");
  expect(deviceSelect.style.paddingRight).toBe("10px");
  expect(deviceSelect.style.paddingTop).toBe("0px");
  expect(deviceSelect.style.borderTopLeftRadius).toBe("6px");
  expect(deviceSelect.style.borderTopWidth).toBe("1px");
  expect(deviceSelect.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(deviceSelect.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(deviceSelect.style.fontSize).toBe("14px");
  expect(deviceSelect.style.columnGap).toBe("8px");
  expect(deviceSelect.style.color).toBe(await color(page, "var(--fg)"));
  const arrow = await measure(page, `${HISTORY} [data-slot="select-trigger"] > svg`, 0);
  expect(arrow.width).toBe(18);
  expect(arrow.style.color).toBe(await color(page, "var(--muted-fg)"));
  const daysSelect = await measure(page, `${HISTORY} [data-slot="select-trigger"]`, 1);
  expect(daysSelect.width).toBe(130);
  expect(daysSelect.height).toBe(32);
  await expect(page.locator(`${HISTORY} [data-slot="select-trigger"]`)).toHaveText([
    "차축 베어링",
    "최근 14일",
  ]);

  const headRow = await measure(page, `${HISTORY} thead [data-slot="table-row"]`);
  expect(headRow.height).toBe(44);
  const heads = [];
  for (let index = 0; index < 5; index += 1) {
    heads.push(await measure(page, `${HISTORY} ${HEAD}`, index));
  }
  expect(heads[0].width).toBe(44);
  expect(heads[1].width).toBe(120);
  expect(heads[2].width).toBe(150);
  expect(heads[4].width).toBe(166);
  expect(heads[3].width).toBeGreaterThanOrEqual(220);
  expect(heads[0].style.paddingLeft).toBe("16px");
  expect(heads[1].style.paddingLeft).toBe("12px");
  await expect(page.locator(`${HISTORY} ${HEAD}`)).toHaveText([
    "#",
    "편성 · 호차",
    "위치",
    "모델별 이상 window",
    "날짜별",
  ]);

  await expect(page.locator(`${HISTORY} ${BODY_ROW}`)).toHaveCount(7);
  const row = await measure(page, `${HISTORY} ${BODY_ROW}`, 0);
  expect(row.height).toBe(38);
  expect(row.style.borderBottomWidth).toBe("1px");
  expect(visibleShadow(row.style.boxShadow)).toBe(
    `${await color(page, "var(--danger)")} 3px 0px 0px 0px inset`,
  );
  await expect(page.locator(`${HISTORY} ${BODY_ROW}`).first()).toContainText("401 · 0호차");
  await expect(page.locator(`${HISTORY} ${BODY_ROW}`).first()).toContainText("4010-H-1-False");

  const strongChip = await measure(page, `${HISTORY} [data-slot="model-hit-chip"]`, 0);
  expect(strongChip.height).toBe(20);
  expect(strongChip.style.paddingLeft).toBe("7px");
  expect(strongChip.style.borderTopLeftRadius).toBe("4px");
  expect(strongChip.style.fontSize).toBe("11px");
  expect(strongChip.style.fontWeight).toBe("700");
  expect(strongChip.style.backgroundColor).toBe(await color(page, "var(--danger-subtle)"));
  expect(strongChip.style.color).toBe(await color(page, "var(--on-danger-subtle)"));
  const plainChip = await measure(page, `${HISTORY} [data-slot="model-hit-chip"]`, 1);
  expect(plainChip.style.fontWeight).toBe("500");
  expect(plainChip.style.backgroundColor).toBe(await color(page, "var(--muted)"));
  expect(plainChip.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator(`${HISTORY} [data-slot="model-hit-chip"]`).nth(0)).toHaveText(
    "IF · 100개",
  );
  await expect(page.locator(`${HISTORY} [data-slot="model-hit-chip"]`).nth(1)).toHaveText(
    "VAE · 75개",
  );

  await expect(page.locator(`${HISTORY} [data-slot="state-pill"]`)).toHaveCount(0);
  await expect(page.locator(HISTORY)).not.toContainText("공통");

  const chipCell = await measure(page, `${HISTORY} ${BODY_ROW}:first-child [data-slot="table-cell"]`, 3);
  expect(chipCell.style.columnGap).toBe("6px");
  expect(chipCell.style.paddingLeft).toBe("12px");

  const firstRowCells = `${HISTORY} ${BODY_ROW}:first-child [data-slot="hit-strip-cell"]`;
  await expect(page.locator(firstRowCells)).toHaveCount(14);
  const stripCell = await measure(page, firstRowCells, 0);
  expect(stripCell.width).toBeCloseTo((166 - 24 - 13 * 2) / 14, 1);
  expect(stripCell.height).toBe(14);
  expect(stripCell.style.borderTopLeftRadius).toBe("2px");
  expect(stripCell.style.backgroundColor).toBe(await color(page, "var(--warning)"));
  const stripWrap = await measure(page, `${HISTORY} ${BODY_ROW}:first-child [data-slot="table-cell"]`, 4);
  expect(stripWrap.style.columnGap).toBe("2px");
  const lightCell = await measure(page, firstRowCells, 5);
  expect(lightCell.style.backgroundColor).toBe(
    await color(page, "color-mix(in srgb, var(--caution) 45%, var(--card))"),
  );
  const emptyCell = await measure(page, `${HISTORY} ${BODY_ROW}:nth-child(3) [data-slot="hit-strip-cell"]`, 10);
  expect(emptyCell.style.borderTopStyle).toBe("dashed");
  expect(emptyCell.style.borderTopWidth).toBe("1px");
  expect(emptyCell.style.borderTopColor).toBe(await color(page, "var(--border-strong)"));
  const emptyStrip = page.locator(`${HISTORY} ${BODY_ROW}:nth-child(3) [data-slot="hit-strip-cell"]`).nth(10);
  await expect(emptyStrip).not.toHaveAttribute("title", /./);
  const TOOLTIP = '[data-slot="cursor-tooltip"]';
  await expect(page.locator(TOOLTIP)).toHaveCount(0);
  await emptyStrip.hover();
  await expect(page.locator(TOOLTIP)).toHaveCount(1);
  await expect(page.locator(`${TOOLTIP} > span`)).toHaveText([/^\d{2}-\d{2}$/, "저장 없음"]);
  await page.locator(firstRowCells).nth(5).hover();
  await expect(page.locator(`${TOOLTIP} > span`).nth(1)).toHaveText("이상 모델 1개");
  await page.mouse.move(0, 0);
  await expect(page.locator(TOOLTIP)).toHaveCount(0);

  const notes = await measure(page, '[data-slot="anomaly-history-notes"]');
  expect(notes.style.fontSize).toBe("12px");
  expect(notes.style.lineHeight).toBe("18px");
  expect(notes.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator('[data-slot="anomaly-history-notes"]')).toContainText(
    /최근 14일 \(\d{2}-\d{2} ~ \d{2}-\d{2}\) · 이상일 = 하루에 이상 window 5개 이상 · 이상 위치 7곳 중 상위 7곳 표시/,
  );
});

test("Select를 열었을 때 확인", async ({ page }) => {
  await openFleet(page, 1920, 1080);

  const trigger = page.locator(`${HISTORY} [data-slot="select-trigger"]`).first();
  const triggerBox = await trigger.boundingBox();
  await trigger.click();
  const popup = page.locator('[data-slot="select-content"]');
  await expect(popup).toBeVisible();
  await page.waitForTimeout(300);

  const opened = await measure(page, `${HISTORY} [data-slot="select-trigger"]`, 0);
  expect(opened.style.borderTopColor).toBe(await color(page, "var(--brand-line4)"));
  expect(visibleShadow(opened.style.boxShadow)).toBe(
    `${await color(page, "var(--brand-line4)")} 0px 0px 0px 1px, ${await color(page, "var(--brand-line4-subtle)")} 0px 0px 0px 4px`,
  );

  const popupBox = await popup.boundingBox();
  expect(popupBox!.y).toBeCloseTo(triggerBox!.y + triggerBox!.height + 4, 0);
  expect(popupBox!.x).toBeCloseTo(triggerBox!.x, 0);
  expect(popupBox!.width).toBeGreaterThanOrEqual(triggerBox!.width);
  const list = await measure(page, '[data-slot="select-content"]');
  expect(list.style.borderTopWidth).toBe("1px");
  expect(list.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(list.style.borderTopLeftRadius).toBe("8px");
  expect(list.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(visibleShadow(list.style.boxShadow)).toBe("rgba(11, 31, 46, 0.14) 0px 8px 24px 0px");
  const group = await measure(page, '[data-slot="select-group"]');
  expect(group.style.paddingTop).toBe("4px");
  expect(group.style.rowGap).toBe("1px");

  await expect(page.locator('[data-slot="select-item"]')).toHaveText([
    "차축 베어링",
    "구동 기어",
    "견인 전동기",
  ]);
  const selected = await measure(page, '[data-slot="select-item"]', 0);
  expect(selected.height).toBe(32);
  expect(selected.style.borderTopLeftRadius).toBe("4px");
  expect(selected.style.fontSize).toBe("14px");
  expect(selected.style.fontWeight).toBe("600");
  expect(selected.style.paddingLeft).toBe("30px");
  expect(selected.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  const plain = await measure(page, '[data-slot="select-item"]', 1);
  expect(plain.height).toBe(32);
  expect(plain.style.fontWeight).toBe("400");
  const check = await measure(page, '[data-slot="select-item"] svg', 0);
  expect(check.width).toBe(16);
  expect(check.style.color).toBe(await color(page, "var(--primary)"));
  const itemBox = await page.locator('[data-slot="select-item"]').first().boundingBox();
  const checkBox = await page.locator('[data-slot="select-item"] svg').first().boundingBox();
  expect(checkBox!.x - itemBox!.x).toBeCloseTo(8, 0);

  await page.locator('[data-slot="select-item"]').nth(2).click();
  await expect(popup).toBeHidden();
  await expect(trigger).toHaveText("견인 전동기");
});

test("Model 커버리지 Card 확인", async ({ page }) => {
  await openFleet(page, 1920, 1080);

  const card = await measure(page, COVERAGE);
  expect(card.style.borderTopLeftRadius).toBe("16px");
  expect(card.style.paddingTop).toBe("16px");
  expect(card.style.paddingLeft).toBe("18px");
  expect(card.style.rowGap).toBe("14px");
  await expect(page.locator(`${COVERAGE} [data-slot="section-card-eyebrow"]`)).toHaveText(
    "MODEL COVERAGE",
  );
  await expect(page.locator(`${COVERAGE} [data-slot="section-card-title"]`)).toHaveText(
    "모델 커버리지 매트릭스",
  );
  const description = await measure(page, `${COVERAGE} [data-slot="section-card-description"]`);
  expect(description.style.fontSize).toBe("14px");
  expect(description.style.lineHeight).toBe("20px");
  expect(description.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator(`${COVERAGE} [data-slot="section-card-description"]`)).toHaveText(
    "전체 장치 × 모델 학습본 · output/{production,staging} 스캔",
  );

  const legend = await measure(page, '[data-slot="model-coverage-legend"]');
  expect(legend.style.fontSize).toBe("12px");
  expect(legend.style.columnGap).toBe("16px");
  expect(legend.style.marginBottom).toBe("6px");
  expect(legend.style.color).toBe(await color(page, "var(--muted-fg)"));
  const productionBox = await measure(page, '[data-slot="model-coverage-legend"] > span:nth-child(1) > span');
  expect(productionBox.width).toBe(30);
  expect(productionBox.height).toBe(18);
  expect(productionBox.style.borderTopLeftRadius).toBe("4px");
  expect(productionBox.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  const productionDot = await measure(page, '[data-slot="model-coverage-legend"] > span:nth-child(1) > span > span');
  expect(productionDot.width).toBe(8);
  expect(productionDot.height).toBe(8);
  const stagingBox = await measure(page, '[data-slot="model-coverage-legend"] > span:nth-child(2) > span');
  expect(stagingBox.width).toBe(30);
  expect(stagingBox.style.borderTopStyle).toBe("dashed");
  expect(stagingBox.style.borderTopWidth).toBe("1px");
  expect(stagingBox.style.borderTopColor).toBe(await color(page, "var(--brand-line4)"));
  const stagingDot = await measure(page, '[data-slot="model-coverage-legend"] > span:nth-child(2) > span > span');
  expect(stagingDot.width).toBe(8);
  expect(stagingDot.style.borderTopWidth).toBe("1px");
  const line = await measure(page, '[data-slot="model-coverage-legend"] > span:nth-child(3) > span');
  expect(line.width).toBe(12);
  expect(line.height).toBe(1);
  await expect(page.locator('[data-slot="model-coverage-legend"] > span')).toHaveText([
    "운영",
    "스테이징",
    "미학습 → 추론 skip",
    "점 개수 = 세그먼트 수",
  ]);

  const head = await measure(page, '[data-slot="model-coverage-head"]');
  expect(head.height).toBe(30);
  expect(head.style.columnGap).toBe("6px");
  expect(head.style.fontSize).toBe("12px");
  expect(head.style.fontWeight).toBe("700");
  const nameHead = await measure(page, '[data-slot="model-coverage-head"] > span', 0);
  expect(nameHead.width).toBe(156);
  expect(nameHead.style.paddingLeft).toBe("8px");
  const ownedHead = await measure(page, '[data-slot="model-coverage-head"] > span', 5);
  expect(ownedHead.width).toBe(54);
  const modelHeads = [];
  for (let index = 1; index <= 4; index += 1) {
    modelHeads.push(await measure(page, '[data-slot="model-coverage-head"] > span', index));
  }
  for (const modelHead of modelHeads) {
    expect(modelHead.width).toBeCloseTo(modelHeads[0].width, 1);
  }
  await expect(page.locator('[data-slot="model-coverage-head"] > span')).toHaveText([
    "장치 21",
    "IF",
    "SVM",
    "VAE",
    "PCA",
    "보유",
  ]);

  await expect(page.locator('[data-slot="coverage-row"]')).toHaveCount(21);
  const firstRow = await measure(page, '[data-slot="coverage-row"]', 0);
  expect(firstRow.height).toBeGreaterThanOrEqual(24);
  expect(firstRow.style.minHeight).toBe("24px");
  expect(firstRow.style.borderTopLeftRadius).toBe("4px");
  expect(firstRow.style.columnGap).toBe("6px");
  expect(firstRow.style.backgroundColor).toBe(await color(page, "transparent"));
  const secondRow = await measure(page, '[data-slot="coverage-row"]', 1);
  expect(secondRow.style.backgroundColor).toBe(await color(page, "var(--surface-low)"));
  const name = await measure(page, '[data-slot="coverage-row-name"]', 0);
  expect(name.style.fontSize).toBe("14px");
  expect(name.style.fontWeight).toBe("700");
  expect(name.style.paddingLeft).toBe("8px");
  const owned = await measure(page, '[data-slot="coverage-row-owned"]', 0);
  expect(owned.style.fontSize).toBe("12px");
  expect(owned.style.textAlign).toBe("right");
  expect(owned.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator('[data-slot="coverage-row-name"]').first()).toHaveText("ATC");
  await expect(page.locator('[data-slot="coverage-row-owned"]').first()).toHaveText("2/4");

  const production = await measure(page, '[data-slot="coverage-cell"][data-status="production"]', 0);
  expect(production.height).toBeCloseTo(Math.min(25, Math.max(18, firstRow.height - 6)), 1);
  expect(production.style.borderTopLeftRadius).toBe("4px");
  expect(production.style.backgroundColor).toBe(await color(page, "var(--brand-line4-subtle)"));
  expect(production.style.columnGap).toBe("4px");
  const productionCellDot = await measure(page, '[data-slot="coverage-cell"][data-status="production"] > span', 0);
  expect(productionCellDot.width).toBe(9);
  expect(productionCellDot.height).toBe(9);
  expect(productionCellDot.style.backgroundColor).toBe(await color(page, "var(--brand-line4)"));
  const staging = await measure(page, '[data-slot="coverage-cell"][data-status="staging"]', 0);
  expect(staging.style.borderTopStyle).toBe("dashed");
  expect(staging.style.borderTopWidth).toBe("1px");
  expect(staging.style.borderTopColor).toBe(await color(page, "var(--brand-line4)"));
  const stagingCellDot = await measure(page, '[data-slot="coverage-cell"][data-status="staging"] > span', 0);
  expect(stagingCellDot.width).toBe(9);
  expect(stagingCellDot.style.borderTopWidth).toBe("1px");
  const none = await measure(page, '[data-slot="coverage-cell"][data-status="none"]', 0);
  expect(none.style.fontSize).toBe("12px");
  expect(none.style.color).toBe(await color(page, "var(--disabled)"));
  await expect(page.locator('[data-slot="coverage-cell"][data-status="none"]').first()).toHaveText("—");
  const atcCells = page.locator('[data-slot="coverage-row"]').first().locator('[data-slot="coverage-cell"]');
  await expect(atcCells).toHaveCount(4);
  await expect(atcCells.nth(0)).toHaveAttribute("data-status", "production");
  await expect(atcCells.nth(0).locator("> span")).toHaveCount(2);
  await expect(atcCells.nth(1)).toHaveAttribute("data-status", "staging");
  await expect(atcCells.nth(1).locator("> span")).toHaveCount(2);
  await expect(atcCells.nth(2)).toHaveAttribute("data-status", "none");

  const totals = await measure(page, '[data-slot="coverage-totals-row"]');
  expect(totals.style.marginTop).toBe("6px");
  expect(totals.style.paddingTop).toBe("12px");
  expect(totals.style.borderTopWidth).toBe("1px");
  expect(totals.style.borderTopColor).toBe(await color(page, "var(--border)"));
  const totalsLabel = await measure(page, '[data-slot="coverage-totals-row"] > span', 0);
  expect(totalsLabel.style.fontSize).toBe("12px");
  expect(totalsLabel.style.lineHeight).toBe("16px");
  expect(totalsLabel.style.fontWeight).toBe("700");
  const total = await measure(page, '[data-slot="coverage-totals-row"] > span:nth-child(2)');
  expect(total.style.rowGap).toBe("2px");
  const totalTop = await measure(page, '[data-slot="coverage-totals-row"] > span:nth-child(2) > span', 0);
  expect(totalTop.style.fontSize).toBe("14px");
  expect(totalTop.style.fontWeight).toBe("700");
  const totalBottom = await measure(page, '[data-slot="coverage-totals-row"] > span:nth-child(2) > span', 1);
  expect(totalBottom.style.fontSize).toBe("11px");
  await expect(page.locator('[data-slot="coverage-totals-row"] > span:nth-child(2)')).toHaveText(
    "11 / 1021/21",
  );
});

test("Page Bar의 갱신 시각과 새Logo침 확인", async ({ page }) => {
  await openFleet(page, 1920, 1080);

  const time = await measure(page, '[data-slot="refresh-time"]');
  expect(time.style.fontSize).toBe("12px");
  expect(time.style.color).toBe(await color(page, "var(--muted-fg)"));
  await expect(page.locator('[data-slot="refresh-time"]')).toHaveText(/^갱신 \d{2}:\d{2}:\d{2}$/);

  const button = await measure(page, '[data-slot="refresh-button"]');
  expect(button.height).toBe(32);
  expect(button.style.paddingLeft).toBe("12px");
  expect(button.style.paddingRight).toBe("12px");
  expect(button.style.borderTopLeftRadius).toBe("6px");
  expect(button.style.borderTopWidth).toBe("1px");
  expect(button.style.borderTopColor).toBe(await color(page, "var(--border)"));
  expect(button.style.backgroundColor).toBe(await color(page, "var(--card)"));
  expect(button.style.fontSize).toBe("14px");
  expect(button.style.fontWeight).toBe("600");
  expect(button.style.columnGap).toBe("6px");
  const icon = await measure(page, '[data-slot="refresh-button"] svg');
  expect(icon.width).toBe(18);

  const timeBox = await page.locator('[data-slot="refresh-time"]').boundingBox();
  const buttonBox = await page.locator('[data-slot="refresh-button"]').boundingBox();
  const sessionBox = await page.locator('[data-slot="session-chip"]').boundingBox();
  expect(buttonBox!.x - (timeBox!.x + timeBox!.width)).toBeCloseTo(12, 0);
  expect(sessionBox!.x - (buttonBox!.x + buttonBox!.width)).toBeCloseTo(12, 0);

  await page.getByRole("link", { name: "이상 타임라인" }).click();
  await expect(page).toHaveURL("/dashboard/timeline");
  await expect(page.locator('[data-slot="refresh-button"]')).toHaveCount(0);
});

test("이상 감지 내역의 Row를 Click하면 이상 감지 내역 화면으로 이동함", async ({ page }) => {
  await openFleet(page, 1920, 1080);

  await page.locator(`${HISTORY} ${BODY_ROW}`).first().click();
  await expect(page).toHaveURL("/info/anomaly");
});

test("기본 Font 크기를 2배로 하면 플릿 개요의 크기도 2배가 됨", async ({ page }) => {
  await openFleet(page, 1920, 1080);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page.waitForTimeout(400);

  const card = await measure(page, KPI);
  expect(card.style.borderLeftWidth).toBe("10px");
  expect(card.style.borderTopWidth).toBe("2px");
  expect(card.style.paddingTop).toBe("36px");
  expect(card.style.borderTopLeftRadius).toBe("24px");
  expect(visibleShadow(card.style.boxShadow)).toBe("rgba(11, 31, 46, 0.08) 0px 2px 6px 0px");

  const digit = await measure(page, '[data-slot="digit-tile"]');
  expect(digit.height).toBe(138);
  expect(digit.style.fontSize).toBe("88px");

  const headRow = await measure(page, `${RISK} thead [data-slot="table-row"]`);
  expect(headRow.height).toBe(88);
  const row = await measure(page, `${RISK} ${BODY_ROW}`, 0);
  expect(row.height).toBe(72);
  expect(row.style.borderBottomWidth).toBe("2px");
  const chip = await measure(page, `${RISK} [data-slot="status-badge-chip"]`, 0);
  expect(chip.width).toBe(40);
  const track = await measure(page, `${RISK} [data-slot="ratio-bar-track"]`, 0);
  expect(track.height).toBe(12);

  const select = await measure(page, `${HISTORY} [data-slot="select-trigger"]`, 0);
  expect(select.width).toBe(320);
  expect(select.height).toBe(64);
  const historyRow = await measure(page, `${HISTORY} ${BODY_ROW}`, 0);
  expect(historyRow.height).toBe(76);
  expect(visibleShadow(historyRow.style.boxShadow)).toBe(
    `${await color(page, "var(--danger)")} 6px 0px 0px 0px inset`,
  );
  const stripCell = await measure(page, `${HISTORY} [data-slot="hit-strip-cell"]`, 0);
  expect(stripCell.width).toBeCloseTo(((166 - 24 - 13 * 2) / 14) * 2, 1);
  expect(stripCell.height).toBe(28);

  const coverageHead = await measure(page, '[data-slot="model-coverage-head"] > span', 0);
  expect(coverageHead.width).toBe(312);
  const stagingDot = await measure(page, '[data-slot="coverage-cell"][data-status="staging"] > span', 0);
  expect(stagingDot.width).toBe(18);
  expect(stagingDot.style.borderTopWidth).toBe("3px");
});

test("다크 Theme에서 플릿 개요의 Color 확인", async ({ page }) => {
  await openFleet(page, 1920, 1080);
  await page.locator('[data-slot="theme-toggle-button"]').click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.waitForTimeout(300);

  const card = await measure(page, KPI);
  expect(card.style.backgroundColor).toBe(await color(page, "#0b1f2e"));
  expect(card.style.borderTopColor).toBe(await color(page, "#264159"));
  const digit = await measure(page, '[data-slot="digit-tile"]');
  expect(digit.style.backgroundColor).toBe(await color(page, "#1b3349"));
  expect(digit.style.color).toBe(await color(page, "#f1f4f8"));

  const headRow = await measure(page, `${RISK} thead [data-slot="table-row"]`);
  expect(headRow.style.backgroundColor).toBe(await color(page, "#142a3d"));
  const selectedRow = await measure(page, `${RISK} ${BODY_ROW}`, 0);
  expect(selectedRow.style.backgroundColor).toBe(await color(page, "#0b2f43"));
  const chip = await measure(page, `${RISK} [data-slot="status-badge-chip"]`, 0);
  expect(chip.style.backgroundColor).toBe(await color(page, "#ec5d62"));
  expect(chip.style.color).toBe(await color(page, "#2a0a0b"));

  const select = await measure(page, `${HISTORY} [data-slot="select-trigger"]`, 0);
  expect(select.style.backgroundColor).toBe(await color(page, "#0b1f2e"));
  expect(select.style.borderTopColor).toBe(await color(page, "#264159"));
  const strongChip = await measure(page, `${HISTORY} [data-slot="model-hit-chip"]`, 0);
  expect(strongChip.style.backgroundColor).toBe(await color(page, "#3b1416"));
  expect(strongChip.style.color).toBe(await color(page, "#ff9ea1"));

  const striped = await measure(page, '[data-slot="coverage-row"]', 1);
  expect(striped.style.backgroundColor).toBe(await color(page, "#0f2335"));
  const production = await measure(page, '[data-slot="coverage-cell"][data-status="production"]', 0);
  expect(production.style.backgroundColor).toBe(await color(page, "#0b2f43"));
});
