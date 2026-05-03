import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata = { title: "Privacy · FamilyMedVault" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold">Privacy</h1>
        <p className="mt-6 text-slate-600">
          Replace this placeholder with your privacy policy before collecting
          personal data or enabling accounts. When you add Supabase auth and
          stored submissions, describe what you collect, why, retention, and
          contact for requests.
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
