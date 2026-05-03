"use client";

import type { CommunityIdeaRow } from "@/types/community";
import {
  deleteCommunityIdeaAdmin,
  logoutCommunityAdmin,
  togglePinCommunityIdea,
} from "@/app/community/admin-actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = { ideas: CommunityIdeaRow[] };

export function AdminPanel({ ideas: initialIdeas }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [ideas, setIdeas] = useState(initialIdeas);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setFeedback(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        setFeedback(r.error ?? "操作失败");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">帖子列表</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/community"
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            返回社区
          </Link>
          <form action={logoutCommunityAdmin}>
            <button
              type="submit"
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              退出登录
            </button>
          </form>
        </div>
      </div>
      {feedback ? (
        <p className="text-sm text-red-600" role="alert">
          {feedback}
        </p>
      ) : null}
      {ideas.length === 0 ? (
        <p className="text-sm text-slate-600">暂无帖子。</p>
      ) : (
        <ul className="space-y-4">
          {ideas.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {item.pinned ? (
                      <span className="mr-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                        置顶
                      </span>
                    ) : null}
                    {item.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {item.body}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(item.created_at).toLocaleString()} · id: {item.id}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
                    onClick={() => {
                      run(async () => {
                        const r = await togglePinCommunityIdea(item.id);
                        if (r.ok && typeof r.pinned === "boolean") {
                          setIdeas((prev) =>
                            prev.map((row) =>
                              row.id === item.id
                                ? { ...row, pinned: r.pinned! }
                                : row,
                            ),
                          );
                        }
                        return r;
                      });
                    }}
                  >
                    {item.pinned ? "取消置顶" : "置顶"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-800 hover:bg-red-100 disabled:opacity-50"
                    onClick={() => {
                      if (
                        !confirm(
                          "确定删除该帖？关联的点赞与评论将一并删除，且不可恢复。",
                        )
                      ) {
                        return;
                      }
                      run(async () => {
                        const r = await deleteCommunityIdeaAdmin(item.id);
                        if (r.ok) {
                          setIdeas((prev) =>
                            prev.filter((row) => row.id !== item.id),
                          );
                        }
                        return r;
                      });
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
