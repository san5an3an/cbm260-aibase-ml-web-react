import { expect, test } from "@playwright/test";

type Theme = "light" | "dark";

const designTokens: Record<string, Record<Theme, string>> = {
  "--brand-line4": { light: "#00a4e3", dark: "#00a4e3" },
  "--brand-line4-subtle": { light: "#e5f6fd", dark: "#0b2f43" },
  "--brand-line4-muted": { light: "#bfe9fa", dark: "#0e4461" },
  "--brand-on-line4-subtle": { light: "#00587d", dark: "#8fd8f5" },
  "--brand-line4-text": { light: "#0072a3", dark: "#4fc2ee" },
  "--primary": { light: "#007cb3", dark: "#007cb3" },
  "--primary-hover": { light: "#0072a3", dark: "#0093cc" },
  "--bg": { light: "#f1f4f8", dark: "#07151f" },
  "--card": { light: "#fff", dark: "#0b1f2e" },
  "--surface-low": { light: "#f7f9fb", dark: "#0f2335" },
  "--muted": { light: "#eaeff4", dark: "#142a3d" },
  "--muted-strong": { light: "#dce3ea", dark: "#1b3349" },
  "--fg": { light: "#0b1f2e", dark: "#f1f4f8" },
  "--muted-fg": { light: "#506579", dark: "#9fb3c6" },
  "--border": { light: "#dce3ea", dark: "#264159" },
  "--border-strong": { light: "#8b9aab", dark: "#6a7d90" },
  "--disabled": { light: "#b6c2ce", dark: "#3a4f63" },
  "--icon": { light: "#484a4b", dark: "#9fb3c6" },
  "--danger": { light: "#d93036", dark: "#ec5d62" },
  "--danger-fg": { light: "#fff", dark: "#2a0a0b" },
  "--danger-subtle": { light: "#fdecec", dark: "#3b1416" },
  "--on-danger-subtle": { light: "#b42328", dark: "#ff9ea1" },
  "--warning": { light: "#f76b15", dark: "#ff8a3d" },
  "--warning-strong": { light: "#c24e00", dark: "#ff8a3d" },
  "--warning-subtle": { light: "#ffeddf", dark: "#3a1f0c" },
  "--on-warning-subtle": { light: "#a33a00", dark: "#ffb27a" },
  "--caution": { light: "#ffc53d", dark: "#ffc53d" },
  "--caution-subtle": { light: "#fff6d6", dark: "#33290a" },
  "--on-caution-subtle": { light: "#8c6a00", dark: "#ffd567" },
  "--success": { light: "#30a46c", dark: "#4cc38a" },
  "--success-subtle": { light: "#ddf3e7", dark: "#0f2e20" },
  "--success-strong": { light: "#218358", dark: "#4cc38a" },
  "--success-fg": { light: "#fff", dark: "#06241a" },
  "--warning-fg": { light: "#fff", dark: "#2a1405" },
  "--caution-fg": { light: "#3d2e00", dark: "#3d2e00" },
  "--on-primary": { light: "#fff", dark: "#fff" },
  "--chart-1": { light: "#00a4e3", dark: "#0098d6" },
  "--chart-2": { light: "#7b61ff", dark: "#8c6cff" },
  "--chart-grid": { light: "#eaeff4", dark: "#142a3d" },
  "--chart-baseline": { light: "#dce3ea", dark: "#264159" },
  "--on-success-subtle": { light: "#1a6b47", dark: "#6fd7a3" },
  "--scrim": { light: "rgba(7,21,31,.88)", dark: "rgba(2,8,13,.72)" },
  "--dialog": { light: "#f1f4f8", dark: "#142a3d" },
  "--shadow": { light: "0 1px 2px rgba(11,31,46,.06)", dark: "none" },
  "--rail-bg": { light: "#e3e9ef", dark: "#0b1f2e" },
  "--rail-border": { light: "#c5c8c8", dark: "#264159" },
  "--rail-active": { light: "#0052a4", dark: "#007cb3" },
  "--rail-power": { light: "#e02033", dark: "#d93036" },
  "--rail-hover": { light: "rgba(11,31,46,.06)", dark: "rgba(255,255,255,.06)" },
};

const shadcnVariables: Record<string, string> = {
  "--background": "--bg",
  "--foreground": "--fg",
  "--card-foreground": "--fg",
  "--popover": "--card",
  "--popover-foreground": "--fg",
  "--primary-foreground": "--on-primary",
  "--secondary": "--brand-line4-subtle",
  "--secondary-foreground": "--brand-on-line4-subtle",
  "--muted-foreground": "--muted-fg",
  "--accent": "--brand-line4-subtle",
  "--accent-foreground": "--fg",
  "--destructive": "--danger",
  "--input": "--border",
  "--ring": "--brand-line4",
};

const themes: Theme[] = ["light", "dark"];

for (const theme of themes) {
  test(`${theme} Theme의 Token 값 확인`, async ({ page }) => {
    await page.goto("/dashboard/fleet");

    const result = await page.evaluate(
      ({ designTokens, shadcnVariables, theme }) => {
        document.documentElement.classList.toggle("dark", theme === "dark");

        const actualProbe = document.createElement("div");
        const expectedProbe = document.createElement("div");
        document.body.append(actualProbe, expectedProbe);

        const compute = (element: HTMLElement, property: "backgroundColor" | "boxShadow", value: string) => {
          element.style[property] = "";
          element.style[property] = value;
          return getComputedStyle(element)[property];
        };

        const mismatches: { name: string; actual: string; expected: string }[] = [];
        let compared = 0;

        for (const [name, values] of Object.entries(designTokens)) {
          const property = name === "--shadow" ? "boxShadow" : "backgroundColor";
          const actual = compute(actualProbe, property, `var(${name})`);
          const expected = compute(expectedProbe, property, values[theme]);
          compared += 1;
          if (actual !== expected) mismatches.push({ name, actual, expected });
        }

        for (const [name, tokenName] of Object.entries(shadcnVariables)) {
          const actual = compute(actualProbe, "backgroundColor", `var(${name})`);
          const expected = compute(expectedProbe, "backgroundColor", designTokens[tokenName][theme]);
          compared += 1;
          if (actual !== expected) mismatches.push({ name, actual, expected });
        }

        return { compared, mismatches };
      },
      { designTokens, shadcnVariables, theme },
    );

    expect(result.compared).toBe(
      Object.keys(designTokens).length + Object.keys(shadcnVariables).length,
    );
    expect(result.mismatches).toEqual([]);
  });
}

test("본문 Font 확인", async ({ page }) => {
  await page.goto("/dashboard/fleet");

  const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);

  expect(fontFamily).toContain("Roboto");
  expect(fontFamily).toContain("Noto Sans KR");
  expect(fontFamily.indexOf("Roboto")).toBeLessThan(fontFamily.indexOf("Noto Sans KR"));
});
