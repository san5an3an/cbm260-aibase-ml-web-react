// Pagination에서 번호를 건너뛴 위치 표시
export const PAGE_GAP = "gap";

export type PageItem = number | typeof PAGE_GAP;

// Page 수가 이 값 이하이면 번호를 전부 나열
const FULL_LIST_MAX_PAGES = 7;
// 줄인 목록의 처음이나 끝에 이어서 놓는 번호 수, 가운데 모양(처음, 현재 Page, 끝)과 항목 수가 같아지는 3으로 고정
const EDGE_RUN_LENGTH = 3;

// 처음 번호부터 끝 번호까지 차례로 나열
function listRange(first: number, last: number): number[] {
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first + index);
}

// Pagination에 표시할 번호와 건너뛴 위치의 순서 계산, 줄인 목록은 어느 위치에서든 항목 5개 유지
export function listPageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= FULL_LIST_MAX_PAGES) {
    return listRange(1, pageCount);
  }
  if (page <= EDGE_RUN_LENGTH) {
    return [...listRange(1, EDGE_RUN_LENGTH), PAGE_GAP, pageCount];
  }
  if (page > pageCount - EDGE_RUN_LENGTH) {
    return [1, PAGE_GAP, ...listRange(pageCount - EDGE_RUN_LENGTH + 1, pageCount)];
  }
  return [1, PAGE_GAP, page, PAGE_GAP, pageCount];
}
