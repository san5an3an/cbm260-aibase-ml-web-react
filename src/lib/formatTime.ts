const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

// 날짜와 시각을 "YYYY-MM-DD (요일) HH:MM:SS"로 변환
export function formatClock(date: Date): string {
  const day = `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;
  const time = `${padTwo(date.getHours())}:${padTwo(date.getMinutes())}:${padTwo(date.getSeconds())}`;
  return `${day} (${WEEKDAYS[date.getDay()]}) ${time}`;
}

// 남은 초를 "MM:SS"로 변환
export function formatCountdown(totalSeconds: number): string {
  return `${padTwo(Math.floor(totalSeconds / 60))}:${padTwo(totalSeconds % 60)}`;
}

// 날짜와 시각을 "YYYY-MM-DDTHH:mm:ss"로 변환, 시간대를 바꾸지 않고 사용자 컴퓨터의 시각 사용
export function formatLocalIsoDateTime(date: Date): string {
  const day = `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;
  const time = `${padTwo(date.getHours())}:${padTwo(date.getMinutes())}:${padTwo(date.getSeconds())}`;
  return `${day}T${time}`;
}

// "YYYY-MM-DDTHH:mm:ss"에서 날짜 "YYYY-MM-DD" 추출
export function formatIsoDate(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

// "YYYY-MM-DD"로 시작하는 값에서 "MM-DD" 추출
export function formatIsoMonthDay(isoDate: string): string {
  return isoDate.slice(5, 10);
}

// "YYYY-MM-DDTHH:mm:ss"에서 시각 "HH:mm" 추출
export function formatIsoHourMinute(isoDateTime: string): string {
  return isoDateTime.slice(11, 16);
}

// 하루 안의 시각 "HH:mm:ss"에서 "HH:mm" 추출
export function formatTimeOfDayHourMinute(timeOfDay: string): string {
  return timeOfDay.slice(0, 5);
}

// "YYYY-MM-DDTHH:mm:ss"에서 시각 "HH:mm:ss" 추출
export function formatIsoTime(isoDateTime: string): string {
  return isoDateTime.slice(11, 19);
}

// "YYYY-MM-DDTHH:mm:ss"를 "YYYY-MM-DD HH:mm:ss"로 변환
export function formatIsoDateTime(isoDateTime: string): string {
  return `${isoDateTime.slice(0, 10)} ${isoDateTime.slice(11, 19)}`;
}
