"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

import { useAuth } from "../models/useAuth";
import { CaptchaWidget } from "./CaptchaWidget";
import { Button } from "@/core/ui/Button";

const inputClassName =
  "rounded-lg border border-border bg-surface-raised p-2 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent";

interface FormValues {
  email: string;
  password: string;
}

export function LoginForm() {
  const { login, error } = useAuth();

  const captchaRef = useRef<TurnstileInstance>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const methods = useForm<FormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { handleSubmit, register } = methods;

  const onSubmit = async (data: FormValues) => {
    const { email, password } = data;

    try {
      await login(email, password, captchaToken ?? undefined);
      redirect("/dashboard");
    } catch {
      captchaRef.current?.reset();
      setCaptchaToken(null);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <header className="mb-2">
        <h1 className="font-display font-bold text-2xl">Log in</h1>
        <p className="text-sm text-ink-muted">Enter the Marppa console.</p>
      </header>

      <input
        type="email"
        placeholder="Email"
        className={inputClassName}
        {...register("email")}
      />

      <input
        type="password"
        placeholder="Password"
        className={inputClassName}
        {...register("password")}
      />

      <CaptchaWidget ref={captchaRef} onToken={setCaptchaToken} />

      {error && <p className="text-status-danger text-sm">{error}</p>}

      <Button type="submit" text="Log in" className="w-full justify-center" />

      <Link
        href="/reset-password"
        className="text-accent-ink text-sm text-center hover:brightness-90"
      >
        Forgot your password?
      </Link>
    </form>
  );
}
