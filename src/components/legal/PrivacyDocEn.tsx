export function PrivacyDocEn() {
  return (
    <article className="space-y-8 text-slate-700">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        This policy explains how we handle data in clear, layered terms. It is
        not legal advice; consult a qualified professional for major compliance
        questions.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          1. Who is responsible
        </h2>
        <p>
          <strong className="text-slate-900">FamilyMedVault</strong> is operated
          by an independent developer (&quot;we&quot; / &quot;us&quot;). We use
          reliable cloud infrastructure, but product and communication
          decisions rest with the operator. Privacy requests:{" "}
          <a
            className="font-medium text-teal-800 underline-offset-2 hover:underline"
            href="mailto:hello@familymedvault.com"
          >
            hello@familymedvault.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">2. Scope</h2>
        <p>
          This policy covers{" "}
          <strong className="text-slate-900">familymedvault.com</strong> and its
          paths (including the community). If you use the{" "}
          <strong className="text-slate-900">FamilyMedVault</strong> mobile app,
          App Store &quot;App Privacy&quot; and in-app notices supplement this
          policy; if wording differs, the version that better protects your
          understanding prevails where law allows.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          3. Data we process
        </h2>
        <p>
          <strong>Website &amp; community:</strong> you may submit ideas,
          comments, and optional contact details. We process IP-derived hashes
          and rate limits to reduce abuse. <strong>App (when available):</strong>{" "}
          health-related data you choose to store is processed to provide the
          service; we do not sell your personal data.
        </p>
        <p className="mt-4 rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-sm">
          <strong className="text-slate-900">Cookies &amp; analytics:</strong>{" "}
          We use <strong className="text-slate-900">Vercel Analytics</strong> for
          aggregate traffic insight (e.g. page views). We do not show a separate
          cookie consent banner on the marketing site. If you are in a
          jurisdiction with specific requirements for analytics or cookies, see
          this policy and Vercel&apos;s current documentation, and consider
          professional advice where appropriate.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          4. Storage, security, retention
        </h2>
        <p>
          Data is stored with our cloud providers under industry-standard
          practices. We retain information as needed to run the product, meet
          legal obligations, and resolve disputes, then delete or anonymize when
          appropriate.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">5. Your rights</h2>
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, or export personal data, and to object to certain processing.
          Contact us at the email above; we will respond within a reasonable
          time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">6. Changes</h2>
        <p>
          We may update this policy as the product or legal context changes. The
          &quot;last updated&quot; date at the top of the page will change
          accordingly.
        </p>
      </section>
    </article>
  );
}
