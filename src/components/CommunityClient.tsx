"use client";

import { useMemo, useState } from "react";

type SortKey = "hot" | "new";

const demoIdeas = [
  {
    id: "1",
    title: "帮我汇总全家疫苗与过敏史",
    body: "出国急诊时医生问病史，纸质散落各处，希望一键导出双语 PDF。",
    votes: 42,
    createdAt: "2026-04-28",
  },
  {
    id: "2",
    title: "转诊单照片太乱",
    body: "专科医院转诊经常拍照丢相册，想按科室和时间自动归档。",
    votes: 31,
    createdAt: "2026-05-01",
  },
  {
    id: "3",
    title: "希望有「药吃完前 7 天」提醒",
    body: "不要只提醒当天吃，而是提前提醒续方和库存。",
    votes: 18,
    createdAt: "2026-05-02",
  },
];

export function CommunityClient() {
  const [sort, setSort] = useState<SortKey>("hot");
  const [localVotes, setLocalVotes] = useState<Record<string, number>>({});

  const sorted = useMemo(() => {
    const rows = demoIdeas.map((row) => ({
      ...row,
      votes: row.votes + (localVotes[row.id] ?? 0),
    }));
    if (sort === "hot") {
      return [...rows].sort((a, b) => b.votes - a.votes);
    }
    return [...rows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [sort, localVotes]);

  return (
    <div className="mx-auto max-w-4xl px-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="flex gap-2">
          {(
            [
              ["hot", "最热门"],
              ["new", "最新"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                sort === key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Demo 数据 · 接上 Supabase 后替换为真实帖子、点赞与评论
        </p>
      </div>

      <form
        className="mt-10 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-8"
        onSubmit={(e) => {
          e.preventDefault();
          alert("首版：表单尚未连接数据库。在 Supabase 建表后用 Server Action 或 API Route 写入。");
        }}
      >
        <h2 className="text-xl font-semibold">提交你的想法</h2>
        <input
          className="rounded-2xl border border-slate-200 bg-white p-4 outline-none focus:border-slate-400"
          placeholder="标题（一句话）"
          required
        />
        <textarea
          className="min-h-[140px] rounded-2xl border border-slate-200 bg-white p-4 outline-none focus:border-slate-400"
          placeholder="描述你的问题、想要的工具、或你觉得很差的 App…"
          required
        />
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded-2xl border border-slate-200 bg-white p-4 outline-none focus:border-slate-400"
            placeholder="称呼（可选）"
          />
          <input
            type="email"
            className="rounded-2xl border border-slate-200 bg-white p-4 outline-none focus:border-slate-400"
            placeholder="邮箱（可选，便于跟进）"
          />
        </div>
        <button
          type="submit"
          className="rounded-2xl bg-slate-900 px-6 py-4 font-medium text-white transition hover:bg-slate-800"
        >
          提交（待接 Supabase）
        </button>
      </form>

      <div className="mt-12 space-y-4">
        <h3 className="text-lg font-semibold">想法墙</h3>
        {sorted.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">{item.title}</h4>
                <p className="mt-2 text-slate-600">{item.body}</p>
                <p className="mt-3 text-xs text-slate-400">{item.createdAt}</p>
              </div>
              <div className="flex items-center gap-3 md:flex-col md:items-end">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                  onClick={() =>
                    setLocalVotes((prev) => ({
                      ...prev,
                      [item.id]: (prev[item.id] ?? 0) + 1,
                    }))
                  }
                >
                  👍 {item.votes}
                </button>
                <button
                  type="button"
                  className="text-sm text-teal-800 underline-offset-2 hover:underline"
                  onClick={() => alert("评论：下一步用 Supabase 存 threaded comments。")}
                >
                  评论
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
