/**
 * Cloudflare Turnstile server-side verification.
 * Set TURNSTILE_SECRET_KEY + NEXT_PUBLIC_TURNSTILE_SITE_KEY to enforce on submissions.
 */

export function isTurnstileEnforced(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim(),
  );
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
): Promise<{ ok: boolean }> {
  if (!isTurnstileEnforced()) {
    return { ok: true };
  }
  const secret = process.env.TURNSTILE_SECRET_KEY!;
  const t = (token ?? "").trim();
  if (!t) {
    return { ok: false };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", t);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    const data = (await res.json()) as { success?: boolean };
    return { ok: data.success === true };
  } catch (e) {
    console.error("[turnstile] verify", e);
    return { ok: false };
  }
}
