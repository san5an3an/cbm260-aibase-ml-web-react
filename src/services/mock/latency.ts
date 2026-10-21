// Mock이 응답을 지연하는 시간(ms), 실제 Server의 응답 시간을 알기 전까지 화면의 Loading 상태를 보여 주려고 넣음
const ENTRY_DELAY_MS = 1000;
const SEARCH_DELAY_MS = 1500;

// 첫 진입과 그 밖의 조회의 지연 시간, 취소 신호 무시 여부. 무시하면 늦게 온 Response를 화면이 버리는지 확인할 수 있음
interface MockLatency {
  entryMs: number;
  searchMs: number;
  ignoreAbort: boolean;
  // 지연 뒤 실패로 응답할 조회 이름, 화면이 실패 상태에 갇히지 않는지 확인할 때 사용
  failNames: readonly string[];
}

// Test가 window에 미리 넣는 설정을 담는 전역 객체 정의
interface MockLatencyHost {
  cbmMockLatency?: Partial<MockLatency>;
}

const NO_LATENCY: MockLatency = { entryMs: 0, searchMs: 0, ignoreAbort: false, failNames: [] };

// 현재 적용할 지연 설정 반환, window에 넣은 설정이 우선이고 Browser 밖이거나 NEXT_PUBLIC_MOCK_LATENCY=off로 Build하면 지연하지 않음
function readLatency(): MockLatency {
  const override = (globalThis as MockLatencyHost).cbmMockLatency;
  if (override !== undefined) return { ...NO_LATENCY, ...override };
  if (typeof window === "undefined" || process.env.NEXT_PUBLIC_MOCK_LATENCY === "off") {
    return NO_LATENCY;
  }
  return { entryMs: ENTRY_DELAY_MS, searchMs: SEARCH_DELAY_MS, ignoreAbort: false, failNames: [] };
}

// 다음 한 번을 첫 진입으로 처리할 조회 이름, 화면 진입 시 한 번 호출하는 조회가 채움
const pendingEntryNames = new Set<string>();

// 화면 진입으로 표시, 넘긴 이름의 다음 조회 한 번은 첫 진입 지연 시간만 적용
export function markScreenEntry(names: readonly string[]): void {
  names.forEach((name) => pendingEntryNames.add(name));
}

// 취소된 신호의 거부 값 반환, 취소 시 이유를 주지 않았으면 AbortError
function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
}

// 만든 값으로 즉시 응답, 이미 취소된 신호면 AbortError로 거부
export function respondNow<T>(signal: AbortSignal | undefined, build: () => T): Promise<T> {
  if (signal?.aborted) return Promise.reject(abortReason(signal));
  try {
    return Promise.resolve(build());
  } catch (error) {
    return Promise.reject(error);
  }
}

// 지정한 시간만큼 지연한 뒤 만든 값으로 응답, 실패 문구를 넘기면 값 대신 그 문구의 오류로 거부. 신호가 취소되면 대기를 멈추고 AbortError로 거부
function respondAfter<T>(
  delayMs: number,
  failureText: string | null,
  signal: AbortSignal | undefined,
  buildValue: () => T,
): Promise<T> {
  const build =
    failureText === null
      ? buildValue
      : (): T => {
          throw new Error(failureText);
        };
  if (delayMs <= 0) return respondNow(signal, build);
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    const stopWaiting = () => {
      clearTimeout(timer);
      if (signal !== undefined) reject(abortReason(signal));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", stopWaiting);
      try {
        resolve(build());
      } catch (error) {
        reject(error);
      }
    }, delayMs);
    signal?.addEventListener("abort", stopWaiting, { once: true });
  });
}

// 이름의 조회를 첫 진입이나 그 밖의 지연 시간만큼 늦춘 뒤 만든 값으로 응답, 신호가 취소되면 대기를 멈추고 AbortError로 거부
export function respondLater<T>(
  name: string,
  signal: AbortSignal | undefined,
  buildValue: () => T,
): Promise<T> {
  const latency = readLatency();
  const delayMs = pendingEntryNames.delete(name) ? latency.entryMs : latency.searchMs;
  const failureText = latency.failNames.includes(name) ? `더미 조회 실패: ${name}` : null;
  return respondAfter(delayMs, failureText, latency.ignoreAbort ? undefined : signal, buildValue);
}

// Mock이 받은 실행 Request 1건, 실행 함수 이름과 대상 번호
interface MockActionRequest {
  name: string;
  target: string;
}

// 즉시 응답하는 Mock 함수(이름 붙은 조회와 실행)를 Test가 지연하거나 실패시킬 때 쓰는 설정, 넣지 않으면 개발 Server에서도 즉시 응답
interface MockActions {
  delayMs: number;
  // 지연 후 응답하지 않고 실패로 끝낼 함수 이름
  failNames: readonly string[];
  // 받은 실행 Request, 받은 순서대로 기록하며 실패로 끝낸 Request 포함, 조회는 기록하지 않음, Mock이 채움
  requested: MockActionRequest[];
}

// Test가 window에 넣는 즉시 응답 함수 설정을 담는 전역 객체 정의, 호출할 때마다 읽으므로 Test 도중 바꿔도 됨. 조회 지연 설정과 따로 둬 서로의 기본값을 덮지 않음
interface MockActionsHost {
  cbmMockActions?: Partial<MockActions>;
}

// 현재 즉시 응답 함수 설정 반환, 없으면 빈 설정
function readActions(): Partial<MockActions> {
  return (globalThis as MockActionsHost).cbmMockActions ?? {};
}

// 받은 실행 Request를 window의 설정에 기록하고 현재 설정 반환, 없으면 생성
function recordActionRequest(name: string, target: string): Partial<MockActions> {
  const host = globalThis as MockActionsHost;
  const actions = (host.cbmMockActions ??= {});
  (actions.requested ??= []).push({ name, target });
  return actions;
}

// 이름 붙은 즉시 응답 조회의 응답, window에 넣은 시간만큼만 지연하고 실패로 지정한 이름이면 거부. 받은 Request에는 기록하지 않음
export function respondInstantly<T>(
  name: string,
  signal: AbortSignal | undefined,
  buildValue: () => T,
): Promise<T> {
  const { delayMs = 0, failNames = [] } = readActions();
  const failureText = failNames.includes(name) ? `더미 조회 실패: ${name}` : null;
  return respondAfter(delayMs, failureText, signal, buildValue);
}

// 이름의 실행 함수 Request를 기록하고 window에 넣은 시간만큼 지연한 뒤 실행, 실패로 지정한 이름이면 상태를 바꾸지 않고 거부. 지연해도 반드시 끝남
export function runActionLater<T>(name: string, target: string, run: () => T): Promise<T> {
  const { delayMs = 0, failNames = [] } = recordActionRequest(name, target);
  const failureText = failNames.includes(name) ? `더미 실행 실패: ${name}` : null;
  return respondAfter(delayMs, failureText, undefined, run);
}
