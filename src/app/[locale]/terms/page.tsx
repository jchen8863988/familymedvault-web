import { getTranslations, setRequestLocale } from "next-intl/server";
import { TermsDoc } from "@/components/legal/TermsDoc";
import { TermsDocEn } from "@/components/legal/TermsDocEn";
import { Link } from "@/i18n/navigation";
import {
  buildAlternates,
  openGraphLocales,
  type SeoPath,
} from "@/lib/seo";

const TERMS_SEO_PATH: SeoPath = "/terms";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "termsPage" });
  const title = `${t("title")} · FamilyMedVault`;
  const description = t("metaDesc");
  const alternates = buildAlternates(locale, TERMS_SEO_PATH);
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

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("termsPage");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900">{t("title")}</h1>
      <p className="mt-2 text-sm text-slate-500">{t("updated")}</p>
      <div className="mt-10">
        {locale === "zh" ? <TermsDoc /> : <TermsDocEn />}
      </div>
      <p className="mt-10">
        <Link href="/" className="text-teal-800 underline-offset-2 hover:underline">
          {t("back")}
        </Link>
      </p>
    </main>
  );
}
