"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { SiteMobileNav, type NavItem } from "@/components/SiteMobileNav";

export function SiteHeaderGate() {
  const pathname = usePathname();
  const isAmpNest = pathname.startsWith("/ampnest");

  if (isAmpNest) {
    return <AmpNestWebHeader />;
  }

  return <SiteHeaderMain />;
}

function AmpNestWebHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/ampnest/book" className="min-w-0 text-lg font-bold text-slate-900 sm:text-xl">
          Amp<span className="text-emerald-700">Nest</span>
        </Link>
        <LocaleSwitcher />
      </div>
    </header>
  );
}

function SiteHeaderMain() {
  const t = useTranslations("nav");

  const items: NavItem[] = [
    { href: "/#features", label: t("features") },
    { href: "/apps", label: t("apps") },
    { href: "/community", label: t("community") },
    { href: "/ampnest/book", label: t("siteApp") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <Link
          href="/"
          className="min-w-0 shrink truncate text-lg font-bold text-slate-900 sm:max-w-none sm:text-xl"
        >
          FamilyMedVault
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden md:block">
            <LocaleSwitcher />
          </div>
          <SiteMobileNav items={items} />
        </div>
      </div>
    </header>
  );
}
