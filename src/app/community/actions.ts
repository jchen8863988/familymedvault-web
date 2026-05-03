"use server";

import { revalidateCommunityRoutes } from "@/lib/revalidate-i18n";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  allowCommentSubmission,
  allowCommunityIdeaSubmission,
  hashClientIp,
} from "@/lib/rate-limit";
import {
  checkCommunitySpam,
  isValidOptionalEmail,
} from "@/lib/spam-filter";
import { createPublicSupabase } from "@/lib/supabase/public";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  notifyNewCommunityIdea,
  notifyNewIdeaComment,
} from "@/lib/email/community-notify";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

type IdeaErrorCode =
  | "honeyFailed"
  | "emptyFields"
  | "invalidEmail"
  | "spamPhrase"
  | "spamLinks"
  | "turnstileFailed"
  | "supabaseNotConfigured"
  | "rateLimited"
  | "submitFailed";

async function clientIpHash(): Promise<string | null> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    const first = xff?.split(",")[0]?.trim();
    const ip = first || h.get("x-real-ip") || "";
    if (!ip) return null;
    return hashClientIp(ip);
  } catch {
    return null;
  }
}

async function runCreateIdea(input: {
  title: string;
  body: string;
  authorName?: string;
  authorEmail?: string;
  turnstileToken?: string;
  websiteHoneypot?: string;
  /** Homepage pulse form skips Turnstile; community keeps verification when enforced. */
  skipTurnstileVerification?: boolean;
}): Promise<{ ok: true } | { ok: false; code: IdeaErrorCode }> {
  if (input.websiteHoneypot?.trim()) {
    return { ok: false, code: "honeyFailed" };
  }

  const title = input.title.trim().slice(0, 200);
  const body = input.body.trim().slice(0, 8000);
  const authorEmail = input.authorEmail?.trim() ?? "";
  const authorName = input.authorName?.trim() ?? "";

  if (!title || !body) {
    return { ok: false, code: "emptyFields" };
  }

  if (!isValidOptionalEmail(authorEmail)) {
    return { ok: false, code: "invalidEmail" };
  }

  const spam = checkCommunitySpam(title, body, authorEmail, authorName);
  if (!spam.ok) {
    return {
      ok: false,
      code: spam.reason === "links" ? "spamLinks" : "spamPhrase",
    };
  }

  if (!input.skipTurnstileVerification) {
    const turned = await verifyTurnstileToken(input.turnstileToken);
    if (!turned.ok) {
      return { ok: false, code: "turnstileFailed" };
    }
  }

  const supabase = createPublicSupabase();
  if (!supabase) {
    return { ok: false, code: "supabaseNotConfigured" };
  }

  const ipHash = await clientIpHash();
  if (ipHash) {
    const rate = await allowCommunityIdeaSubmission(supabase, ipHash);
    if (!rate.ok) {
      return { ok: false, code: "rateLimited" };
    }
  }

  const { data: inserted, error } = await supabase
    .from("community_ideas")
    .insert({
      title,
      body,
      author_name: authorName || null,
      author_email: authorEmail || null,
      submitter_ip_hash: ipHash,
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    console.error("[community] insert idea", error?.message ?? "no id");
    return { ok: false, code: "submitFailed" };
  }

  revalidateCommunityRoutes();

  try {
    await notifyNewCommunityIdea({
      id: inserted.id,
      title,
      body,
      authorName: authorName || undefined,
      authorEmail: authorEmail || undefined,
    });
  } catch (e) {
    console.error("[community] notify email after idea", e);
  }

  return { ok: true };
}

function ideaCodeToPulse(code: IdeaErrorCode): string {
  const map: Record<IdeaErrorCode, string> = {
    honeyFailed: "blocked",
    emptyFields: "error",
    invalidEmail: "invalid",
    spamPhrase: "spam",
    spamLinks: "spam",
    turnstileFailed: "verify",
    supabaseNotConfigured: "error",
    rateLimited: "rate",
    submitFailed: "error",
  };
  return map[code] ?? "error";
}

export async function createCommunityIdea(input: {
  title: string;
  body: string;
  authorName?: string;
  authorEmail?: string;
  turnstileToken?: string;
  websiteHoneypot?: string;
}): Promise<ActionResult> {
  const t = await getTranslations("community.errors");
  const r = await runCreateIdea(input);
  if (r.ok) return { ok: true };
  const key = r.code;
  return { ok: false, error: t(key) };
}

export async function voteOnIdea(input: {
  ideaId: string;
  clientId: string;
}): Promise<ActionResult & { duplicate?: boolean }> {
  const t = await getTranslations("community.errors");
  const supabase = createPublicSupabase();
  if (!supabase) {
    return { ok: false, error: t("supabaseNotConfigured") };
  }

  const ideaId = input.ideaId.trim();
  const clientId = input.clientId.trim().slice(0, 120);
  if (!ideaId || !clientId) {
    return { ok: false, error: t("invalidVote") };
  }

  const { error } = await supabase.from("idea_votes").insert({
    idea_id: ideaId,
    client_id: clientId,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, duplicate: true };
    }
    console.error("[community] vote", error.message);
    return { ok: false, error: t("voteFailed") };
  }

  revalidateCommunityRoutes();
  return { ok: true };
}

export async function addIdeaComment(input: {
  ideaId: string;
  body: string;
  authorName?: string;
  clientId: string;
}): Promise<ActionResult> {
  const t = await getTranslations("community.errors");
  const supabase = createPublicSupabase();
  if (!supabase) {
    return { ok: false, error: t("supabaseNotConfigured") };
  }

  const body = input.body.trim().slice(0, 2000);
  const clientId = input.clientId.trim().slice(0, 120);
  const authorName = input.authorName?.trim() ?? "";
  if (!input.ideaId || !body || !clientId) {
    return { ok: false, error: t("emptyComment") };
  }

  const spam = checkCommunitySpam(body, authorName);
  if (!spam.ok) {
    return {
      ok: false,
      error: t(spam.reason === "links" ? "spamLinks" : "spamPhrase"),
    };
  }

  const rate = await allowCommentSubmission(supabase, clientId);
  if (!rate.ok) {
    return { ok: false, error: t("commentRateLimited") };
  }

  const { error } = await supabase.from("idea_comments").insert({
    idea_id: input.ideaId,
    body,
    author_name: authorName || null,
    client_id: clientId,
  });

  if (error) {
    console.error("[community] comment", error.message);
    return { ok: false, error: t("commentFailed") };
  }

  revalidateCommunityRoutes();

  try {
    await notifyNewIdeaComment({
      ideaId: input.ideaId,
      commentBody: body,
      authorName: authorName || undefined,
    });
  } catch (e) {
    console.error("[community] notify email after comment", e);
  }

  return { ok: true };
}

/** Homepage #community quick form → same `community_ideas` table. */
export async function submitHomePulse(formData: FormData) {
  const locale = await getLocale();
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    redirect({ href: "/?pulse=blocked#community", locale });
  }

  const message = String(formData.get("message") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!message) {
    redirect({ href: "/?pulse=empty#community", locale });
  }
  const title =
    message.length <= 120 ? message : `${message.slice(0, 117)}…`;
  const result = await runCreateIdea({
    title,
    body: message,
    authorName: name || undefined,
    authorEmail: email || undefined,
    skipTurnstileVerification: true,
  });
  if (!result.ok) {
    const pulse = ideaCodeToPulse(result.code);
    redirect({ href: `/?pulse=${pulse}#community`, locale });
  }
  redirect({ href: "/community?submitted=1", locale });
}
