import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncResource<Data> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: Data };

// 조회 함수, 전달받은 signal이 abort되면 응답을 더 기다리지 않아도 됨(인자를 받지 않는 함수도 그대로 전달 가능)
export type AsyncLoad<Data> = (signal: AbortSignal) => Promise<Data>;

interface AsyncResourceResult<Data> {
  resource: AsyncResource<Data>;
  // 앞에 받은 결과를 표시한 채 새 응답을 기다리는 중인지 여부
  isReloading: boolean;
  reload: () => void;
  // 다시 받는 중인 조회를 취소하고 마지막으로 응답이 끝난 조회로 복원, 조회 함수를 바꿔 호출했다면 그 함수도 이전 것으로 복원
  cancel: () => void;
}

// 조회 한 번을 나타내는 값, 조회 함수와 재조회 횟수를 함께 보관
interface LoadRequest<Data> {
  load: AsyncLoad<Data>;
  reloadCount: number;
}

// 비동기 조회의 진행, 실패, 성공 상태 관리, load가 null이면 조회 보류
export function useAsyncResource<Data>(load: AsyncLoad<Data> | null): AsyncResourceResult<Data> {
  const [resource, setResource] = useState<AsyncResource<Data>>({ status: "loading" });
  const [reloadCount, setReloadCount] = useState(0);
  // 마지막으로 응답이 끝난 조회 보관, 첫 응답 전과 조회를 보류한 동안에는 null 유지
  const [settledRequest, setSettledRequest] = useState<LoadRequest<Data> | null>(null);
  // 진행 중인 조회를 취소하는 AbortController 보관
  const controllerRef = useRef<AbortController | null>(null);
  // 조회를 보류하면 완료된 조회 기록을 지워 같은 함수를 다시 전달해도 새 조회로 판정
  if (load === null && settledRequest !== null) setSettledRequest(null);

  useEffect(() => {
    if (load === null) return;
    // 응답이 끝난 조회로 되돌아왔으면 다시 호출하지 않음
    if (settledRequest?.load === load && settledRequest.reloadCount === reloadCount) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    load(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setResource({ status: "success", data });
        setSettledRequest({ load, reloadCount });
      })
      .catch((error: unknown) => {
        // 취소된 조회의 거부와 늦게 도착한 응답은 화면에 반영하지 않음
        if (controller.signal.aborted) return;
        setResource({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
        setSettledRequest({ load, reloadCount });
      });
    return () => {
      controller.abort();
    };
  }, [load, reloadCount, settledRequest]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  const cancel = useCallback(() => {
    // 첫 조회는 되돌아갈 결과가 없어 취소하지 않음
    if (settledRequest === null) return;
    controllerRef.current?.abort();
    setReloadCount(settledRequest.reloadCount);
  }, [settledRequest]);

  // 앞에 받은 결과가 있고 응답이 끝난 조회가 현재 조회와 다르면 기다리는 중으로 판정
  const isReloading =
    load !== null &&
    resource.status !== "loading" &&
    (settledRequest === null ||
      settledRequest.load !== load ||
      settledRequest.reloadCount !== reloadCount);

  return { resource, isReloading, reload, cancel };
}
