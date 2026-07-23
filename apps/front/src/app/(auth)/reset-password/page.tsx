import { Suspense } from "react";

import { ResetPasswordForm } from "@/auth/ui/ResetPasswordForm";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
