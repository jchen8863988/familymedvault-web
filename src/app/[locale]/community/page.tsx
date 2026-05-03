import { getTranslations, setRequestLocale } from "next-intl/server";
import { fetchCommunityIdeas } from "@/app/community/data";
import { CommunityClient } from "@/components/CommunityClient";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Link } from "@/i18n/navigation";
import {
  buildAlternates,
  openGraphLocales,
  type SeoPath,
} from "@/lib/seo";

/** Always read fresh data from Supabase (no stale prerender after deletes). */
export const dynamic = "force-dynamic";

const COMMUNITY_SEO_PATH: SeoPath = "/community";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "communityPage" });
  const title = t("metaTitle");
  const description = t("metaDesc");
  const alternates = buildAlternates(locale, COMMUNITY_SEO_PATH);
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

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ submitted?: string }>;
}) {
  await params;
  const sp = searchParams ? await searchParams : {};
  const showSubmitted =
    typeof sp.submitted === "string" && sp.submitted === "1";
  const t = await getTranslations("communityPage");
  const { configured, ideas } = await fetchCommunityIdeas();
  const tags = t.raw("tags") as string[];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <div className="mx-auto max-w-4xl px-6 py-16">
        {showSubmitted ? (
          <p
            className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950"
            role="status"
          >
            {t("submittedBanner")}
          </p>
        ) : null}
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-4xl font-bold">{t("title")}</h1>
        <p className="mt-4 text-lg text-slate-600">{t("lead")}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-3 py-1">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <CommunityClient configured={configured} initialIdeas={ideas} />

      <section className="border-t border-slate-100 bg-slate-50 py-12">
        <div className="mx-auto max-w-4xl px-6 text-center text-sm text-slate-600">
          <p>
            {t("footerJump")}{" "}
            <Link
              href="/#community"
              className="font-medium text-teal-800 underline-offset-2 hover:underline"
            >
              {t("footerLink")}
            </Link>
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
