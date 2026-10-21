export type LevelTextTone = "danger" | "warning" | "caution" | "normal";

// 등급별 숫자 Text Color 정의
export const levelTextClassNames: Record<LevelTextTone, string> = {
  danger: "text-destructive",
  warning: "text-on-warning-subtle",
  caution: "text-on-caution-subtle",
  normal: "text-on-success-subtle",
};
