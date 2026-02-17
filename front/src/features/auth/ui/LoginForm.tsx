"use client";

import { useForm } from "react-hook-form";
import { useAuth } from "../models/useAuth";
import { redirect } from "next/navigation";

interface FormValues {
  email: string;
  password: string;
}

export function LoginForm() {
  const { login } = useAuth();

  const methods = useForm<FormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { handleSubmit } = methods;

  const onSubmit = async (data: FormValues) => {
    const { email, password } = data;
    await login(email, password);

    redirect("/dashboard");
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

      <button type="submit" className="bg-blue-500 text-black p-2">
        Login
      </button>
    </form>
  );
}
