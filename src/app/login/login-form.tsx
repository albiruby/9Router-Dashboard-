"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, Eye, EyeSlash, Flask, LockKey } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

interface LoginResponse {
  ok?: boolean;
  error?: string;
  retryAfter?: number;
}

export function LoginForm() {
  const router = useRouter();
  const passwordId = useId();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [retryIn, setRetryIn] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { mock?: boolean }) => {
        if (active) setMock(Boolean(data?.mock));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (retryIn <= 0) return;
    const timer = setTimeout(() => setRetryIn((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [retryIn]);

  async function login(payload: { password?: string; demo?: boolean }) {
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as LoginResponse | null;
    if (!response.ok) {
      if (typeof data?.retryAfter === "number") {
        setRetryIn(Math.max(0, Math.ceil(data.retryAfter)));
      }
      throw new Error(data?.error || "Tidak bisa masuk. Coba lagi.");
    }
    router.replace("/");
    router.refresh();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password.trim() || loading || retryIn > 0) return;
    setLoading(true);
    setError(null);
    try {
      await login({ password });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak bisa masuk. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function onDemo() {
    if (demoLoading) return;
    setDemoLoading(true);
    setError(null);
    try {
      await login({ demo: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mode demo gagal dibuka.");
    } finally {
      setDemoLoading(false);
    }
  }

  const disabled = loading || demoLoading || retryIn > 0;

  return (
    <div className="w-full max-w-[400px]">
      <div className="panel p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface-2 text-amber">
            <LockKey size={16} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Masuk ke dashboard</h2>
            <p className="text-xs text-ink-muted">Gunakan password dashboard 9Router.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-2">
          <label htmlFor={passwordId} className="text-xs font-medium text-ink-muted">
            Password
          </label>
          <div className="relative">
            <LockKey
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <input
              id={passwordId}
              type={showPassword ? "text" : "password"}
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              placeholder="Masukkan password"
              className="h-11 w-full rounded-[9px] border border-line bg-surface-2 pl-10 pr-11 text-sm text-ink placeholder:text-ink-faint focus:border-amber/60"
              aria-describedby={`${passwordId}-hint`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-white/5 hover:text-ink"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p id={`${passwordId}-hint`} className="text-[11px] leading-relaxed text-ink-faint">
            Password dipakai sekali untuk membuat sesi 24 jam dan tidak disimpan di server ini.
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-1 rounded-md border border-red/30 bg-red/10 px-3 py-2 text-xs leading-relaxed text-red"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={disabled}
            className={cn(
              "mt-2 flex h-11 items-center justify-center gap-2 rounded-[9px] bg-amber px-4 text-sm font-semibold text-[#1a1305] transition-colors",
              "hover:bg-[#ffc65c] active:translate-y-px",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            {loading ? <CircleNotch size={16} className="animate-spin" aria-hidden="true" /> : null}
            {retryIn > 0 ? `Coba lagi dalam ${retryIn} dtk` : "Masuk"}
          </button>
        </form>

        {mock ? (
          <div className="mt-4 border-t border-line pt-4">
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted">
              <Flask size={14} className="mt-0.5 shrink-0 text-amber" aria-hidden="true" />
              Mode demo aktif. Data contoh, bukan dari instance 9Router.
            </p>
            <button
              type="button"
              onClick={onDemo}
              disabled={disabled}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[9px] border border-line bg-surface-2 px-4 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {demoLoading ? <CircleNotch size={16} className="animate-spin" aria-hidden="true" /> : null}
              Masuk mode demo
            </button>
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-faint">
        Aplikasi ini hanya membaca data. Perubahan provider dan kunci tetap dilakukan di dashboard 9Router.
      </p>
    </div>
  );
}
