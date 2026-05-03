export function PrivacyDoc() {
  return (
    <article className="space-y-8 text-slate-700">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        以下为便于理解的概要说明，不构成正式法律意见。涉及权利义务与合规边界时，请咨询专业律师，并以适用法律及司法或行政机关认定为准。
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">1. 适用范围</h2>
        <p>
          本隐私政策适用于您访问与使用{" "}
          <strong className="text-slate-900">familymedvault.com</strong>（下称「本网站」）时，我们对信息的处理
          方式。若您使用 FamilyMedVault 移动应用，另有独立的应用内隐私说明（以应用内展示为准）。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">2. 我们处理的信息</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-slate-900">技术与访问数据：</strong>
            当您浏览页面时，托管与基础设施服务商（见下文「第三方服务」）可能记录诸如请求时间、大致来源地区、设备或浏览器类型、页面路径等日志类信息，用于保障网站可用性与安全。
          </li>
          <li>
            <strong className="text-slate-900">使用情况分析：</strong>
            我们可能使用 Vercel Analytics 等工具统计访问量与页面浏览（通常为聚合、匿名化程度较高的数据），用于了解产品使用情况。您可在浏览器中通过常规方式限制 Cookie 或启用「请勿追踪」（若适用）。
          </li>
          <li>
            <strong className="text-slate-900">社区「想法墙」与首页反馈：</strong>
            若您主动提交内容，我们会存储您填写的标题与正文。您可自愿填写称呼与电子邮箱以便跟进；不提供亦可提交。
          </li>
          <li>
            <strong className="text-slate-900">点赞与评论：</strong>
            为实现「每个浏览器账号对同一帖子点赞一次」及展示评论，我们会在您的浏览器中生成并保存本地标识（localStorage），并在服务端关联该标识与您的互动记录；不包含您的真实姓名，除非您在表单中主动填写。
          </li>
          <li>
            <strong className="text-slate-900">滥用防范（IP 哈希）：</strong>
            为限制短时间内的无效或恶意刷屏提交，服务器可能对访问者 IP 地址进行单向哈希（加盐）后保存为不可逆的摘要值，用于在有限时间窗口内计数；我们不会在本功能中存储完整的原始 IP 地址用于长期画像。
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">3. 处理目的与法律依据（概要）</h2>
        <p>
          我们基于提供与改进网站与社区功能、与您沟通（在您提供联系方式时）、保障服务安全与遵守法定义务等目的处理上述信息。根据您所在地区法律，处理合法性可能包括合同履行、合法权益（如防止滥用）或您的同意（例如在表单中自愿留下邮箱时）。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">4. 第三方服务</h2>
        <p>
          本网站部署于 <strong className="text-slate-900">Vercel</strong>，社区数据存储于{" "}
          <strong className="text-slate-900">Supabase</strong>
          。这些服务商在其隐私政策框架内处理为提供服务所必需的数据。建议您查阅其官方隐私声明以了解跨境传输、 subprocessors 与安全措施。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">5. 保留期限</h2>
        <p>
          我们会在实现本政策所述目的所需的期间内保留信息，除非法律要求或允许更长的保留期。社区帖子及互动记录在运营需要期间保留；您可通过联系邮箱请求删除您自愿提交的个人信息（我们将在核实合理请求与法律要求后处理）。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">6. 您的权利</h2>
        <p>
          在适用法律允许的范围内，您可能享有访问、更正、删除、限制处理、可携带性及反对处理等权利。若您位于欧盟/英国等地区，还可向监管机构投诉。行使权利请联系{" "}
          <a
            className="font-medium text-teal-800 underline-offset-2 hover:underline"
            href="mailto:hello@familymedvault.com"
          >
            hello@familymedvault.com
          </a>
          。我们可能需验证您的身份以防止欺诈。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">7. 儿童</h2>
        <p>
          本网站面向普通公众，并非以十四周岁以下儿童为主要对象。若您认为我们在未获适当同意的情况下收集了儿童信息，请联系我们，我们将及时核查并删除可删除的数据。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">8. 政策更新</h2>
        <p>
          我们可能不时修订本政策；重大变更时将通过网站显著位置或适当方式提示。继续使用本网站即表示您了解更新后的版本（在法律要求另有规定的从其规定）。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">9. 联系我们</h2>
        <p>
          隐私相关问询：{" "}
          <a
            className="font-medium text-teal-800 underline-offset-2 hover:underline"
            href="mailto:hello@familymedvault.com?subject=Privacy%20inquiry"
          >
            hello@familymedvault.com
          </a>
        </p>
      </section>

      <section className="space-y-2 border-t border-slate-100 pt-6 text-sm text-slate-500">
        <h3 className="font-medium text-slate-700">English summary</h3>
        <p>
          This policy describes what we collect on familymedvault.com (hosting logs,
          optional analytics, community submissions, browser identifiers for votes,
          and hashed IP summaries for rate limiting), why we use it, retention,
          subprocessors (e.g. Vercel, Supabase), and how to contact us at{" "}
          <a className="text-teal-800 underline" href="mailto:hello@familymedvault.com">
            hello@familymedvault.com
          </a>
          . It is not medical or legal advice.
        </p>
      </section>
    </article>
  );
}
