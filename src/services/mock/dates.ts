const DAY_MS = 86_400_000;
// Mock 데이터의 기준일 연도, 기준일이 "오늘"로 보이도록 모든 날짜를 이동
const BASE_YEAR = 2026;
const BASE_MONTH_INDEX = 8;
const BASE_DAY = 23;

function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function shiftDays(): number {
  const base = new Date(BASE_YEAR, BASE_MONTH_INDEX, BASE_DAY);
  return Math.round((startOfToday().getTime() - base.getTime()) / DAY_MS);
}

// 기준일의 "YYYY-MM-DD"를 오늘 기준 날짜로 변환
export function shiftIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return toIsoDate(new Date(year, month - 1, day + shiftDays()));
}

// 오늘보다 며칠 전인 "YYYY-MM-DD" 반환
export function isoDateBeforeToday(daysAgo: number): string {
  return toIsoDate(new Date(startOfToday().getTime() - daysAgo * DAY_MS));
}
