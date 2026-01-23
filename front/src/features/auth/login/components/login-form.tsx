"use client";

import { fetcher } from "@/libs/fetcher";
import { redirect } from "next/navigation";
import { useForm } from "react-hook-form";

export default function LoginForm() {
  const methods = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { handleSubmit } = methods;

  const onSubmit = async (data: { email: string; password: string }) => {
    const response = await fetcher("/api/auth/login", "POST", data);
    if (response.success) {
      redirect("/dashboard");
    } else {
      alert(response.data.message || "Login failed");
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
      <button type="submit" className="bg-blue-500 text-black p-2">
        Login
      </button>
    </form>
  );
}
