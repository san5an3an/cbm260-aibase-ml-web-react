import type { AlarmSeverityTone } from "@/components/atoms/AlarmSeverity";
import type { LegendDotTone } from "@/components/atoms/LegendDot";
import type { StatePillTone } from "@/components/atoms/StatePill";
import type { RuleCellTone } from "@/components/molecules/RuleCell";
import type { AlarmRuleScopeKind, AlarmSeverityKey, AlarmStatusKey } from "@/domain/alarms";

// 심각도 표시의 Color 지정
export const alarmSeverityTones: Record<AlarmSeverityKey, AlarmSeverityTone> = {
  LOW: "low",
  MID: "mid",
  HIGH: "high",
  CRIT: "critical",
};

// 범례 점에 쓰는 심각도별 Color 지정
export const alarmSeverityLegendTones: Record<AlarmSeverityKey, LegendDotTone> = {
  LOW: "borderStrong",
  MID: "caution",
  HIGH: "warningStrong",
  CRIT: "danger",
};

// Chart의 누적 Segment에 쓰는 심각도별 Color 지정
export const alarmSeverityChartColors: Record<AlarmSeverityKey, string> = {
  LOW: "var(--border-strong)",
  MID: "var(--caution)",
  HIGH: "var(--warning-strong)",
  CRIT: "var(--danger)",
};

// Alarm 상태 표시의 Color 지정
export const alarmStatusTones: Record<AlarmStatusKey, StatePillTone> = {
  NEW: "danger",
  ACK: "brand",
  IN_PROGRESS: "caution",
  RESOLVED: "success",
  FALSE_POSITIVE: "muted",
};

// 규칙 Table Cell의 왼쪽 Border에 쓰는 규칙 범위별 Color 지정
export const alarmRuleScopeCellTones: Record<AlarmRuleScopeKind, RuleCellTone> = {
  pair: "own",
  device: "device",
  model: "model",
  global: "global",
};

// 범례 점에 쓰는 규칙 범위별 Color 지정
export const alarmRuleScopeLegendTones: Record<AlarmRuleScopeKind, LegendDotTone> = {
  pair: "caution",
  device: "brandText",
  model: "success",
  global: "borderStrong",
};
