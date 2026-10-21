import { useState } from "react";

// 실패 알림 문구의 형식 정의, 거부 사유를 담을 때는 사유를 받아 문구를 만드는 함수 사용
type FailureText = string | ((error: unknown) => string);

interface RequestGuard {
  // 실행 함수의 응답을 기다리는 중인지 여부
  isRequesting: boolean;
  // 실행 함수를 호출하는 동안 요청 중으로 두고 실패하면 실패 문구를 전달해 알림, 성공 여부 반환
  request: (action: () => Promise<unknown>, failureText: FailureText) => Promise<boolean>;
  // 요청 중에는 전달받은 동작을 실행하지 않는 함수 반환, Modal의 닫기 Button, 취소, Esc, 바깥 Click과 Modal 안의 삭제에 전달
  unlessRequesting: (action: () => void) => () => void;
}

// 실행 함수의 요청 중 상태와 그동안 막을 동작 관리, 실패 알림은 호출자가 전달한 함수로 표시
export function useRequestGuard(onFailure: (failureText: string) => void): RequestGuard {
  const [isRequesting, setIsRequesting] = useState(false);

  const request = async (action: () => Promise<unknown>, failureText: FailureText) => {
    setIsRequesting(true);
    try {
      await action();
      return true;
    } catch (error) {
      onFailure(typeof failureText === "string" ? failureText : failureText(error));
      return false;
    } finally {
      setIsRequesting(false);
    }
  };

  const unlessRequesting = (action: () => void) => () => {
    if (!isRequesting) action();
  };

  return { isRequesting, request, unlessRequesting };
}
