import { getTranslations, setRequestLocale } from "next-intl/server";
import { PrivacyDoc } from "@/components/legal/PrivacyDoc";
import { PrivacyDocEn } from "@/components/legal/PrivacyDocEn";
import { Link } from "@/i18n/navigation";
import {
  buildAlternates,
  openGraphLocales,
  type SeoPath,
} from "@/lib/seo";

const PRIVACY_SEO_PATH: SeoPath = "/privacy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "privacyPage" });
  const title = `${t("title")} · FamilyMedVault`;
  const description = t("metaDesc");
  const alternates = buildAlternates(locale, PRIVACY_SEO_PATH);
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

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacyPage");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900">{t("title")}</h1>
      <p className="mt-2 text-sm text-slate-500">{t("updated")}</p>
      <div className="mt-10">
        {locale === "zh" ? <PrivacyDoc /> : <PrivacyDocEn />}
      </div>
      <p className="mt-10">
        <Link href="/" className="text-teal-800 underline-offset-2 hover:underline">
          {t("back")}
        </Link>
      </p>
    </main>
  );
}
