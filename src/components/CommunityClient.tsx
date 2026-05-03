"use client";

import type { CommunityIdeaRow, IdeaCommentRow } from "@/types/community";
import {
  addIdeaComment,
  createCommunityIdea,
  voteOnIdea,
} from "@/app/community/actions";
import {
  TurnstileField,
  isTurnstileConfigured,
} from "@/components/TurnstileField";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";

type SortKey = "hot" | "new";

function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "";
  try {
    const key = "fmv_client_id";
    let id = window.localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

type Props = {
  configured: boolean;
  initialIdeas: CommunityIdeaRow[];
};

export function CommunityClient({ configured, initialIdeas }: Props) {
  const t = useTranslations("communityClient");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sort, setSort] = useState<SortKey>("hot");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [voteFlash, setVoteFlash] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentsByIdea, setCommentsByIdea] = useState<
    Record<string, IdeaCommentRow[]>
  >({});
  const [loadingCommentsId, setLoadingCommentsId] = useState<string | null>(
    null,
  );
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  const [commentNames, setCommentNames] = useState<Record<string, string>>({});
  const honeyRef = useRef<HTMLInputElement>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileOn = isTurnstileConfigured();

  const sorted = useMemo(() => {
    const rows = [...initialIdeas];
    const pinOrder = (a: CommunityIdeaRow, b: CommunityIdeaRow) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return 0;
    };
    if (sort === "hot") {
      return rows.sort((a, b) => {
        const p = pinOrder(a, b);
        if (p !== 0) return p;
        if (b.vote_count !== a.vote_count) {
          return b.vote_count - a.vote_count;
        }
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    }
    return rows.sort((a, b) => {
      const p = pinOrder(a, b);
      if (p !== 0) return p;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [initialIdeas, sort]);

  const loadComments = useCallback(async (ideaId: string) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setLoadingCommentsId(ideaId);
    const { data, error } = await supabase
      .from("idea_comments")
      .select("id, idea_id, body, author_name, created_at")
      .eq("idea_id", ideaId)
      .order("created_at", { ascending: true });
    setLoadingCommentsId(null);
    if (error) {
      setFeedback(t("loadCommentsFail"));
      return;
    }
    setCommentsByIdea((prev) => ({
      ...prev,
      [ideaId]: (data ?? []) as IdeaCommentRow[],
    }));
  }, [t]);

  const handleSubmitIdea = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (honeyRef.current?.value?.trim()) {
      setFeedback(t("honeyFail"));
      return;
    }
    if (turnstileOn && !turnstileToken?.trim()) {
      setFeedback(t("verifyFirst"));
      return;
    }
    startTransition(async () => {
      const res = await createCommunityIdea({
        title,
        body,
        authorName: authorName || undefined,
        authorEmail: authorEmail || undefined,
        turnstileToken: turnstileToken ?? undefined,
        websiteHoneypot: honeyRef.current?.value ?? "",
      });
      if (!res.ok) {
        setFeedback(res.error);
        return;
      }
      setTitle("");
      setBody("");
      setAuthorName("");
      setAuthorEmail("");
      setTurnstileToken(null);
      setFeedback(t("thanks"));
      router.refresh();
    });
  };

  const handleVote = (ideaId: string) => {
    setFeedback(null);
    setVoteFlash(null);
    const clientId = getOrCreateClientId();
    if (!clientId) {
      setFeedback(t("voteStorage"));
      return;
    }
    startTransition(async () => {
      const res = await voteOnIdea({ ideaId, clientId });
      if (!res.ok) {
        setFeedback(res.error);
        return;
      }
      if ("duplicate" in res && res.duplicate) {
        setVoteFlash(t("voteDuplicate"));
        return;
      }
      router.refresh();
    });
  };

  const handleSubmitComment = (ideaId: string) => {
    const text = (commentDrafts[ideaId] ?? "").trim();
    const name = (commentNames[ideaId] ?? "").trim();
    if (!text) {
      setFeedback(t("commentEmpty"));
      return;
    }
    const clientId = getOrCreateClientId();
    if (!clientId) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await addIdeaComment({
        ideaId,
        body: text,
        authorName: name || undefined,
        clientId,
      });
      if (!res.ok) {
        setFeedback(res.error);
        return;
      }
      setCommentDrafts((prev) => ({ ...prev, [ideaId]: "" }));
      await loadComments(ideaId);
      router.refresh();
    });
  };

  const toggleComments = (ideaId: string) => {
    if (expandedId === ideaId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(ideaId);
    if (!commentsByIdea[ideaId]) {
      void loadComments(ideaId);
    }
  };

  if (!configured) {
    return (
      <div className="mx-auto max-w-4xl px-6 pb-20">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-950">
          <p className="font-medium">{t("notConfiguredTitle")}</p>
          <p className="mt-2 text-amber-900/90">{t("notConfiguredBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="flex gap-2">
          {(
            [
              ["hot", t("sortHot")],
              ["new", t("sortNew")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              disabled={pending}
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
        <p className="text-xs text-slate-500">{t("metaLine")}</p>
      </div>

      {feedback ? (
        <p className="mt-6 text-sm text-slate-700" role="status">
          {feedback}
        </p>
      ) : null}
      {voteFlash ? (
        <p className="mt-2 text-sm text-teal-800" role="status">
          {voteFlash}
        </p>
      ) : null}

      <form
        className="mt-10 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-8"
        onSubmit={handleSubmitIdea}
      >
        <input
          ref={honeyRef}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        <h2 className="text-xl font-semibold">{t("formTitle")}</h2>
        <input
          className="rounded-2xl border border-slate-200 bg-white p-4 outline-none focus:border-slate-400"
          placeholder={t("titlePh")}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={pending}
          maxLength={200}
        />
        <textarea
          className="min-h-[140px] rounded-2xl border border-slate-200 bg-white p-4 outline-none focus:border-slate-400"
          placeholder={t("bodyPh")}
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={pending}
          maxLength={8000}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded-2xl border border-slate-200 bg-white p-4 outline-none focus:border-slate-400"
            placeholder={t("namePh")}
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            disabled={pending}
          />
          <input
            type="email"
            className="rounded-2xl border border-slate-200 bg-white p-4 outline-none focus:border-slate-400"
            placeholder={t("emailPh")}
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            disabled={pending}
          />
        </div>
        <TurnstileField onTokenChange={setTurnstileToken} />
        <button
          type="submit"
          disabled={pending || (turnstileOn && !turnstileToken)}
          className="rounded-2xl bg-slate-900 px-6 py-4 font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? t("submitting") : t("submit")}
        </button>
      </form>

      <div className="mt-12 space-y-4">
        <h3 className="text-lg font-semibold">{t("wallTitle")}</h3>
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-600">{t("emptyWall")}</p>
        ) : null}
        {sorted.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <h4 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900">
                  {item.pinned ? (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      {t("pinned")}
                    </span>
                  ) : null}
                  <span>{item.title}</span>
                </h4>
                <p className="mt-2 whitespace-pre-wrap text-slate-600">
                  {item.body}
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  {new Date(item.created_at).toLocaleString()}
                  {item.author_name ? ` · ${item.author_name}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-3 md:items-end">
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                  onClick={() => handleVote(item.id)}
                >
                  👍 {item.vote_count}
                </button>
                <button
                  type="button"
                  className="text-left text-sm text-teal-800 underline-offset-2 hover:underline md:text-right"
                  onClick={() => toggleComments(item.id)}
                >
                  {t("comments", { count: item.comment_count })}
                </button>
              </div>
            </div>

            {expandedId === item.id ? (
              <div className="mt-6 border-t border-slate-100 pt-4">
                {loadingCommentsId === item.id ? (
                  <p className="text-sm text-slate-500">{t("loadingComments")}</p>
                ) : (
                  <ul className="space-y-3">
                    {(commentsByIdea[item.id] ?? []).map((c) => (
                      <li
                        key={c.id}
                        className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                      >
                        <p className="whitespace-pre-wrap">{c.body}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          {new Date(c.created_at).toLocaleString()}
                          {c.author_name ? ` · ${c.author_name}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 grid gap-2">
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    placeholder={t("commentNamePh")}
                    value={commentNames[item.id] ?? ""}
                    onChange={(e) =>
                      setCommentNames((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    disabled={pending}
                  />
                  <textarea
                    className="min-h-[80px] rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-slate-400"
                    placeholder={t("commentBodyPh")}
                    value={commentDrafts[item.id] ?? ""}
                    onChange={(e) =>
                      setCommentDrafts((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    disabled={pending}
                    maxLength={2000}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    className="w-fit rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    onClick={() => handleSubmitComment(item.id)}
                  >
                    {t("sendComment")}
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
