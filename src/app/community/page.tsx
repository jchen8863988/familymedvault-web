import Link from "next/link";
import { CommunityClient } from "@/components/CommunityClient";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { fetchCommunityIdeas } from "./data";

export const metadata = {
  title: "Community Ideas · FamilyMedVault",
  description:
    "Share problems, tool wishes, and feature ideas. Help validate what we build next.",
};

export default async function CommunityPage() {
  const { configured, ideas } = await fetchCommunityIdeas();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
          Community
        </p>
        <h1 className="mt-2 text-4xl font-bold">Community Ideas</h1>
        <p className="mt-4 text-lg text-slate-600">
          Submissions are stored in Supabase: vote once per browser, comment on
          each idea, and sort by hottest or newest.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">我遇到的问题</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">我想要的工具</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">哪些 App 很差</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">希望什么功能</span>
        </div>
      </div>

      <CommunityClient configured={configured} initialIdeas={ideas} />

      <section className="border-t border-slate-100 bg-slate-50 py-12">
        <div className="mx-auto max-w-4xl px-6 text-center text-sm text-slate-600">
          <p>
            Prefer the short form on the homepage?{" "}
            <Link
              href="/#community"
              className="font-medium text-teal-800 underline-offset-2 hover:underline"
            >
              Jump to Tell us your pain points
            </Link>
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
