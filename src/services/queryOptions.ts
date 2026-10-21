// 조회 함수가 마지막 인자로 받는 Option, signal을 fetch에 그대로 넘기면 화면이 조회를 취소할 수 있음
export interface QueryOptions {
  // 화면이 응답을 더 기다리지 않을 때 취소를 알리는 신호
  signal?: AbortSignal;
}
