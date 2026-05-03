"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

const CONSENT_KEY = "fmv_cookie_consent";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener("fmv-consent", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("fmv-consent", handler);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === null;
  } catch {
    return true;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function CookieBanner() {
  const t = useTranslations("cookieBanner");
  const visible = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  function persist(value: string) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      /* ignore private mode */
    }
    window.dispatchEvent(new CustomEvent("fmv-consent"));
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t("message")}
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur md:p-5"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-700">{t("message")}</p>
        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
          <Link
            href="/privacy"
            className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline"
          >
            {t("privacy")}
          </Link>
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
            onClick={() => persist("essential")}
          >
            {t("essential")}
          </button>
          <button
            type="button"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => persist("all")}
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
