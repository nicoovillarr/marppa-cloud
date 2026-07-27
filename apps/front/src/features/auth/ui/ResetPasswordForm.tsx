"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

import { useAuth } from "../models/useAuth";
import { CaptchaWidget } from "./CaptchaWidget";
import { Button } from "@/core/ui/Button";

const inputClassName =
  "rounded-lg border border-border bg-surface-raised p-2 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-amber";

interface RequestFormValues {
  email: string;
}

interface ConfirmFormValues {
  newPassword: string;
}

export function ResetPasswordForm() {
  const token = useSearchParams().get("token");

  return token ? <ConfirmForm token={token} /> : <RequestForm />;
}

function RequestForm() {
  const { requestPasswordReset, error, isLoading } = useAuth();

  const captchaRef = useRef<TurnstileInstance>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit } = useForm<RequestFormValues>({
    defaultValues: { email: "" },
  });

  const onSubmit = async ({ email }: RequestFormValues) => {
    try {
      await requestPasswordReset(email, captchaToken ?? undefined);
      setSent(true);
    } catch {
      captchaRef.current?.reset();
      setCaptchaToken(null);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display font-bold text-2xl">Check your email</h1>
        <p className="text-sm text-ink-muted">
          If an account exists for that email, we sent a link to reset your
          password.
        </p>
        <Link href="/login" className="text-amber-ink text-sm text-center hover:brightness-90">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <header className="mb-2">
        <h1 className="font-display font-bold text-2xl">Reset password</h1>
        <p className="text-sm text-ink-muted">
          We'll email you a link to set a new one.
        </p>
      </header>

      <input
        type="email"
        placeholder="Email"
        className={inputClassName}
        {...register("email")}
      />

      <CaptchaWidget ref={captchaRef} onToken={setCaptchaToken} />

      {error && <p className="text-status-danger text-sm">{error}</p>}

      <Button
        type="submit"
        text="Send reset link"
        disabled={isLoading}
        className="w-full justify-center"
      />

      <Link href="/login" className="text-amber-ink text-sm text-center hover:brightness-90">
        Back to login
      </Link>
    </form>
  );
}

function ConfirmForm({ token }: { token: string }) {
  const { confirmPasswordReset, error, isLoading } = useAuth();
  const [done, setDone] = useState(false);

  const { register, handleSubmit } = useForm<ConfirmFormValues>({
    defaultValues: { newPassword: "" },
  });

  const onSubmit = async ({ newPassword }: ConfirmFormValues) => {
    await confirmPasswordReset(token, newPassword);
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display font-bold text-2xl">Password updated</h1>
        <p className="text-sm text-ink-muted">Your password has been updated.</p>
        <Link href="/login" className="text-amber-ink text-sm text-center hover:brightness-90">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <header className="mb-2">
        <h1 className="font-display font-bold text-2xl">Set a new password</h1>
      </header>

      <input
        type="password"
        placeholder="New password"
        className={inputClassName}
        {...register("newPassword", { minLength: 8 })}
      />

      {error && <p className="text-status-danger text-sm">{error}</p>}

      <Button
        type="submit"
        text="Set new password"
        disabled={isLoading}
        className="w-full justify-center"
      />
    </form>
  );
}
