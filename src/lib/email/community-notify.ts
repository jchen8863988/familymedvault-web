/**
 * Optional notifications: if `RESEND_API_KEY` / sender are missing, all functions no-op.
 * Posting and comments still succeed (see `app/community/actions.ts` — notify runs after insert, errors swallowed).
 */
import { Resend } from "resend";
import { createPublicSupabase } from "@/lib/supabase/public";
import { SITE_URL } from "@/lib/seo";

const MAX_BODY_SNIPPET = 2000;
const MAX_COMMENT_SNIPPET = 800;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseAdminEmails(): string[] {
  const raw = process.env.COMMUNITY_NOTIFY_EMAIL?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/** Resend returns `{ data, error }` and does not throw on API failures — must check `error`. */
function logResendResult(
  context: string,
  result: { error: unknown },
): boolean {
  if (result.error) {
    console.error(`[community-email] ${context}`, result.error);
    return false;
  }
  return true;
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

let warnedDefaultFrom = false;
let warnedNotifyEmailEmpty = false;

/** Verified domain in production; if unset, Resend test sender (only delivers to your account email per Resend rules). */
function resolveFromEmail(): string | null {
  const explicit = process.env.RESEND_FROM_EMAIL?.trim();
  if (explicit) return explicit;
  if (process.env.RESEND_API_KEY?.trim()) {
    if (!warnedDefaultFrom) {
      warnedDefaultFrom = true;
      console.warn(
        "[community-email] RESEND_FROM_EMAIL unset — using onboarding@resend.dev (testing only; verify your domain and set RESEND_FROM_EMAIL for production)",
      );
    }
    return "FamilyMedVault <onboarding@resend.dev>";
  }
  return null;
}

const communityEnUrl = `${SITE_URL}/community`;

/** After insert success: email admins + optional receipt to author. Failures are logged only. */
export async function notifyNewCommunityIdea(input: {
  id: string;
  title: string;
  body: string;
  authorName?: string;
  authorEmail?: string;
}): Promise<void> {
  const resend = getResend();
  const from = resolveFromEmail();
  if (!resend || !from) {
    return;
  }

  const adminTo = parseAdminEmails();
  if (adminTo.length === 0 && !warnedNotifyEmailEmpty) {
    warnedNotifyEmailEmpty = true;
    console.warn(
      "[community-email] COMMUNITY_NOTIFY_EMAIL is empty — admin idea alerts will not be sent (set comma-separated addresses in .env)",
    );
  }
  const titleEsc = escapeHtml(input.title);
  const bodyPreview = escapeHtml(
    input.body.length > MAX_BODY_SNIPPET
      ? `${input.body.slice(0, MAX_BODY_SNIPPET)}…`
      : input.body,
  );
  const authorLine =
    input.authorName || input.authorEmail
      ? `<p><strong>From:</strong> ${escapeHtml(input.authorName ?? "(no name)")}${input.authorEmail ? ` (${escapeHtml(input.authorEmail)})` : ""}</p>`
      : "";

  if (adminTo.length > 0) {
    try {
      const sent = await resend.emails.send({
        from,
        to: adminTo,
        subject: `[FamilyMedVault] New community idea: ${input.title.slice(0, 80)}${input.title.length > 80 ? "…" : ""}`,
        html: `<p>A new idea was posted on the community wall.</p>
<p><strong>ID:</strong> ${escapeHtml(input.id)}</p>
<p><strong>Title:</strong> ${titleEsc}</p>
${authorLine}
<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif">${bodyPreview}</pre>
<p><a href="${communityEnUrl}">Open community</a></p>`,
      });
      logResendResult("admin new idea", sent);
    } catch (e) {
      console.error("[community-email] admin new idea (exception)", e);
    }
  }

  const author = input.authorEmail?.trim();
  const sendAuthor =
    author &&
    process.env.COMMUNITY_NOTIFY_AUTHOR !== "0" &&
    process.env.COMMUNITY_NOTIFY_AUTHOR !== "false";

  if (sendAuthor && author) {
    try {
      const sent = await resend.emails.send({
        from,
        to: [author],
        subject: "We received your FamilyMedVault community message",
        html: `<p>Thanks for sharing your idea with FamilyMedVault.</p>
<p><strong>Title:</strong> ${titleEsc}</p>
<p>We have received the following (abbreviated if long):</p>
<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif">${bodyPreview}</pre>
<p>You can view the public community at <a href="${communityEnUrl}">${communityEnUrl}</a>.</p>
<p>This is an automated message about your submission.</p>`,
      });
      logResendResult("author receipt", sent);
    } catch (e) {
      console.error("[community-email] author receipt (exception)", e);
    }
  }
}

/** Notify admins when a new comment is posted (optional ops signal). */
export async function notifyNewIdeaComment(input: {
  ideaId: string;
  commentBody: string;
  authorName?: string;
}): Promise<void> {
  const resend = getResend();
  const from = resolveFromEmail();
  const adminTo = parseAdminEmails();
  if (!resend || !from || adminTo.length === 0) return;

  const supabase = createPublicSupabase();
  let ideaTitle = "(unknown)";
  if (supabase) {
    const { data } = await supabase
      .from("community_ideas")
      .select("title")
      .eq("id", input.ideaId)
      .maybeSingle();
    if (data?.title) ideaTitle = data.title;
  }

  const bodyPreview = escapeHtml(
    input.commentBody.length > MAX_COMMENT_SNIPPET
      ? `${input.commentBody.slice(0, MAX_COMMENT_SNIPPET)}…`
      : input.commentBody,
  );
  const author = input.authorName?.trim()
    ? escapeHtml(input.authorName.trim())
    : "Anonymous";

  try {
    const sent = await resend.emails.send({
      from,
      to: adminTo,
      subject: `[FamilyMedVault] New comment on: ${ideaTitle.slice(0, 60)}${ideaTitle.length > 60 ? "…" : ""}`,
      html: `<p>A new comment was posted.</p>
<p><strong>Idea ID:</strong> ${escapeHtml(input.ideaId)}</p>
<p><strong>Idea title:</strong> ${escapeHtml(ideaTitle)}</p>
<p><strong>Comment by:</strong> ${author}</p>
<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif">${bodyPreview}</pre>
<p><a href="${communityEnUrl}">Open community</a></p>`,
    });
    logResendResult("admin new comment", sent);
  } catch (e) {
    console.error("[community-email] admin new comment (exception)", e);
  }
}
