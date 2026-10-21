import type { StatePillTone } from "@/components/atoms/StatePill";
import type { MeasureEffectLevel, UnactionedLevelKey, YesNoCode } from "@/domain/measures";

// 조치 여부 표시의 Color 지정
export const measureActionTones: Record<YesNoCode, StatePillTone> = {
  Y: "success",
  N: "danger",
};

// 검수 여부 표시의 Color 지정
export const measureInspectionTones: Record<YesNoCode, StatePillTone> = {
  Y: "success",
  N: "caution",
};

// 미조치 건수의 Text Color 지정
export const unactionedLevelClassNames: Record<UnactionedLevelKey, string> = {
  high: "text-destructive",
  normal: "text-foreground",
};

// 조치 효과 판정별 변화 Text Color 지정, 새로 생긴 이상은 나빠짐과 같은 Color, 비교할 자료가 없으면 본문 Color
export const measureEffectLevelClassNames: Record<
  MeasureEffectLevel | "appeared" | "noData",
  string
> = {
  improved: "text-success",
  worsened: "text-destructive",
  steady: "text-foreground",
  appeared: "text-destructive",
  noData: "text-foreground",
};
