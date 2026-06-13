import { Suspense } from "react";
import { AmpNestBookingClient } from "@/components/ampnest/AmpNestBookingClient";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildAlternates, openGraphLocales, type SeoPath } from "@/lib/seo";

const SEO_PATH: SeoPath = "/ampnest/book";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "ampnestBook" });
  const title = t("metaTitle");
  const description = t("metaDesc");
  const alternates = buildAlternates(locale, SEO_PATH);
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
    twitter: { card: "summary", title, description },
  };
}

export default async function AmpNestBookPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ampnestBook");

  return (
    <main className="min-h-0 flex-1 bg-slate-100/80">
      <div className="border-b border-slate-200 bg-white px-6 py-8 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-800">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{t("pageTitle")}</h1>
        <p className="mx-auto mt-3 max-w-lg text-slate-600">{t("pageLead")}</p>
      </div>
      <Suspense fallback={<div className="py-16 text-center text-slate-500">{t("loading")}</div>}>
        <AmpNestBookingClient />
      </Suspense>
    </main>
  );
}
