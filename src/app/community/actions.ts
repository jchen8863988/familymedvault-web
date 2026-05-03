"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPublicSupabase } from "@/lib/supabase/public";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createCommunityIdea(input: {
  title: string;
  body: string;
  authorName?: string;
  authorEmail?: string;
}): Promise<ActionResult> {
  const supabase = createPublicSupabase();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const title = input.title.trim().slice(0, 200);
  const body = input.body.trim().slice(0, 8000);
  if (!title || !body) {
    return { ok: false, error: "标题与正文不能为空。" };
  }

  const { error } = await supabase.from("community_ideas").insert({
    title,
    body,
    author_name: input.authorName?.trim() || null,
    author_email: input.authorEmail?.trim() || null,
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
  if (!input.ideaId || !body || !clientId) {
    return { ok: false, error: "评论内容不能为空。" };
  }

  const { error } = await supabase.from("idea_comments").insert({
    idea_id: input.ideaId,
    body,
    author_name: input.authorName?.trim() || null,
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
  const message = String(formData.get("message") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
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
  });
  if (!result.ok) {
    redirect("/?pulse=error#community");
  }
  redirect("/community?submitted=1");
}
