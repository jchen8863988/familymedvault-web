"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function LocaleNotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-sm font-medium text-teal-700">404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">{t("title")}</h1>
      <p className="mt-4 max-w-md text-slate-600">{t("description")}</p>
      <Link
        href="/"
        className="mt-10 rounded-2xl bg-slate-900 px-8 py-3 text-white transition hover:bg-slate-800"
      >
        {t("home")}
      </Link>
    </div>
  );
}
