"use client";

import { useId, useState, type Ref } from "react";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { FieldMessage } from "@/components/atoms/FieldMessage";
import { AlertBanner } from "@/components/molecules/AlertBanner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

// Login 화면의 고정 문구
export interface LoginFormTexts {
  title: string;
  description: string;
  idLabel: string;
  passwordLabel: string;
  showPassword: string;
  hidePassword: string;
  submit: string;
  idHangulBlocked: string;
}

// 아이디 Input, 다른 Input(TextInput)과 같은 Border, Focus, 오류 모양에 Height와 Font만 키움
const ID_INPUT_CLASS_NAME =
  "h-11 rounded-sm border-border bg-card px-3.5 py-0 text-base text-foreground transition-[border-color,box-shadow] timing-micro md:text-base dark:bg-card focus-visible:border-brand-line4 focus-visible:shadow-[0_0_0_0.0625rem_var(--brand-line4),0_0_0_0.25rem_var(--brand-line4-subtle)] focus-visible:ring-0 aria-invalid:border-[0.125rem] aria-invalid:border-destructive aria-invalid:ring-0 aria-invalid:focus-visible:border aria-invalid:focus-visible:border-brand-line4 dark:aria-invalid:border-destructive";

// 비밀번호 Input의 바깥 Layout, 보기 Button이 Input 안 오른쪽에 붙음
const PASSWORD_GROUP_CLASS_NAME =
  "h-11 rounded-sm border-border bg-card transition-[border-color,box-shadow] timing-micro dark:bg-card has-[[data-slot=input-group-control]:focus-visible]:border-brand-line4 has-[[data-slot=input-group-control]:focus-visible]:shadow-[0_0_0_0.0625rem_var(--brand-line4),0_0_0_0.25rem_var(--brand-line4-subtle)] has-[[data-slot=input-group-control]:focus-visible]:ring-0 has-[[data-slot][aria-invalid=true]]:border-[0.125rem] has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-0 has-[[data-slot][aria-invalid=true]]:has-[[data-slot=input-group-control]:focus-visible]:border has-[[data-slot][aria-invalid=true]]:has-[[data-slot=input-group-control]:focus-visible]:border-brand-line4";

interface LoginFormProps {
  texts: LoginFormTexts;
  id: string;
  password: string;
  onIdChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  // Input 아래에 표시할 오류 문구, 없으면 null
  idError: string | null;
  passwordError: string | null;
  // Login Request가 실패했을 때 Button 위에 표시할 문구, 없으면 null
  failureText: string | null;
  // Request를 기다리는 동안 Button 비활성화 표시
  isSubmitting: boolean;
  onSubmit: () => void;
  idInputRef: Ref<HTMLInputElement>;
  passwordInputRef: Ref<HTMLInputElement>;
}

// 한글 완성형, 자모, 옛 자모, 아이디 Input에서 받지 않는 문자
const HANGUL_PATTERN = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF]/g;

