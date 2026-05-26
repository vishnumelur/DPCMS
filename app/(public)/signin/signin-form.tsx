'use client';

import { useState, useTransition, useRef } from 'react';
import { Eye, EyeOff, User, Lock, AlertCircle, ShieldCheck } from 'lucide-react';

type Props = {
  action: (formData: FormData) => Promise<void>;
  callbackUrl: string;
  error?: string;
  copy: {
    username: string;
    password: string;
    submit: string;
    submitPending: string;
    showPassword: string;
    hidePassword: string;
    rememberMe: string;
    forgotPassword: string;
    demoLabel: string;
    demoHint: string;
    errorText: string;
    securedNote: string;
  };
};

export function SignInForm({ action, callbackUrl, error, copy }: Props) {
  const [showPwd, setShowPwd] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function fillDemo() {
    const userInput = document.getElementById('username') as HTMLInputElement | null;
    const passInput = document.getElementById('password') as HTMLInputElement | null;
    setInputValue(userInput, 'dpcmsadmin');
    setInputValue(passInput, 'dpcms@2026');
    userInput?.focus();
  }

  function onSubmit(formData: FormData) {
    startTransition(() => action(formData));
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[12px] border border-[#fde9e7] bg-[#fef3f2] px-3.5 py-3 text-[13px] text-[#b42318]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="min-w-0 break-words">{copy.errorText}</span>
        </div>
      ) : null}

      {/* Username */}
      <div className="space-y-1.5">
        <label
          htmlFor="username"
          className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
        >
          {copy.username}
        </label>
        <div className="relative">
          <User
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
          />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            disabled={isPending}
            placeholder="dpcmsadmin"
            className="h-12 w-full rounded-[12px] border-0 bg-muted/40 pl-10 pr-3 text-[14.5px] outline-none ring-1 ring-transparent transition focus:bg-background focus:ring-primary/40 disabled:opacity-60"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
        >
          {copy.password}
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
          />
          <input
            id="password"
            name="password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            required
            disabled={isPending}
            placeholder="••••••••"
            className="h-12 w-full rounded-[12px] border-0 bg-muted/40 pl-10 pr-11 text-[14.5px] outline-none ring-1 ring-transparent transition focus:bg-background focus:ring-primary/40 disabled:opacity-60"
          />
          <button
            type="button"
            aria-label={showPwd ? copy.hidePassword : copy.showPassword}
            onClick={() => setShowPwd((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition hover:text-foreground"
          >
            {showPwd ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {/* Row: remember me + forgot */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <label className="inline-flex cursor-pointer items-center gap-2 text-muted-foreground">
          <input
            type="checkbox"
            name="remember"
            defaultChecked
            disabled={isPending}
            className="peer h-4 w-4 cursor-pointer appearance-none rounded-[5px] border border-input bg-background checked:border-primary checked:bg-primary"
          />
          <svg
            className="pointer-events-none -ml-6 hidden h-4 w-4 text-primary-foreground peer-checked:block"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3.5 8.2 L6.8 11.4 L12.5 4.8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="select-none">{copy.rememberMe}</span>
        </label>
        <a
          href="#"
          className="text-primary hover:underline"
          onClick={(e) => e.preventDefault()}
        >
          {copy.forgotPassword}
        </a>
      </div>

      {/* Primary CTA */}
      <button
        type="submit"
        disabled={isPending}
        className="relative h-12 w-full rounded-full bg-primary text-[14.5px] font-semibold text-primary-foreground transition-[filter,transform] active:scale-[0.985] hover:brightness-105 disabled:opacity-70"
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            {copy.submitPending}
          </span>
        ) : (
          <span>{copy.submit} →</span>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3" strokeWidth={2} />
        {copy.securedNote}
      </p>

      {/* Demo helper */}
      <div className="hairline-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12px] text-muted-foreground">{copy.demoHint}</span>
          <button
            type="button"
            onClick={fillDemo}
            disabled={isPending}
            className="btn-pill-ghost h-9 px-4 text-[12.5px]"
          >
            {copy.demoLabel} ↩
          </button>
        </div>
      </div>
    </form>
  );
}

function setInputValue(input: HTMLInputElement | null, value: string) {
  if (!input) return;
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
