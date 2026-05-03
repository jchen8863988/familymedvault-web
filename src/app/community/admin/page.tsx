import { AdminLoginForm } from "@/app/community/admin/AdminLoginForm";
import { AdminPanel } from "@/app/community/admin/AdminPanel";
import { fetchCommunityIdeas } from "@/app/community/data";
import { verifyCommunityAdminSession } from "@/lib/admin-session";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import Link from "next/link";

export const metadata = {
  title: "Community admin",
  robots: { index: false, follow: false },
};

export default async function CommunityAdminPage(props: {
  searchParams?: Promise<{ err?: string }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const hasSecret = Boolean(process.env.COMMUNITY_ADMIN_SECRET);
  const session = await verifyCommunityAdminSession();

  if (!hasSecret) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-slate-600">
            管理后台未启用：请在服务器环境变量中设置{" "}
            <code className="rounded bg-slate-100 px-1">COMMUNITY_ADMIN_SECRET</code>{" "}
            与{" "}
            <code className="rounded bg-slate-100 px-1">
              SUPABASE_SERVICE_ROLE_KEY
            </code>
            后重新部署。
          </p>
          <p className="mt-4">
            <Link href="/community" className="text-teal-800 underline-offset-2 hover:underline">
              ← 返回社区
            </Link>
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-6 py-16">
          <AdminLoginForm error={searchParams.err === "1"} />
          <p className="mx-auto mt-8 max-w-sm text-center text-sm text-slate-500">
            <Link href="/community" className="text-teal-800 underline-offset-2 hover:underline">
              ← 返回社区
            </Link>
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { ideas, configured } = await fetchCommunityIdeas();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-2xl font-bold text-slate-900">社区管理</h1>
        {!configured ? (
          <p className="mt-4 text-slate-600">
            Supabase 未配置，无法加载帖子。
          </p>
        ) : (
          <div className="mt-8">
            <AdminPanel ideas={ideas} />
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
