import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
        <Link href="/" className="text-xl font-bold text-slate-900">
          FamilyMedVault
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
          <Link href="/#features">{t("features")}</Link>
          <Link href="/apps">{t("apps")}</Link>
          <Link href="/community">{t("community")}</Link>
          <Link href="/#download">{t("siteApp")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <Link
            href="/apps"
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 md:hidden"
          >
            {t("apps")}
          </Link>
          <Link
            href="/community"
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 md:hidden"
          >
            {t("community")}
          </Link>
          <Link
            href="/#download"
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800 md:hidden"
          >
            {t("siteApp")}
          </Link>
        </div>
      </div>
    </header>
  );
}

const CONTACT_EMAIL = "hello@familymedvault.com";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t("contactSubject"))}`;
  return (
    <footer className="border-t border-slate-100 py-10 text-center text-sm text-slate-500">
      <p>
        © {new Date().getFullYear()} FamilyMedVault.com ·{" "}
        <Link href="/privacy" className="underline-offset-2 hover:underline">
          {t("privacy")}
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="underline-offset-2 hover:underline">
          {t("terms")}
        </Link>
      </p>
      <p className="mt-3">
        <a
          href={mailto}
          className="font-medium text-teal-800 underline-offset-2 hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    </footer>
  );
}
