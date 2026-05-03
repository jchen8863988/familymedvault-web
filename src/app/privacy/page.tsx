import { PrivacyDoc } from "@/components/legal/PrivacyDoc";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import Link from "next/link";

export const metadata = { title: "Privacy · FamilyMedVault" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900">隐私政策</h1>
        <p className="mt-2 text-sm text-slate-500">
          最近更新：2026 年 5 月（随产品迭代可能修订，请以本页为准）。
        </p>
        <div className="mt-10">
          <PrivacyDoc />
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
