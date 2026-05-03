"use client";

import { submitHomePulse } from "@/app/community/actions";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  /** When false, same as /community: show setup instructions instead of a form that cannot succeed. */
  configured: boolean;
};

export function HomePulseForm({ configured }: Props) {
  const t = useTranslations("pulseForm");
  const tSetup = useTranslations("communityClient");

  if (!configured) {
    return (
      <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-left text-sm text-amber-950">
        <p className="font-medium">{tSetup("notConfiguredTitle")}</p>
        <p className="mt-2 text-amber-900/90">{tSetup("notConfiguredBody")}</p>
      </div>
    );
  }

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
      <div className="flex flex-wrap gap-4">
        <Link
          href="/community"
          className="rounded-2xl bg-slate-900 px-6 py-4 text-center text-white transition hover:bg-slate-800"
        >
          {t("openCommunity")}
        </Link>
        <button
          type="submit"
          className="rounded-2xl border border-slate-200 px-6 py-4 text-slate-700 transition hover:bg-slate-50"
        >
          {t("submit")}
        </button>
      </div>
    </form>
  );
}
