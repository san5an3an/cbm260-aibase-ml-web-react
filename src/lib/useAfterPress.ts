import { useEffect, useRef } from "react";

// 누르는 중에 생긴 일을 그 누름이 끝난 뒤로 미루는 함수 반환, Input에서 나갈 때 생기는 오류 Row가 누르던 Button을 밀어 Click이 빗나가지 않게 할 때 사용
export function useAfterPress(isActive: boolean): (run: () => void) => void {
  // 포인터를 누르고 있는지 보관
  const isPressingRef = useRef(false);

  useEffect(() => {
    if (!isActive) return;
    const press = () => {
      isPressingRef.current = true;
    };
    const release = () => {
      isPressingRef.current = false;
    };
    document.addEventListener("pointerdown", press, true);
    document.addEventListener("pointerup", release, true);
    document.addEventListener("pointercancel", release, true);
    return () => {
      document.removeEventListener("pointerdown", press, true);
      document.removeEventListener("pointerup", release, true);
      document.removeEventListener("pointercancel", release, true);
      isPressingRef.current = false;
    };
  }, [isActive]);

  return (run) => {
    if (!isPressingRef.current) {
      run();
      return;
    }
    // 포인터를 놓은 뒤 해당 Click까지 끝난 다음 차례에 실행
    const finish = () => {
      document.removeEventListener("pointerup", finish, true);
      document.removeEventListener("pointercancel", finish, true);
      window.setTimeout(run, 0);
    };
    document.addEventListener("pointerup", finish, true);
    document.addEventListener("pointercancel", finish, true);
  };
}
