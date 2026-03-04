"use client";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <header className="border-b border-white/5 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/40">
              <span className="text-sm font-semibold text-emerald-300">M</span>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">
                某某科技有限公司
              </p>
              <p className="text-xs text-slate-400">MOMO TECHNOLOGY</p>
            </div>
          </div>
          <nav className="hidden gap-6 text-xs text-slate-300 sm:flex">
            <a href="#about" className="hover:text-white">
              公司简介
            </a>
            <a href="#services" className="hover:text-white">
              业务领域
            </a>
            <a href="#cases" className="hover:text-white">
              成功案例
            </a>
            <a href="#team" className="hover:text-white">
              核心团队
            </a>
            <a href="#contact" className="hover:text-white">
              联系我们
            </a>
          </nav>
          <a
            href="#contact"
            className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-slate-950 shadow-lg shadow-emerald-500/40 hover:bg-emerald-400"
          >
            获取方案
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16 pt-10 space-y-24">
        <section className="grid gap-10 md:grid-cols-[3fr,2fr] md:items-center">
          <div>
            <p className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
              专注中小企业数字化升级
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              用技术，帮您的公司
              <span className="block bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">
                经营更高效、增长更稳定
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
              某某科技是一家专注企业数字化解决方案的技术公司，服务覆盖企业官网、业务系统开发、
              数据可视化、流程自动化等多个领域，已为多家成长型企业搭建稳定可靠的线上基础设施。
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-200">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                一站式数字化解决方案
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                深耕 B 端实战经验
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 -translate-y-6 translate-x-4 rounded-3xl bg-emerald-500/20 blur-3xl" />
            <div className="relative rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-emerald-500/20">
              <p className="text-xs font-medium text-slate-200">
                我们能为您做什么？
              </p>
              <ul className="mt-4 space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>企业官网 / 品牌官网设计与开发，统一线上形象。</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>内部业务系统、流程审批、报表平台定制开发。</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-violet-400" />
                  <span>数据看板与经营分析，辅助业务决策。</span>
                </li>
              </ul>
              <div className="mt-5 grid grid-cols-3 gap-3 text-[11px] text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-lg font-semibold text-emerald-300">50+</p>
                  <p>服务企业</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-lg font-semibold text-emerald-300">98%</p>
                  <p>项目按期交付</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-lg font-semibold text-emerald-300">7×12</p>
                  <p>技术支持</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                公司简介
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                一家以技术驱动业务增长的创新型科技公司。
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-3 text-sm leading-relaxed text-slate-200">
              <p>
                某某科技成立于 20XX
                年，核心团队来自互联网及传统行业数字化部门，既懂技术又懂业务。我们长期陪伴客户一起打磨系统，关注“能真正落地、能被一线同事用好”的解决方案。
              </p>
              <p>
                我们擅长用轻量、敏捷的方式迭代产品：从企业官网、活动落地页，到内部业务平台、数字化运营工具，覆盖企业对外展示和对内管理的关键场景。
              </p>
            </div>
            <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-200">
              <p className="font-medium text-slate-50">公司信息</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">公司名称</span>
                  <span>某某科技有限公司</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">成立时间</span>
                  <span>20XX 年</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">业务范围</span>
                  <span>全国 · 远程交付</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">服务对象</span>
                  <span>中小企业 / 事业单位</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                核心业务
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                围绕企业经营全过程，提供可落地的数字化服务。
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-sm font-semibold text-slate-50">
                企业官网与品牌网站
              </p>
              <p className="mt-2 text-xs text-slate-300">
                从信息架构、视觉设计到前后端开发，一站式打造专业线上门面，支持多语言与移动端适配。
              </p>
              <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                <li>· 官网 / 产品站 / 招聘站</li>
                <li>· 品牌形象统一与升级</li>
                <li>· SEO 基础优化</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-sm font-semibold text-slate-50">
                业务系统定制开发
              </p>
              <p className="mt-2 text-xs text-slate-300">
                围绕业务流程搭建系统，如订单管理、审批流、客户管理、内部运营平台等，可与现有系统集成。
              </p>
              <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                <li>· 需求梳理与流程设计</li>
                <li>· Web / 小程序多端接入</li>
                <li>· 权限 / 日志 / 审批流</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-sm font-semibold text-slate-50">
                数据可视化与运营分析
              </p>
              <p className="mt-2 text-xs text-slate-300">
                打通多渠道数据，构建实时看板和经营报表，帮助管理层更直观地掌握业务情况。
              </p>
              <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                <li>· 经营指标看板</li>
                <li>· 自助数据分析组件</li>
                <li>· 预警与通知机制</li>
              </ul>
            </div>
          </div>
        </section>

        <section
          id="cases"
          className="grid gap-6 md:grid-cols-[3fr,2fr] md:items-start"
        >
          <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-50">
                部分合作案例（节选）
              </h2>
              <span className="text-[11px] text-slate-400">
                出于保密，以下为匿名描述
              </span>
            </div>
            <div className="space-y-3 text-xs text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                <p className="font-medium">某制造企业 · 内部运营平台</p>
                <p className="mt-1 text-slate-300">
                  为一家传统制造企业搭建生产进度与库存管理系统，对接原有 ERP
                  ，将一线纸质流程电子化，生产异常响应时间缩短约 40%。
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                <p className="font-medium">某教育机构 · 招生官网</p>
                <p className="mt-1 text-slate-300">
                  重新设计并开发招生官网，打通在线咨询、报名与数据追踪，实现广告投放效果可视化，报名转化率提升约
                  25%。
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                <p className="font-medium">某服务企业 · 报表看板</p>
                <p className="mt-1 text-slate-300">
                  为服务型企业搭建经营数据看板，从多个系统汇总指标，老板可以随时查看客户、项目和回款情况。
                </p>
              </div>
            </div>
          </div>

          <div
            id="team"
            className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5"
          >
            <h2 className="text-sm font-semibold text-slate-50">核心团队</h2>
            <p className="text-xs text-slate-300">
              团队成员拥有互联网大厂及传统行业信息化经验，既熟悉现代技术栈，也理解企业内部管理和流程约束。
            </p>
            <ul className="space-y-2 text-xs text-slate-200">
              <li>· 超 8 年前端 / 全栈开发经验</li>
              <li>· 熟悉云原生、Serverless 与主流数据库</li>
              <li>· 多个 0→1 企业系统落地经验</li>
            </ul>
          </div>
        </section>

        <section
          id="contact"
          className="grid gap-6 rounded-3xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-sky-500/15 p-5 md:grid-cols-[2fr,3fr]"
        >
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-50">
              联系我们，获取一份适合贵公司的数字化方案
            </h2>
            <p className="text-xs text-slate-200">
              欢迎添加微信或发送邮件简单介绍您的行业、规模和当前困惑，我们会在 1 个工作日内回复。
            </p>
            <div className="space-y-2 text-xs text-slate-100">
              <p>
                邮箱：
                <span className="font-mono">contact@example.com</span>
              </p>
              <p>
                微信：
                <span className="font-mono">your-wechat-id</span>
              </p>
              <p>
                电话：
                <span className="font-mono">010-1234 5678</span>
              </p>
            </div>
          </div>
          <form className="space-y-3 text-xs text-slate-100">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label>您的姓名</label>
                <input
                  type="text"
                  placeholder="例如：张先生 / 李女士"
                  className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-xs outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>
              <div className="space-y-1.5">
                <label>公司名称</label>
                <input
                  type="text"
                  placeholder="例如：某某科技有限公司"
                  className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-xs outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label>联系方式（邮箱 / 微信）</label>
              <input
                type="text"
                placeholder="我们将通过该方式与您联系"
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-xs outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              />
            </div>
            <div className="space-y-1.5">
              <label>简单描述您的需求</label>
              <textarea
                rows={3}
                placeholder="例如：希望搭建企业官网，并接入简单的招聘与表单收集功能。"
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-xs outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-slate-950/80 px-4 py-2 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/50 hover:bg-slate-900"
            >
              提交意向（示意按钮）
            </button>
            <p className="text-[11px] text-slate-300">
              当前为演示表单，点击后不会真正发送信息。正式使用时可接入邮箱、企业微信或 CRM
              系统。
            </p>
          </form>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-4 text-[11px] text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} 某某科技有限公司. 保留所有权利。</p>
          <p>备案号示意：京ICP备 00000000 号</p>
        </div>
      </footer>
    </div>
  );
}

