import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold text-slate-900">
          FamilyMedVault
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
          <a href="/#features">Features</a>
          <Link href="/community">Community</Link>
          <a href="/#download">Download</a>
        </nav>
        <Link
          href="/community"
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 md:hidden"
        >
          Community
        </Link>
      </div>
    </header>
  );
}

const CONTACT_EMAIL = "hello@familymedvault.com";

export function SiteFooter() {
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("FamilyMedVault 官网咨询")}`;
  return (
    <footer className="border-t border-slate-100 py-10 text-center text-sm text-slate-500">
      <p>
        © {new Date().getFullYear()} FamilyMedVault.com ·{" "}
        <Link href="/privacy" className="underline-offset-2 hover:underline">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="underline-offset-2 hover:underline">
          Terms
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
