"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

import { useAuth } from "../models/useAuth";
import { CaptchaWidget } from "./CaptchaWidget";

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
        <p className="text-sm">
          If an account exists for that email, we sent a link to reset your
          password.
        </p>
        <Link href="/login" className="text-blue-500 text-sm text-center">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <input
        type="email"
        placeholder="Email"
        className="border p-2"
        {...register("email")}
      />

      <CaptchaWidget ref={captchaRef} onToken={setCaptchaToken} />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={isLoading} className="bg-blue-500 text-black p-2">
        Send reset link
      </button>

      <Link href="/login" className="text-blue-500 text-sm text-center">
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
        <p className="text-sm">Your password has been updated.</p>
        <Link href="/login" className="text-blue-500 text-sm text-center">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <input
        type="password"
        placeholder="New password"
        className="border p-2"
        {...register("newPassword", { minLength: 8 })}
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={isLoading} className="bg-blue-500 text-black p-2">
        Set new password
      </button>
    </form>
  );
}
