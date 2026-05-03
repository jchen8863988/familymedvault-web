# FamilyMedVault — marketing site

Next.js 16 (App Router) + Tailwind + Supabase for the public **Community** page (ideas, votes, comments).

**Live:** [familymedvault.com](https://www.familymedvault.com) (deployed on Vercel).

## Local development

```bash
npm install
cp .env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Optional, Vercel + `.env.local` | Canonical site origin (no trailing slash); default `https://www.familymedvault.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | Public anon / publishable key (RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel only (server) | Admin delete / pin (bypasses RLS); **never** commit |
| `COMMUNITY_ADMIN_SECRET` | Vercel only (server) | Password for `/community/admin` session |
| `RATE_LIMIT_IP_SALT` | Optional | Salt for hashed IP; defaults to `COMMUNITY_ADMIN_SECRET` |
| `COMMUNITY_RATE_LIMIT_MAX` | Optional | Max idea submissions per IP hash per window (default `5`) |
| `COMMUNITY_RATE_LIMIT_WINDOW_MS` | Optional | Window length in ms (default `3600000` = 1 hour) |
| `COMMUNITY_COMMENT_RATE_LIMIT_MAX` | Optional | Max comments per browser ID per hour (default `25`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel + `.env.local` | Cloudflare Turnstile **site** key (public) |
| `TURNSTILE_SECRET_KEY` | Vercel only (server) | Turnstile **secret**; set together with site key to enforce |
| `COMMUNITY_BLOCKED_SUBSTRINGS` | Optional | Extra comma-separated phrases to block (spam filter) |

Copy `.env.example` to `.env.local` and see table above.

### Anti-spam (community)

Server-side: keyword / URL-density filter, optional env blocklist, IP-hash rate limits for new posts, per-browser rate limit for comments, honeypot fields on forms.

### Turnstile（推荐生产开启）— 一步一步

**上线后的行为（与代码一致）**

| 配置 | 页面上的控件 | 服务端校验 |
| --- | --- | --- |
| **两个都没有**，或只配了其中一个 | 无 Turnstile | **不校验**（与升级前一致） |
| **同时**配置了 Site Key + Secret | 首页「Tell us…」区块与 `/community` 发帖表单会显示 Turnstile | **会校验** token；未通过则不能提交 |

说明：**必须两个变量都配齐**才会 enforced。只配 `NEXT_PUBLIC_TURNSTILE_SITE_KEY` 可能出现「有控件但服务端仍不强制」的不一致，请始终同时添加两项。

**步骤 1 — Cloudflare 创建站点（Turnstile）**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)（没有账号则先注册）。
2. 左侧或直接打开 **Turnstile**（「Turnstile」产品页）。
3. 点击 **Add widget** / **添加站点**。
4. **Widget name**：任意可辨认的名字（如 `familymedvault-web`）。
5. **Domains（域名）**：加入生产站点使用的域名，例如：
   - `familymedvault.com`
   - `www.familymedvault.com`  
   若暂用 Vercel 预览域名测试，可把 `*.vercel.app` 或具体预览域名一并加入（按 Cloudflare 当前界面允许的格式填写）。
6. **Widget mode**：一般用 **Managed**（托管模式）即可。
7. 创建后复制两把密钥：
   - **Site Key**（站点密钥，可公开给前端）→ 对应环境变量 **`NEXT_PUBLIC_TURNSTILE_SITE_KEY`**
   - **Secret Key**（密钥，仅服务端）→ 对应 **`TURNSTILE_SECRET_KEY`**  
   （界面文案可能是 “Site key” / “Secret key”，含义相同。）

**步骤 2 — Vercel 配置环境变量**

1. 打开 [Vercel Dashboard](https://vercel.com/) → 选中本项目。
2. **Settings** → **Environment Variables**。
3. 新增第一条：
   - **Key**：`NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - **Value**：Cloudflare 给出的 **Site Key**
   - **Environment**：至少勾选 **Production**（若要在预览环境也测人机验证，可同时勾选 **Preview**）。
4. 新增第二条：
   - **Key**：`TURNSTILE_SECRET_KEY`
   - **Value**：Cloudflare 给出的 **Secret Key**
   - **Environment**：勾选 **Production**（Secret **不要**勾选暴露给 Edge/浏览器的环境；按 Vercel 默认仅服务端可用即可）。
5. 点击 **Save**。不要把 Secret 提交到 Git 或发给前端。

**步骤 3 — 重新部署**

1. 在 Vercel 项目页打开 **Deployments**，对最新部署点击 **⋯** → **Redeploy**（或在本地提交一次空 commit 触发构建）。
2. 部署完成后访问线上首页与 `/community`，应能看到 Turnstile；提交一次确认能通过。

**本地开发（可选）**

把同样的两个变量写入项目根目录 `.env.local`（可参考 `.env.example`），然后 `npm run dev`。不配则本地行为与「未上线 Turnstile」一致。

## Database

- **New project:** run `supabase/schema.sql` in the Supabase SQL Editor.
- **Existing project** created before moderation fields: run `supabase/migration_community_moderation.sql` once to add `pinned` and `submitter_ip_hash`.

## Community admin

1. Set `COMMUNITY_ADMIN_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` on Vercel and redeploy.
2. Open `/community/admin` (not linked from the public nav), sign in with the secret value.
3. Delete posts or toggle **置顶** (pinned). Pinned ideas appear at the top of the idea wall.

Do not share the admin URL or secret publicly.

## Analytics

The app includes `@vercel/analytics`. In the Vercel project, enable **Analytics** under the project tab so page views are collected in production.

## SEO

`src/app/sitemap.ts` and `src/app/robots.ts` serve `/sitemap.xml` and `/robots.txt`. Optional **`NEXT_PUBLIC_SITE_URL`** (no trailing slash) overrides the default host in `src/lib/seo.ts` for sitemap, `robots`, canonical URLs, and JSON-LD — keep it aligned with `metadataBase` in `src/app/layout.tsx`.

Indexed routes emit **`alternates.canonical`**, **`alternates.languages`** (`en`, `zh-CN`, `x-default`), and **`openGraph` / `twitter`** per locale on the home, community, privacy, and terms pages. **`JsonLd`** outputs Organization + WebSite schema.

## Cookies & analytics

A **cookie banner** (`CookieBanner`) explains analytics and links to Privacy. **Vercel Analytics** loads only after the user chooses **Accept** (`localStorage` key `fmv_cookie_consent` = `all`). **Essential only** disables analytics (site still runs).

## i18n proxy (Next.js 16)

Locale routing uses `src/proxy.ts` (Next.js 16 `proxy` convention) wrapping `next-intl` — the old `middleware.ts` filename is deprecated in v16.

## Deploy

Push to the connected Git branch (e.g. `main`); Vercel builds automatically. After changing env vars, trigger a **Redeploy**.

## Repository

Application code is in this repo; the native iOS app lives in a separate project.
