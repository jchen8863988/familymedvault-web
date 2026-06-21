"use server";

import { createHash, timingSafeEqual } from "crypto";
import { revalidateAppsRoutes } from "@/lib/revalidate-i18n";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  clearAppsAdminSessionCookie,
  setAppsAdminSessionCookie,
  verifyAppsAdminSession,
} from "@/lib/admin-session";
import { normalizeHttpUrl, normalizeStoreSlug } from "@/lib/store-apps-utils";
import { createServiceSupabase } from "@/lib/supabase/admin";

export type AppsAdminActionResult =
  | { ok: true }
  | { ok: false; error: string };

function isDuplicateSlugError(message: string, code?: string): boolean {
  if (code === "23505") return true;
  return /duplicate key|unique constraint|store_apps.*slug/i.test(message);
}

function verifyAppsPassword(input: string): boolean {
  const secret = process.env.APPS_ADMIN_SECRET;
  if (!secret || !input) return false;
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(secret, "utf8").digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function loginAppsAdmin(formData: FormData) {
  const locale = await getLocale();
  const password = String(formData.get("password") ?? "");
  if (!verifyAppsPassword(password)) {
    redirect({ href: "/apps/admin?err=1", locale });
  }
  await setAppsAdminSessionCookie();
  redirect({ href: "/apps/admin", locale });
}

export async function logoutAppsAdmin() {
  const locale = await getLocale();
  await clearAppsAdminSessionCookie();
  redirect({ href: "/apps/admin", locale });
}

export async function upsertStoreApp(
  formData: FormData,
): Promise<AppsAdminActionResult> {
  const t = await getTranslations("appsAdmin.errors");
  if (!(await verifyAppsAdminSession())) {
    return { ok: false, error: t("session") };
  }
  const sb = createServiceSupabase();
  if (!sb) return { ok: false, error: t("noServiceKey") };

  const id = String(formData.get("id") ?? "").trim();
  const slug = normalizeStoreSlug(String(formData.get("slug") ?? ""));
  if (!slug) return { ok: false, error: t("invalidSlug") };

  const name_en = String(formData.get("name_en") ?? "").trim();
  const name_zh = String(formData.get("name_zh") ?? "").trim();
  const tagline_en =
    String(formData.get("tagline_en") ?? "").trim() || null;
  const tagline_zh =
    String(formData.get("tagline_zh") ?? "").trim() || null;

  const platform_ios = formData.get("platform_ios") === "on";
  const platform_android = formData.get("platform_android") === "on";
  const platform_web = formData.get("platform_web") === "on";

  const app_store_url = normalizeHttpUrl(
    String(formData.get("app_store_url") ?? ""),
  );
  const google_play_url = normalizeHttpUrl(
    String(formData.get("google_play_url") ?? ""),
  );
  const web_url = normalizeHttpUrl(String(formData.get("web_url") ?? ""));

  const sortRaw = Number(formData.get("sort_order"));
  const sort_order = Number.isFinite(sortRaw) ? Math.trunc(sortRaw) : 0;

  if (!name_en || !name_zh) {
    return { ok: false, error: t("requiredFields") };
  }
  if (!platform_ios && !platform_android && !platform_web) {
    return { ok: false, error: t("requiredFields") };
  }
  if (platform_ios && !app_store_url) {
    return { ok: false, error: t("urlPlatform") };
  }
  if (platform_android && !google_play_url) {
    return { ok: false, error: t("urlPlatform") };
  }
  if (platform_web && !web_url) {
    return { ok: false, error: t("urlPlatform") };
  }

  const payload = {
    slug,
    name_en,
    name_zh,
    tagline_en,
    tagline_zh,
    platform_ios,
    platform_android,
    platform_web,
    app_store_url,
    google_play_url,
    web_url,
    sort_order,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await sb.from("store_apps").update(payload).eq("id", id);
    if (error) {
      console.error("[apps admin] update", error.message);
      if (isDuplicateSlugError(error.message, error.code)) {
        return { ok: false, error: t("duplicateSlug") };
      }
      return { ok: false, error: t("saveFailed") };
    }
  } else {
    const { error } = await sb.from("store_apps").insert(payload);
    if (error) {
      console.error("[apps admin] insert", error.message);
      if (isDuplicateSlugError(error.message, error.code)) {
        return { ok: false, error: t("duplicateSlug") };
      }
      return { ok: false, error: t("saveFailed") };
    }
  }

  revalidateAppsRoutes();
  return { ok: true };
}

export async function deleteStoreApp(id: string): Promise<AppsAdminActionResult> {
  const t = await getTranslations("appsAdmin.errors");
  if (!(await verifyAppsAdminSession())) {
    return { ok: false, error: t("session") };
  }
  const sb = createServiceSupabase();
  if (!sb) return { ok: false, error: t("noServiceKey") };
  const rowId = id.trim();
  if (!rowId) return { ok: false, error: t("invalidId") };

  const { error } = await sb.from("store_apps").delete().eq("id", rowId);
  if (error) {
    console.error("[apps admin] delete", error.message);
    return { ok: false, error: t("deleteFailed") };
  }
  revalidateAppsRoutes();
  return { ok: true };
}

type JsonImportItem = {
  slug?: string;
  name_en?: string;
  name_zh?: string;
  tagline_en?: string;
  tagline_zh?: string;
  platform_ios?: boolean;
  platform_android?: boolean;
  platform_web?: boolean;
  app_store_url?: string;
  google_play_url?: string;
  web_url?: string;
  sort_order?: number;
};

export async function importStoreAppsJson(
  formData: FormData,
): Promise<AppsAdminActionResult> {
  const t = await getTranslations("appsAdmin.errors");
  if (!(await verifyAppsAdminSession())) {
    return { ok: false, error: t("session") };
  }
  const sb = createServiceSupabase();
  if (!sb) return { ok: false, error: t("noServiceKey") };

  const raw = String(formData.get("json") ?? "").trim();
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return { ok: false, error: t("invalidJson") };
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    return { ok: false, error: t("invalidJson") };
  }

  const rows: Record<string, unknown>[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as JsonImportItem;
    const slug = normalizeStoreSlug(String(o.slug ?? ""));
    if (!slug) continue;
    const name_en = String(o.name_en ?? "").trim();
    const name_zh = String(o.name_zh ?? "").trim();
    if (!name_en || !name_zh) continue;

    const platform_ios = Boolean(o.platform_ios);
    const platform_android = Boolean(o.platform_android);
    const platform_web = Boolean(o.platform_web);
    const app_store_url = normalizeHttpUrl(String(o.app_store_url ?? ""));
    const google_play_url = normalizeHttpUrl(String(o.google_play_url ?? ""));
    const web_url = normalizeHttpUrl(String(o.web_url ?? ""));

    if (!platform_ios && !platform_android && !platform_web) continue;
    if (platform_ios && !app_store_url) continue;
    if (platform_android && !google_play_url) continue;
    if (platform_web && !web_url) continue;

    const sortRaw = Number(o.sort_order);
    const sort_order = Number.isFinite(sortRaw) ? Math.trunc(sortRaw) : 0;

    rows.push({
      slug,
      name_en,
      name_zh,
      tagline_en: String(o.tagline_en ?? "").trim() || null,
      tagline_zh: String(o.tagline_zh ?? "").trim() || null,
      platform_ios,
      platform_android,
      platform_web,
      app_store_url,
      google_play_url,
      web_url,
      sort_order,
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: t("importFailed") };
  }

  const { error } = await sb.from("store_apps").upsert(rows, {
    onConflict: "slug",
  });
  if (error) {
    console.error("[apps admin] import", error.message);
    return { ok: false, error: t("importFailed") };
  }

  revalidateAppsRoutes();
  return { ok: true };
}
