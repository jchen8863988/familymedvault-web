"use client";

import { Turnstile } from "@marsidev/react-turnstile";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Props = {
  onTokenChange: (token: string | null) => void;
};

/** Renders Cloudflare Turnstile when site key is configured. */
export function TurnstileField({ onTokenChange }: Props) {
  if (!siteKey?.trim()) {
    return null;
  }

  return (
    <div className="flex justify-center py-2">
      <Turnstile
        siteKey={siteKey}
        onSuccess={(token) => onTokenChange(token)}
        onExpire={() => onTokenChange(null)}
        onError={() => onTokenChange(null)}
      />
    </div>
  );
}

export function isTurnstileConfigured(): boolean {
  return Boolean(siteKey?.trim());
}
