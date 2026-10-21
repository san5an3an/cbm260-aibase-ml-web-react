// 시작일과 종료일의 쌍, 날짜는 "YYYY-MM-DD", 정하지 않은 끝은 null
export interface DateRange {
  from: string | null;
  to: string | null;
}
