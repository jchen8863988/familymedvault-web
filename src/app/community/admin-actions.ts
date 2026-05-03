"use server";

import { createHash, timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSessionCookie,
  setAdminSessionCookie,
  verifyCommunityAdminSession,
} from "@/lib/admin-session";
import { createServiceSupabase } from "@/lib/supabase/admin";
import type { ActionResult } from "./actions";

function verifyAdminPassword(input: string): boolean {
  const secret = process.env.COMMUNITY_ADMIN_SECRET;
  if (!secret || !input) return false;
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(secret, "utf8").digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function loginCommunityAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) {
    redirect("/community/admin?err=1");
  }
  await setAdminSessionCookie();
  redirect("/community/admin");
}

export async function logoutCommunityAdmin() {
  await clearAdminSessionCookie();
  redirect("/community/admin");
}

export async function deleteCommunityIdeaAdmin(
  ideaId: string,
): Promise<ActionResult> {
  if (!(await verifyCommunityAdminSession())) {
    return { ok: false, error: "未登录或会话已过期。" };
  }
  const sb = createServiceSupabase();
  if (!sb) {
    return { ok: false, error: "服务器未配置 SUPABASE_SERVICE_ROLE_KEY。" };
  }
  const id = ideaId.trim();
  if (!id) return { ok: false, error: "无效 ID。" };

  const { error } = await sb.from("community_ideas").delete().eq("id", id);
  if (error) {
    console.error("[community admin] delete", error.message);
    return { ok: false, error: "删除失败，请稍后再试。" };
  }
  revalidatePath("/community");
  revalidatePath("/community/admin");
  return { ok: true };
}

export async function togglePinCommunityIdea(
  ideaId: string,
): Promise<ActionResult & { pinned?: boolean }> {
  if (!(await verifyCommunityAdminSession())) {
    return { ok: false, error: "未登录或会话已过期。" };
  }
  const sb = createServiceSupabase();
  if (!sb) {
    return { ok: false, error: "服务器未配置 SUPABASE_SERVICE_ROLE_KEY。" };
  }
  const id = ideaId.trim();
  if (!id) return { ok: false, error: "无效 ID。" };

  const { data: row, error: fetchErr } = await sb
    .from("community_ideas")
    .select("pinned")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) {
    return { ok: false, error: "找不到该帖子。" };
  }

  const nextPinned = !(row.pinned ?? false);
  const { error } = await sb
    .from("community_ideas")
    .update({ pinned: nextPinned })
    .eq("id", id);

  if (error) {
    console.error("[community admin] pin", error.message);
    return { ok: false, error: "操作失败，请稍后再试。" };
  }
  revalidatePath("/community");
  revalidatePath("/community/admin");
  return { ok: true, pinned: nextPinned };
}
