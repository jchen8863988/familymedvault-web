import { loginCommunityAdmin } from "@/app/community/admin-actions";

type Props = { error?: boolean };

export function AdminLoginForm({ error }: Props) {
  return (
    <form
      action={loginCommunityAdmin}
      className="mx-auto max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-900">社区管理登录</h2>
      <p className="text-sm text-slate-600">
        输入环境变量 <code className="rounded bg-slate-100 px-1">COMMUNITY_ADMIN_SECRET</code>{" "}
        对应的密码。请勿公开此页面链接。
      </p>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          密码不正确。
        </p>
      ) : null}
      <input
        type="password"
        name="password"
        required
        autoComplete="current-password"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
        placeholder="管理密码"
      />
      <button
        type="submit"
        className="w-full rounded-xl bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        登录
      </button>
    </form>
  );
}
