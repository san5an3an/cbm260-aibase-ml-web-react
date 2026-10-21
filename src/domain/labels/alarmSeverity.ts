import type { AlarmSeverityKey } from "@/domain/alarms";

interface AlarmSeverityLabel {
  label: string;
  shortLabel: string;
}

// 심각도의 화면 표기 정의, 낮은 것부터 나열한 순서를 Sort, 누적, 범례에 그대로 사용
export const alarmSeverityLabels: Record<AlarmSeverityKey, AlarmSeverityLabel> = {
  LOW: { label: "LOW", shortLabel: "L" },
  MID: { label: "MID", shortLabel: "M" },
  HIGH: { label: "HIGH", shortLabel: "H" },
  CRIT: { label: "CRIT", shortLabel: "C" },
};

// 심각도의 순서 목록, 화면 표기에 나열한 순서를 그대로 사용
export const alarmSeverityKeys: readonly AlarmSeverityKey[] = Object.keys(
  alarmSeverityLabels,
) as AlarmSeverityKey[];
