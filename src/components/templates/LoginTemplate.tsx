import type { ReactNode } from "react";

interface LoginTemplateProps {
  // 화면 오른쪽 위에 놓을 요소(시계, Theme 전환)
  topBarEnd: ReactNode;
  // Card 왼쪽에 표시할 기관과 시스템 표시
  brand: ReactNode;
  // Card 오른쪽의 Login 양식
  form: ReactNode;
}

// 공통 Layout 없이 화면 가운데에 Login Card, 오른쪽 위에 시계와 Theme 전환을 배치, Card는 짧게 떠오르며 나타나고 움직임 줄이기 설정에서는 Fade만 적용
export function LoginTemplate({ topBarEnd, brand, form }: LoginTemplateProps) {
  return (
    <div data-slot="login-screen" className="flex min-h-dvh flex-col bg-background text-foreground">
      <header
        data-slot="login-top-bar"
        className="flex h-[3.625rem] flex-none items-center justify-end gap-4 px-5"
      >
        {topBarEnd}
      </header>
      <main className="flex flex-1 items-center justify-center px-8 pb-[3.625rem]">
        <section
          data-slot="login-card"
          className="grid min-h-[34rem] w-[60rem] grid-cols-[26rem_minmax(0,1fr)] overflow-hidden rounded-[1rem] border border-border bg-card shadow-[0_1.5rem_4rem_rgba(11,31,46,0.12)] duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:slide-in-from-bottom-0 dark:shadow-[0_1.5rem_4rem_rgba(0,0,0,0.32)]"
        >
          {brand}
          <div data-slot="login-form-area" className="flex flex-col justify-center px-16 py-14">
            {form}
          </div>
        </section>
      </main>
    </div>
  );
}
