"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef } from "react";

interface CaptchaWidgetProps {
  onToken: (token: string | null) => void;
}

export const CaptchaWidget = forwardRef<TurnstileInstance, CaptchaWidgetProps>(
  function CaptchaWidget({ onToken }, ref) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    if (!siteKey) {
      return null;
    }

    return (
      <div className="flex justify-center">
        <Turnstile
          ref={ref}
          siteKey={siteKey}
          options={{ theme: "auto" }}
          onSuccess={(token) => onToken(token)}
          onExpire={() => onToken(null)}
          onError={() => onToken(null)}
        />
      </div>
    );
  }
);
