"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

import { useAuth } from "../models/useAuth";
import { CaptchaWidget } from "./CaptchaWidget";

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

  const { handleSubmit } = methods;

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
      <input
        type="email"
        placeholder="Email"
        className="border p-2"
        {...methods.register("email")}
      />

      <input
        type="password"
        placeholder="Password"
        className="border p-2"
        {...methods.register("password")}
      />

      <CaptchaWidget ref={captchaRef} onToken={setCaptchaToken} />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" className="bg-blue-500 text-black p-2">
        Login
      </button>

      <Link
        href="/reset-password"
        className="text-blue-500 text-sm text-center"
      >
        Forgot your password?
      </Link>
    </form>
  );
}
