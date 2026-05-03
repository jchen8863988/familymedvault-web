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

Server-side: keyword / URL-density filter, optional env blocklist, IP-hash rate limits for new posts, per-browser rate limit for comments, honeypot fields on forms. When **both** Turnstile keys are set, homepage and `/community` idea forms require Cloudflare Turnstile before submit. Create a Turnstile widget in [Cloudflare Dashboard](https://dash.cloudflare.com/) → Turnstile → add site for `familymedvault.com`.

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

## Deploy

Push to the connected Git branch (e.g. `main`); Vercel builds automatically. After changing env vars, trigger a **Redeploy**.

## Repository

Application code is in this repo; the native iOS app lives in a separate project.
