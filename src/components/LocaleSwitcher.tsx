"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="sr-only">{t("label")}</span>
      <select
        aria-label={t("label")}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800 outline-none focus:border-slate-400"
        value={locale}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {loc === "en" ? t("en") : t("zh")}
          </option>
        ))}
      </select>
    </label>
  );
}
