"use client";

import { submitHomePulse } from "@/app/community/actions";
import { TurnstileField, isTurnstileConfigured } from "@/components/TurnstileField";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function HomePulseForm() {
  const t = useTranslations("pulseForm");
  const [token, setToken] = useState<string | null>(null);
  const turnstileOn = isTurnstileConfigured();

  return (
    <form className="mt-10 grid gap-4 text-left" action={submitHomePulse}>
      <p className="text-sm text-slate-500">{t("hint")}</p>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
      />
      <input
        name="name"
        className="rounded-2xl border border-slate-200 p-4 outline-none focus:border-slate-400"
        placeholder={t("namePh")}
        autoComplete="name"
      />
      <input
        name="email"
        type="email"
        className="rounded-2xl border border-slate-200 p-4 outline-none focus:border-slate-400"
        placeholder={t("emailPh")}
        autoComplete="email"
      />
      <textarea
        name="message"
        required
        className="min-h-[180px] rounded-2xl border border-slate-200 p-4 outline-none focus:border-slate-400"
        placeholder={t("messagePh")}
      />
      <TurnstileField onTokenChange={setToken} />
      {turnstileOn ? (
        <input type="hidden" name="cf-turnstile-response" value={token ?? ""} />
      ) : null}
      <div className="flex flex-wrap gap-4">
        <Link
          href="/community"
          className="rounded-2xl bg-slate-900 px-6 py-4 text-center text-white transition hover:bg-slate-800"
        >
          {t("openCommunity")}
        </Link>
        <button
          type="submit"
          disabled={turnstileOn && !token}
          className="rounded-2xl border border-slate-200 px-6 py-4 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("submit")}
        </button>
      </div>
    </form>
  );
}
