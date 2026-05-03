"use client";

import { submitHomePulse } from "@/app/community/actions";
import { TurnstileField, isTurnstileConfigured } from "@/components/TurnstileField";
import Link from "next/link";
import { useState } from "react";

export function HomePulseForm() {
  const [token, setToken] = useState<string | null>(null);
  const turnstileOn = isTurnstileConfigured();

  return (
    <form className="mt-10 grid gap-4 text-left" action={submitHomePulse}>
      <p className="text-sm text-slate-500">
        Quick pulse check — optional name/email; submissions appear on Community
        Ideas (Supabase).
      </p>
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
        placeholder="Your name (optional)"
        autoComplete="name"
      />
      <input
        name="email"
        type="email"
        className="rounded-2xl border border-slate-200 p-4 outline-none focus:border-slate-400"
        placeholder="Email (optional)"
        autoComplete="email"
      />
      <textarea
        name="message"
        required
        className="min-h-[180px] rounded-2xl border border-slate-200 p-4 outline-none focus:border-slate-400"
        placeholder="What tool do you wish existed? What daily problem wastes your time?"
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
          Open Community Ideas
        </Link>
        <button
          type="submit"
          disabled={turnstileOn && !token}
          className="rounded-2xl border border-slate-200 px-6 py-4 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit to Community
        </button>
      </div>
    </form>
  );
}
