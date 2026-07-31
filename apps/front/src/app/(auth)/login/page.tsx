import { Suspense } from "react";
import { LoginForm } from "@/auth/ui/LoginForm";

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