// 아이디와 비밀번호 Input, 실패 문구, Login Button이 있는 Login Form 표시, Enter로 전송
export function LoginForm({
  texts,
  id,
  password,
  onIdChange,
  onPasswordChange,
  idError,
  passwordError,
  failureText,
  isSubmitting,
  onSubmit,
  idInputRef,
  passwordInputRef,
}: LoginFormProps) {
  const baseId = useId();
  const idInputId = `${baseId}-id`;
  const passwordInputId = `${baseId}-password`;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  // 방금 입력한 문자에서 한글을 뺐는지 여부, 한글 없이 다시 입력하면 안내를 거둠
  const [hasBlockedHangul, setHasBlockedHangul] = useState(false);
  const idHintId = `${idInputId}-hint`;

  return (
    <div data-slot="login-form-panel" className="flex flex-col">
      <h2 data-slot="login-title" className="text-[1.375rem] leading-7 font-bold">
        {texts.title}
      </h2>
      <p data-slot="login-description" className="mt-2 text-sm leading-5 text-muted-foreground">
        {texts.description}
      </p>
      <form
        data-slot="login-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="mt-8 flex flex-col gap-5"
      >
        <Field data-slot="login-id-field" className="gap-2">
          <FieldLabel htmlFor={idInputId} className="text-sm leading-5 font-semibold">
            {texts.idLabel}
          </FieldLabel>
          <div className="flex flex-col">
            <Input
              ref={idInputRef}
              id={idInputId}
              data-slot="login-id-input"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-required
              aria-invalid={idError !== null || undefined}
              aria-describedby={
                idError !== null ? `${idInputId}-error` : hasBlockedHangul ? idHintId : undefined
              }
              value={id}
              onChange={(event) => {
                const typed = event.target.value;
                const kept = typed.replace(HANGUL_PATTERN, "");
                setHasBlockedHangul(kept !== typed);
                onIdChange(kept);
              }}
              className={ID_INPUT_CLASS_NAME}
            />
            {idError !== null ? (
              <FieldMessage id={`${idInputId}-error`} message={idError} />
            ) : hasBlockedHangul ? (
              <FieldMessage id={idHintId} tone="help" message={texts.idHangulBlocked} />
            ) : null}
          </div>
        </Field>
        <Field data-slot="login-password-field" className="gap-2">
          <FieldLabel htmlFor={passwordInputId} className="text-sm leading-5 font-semibold">
            {texts.passwordLabel}
          </FieldLabel>
          <div className="flex flex-col">
            <InputGroup data-slot="login-password-group" className={PASSWORD_GROUP_CLASS_NAME}>
              <InputGroupInput
                ref={passwordInputRef}
                id={passwordInputId}
                data-slot="login-password-input"
                name="password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="current-password"
                autoCapitalize="none"
                spellCheck={false}
                aria-required
                aria-invalid={passwordError !== null || undefined}
                aria-describedby={passwordError !== null ? `${passwordInputId}-error` : undefined}
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                className="h-full py-0 pl-3.5 text-base text-foreground md:text-base"
              />
              {/* 라이브러리 addon이 Button에 준 음수 바깥 Margin을 지워 Button 오른쪽 간격을 위아래 간격과 같게 맞춤 */}
              <InputGroupAddon align="inline-end" className="py-0 pr-[0.3125rem] has-[>button]:mr-0">
                <InputGroupButton
                  data-slot="login-password-toggle"
                  size="icon-sm"
                  aria-label={isPasswordVisible ? texts.hidePassword : texts.showPassword}
                  aria-controls={passwordInputId}
                  title={isPasswordVisible ? texts.hidePassword : texts.showPassword}
                  onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
                  className="size-8 rounded-sm text-muted-foreground timing-micro hover:text-foreground [&_svg:not([class*='size-'])]:size-5"
                >
                  {isPasswordVisible ? (
                    <VisibilityOffRoundedIcon aria-hidden />
                  ) : (
                    <VisibilityRoundedIcon aria-hidden />
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {passwordError !== null ? (
              <FieldMessage id={`${passwordInputId}-error`} message={passwordError} />
            ) : null}
          </div>
        </Field>
        {failureText !== null ? (
          <AlertBanner
            tone="danger"
            layout="paragraph"
            icon={<WarningAmberRoundedIcon aria-hidden />}
            animated
          >
            {failureText}
          </AlertBanner>
        ) : null}
        <Button
          type="submit"
          data-slot="login-submit"
          disabled={isSubmitting}
          // 비활성화된 동안에도 방금 Click한 Button이 Focus를 잃지 않게 유지
          focusableWhenDisabled
          className="mt-1 h-11 w-full rounded-sm border-0 bg-primary text-base font-semibold text-primary-foreground timing-micro hover:bg-primary-hover aria-disabled:pointer-events-none aria-disabled:opacity-70"
        >
          {texts.submit}
        </Button>
      </form>
    </div>
  );
}
