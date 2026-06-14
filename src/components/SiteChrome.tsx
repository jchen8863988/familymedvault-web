import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeaderGate } from "@/components/SiteHeaderGate";

export function SiteHeader() {
  return <SiteHeaderGate />;
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
