import { TermsDoc } from "@/components/legal/TermsDoc";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import Link from "next/link";

export const metadata = { title: "Terms · FamilyMedVault" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900">服务条款</h1>
        <p className="mt-2 text-sm text-slate-500">
          最近更新：2026 年 5 月 3 日（含独立开发者责任边界与 App Store 衔接说明）。
        </p>
        <div className="mt-10">
          <TermsDoc />
        </div>
        <p className="mt-10">
          <Link href="/" className="text-teal-800 underline-offset-2 hover:underline">
            ← 返回首页
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
