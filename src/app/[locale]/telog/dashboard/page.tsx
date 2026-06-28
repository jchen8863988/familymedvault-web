import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  buildAlternates,
  openGraphLocales,
  type SeoPath,
} from "@/lib/seo";

const TELOG_DASHBOARD_SEO_PATH: SeoPath = "/telog/dashboard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "telogDashboardPage" });
  const title = t("metaTitle");
  const description = t("metaDesc");
  const alternates = buildAlternates(locale, TELOG_DASHBOARD_SEO_PATH);
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
      card: "summary",
      title,
      description,
    },
  };
}

export default async function TelogDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("telogDashboardPage");

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-md text-lg text-slate-600">{t("maintenance")}</p>
    </main>
  );
}
