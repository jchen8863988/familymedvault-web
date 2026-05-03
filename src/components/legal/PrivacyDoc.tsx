export function PrivacyDoc() {
  return (
    <article className="space-y-8 text-slate-700">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        本文件旨在以清晰、分层的方式说明数据处理实践，便于您理解与对照 Apple
        等平台对开发者透明度的一般期望。不构成律师提供的正式法律意见；重大合规事项请咨询持证专业人士。
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">1. 谁在对您的信息负责</h2>
        <p>
          <strong className="text-slate-900">FamilyMedVault</strong>{" "}
          由独立开发者运营（下称「我们」或「运营者」）。我们不是跨国企业集团：基础设施依托可靠的云服务提供商，但对本产品与您沟通的<strong className="text-slate-900">最终决定权与联系入口由运营者本人承担</strong>
          。隐私相关请求请联系：
          <a
            className="ml-1 font-medium text-teal-800 underline-offset-2 hover:underline"
            href="mailto:hello@familymedvault.com"
          >
            hello@familymedvault.com
          </a>
          。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">2. 适用范围</h2>
        <p>
          本政策适用于您访问{" "}
          <strong className="text-slate-900">familymedvault.com</strong>{" "}
          及其子路径（含社区页）。若您使用 FamilyMedVault{" "}
          <strong className="text-slate-900">移动应用</strong>：Apple{" "}
          <strong className="text-slate-900">App Store Connect</strong>{" "}
          中的「App 隐私」声明与应用内说明旨在与本政策<strong className="text-slate-900">相互补充</strong>
          ；若二者偶有措辞差异，以<strong className="text-slate-900">更严格保护用户知情权</strong>
          的版本为准，除非适用法律另有强制性规定。
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">
          3. 我们收集哪些数据（类别与用途）
        </h2>
        <p className="text-sm text-slate-600">
          下列表述方式便于您对照常见隐私披露维度（含与 Apple
          开发者文档中「数据类型」思路一致的划分）；我们不会超出所述目的使用这些信息。
        </p>

        <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-sm text-slate-800">
          <p className="font-semibold text-slate-900">Cookie 与访问统计</p>
          <p className="mt-2">
            本网站通过 <strong className="text-slate-900">Vercel Analytics</strong> 了解汇总层面的访问情况（例如页面浏览），未再单独展示同意横幅。若您位于对分析或 Cookie
            有特别要求的法域，请以本政策与 Vercel 现行说明为准，必要时可咨询专业人士。
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div>
            <h3 className="font-semibold text-slate-900">3.1 使用数据与诊断（Usage & diagnostics）</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                <strong className="text-slate-800">内容：</strong>
                页面浏览、大致的地区层级来源（通常为国家/地区层级）、设备类型、浏览器类型、请求时间与路径等聚合或日志级信息。
              </li>
              <li>
                <strong className="text-slate-800">用途：</strong>
                维持网站可用性、排错、安全审计与产品改进。
              </li>
              <li>
                <strong className="text-slate-800">提供者：</strong>
                <strong className="text-slate-900">Vercel</strong>（托管与分析组件；请以 Vercel
                现行隐私政策为准）。
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">3.2 标识符（Identifiers）</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                <strong className="text-slate-800">浏览器本地标识：</strong>
                为实现「同一浏览器对同一帖子仅点赞一次」及加载评论，我们会在您的设备上使用{" "}
                <code className="rounded bg-white px-1 text-xs">localStorage</code>{" "}
                存储随机生成的标识符；该标识<strong className="text-slate-900">不用于跨站广告画像</strong>
                ，亦不与我们从您处收集的姓名主动绑定，除非您在表单中自愿填写。
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">3.3 联系信息（可选）</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                <strong className="text-slate-800">内容：</strong>
                您在社区或首页反馈表单中<strong className="text-slate-900">自愿填写</strong>
                的电子邮箱、称呼等。
              </li>
              <li>
                <strong className="text-slate-800">用途：</strong>
                在必要时就您的反馈与您跟进；我们不会将邮箱出售给第三方用于其独立营销名单。
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">3.4 用户内容与互动（User content）</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                <strong className="text-slate-800">内容：</strong>
                您提交的标题、正文、评论文本及与之关联的点赞记录。
              </li>
              <li>
                <strong className="text-slate-800">存储：</strong>
                由 <strong className="text-slate-900">Supabase</strong>（PostgreSQL）托管；请参阅
                Supabase 的数据处理条款。
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              3.5 滥用防范（不可逆的技术摘要）
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                <strong className="text-slate-800">内容：</strong>
                可能对来访 IP 进行<strong className="text-slate-900">加盐单向哈希</strong>
                后的摘要值，并在有限时间窗口内计数，以防短时间刷屏。
              </li>
              <li>
                <strong className="text-slate-800">说明：</strong>
                我们不将原始 IP 用于长期用户画像；摘要本身通常不足以单独识别自然人。
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              3.6 人机验证（Cloudflare Turnstile）
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>
                <strong className="text-slate-800">用途：</strong>
                在已开启配置时，于<strong className="text-slate-900">社区相关提交</strong>等场景区分真人与自动化脚本，降低垃圾信息与滥用；首页快速留言不经过 Turnstile。
              </li>
              <li>
                <strong className="text-slate-800">处理者：</strong>
                验证流程由 <strong className="text-slate-900">Cloudflare</strong>{" "}
                提供；我们可能收到一次性通过与失败摘要，不将其用于广告画像。
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">4. 「跟踪」说明（Transparency）</h2>
        <p>
          我们不使用本网站数据在您不知情的情况下开展<strong className="text-slate-900">跨 App / 跨网站广告跟踪</strong>
          ，亦<strong className="text-slate-900">不出售</strong>您的个人信息换取金钱对价（California「sale」语境下常见含义）。
          分析工具用于<strong className="text-slate-900">了解本站自身的使用情况</strong>
          ，而非向您推送第三方个性化广告。若未来实践发生重大变化，我们将更新本页并在必要时寻求适用法律要求的同意。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">5. 处理数据的法律依据（概要）</h2>
        <p>
          视您所在司法辖区而定，合法性可能基于：履行向您提供服务的必要性、运营者在网络安全与防滥用方面的合法权益、或在您自愿提交联系方式时的同意。我们不会藉「同意」捆绑与您请求无关的处理。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">6. 保留、安全与最小化</h2>
        <p>
          我们仅在实现目的所需期限内保留数据；社区内容与互动记录在运营需要期间保存，除非您行使删除权且不与法律保留义务冲突。我们依托行业标准 TLS、访问控制与托管商安全措施；没有任何线上系统能做到绝对安全，请您妥善保管设备与会话。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">7. 第三方与子处理者</h2>
        <p>
          当前主要包括：<strong className="text-slate-900">Vercel</strong>（托管、可能的边缘与分析功能）、
          <strong className="text-slate-900">Supabase</strong>（数据库）、
          <strong className="text-slate-900">Cloudflare</strong>（Turnstile
          人机验证）。基础设施可能涉及跨境处理；相关服务商各自受其条款约束，我们会在可行的范围内选择合规选项。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">8. 您的权利</h2>
        <p>
          在适用法律允许范围内，您可请求访问、更正、删除、限制或反对某些处理，并可索取结构化副本（可携带性）。欧盟用户可向监管机构投诉；部分美国州居民享有额外的知情权与选择退出「出售/共享」的权利——鉴于我们当前<strong className="text-slate-900">不出售</strong>
          前述语境下的个人信息，多数情形下仅需告知即可满足透明度义务。
        </p>
        <p>
          请求请联系{" "}
          <a
            className="font-medium text-teal-800 underline-offset-2 hover:underline"
            href="mailto:hello@familymedvault.com?subject=Data%20rights%20request"
          >
            hello@familymedvault.com
          </a>
          ，我们可能要求验证身份以保护账户免受欺诈。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">9. 未成年人</h2>
        <p>
          本网站并非面向十四周岁以下儿童定向提供服务。若您认为我们在未获可验证家长同意的情况下收集了儿童个人信息，请立即联系我们，我们将在核实后<strong className="text-slate-900">尽快删除</strong>
          可删除的信息。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">10. 健康信息的特别说明</h2>
        <p>
          <strong className="text-slate-900">本网站社区不宜上传诊疗记录、处方影像或可单独识别您健康状况的高度敏感信息。</strong>
          移动应用中若有健康相关数据处理，将以 App 内专门说明与适用法规为准；本页面不构成医疗服务或 HIPAA 等专业合规承诺。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">11. 政策变更</h2>
        <p>
          我们可能更新本政策并在本页标注生效日期；若变更实质影响您的权利，我们将采取合理方式提示。继续使用在适用法律允许的前提下构成对更新版本的知晓。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">12. 联系我们</h2>
        <p>
          <a
            className="font-medium text-teal-800 underline-offset-2 hover:underline"
            href="mailto:hello@familymedvault.com?subject=Privacy"
          >
            hello@familymedvault.com
          </a>
        </p>
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-8 text-sm text-slate-600">
        <h3 className="font-semibold text-slate-800">English summary (for international readers)</h3>
        <p>
          FamilyMedVault is operated by an <strong>individual developer</strong>. This policy describes
          categories of data processed on familymedvault.com (usage/diagnostics via hosting such as
          Vercel; optional contact info and community content stored with Supabase; browser-local
          identifiers for votes/comments; salted hashes for abuse prevention; Cloudflare Turnstile
          when enabled). We do{" "}
          <strong>not</strong> sell personal information for cross-context behavioural advertising as
          commonly understood, and we do not use site data for cross-app tracking for third-party ads.
          Contact{" "}
          <a className="text-teal-800 underline" href="mailto:hello@familymedvault.com">
            hello@familymedvault.com
          </a>{" "}
          for privacy requests. The iOS app may have supplementary disclosures in App Store Connect
          and in-app text.
        </p>
      </section>
    </article>
  );
}
