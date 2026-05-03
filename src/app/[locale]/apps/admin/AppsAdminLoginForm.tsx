"use client";

import { loginAppsAdmin } from "@/app/apps-admin-actions";
import { useTranslations } from "next-intl";

type Props = { error?: boolean };

export function AppsAdminLoginForm({ error }: Props) {
  const t = useTranslations("appsAdmin");

  return (
    <form
      action={loginAppsAdmin}
      className="mx-auto max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-900">{t("loginTitle")}</h2>
      <p className="text-sm text-slate-600">{t("loginHint")}</p>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {t("loginWrong")}
        </p>
      ) : null}
      <input
        type="password"
        name="password"
        required
        autoComplete="current-password"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
        placeholder={t("loginPh")}
      />
      <button
        type="submit"
        className="w-full rounded-xl bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        {t("loginSubmit")}
      </button>
    </form>
  );
}
