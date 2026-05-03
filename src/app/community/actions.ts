"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

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

export async function createCommunityIdea(input: {
  title: string;
  body: string;
  authorName?: string;
  authorEmail?: string;
  /** Cloudflare Turnstile token when enforcement is enabled */
  turnstileToken?: string;
  /** Honeypot — must be empty for humans */
  websiteHoneypot?: string;
}): Promise<ActionResult> {
  if (input.websiteHoneypot?.trim()) {
    return { ok: false, error: "提交失败，请刷新页面后重试。" };
  }

  const title = input.title.trim().slice(0, 200);
  const body = input.body.trim().slice(0, 8000);
  const authorEmail = input.authorEmail?.trim() ?? "";
  const authorName = input.authorName?.trim() ?? "";

  if (!title || !body) {
    return { ok: false, error: "标题与正文不能为空。" };
  }

  if (!isValidOptionalEmail(authorEmail)) {
    return { ok: false, error: "邮箱格式不正确。" };
  }

  const spam = checkCommunitySpam(title, body, authorEmail, authorName);
  if (!spam.ok) {
    return { ok: false, error: spam.reason ?? "内容未通过审核。" };
  }

  const turned = await verifyTurnstileToken(input.turnstileToken);
  if (!turned.ok) {
    return {
      ok: false,
      error: "人机验证未通过，请完成验证后重试。",
    };
  }

  const supabase = createPublicSupabase();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const ipHash = await clientIpHash();
  if (ipHash) {
    const rate = await allowCommunityIdeaSubmission(supabase, ipHash);
    if (!rate.ok) {
      return { ok: false, error: "提交过于频繁，请稍后再试。" };
    }
  }

  const { error } = await supabase.from("community_ideas").insert({
    title,
    body,
    author_name: authorName || null,
    author_email: authorEmail || null,
    submitter_ip_hash: ipHash,
  });

  if (error) {
    console.error("[community] insert idea", error.message);
    return { ok: false, error: "提交失败，请稍后再试。" };
  }

  revalidatePath("/community");
  revalidatePath("/");
  return { ok: true };
}

export async function voteOnIdea(input: {
  ideaId: string;
  clientId: string;
}): Promise<ActionResult & { duplicate?: boolean }> {
  const supabase = createPublicSupabase();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const ideaId = input.ideaId.trim();
  const clientId = input.clientId.trim().slice(0, 120);
  if (!ideaId || !clientId) {
    return { ok: false, error: "Invalid vote." };
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
    return { ok: false, error: "点赞失败，请稍后再试。" };
  }

  revalidatePath("/community");
  return { ok: true };
}

export async function addIdeaComment(input: {
  ideaId: string;
  body: string;
  authorName?: string;
  clientId: string;
}): Promise<ActionResult> {
  const supabase = createPublicSupabase();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const body = input.body.trim().slice(0, 2000);
  const clientId = input.clientId.trim().slice(0, 120);
  const authorName = input.authorName?.trim() ?? "";
  if (!input.ideaId || !body || !clientId) {
    return { ok: false, error: "评论内容不能为空。" };
  }

  const spam = checkCommunitySpam(body, authorName);
  if (!spam.ok) {
    return { ok: false, error: spam.reason ?? "评论未通过审核。" };
  }

  const rate = await allowCommentSubmission(supabase, clientId);
  if (!rate.ok) {
    return { ok: false, error: "评论过于频繁，请稍后再试。" };
  }

  const { error } = await supabase.from("idea_comments").insert({
    idea_id: input.ideaId,
    body,
    author_name: authorName || null,
    client_id: clientId,
  });

  if (error) {
    console.error("[community] comment", error.message);
    return { ok: false, error: "评论失败，请稍后再试。" };
  }

  revalidatePath("/community");
  return { ok: true };
}

/** Homepage #community quick form → same `community_ideas` table. */
export async function submitHomePulse(formData: FormData) {
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    redirect("/?pulse=blocked#community");
  }

  const message = String(formData.get("message") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const turnstileToken = String(formData.get("cf-turnstile-response") ?? "");

  if (!message) {
    redirect("/?pulse=empty#community");
  }
  const title =
    message.length <= 120 ? message : `${message.slice(0, 117)}…`;
  const result = await createCommunityIdea({
    title,
    body: message,
    authorName: name || undefined,
    authorEmail: email || undefined,
    turnstileToken: turnstileToken || undefined,
  });
  if (!result.ok) {
    const err = result.error ?? "";
    if (err.includes("人机") || err.includes("验证")) {
      redirect("/?pulse=verify#community");
    }
    if (err.includes("频繁")) {
      redirect("/?pulse=rate#community");
    }
    if (err.includes("邮箱")) {
      redirect("/?pulse=invalid#community");
    }
    if (
      err.includes("拦截") ||
      err.includes("链接") ||
      err.includes("推广") ||
      err.includes("垃圾")
    ) {
      redirect("/?pulse=spam#community");
    }
    redirect("/?pulse=error#community");
  }
  redirect("/community?submitted=1");
}
