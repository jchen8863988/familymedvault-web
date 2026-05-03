import { AppsAdminLoginForm } from "@/app/[locale]/apps/admin/AppsAdminLoginForm";
import { AppsAdminPanel } from "@/app/[locale]/apps/admin/AppsAdminPanel";
import { fetchStoreApps } from "@/app/store-apps/data";
import { verifyAppsAdminSession } from "@/lib/admin-session";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "appsAdmin" });
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function AppsAdminPage(props: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ err?: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const searchParams = (await props.searchParams) ?? {};
  const t = await getTranslations("appsAdmin");
  const hasSecret = Boolean(process.env.APPS_ADMIN_SECRET?.trim());
  const session = await verifyAppsAdminSession();

  if (!hasSecret) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="font-medium text-slate-900">{t("disabledTitle")}</p>
        <p className="mt-2 text-slate-600">{t("disabledBody")}</p>
        <p className="mt-4">
          <Link
            href="/apps"
            className="text-teal-800 underline-offset-2 hover:underline"
          >
            {t("backApps")}
          </Link>
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <AppsAdminLoginForm error={searchParams.err === "1"} />
        <p className="mx-auto mt-8 max-w-sm text-center text-sm text-slate-500">
          <Link
            href="/apps"
            className="text-teal-800 underline-offset-2 hover:underline"
          >
            {t("backApps")}
          </Link>
        </p>
      </main>
    );
  }

  const { rows } = await fetchStoreApps();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <AppsAdminPanel apps={rows} />
      <p className="mt-10 text-center text-sm text-slate-500">
        <Link href="/apps" className="text-teal-800 underline-offset-2 hover:underline">
          {t("backApps")}
        </Link>
      </p>
    </main>
  );
}
