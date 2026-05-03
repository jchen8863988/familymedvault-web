import { fetchStoreApps } from "@/app/store-apps/data";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  buildAlternates,
  openGraphLocales,
  type SeoPath,
} from "@/lib/seo";
import type { StoreAppRow } from "@/types/store-app";

/** Always read latest rows from Supabase after admin updates. */
export const dynamic = "force-dynamic";

const APPS_SEO_PATH: SeoPath = "/apps";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "appsPage" });
  const title = t("metaTitle");
  const description = t("metaDesc");
  const alternates = buildAlternates(locale, APPS_SEO_PATH);
  const ogLocales = openGraphLocales(locale);
  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      siteName: "FamilyMedVault",
      type: "website",
      ...ogLocales,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function titleForLocale(row: StoreAppRow, locale: string): string {
  return locale === "zh" ? row.name_zh : row.name_en;
}

function taglineForLocale(row: StoreAppRow, locale: string): string | null {
  const v = locale === "zh" ? row.tagline_zh : row.tagline_en;
  return v?.trim() ? v : null;
}

export default async function AppsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const p = await params;
  setRequestLocale(p.locale);
  const t = await getTranslations("appsPage");
  const { rows, configured } = await fetchStoreApps();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
        {t("eyebrow")}
      </p>
      <h1 className="mt-2 text-4xl font-bold text-slate-900">{t("title")}</h1>
      <p className="mt-4 text-lg text-slate-600">{t("lead")}</p>

      {!configured ? (
        <p className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t("notConfigured")}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-10 text-slate-600">{t("empty")}</p>
      ) : (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {rows.map((app) => (
            <li
              key={app.id}
              className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-slate-900">
                {titleForLocale(app, p.locale)}
              </h2>
              {taglineForLocale(app, p.locale) ? (
                <p className="mt-2 flex-1 text-sm text-slate-600">
                  {taglineForLocale(app, p.locale)}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3">
                {app.platform_ios && app.app_store_url ? (
                  <a
                    href={app.app_store_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    {t("appStore")}
                  </a>
                ) : null}
                {app.platform_android && app.google_play_url ? (
                  <a
                    href={app.google_play_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                  >
                    {t("playStore")}
                  </a>
                ) : null}
                {app.platform_web && app.web_url ? (
                  <a
                    href={app.web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 px-5 py-2.5 text-sm font-medium text-teal-900 transition hover:bg-teal-100"
                  >
                    {t("webApp")}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-16 text-center text-sm text-slate-500">
        <Link href="/" className="text-teal-800 underline-offset-2 hover:underline">
          ← FamilyMedVault
        </Link>
      </p>
    </main>
  );
}
