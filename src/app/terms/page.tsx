import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata = { title: "Terms · FamilyMedVault" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold">Terms</h1>
        <p className="mt-6 text-slate-600">
          Replace this placeholder with your terms of service. Cover acceptable
          use, medical disclaimers (this site/app is not a substitute for
          professional care), liability limits, and governing law as appropriate
          for your jurisdiction.
        </p>
        <p className="mt-6">
          <Link href="/" className="text-teal-800 underline-offset-2 hover:underline">
            ← Back home
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
