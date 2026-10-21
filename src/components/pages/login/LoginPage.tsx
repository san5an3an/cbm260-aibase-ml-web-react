"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ThemeToggleButton } from "@/components/atoms/ThemeToggleButton";
import { ClockChip } from "@/components/molecules/ClockChip";
import { LoginBrandPanel } from "@/components/organisms/LoginBrandPanel";
import { LoginForm } from "@/components/organisms/LoginForm";
import { loginTexts } from "@/components/organisms/loginTexts";
import { LoginTemplate } from "@/components/templates/LoginTemplate";
import { pathAfterLogin } from "@/config/navigation";
import { loginTrainConfig, systemConfig } from "@/config/system";
import { formatClock } from "@/lib/formatTime";
import { saveLoginAccount } from "@/lib/loginAccount";
import { useLoginTrainNumbers } from "@/lib/loginTrainNumbers";
import { useCurrentSecond } from "@/lib/useCurrentSecond";
import { useIsClient } from "@/lib/useIsClient";
import { useLoginAccountGuard } from "@/lib/useLoginAccountGuard";
import { login } from "@/services/auth";

// Login 후 이동할 경로 반환, 주소의 next가 같은 사이트 경로면 그 경로, 아니거나 Login 화면이면 첫 화면
function nextPathAfterLogin(): string {
  const { origin, search } = window.location;
  return pathAfterLogin(new URLSearchParams(search).get("next"), origin);
}

// Login 화면의 연결, Input 확인, Login Request 전송, 성공하면 보던 화면으로 이동
export function LoginPage() {
  const router = useRouter();
  const isClient = useIsClient();
  const { resolvedTheme, setTheme } = useTheme();
  const currentSecond = useCurrentSecond();
  const idInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [idError, setIdError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [failureText, setFailureText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDark = isClient && resolvedTheme === "dark";
  // 화면에 들어올 때마다 바뀌는 열차 번호(이스터에그), 정해지기 전에는 빈 값
  const trainNumbers = useLoginTrainNumbers(loginTrainConfig);
  // 이미 Login한 채 Login 화면이 표시되면(뒤로가기의 bfcache 등 proxy를 거치지 않은 이동) Login 후 이동할 경로로 이동
  useLoginAccountGuard(false, nextPathAfterLogin, "login");

  // 화면을 열면 아이디 Input에 Focus
  useEffect(() => {
    idInputRef.current?.focus();
  }, []);

  // 화면을 떠나면(Next가 이전 화면을 숨겨 두는 경우 포함) Input, 오류, Request 중 상태를 비움, 비밀번호를 숨은 화면에 남기지 않음
  useLayoutEffect(
    () => () => {
      setId("");
      setPassword("");
      setIdError(null);
      setPasswordError(null);
      setFailureText(null);
      setIsSubmitting(false);
    },
    [],
  );

  // 빈 Input을 Input 아래에 알리고 첫 빈 Input에 Focus, 다 채워졌으면 Login Request 전송, 실패하면 입력을 그대로 두고 실패 문구 표시
  const submit = async () => {
    if (isSubmitting) return;
    const credentials = { id: id.trim(), password };
    const nextIdError = credentials.id === "" ? loginTexts.idRequired : null;
    const nextPasswordError = credentials.password === "" ? loginTexts.passwordRequired : null;
    setIdError(nextIdError);
    setPasswordError(nextPasswordError);
    setFailureText(null);
    if (nextIdError !== null) {
      idInputRef.current?.focus();
      return;
    }
    if (nextPasswordError !== null) {
      passwordInputRef.current?.focus();
      return;
    }
    setIsSubmitting(true);
    try {
      await login(credentials);
    } catch {
      setFailureText(loginTexts.failed);
      setIsSubmitting(false);
      return;
    }
    // Login한 아이디를 저장해 새Logo침과 뒤로가기에도 Login 화면으로 돌아가지 않게 함, 화면을 이동하는 동안에도 Button 비활성화 유지
    saveLoginAccount(credentials.id);
    router.replace(nextPathAfterLogin());
  };

  return (
    <LoginTemplate
      topBarEnd={
        <>
          <ClockChip text={currentSecond === null ? "" : formatClock(new Date(currentSecond * 1000))} />
          <ThemeToggleButton
            isDark={isDark}
            label={loginTexts.themeLabel}
            onToggle={() => setTheme(isDark ? "light" : "dark")}
          />
        </>
      }
      brand={
        <LoginBrandPanel
          operatorName={systemConfig.operatorName}
          eyebrow={loginTexts.eyebrow}
          systemName={systemConfig.name}
          trainNumber={trainNumbers?.trainNumber ?? ""}
          formation={trainNumbers?.formation ?? ""}
        />
      }
      form={
        <LoginForm
          texts={loginTexts}
          id={id}
          password={password}
          onIdChange={(value) => {
            setId(value);
            setIdError(null);
          }}
          onPasswordChange={(value) => {
            setPassword(value);
            setPasswordError(null);
          }}
          idError={idError}
          passwordError={passwordError}
          failureText={failureText}
          isSubmitting={isSubmitting}
          onSubmit={() => void submit()}
          idInputRef={idInputRef}
          passwordInputRef={passwordInputRef}
        />
      }
    />
  );
}
