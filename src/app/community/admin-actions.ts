"use server";

import { createHash, timingSafeEqual } from "crypto";
import { revalidateAdminRoutes, revalidateCommunityRoutes } from "@/lib/revalidate-i18n";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
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
  const locale = await getLocale();
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) {
    redirect({ href: "/community/admin?err=1", locale });
  }
  await setAdminSessionCookie();
  redirect({ href: "/community/admin", locale });
}

export async function logoutCommunityAdmin() {
  const locale = await getLocale();
  await clearAdminSessionCookie();
  redirect({ href: "/community/admin", locale });
}

export async function deleteCommunityIdeaAdmin(
  ideaId: string,
): Promise<ActionResult> {
  const t = await getTranslations("admin.errors");
  if (!(await verifyCommunityAdminSession())) {
    return { ok: false, error: t("session") };
  }
  const sb = createServiceSupabase();
  if (!sb) {
    return { ok: false, error: t("noServiceKey") };
  }
  const id = ideaId.trim();
  if (!id) return { ok: false, error: t("invalidId") };

  const { error } = await sb.from("community_ideas").delete().eq("id", id);
  if (error) {
    console.error("[community admin] delete", error.message);
    return { ok: false, error: t("deleteFailed") };
  }
  revalidateCommunityRoutes();
  revalidateAdminRoutes();
  return { ok: true };
}

export async function togglePinCommunityIdea(
  ideaId: string,
): Promise<ActionResult & { pinned?: boolean }> {
  const t = await getTranslations("admin.errors");
  if (!(await verifyCommunityAdminSession())) {
    return { ok: false, error: t("session") };
  }
  const sb = createServiceSupabase();
  if (!sb) {
    return { ok: false, error: t("noServiceKey") };
  }
  const id = ideaId.trim();
  if (!id) return { ok: false, error: t("invalidId") };

  const { data: row, error: fetchErr } = await sb
    .from("community_ideas")
    .select("pinned")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) {
    return { ok: false, error: t("notFound") };
  }

  const nextPinned = !(row.pinned ?? false);
  const { error } = await sb
    .from("community_ideas")
    .update({ pinned: nextPinned })
    .eq("id", id);

  if (error) {
    console.error("[community admin] pin", error.message);
    return { ok: false, error: t("pinFailed") };
  }
  revalidateCommunityRoutes();
  revalidateAdminRoutes();
  return { ok: true, pinned: nextPinned };
}
