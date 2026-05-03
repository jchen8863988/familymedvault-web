import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomePulseForm } from "@/components/HomePulseForm";
import { Link } from "@/i18n/navigation";
import {
  buildAlternates,
  openGraphLocales,
  type SeoPath,
} from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/public";

/** Set when the app is live on the App Store, e.g. https://apps.apple.com/app/idXXXXXXXX */
const APP_STORE_URL: string | null = null;

const PULSE_KEYS = new Set([
  "blocked",
  "verify",
  "rate",
  "invalid",
  "spam",
  "empty",
  "error",
]);

const HOME_SEO_PATH: SeoPath = "";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });
  const title = t("metaTitle");
  const description = t("metaDesc");
  const alternates = buildAlternates(locale, HOME_SEO_PATH);
  const ogLocales = openGraphLocales(locale);
  return {
    title: { absolute: title },
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

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ pulse?: string }>;
}) {
  await params;
  const sp = searchParams ? await searchParams : {};
  const pulseKey =
    typeof sp.pulse === "string" && PULSE_KEYS.has(sp.pulse)
      ? sp.pulse
      : undefined;
  const t = await getTranslations("home");
  const tp = await getTranslations("pulse");
  const pulseMsg = pulseKey ? tp(pulseKey) : null;
  const supabaseConfigured = isSupabaseConfigured();

  const bullets = t.raw("bullets") as string[];
  const visualCards = t.raw("visualCards") as string[];
  const featuresItems = t.raw("featuresItems") as { title: string; desc: string }[];
  const shipCards = t.raw("shipCards") as { title: string; desc: string }[];

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
            {t("brand")}
          </p>
          <h1 className="mt-3 text-5xl font-bold leading-tight">{t("heroTitle")}</h1>
          <p className="mt-6 text-lg text-slate-600">{t("heroLead")}</p>
          <ul className="mt-6 space-y-2 text-slate-700">
            {bullets.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden>✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#download"
              className="rounded-2xl bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800"
            >
              {t("ctaAppStore")}
            </a>
            <Link
              href="/community"
              className="rounded-2xl border border-slate-200 px-6 py-3 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {t("ctaPain")}
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border bg-slate-50 p-8 shadow-xl">
          <div className="space-y-4">
            {visualCards.map((label) => (
              <div
                key={label}
                className="rounded-2xl bg-white p-4 shadow"
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold">{t("featuresTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            {t("featuresLead")}
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {featuresItems.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="community" className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold">{t("communityTitle")}</h2>
          <p className="mt-4 text-slate-600">
            {t("communityLead")}{" "}
            <Link
              href="/community"
              className="font-medium text-teal-800 underline-offset-2 hover:underline"
            >
              {t("communityLink")}
            </Link>{" "}
            {t("communityLeadAfter")}
          </p>
          {pulseMsg ? (
            <p
              className="mx-auto mt-6 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              role="alert"
            >
              {pulseMsg}
            </p>
          ) : null}
          <HomePulseForm configured={supabaseConfigured} />
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold">{t("shipTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            {t("shipLead")}
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {shipCards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-6"
              >
                <h3 className="font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="download" className="bg-slate-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-bold">{t("downloadTitle")}</h2>
          <p className="mt-4 text-slate-300">{t("downloadLead")}</p>
          <div className="mt-8 flex flex-col items-center gap-4">
            {APP_STORE_URL ? (
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-2xl bg-white px-8 py-4 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                {t("downloadButton")}
              </a>
            ) : (
              <p
                className="inline-block rounded-2xl border border-slate-600 bg-slate-800/80 px-8 py-4 font-semibold text-slate-200"
                role="status"
                aria-live="polite"
              >
                {t("downloadPending")}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
