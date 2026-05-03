import { AdminLoginForm } from "@/app/[locale]/community/admin/AdminLoginForm";
import { AdminPanel } from "@/app/[locale]/community/admin/AdminPanel";
import { fetchCommunityIdeas } from "@/app/community/data";
import { verifyCommunityAdminSession } from "@/lib/admin-session";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin" });
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function CommunityAdminPage(props: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ err?: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const searchParams = (await props.searchParams) ?? {};
  const t = await getTranslations("admin");
  const hasSecret = Boolean(process.env.COMMUNITY_ADMIN_SECRET);
  const session = await verifyCommunityAdminSession();

  if (!hasSecret) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="font-medium text-slate-900">{t("disabledTitle")}</p>
        <p className="mt-2 text-slate-600">{t("disabledBody")}</p>
        <p className="mt-4">
          <Link
            href="/community"
            className="text-teal-800 underline-offset-2 hover:underline"
          >
            {t("backCommunity")}
          </Link>
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <AdminLoginForm error={searchParams.err === "1"} />
        <p className="mx-auto mt-8 max-w-sm text-center text-sm text-slate-500">
          <Link
            href="/community"
            className="text-teal-800 underline-offset-2 hover:underline"
          >
            {t("backCommunity")}
          </Link>
        </p>
      </main>
    );
  }

  const { ideas, configured } = await fetchCommunityIdeas();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-2xl font-bold text-slate-900">{t("pageTitle")}</h1>
      {!configured ? (
        <p className="mt-4 text-slate-600">{t("errors.supabaseIdeas")}</p>
      ) : (
        <div className="mt-8">
          <AdminPanel ideas={ideas} />
        </div>
      )}
    </main>
  );
}
