import Link from "next/link";
import { submitHomePulse } from "@/app/community/actions";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

/** Set when the app is live on the App Store, e.g. https://apps.apple.com/app/idXXXXXXXX */
const APP_STORE_URL: string | null = null;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
            familymedvault.com
          </p>
          <h1 className="mt-3 text-5xl font-bold leading-tight">
            Your Family. Your Health. One Secure Place.
          </h1>
          <p className="mt-6 text-lg text-slate-600">
            Organize records, medications, appointments, referrals, and
            emergency health info for everyone you love.
          </p>
          <ul className="mt-6 space-y-2 text-slate-700">
            <li className="flex gap-2">
              <span aria-hidden>✓</span>
              <span>家庭医疗记录 · Medical records in one vault</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>✓</span>
              <span>预约管理 · Appointments & referrals</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>✓</span>
              <span>AI 健康助手 · Ask questions in plain language</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>✓</span>
              <span>紧急卡片 · Emergency card export for urgent care</span>
            </li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#download"
              className="rounded-2xl bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800"
            >
              App Store · 等待发布
            </a>
            <Link
              href="/community"
              className="rounded-2xl border border-slate-200 px-6 py-3 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Share a pain point
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border bg-slate-50 p-8 shadow-xl">
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow">📁 Medical records</div>
            <div className="rounded-2xl bg-white p-4 shadow">
              📅 Appointments & referrals
            </div>
            <div className="rounded-2xl bg-white p-4 shadow">🤖 AI health assistant</div>
            <div className="rounded-2xl bg-white p-4 shadow">🚑 Emergency card export</div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold">
            Everything your family needs
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Built for busy caregivers: fewer spreadsheets, fewer missed refills,
            faster answers before the doctor visit.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              ["Secure records", "Store labs, imaging, prescriptions, and history."],
              ["Care coordination", "Track appointments and referrals in one place."],
              ["AI assistant", "Understand reports and prepare better questions."],
              ["Medication tools", "Reminders, logs, and refill awareness."],
              ["Emergency ready", "Instant export for urgent care and travel."],
              ["Family sharing", "Parents, kids, and loved ones—permissions you control."],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="community" className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold">Tell us what problem you need solved</h2>
          <p className="mt-4 text-slate-600">
            Your pain points become our roadmap—new app ideas, real validation,
            and a future product lab. Jump into{" "}
            <Link href="/community" className="font-medium text-teal-800 underline-offset-2 hover:underline">
              Community Ideas
            </Link>{" "}
            for structured submissions, votes, and discussion.
          </p>
          <form className="mt-10 grid gap-4 text-left" action={submitHomePulse}>
            <p className="text-sm text-slate-500">
              Quick pulse check — optional name/email; submissions appear on
              Community Ideas (Supabase).
            </p>
            <input
              name="name"
              className="rounded-2xl border border-slate-200 p-4 outline-none focus:border-slate-400"
              placeholder="Your name (optional)"
              autoComplete="name"
            />
            <input
              name="email"
              type="email"
              className="rounded-2xl border border-slate-200 p-4 outline-none focus:border-slate-400"
              placeholder="Email (optional)"
              autoComplete="email"
            />
            <textarea
              name="message"
              required
              className="min-h-[180px] rounded-2xl border border-slate-200 p-4 outline-none focus:border-slate-400"
              placeholder="What tool do you wish existed? What daily problem wastes your time?"
            />
            <div className="flex flex-wrap gap-4">
              <Link
                href="/community"
                className="rounded-2xl bg-slate-900 px-6 py-4 text-center text-white transition hover:bg-slate-800"
              >
                Open Community Ideas
              </Link>
              <button
                type="submit"
                className="rounded-2xl border border-slate-200 px-6 py-4 text-slate-700 transition hover:bg-slate-50"
              >
                Submit to Community
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold">What we ship next</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            FamilyMedVault today — subscription utilities, EV tools, and more
            health products as the community tells us what hurts.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["FamilyMedVault", "Secure family health records & emergency readiness."],
              ["Subscription tools", "Ideas from founders & households managing recurring spend."],
              ["EV & health tools", "Charging + wellness workflows driven by your feedback."],
            ].map(([title, blurb]) => (
              <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="download" className="bg-slate-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-bold">Protect what matters most</h2>
          <p className="mt-4 text-slate-300">
            iOS 版正在 App Store 审核 / 上架流程中；上架后将在此提供官方下载链接。
          </p>
          <p className="mt-2 text-sm text-slate-400">
            The iOS app is pending App Store review and release. We will link the
            official listing here as soon as it is live.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            {APP_STORE_URL ? (
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-2xl bg-white px-8 py-4 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Download on the App Store
              </a>
            ) : (
              <p
                className="inline-block rounded-2xl border border-slate-600 bg-slate-800/80 px-8 py-4 font-semibold text-slate-200"
                role="status"
                aria-live="polite"
              >
                等待发布中 · Pending App Store release
              </p>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
