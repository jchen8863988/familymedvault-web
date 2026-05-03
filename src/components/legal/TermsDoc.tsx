export function TermsDoc() {
  return (
    <article className="space-y-8 text-slate-700">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        以下为便于理解的概要条款，不构成正式法律意见；争议解决与责任限制以适用法律及有权机关认定为准。
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">1. 接受条款</h2>
        <p>
          访问或使用 <strong className="text-slate-900">familymedvault.com</strong>（下称「本网站」），即表示您同意本服务条款。若不同意，请停止使用本网站。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">2. 非医疗建议</h2>
        <p>
          本网站及任何展示内容（包括社区区的讨论）仅供一般信息与产品沟通之用，{" "}
          <strong className="text-slate-900">
            不构成医疗、诊断、治疗或专业健康建议
          </strong>
          。紧急医疗情况请立即联系当地急救服务或前往医疗机构。您对自身健康决策承担全部责任。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">3. 服务性质</h2>
        <p>
          本网站用于介绍 FamilyMedVault 产品、收集用户反馈与运营社区功能。功能与可用性可能随时变更、暂停或终止，恕不另行通知（我们会在合理范围内尽量减少对您的影响）。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">4. 用户内容与社区规范</h2>
        <p>在社区提交想法、评论或点赞时，您同意：</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>您拥有或已获得必要权利发布该内容，且内容不侵犯第三方权利；</li>
          <li>
            不发布违法、仇恨、骚扰、色情、虚假医疗宣称、侵犯隐私或恶意软件相关信息；
          </li>
          <li>
            理解运营方有权为维护社区质量与安全，对内容进行展示排序、隐藏、删除或限制访问（包括通过管理工具删除违规或重复刷屏内容）。
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">5. 免责声明与责任限制</h2>
        <p>
          在适用法律允许的最大范围内，本网站按「现状」与「可用」基础提供，不作任何明示或默示担保（包括对准确性、适销性、特定用途适用性）。对于因使用或无法使用本网站而产生的任何间接、附带、特殊、后果性或惩罚性损害，我们在法律允许范围内不承担责任；若法律强制规定不可排除责任，我们的责任限于法律允许的最低范围。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">6. 知识产权</h2>
        <p>
          本网站上的标识、文案、设计与排版等受著作权与商标等相关法律保护。未经授权，不得复制、修改或用于商业用途（合理使用或法律允许的除外）。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">7. 第三方链接</h2>
        <p>
          本网站可能包含指向第三方网站的链接。我们不对第三方内容或隐私做法负责；访问时请查阅对方的条款与政策。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">8. 条款变更</h2>
        <p>
          我们可能修订本条款；更新后继续使用本网站即视为接受修订版本（法律另有强制性要求的除外）。重大变更时我们将尽力通过合理方式进行提示。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">9. 适用法律与争议（概要）</h2>
        <p>
          本条款的解释与争议解决应适用您所在地强制性消费者保护法以外的相关法律规定及司法管辖规则（具体管辖法院或仲裁以适用法律为准）。若您为消费者，您可能享有当地法律赋予、不可通过合同剥夺的权利。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">10. 联系我们</h2>
        <p>
          <a
            className="font-medium text-teal-800 underline-offset-2 hover:underline"
            href="mailto:hello@familymedvault.com?subject=Terms%20inquiry"
          >
            hello@familymedvault.com
          </a>
        </p>
      </section>

      <section className="space-y-2 border-t border-slate-100 pt-6 text-sm text-slate-500">
        <h3 className="font-medium text-slate-700">English summary</h3>
        <p>
          These terms govern use of familymedvault.com: not medical advice,
          community rules, intellectual property, limitation of liability where
          allowed by law, and contact at{" "}
          <a className="text-teal-800 underline" href="mailto:hello@familymedvault.com">
            hello@familymedvault.com
          </a>
          . Use constitutes acceptance of updates posted here.
        </p>
      </section>
    </article>
  );
}
