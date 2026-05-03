"use client";

import {
  deleteStoreApp,
  importStoreAppsJson,
  logoutAppsAdmin,
  upsertStoreApp,
} from "@/app/apps-admin-actions";
import type { StoreAppRow } from "@/types/store-app";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

type Props = {
  apps: StoreAppRow[];
};

export function AppsAdminPanel({ apps }: Props) {
  const t = useTranslations("appsAdmin");
  const router = useRouter();
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<StoreAppRow | null>(null);

  async function handleUpsert(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormErr(null);
    setFormMsg(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const r = await upsertStoreApp(fd);
    setPending(false);
    if (r.ok) {
      setFormMsg(editing ? t("save") + " ✓" : t("save") + " ✓");
      setEditing(null);
      e.currentTarget.reset();
      router.refresh();
    } else {
      setFormErr(r.error);
    }
  }

  async function handleDelete(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Delete this app row?"))
      return;
    setPending(true);
    const r = await deleteStoreApp(id);
    setPending(false);
    if (r.ok) {
      setEditing(null);
      router.refresh();
    } else {
      setFormErr(r.error);
    }
  }

  async function handleImport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setImportErr(null);
    setImportMsg(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const r = await importStoreAppsJson(fd);
    setPending(false);
    if (r.ok) {
      setImportMsg(t("imported"));
      e.currentTarget.reset();
      router.refresh();
    } else {
      setImportErr(r.error);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">{t("pageTitle")}</h2>
        <form action={logoutAppsAdmin}>
          <button
            type="submit"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {t("logout")}
          </button>
        </form>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
        <h3 className="text-base font-semibold text-slate-900">
          {editing ? t("edit") : t("newEntry")}
        </h3>
        <form
          key={editing?.id ?? "new"}
          className="mt-4 grid gap-4"
          onSubmit={handleUpsert}
        >
          {editing ? (
            <input type="hidden" name="id" value={editing.id} />
          ) : null}
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">{t("formSlug")}</span>
            <span className="text-xs text-slate-500">{t("formSlugHint")}</span>
            <input
              name="slug"
              required
              defaultValue={editing?.slug ?? ""}
              readOnly={Boolean(editing)}
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400 read-only:bg-slate-50"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("formNameEn")}</span>
              <input
                name="name_en"
                required
                defaultValue={editing?.name_en ?? ""}
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("formNameZh")}</span>
              <input
                name="name_zh"
                required
                defaultValue={editing?.name_zh ?? ""}
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("formTaglineEn")}</span>
              <input
                name="tagline_en"
                defaultValue={editing?.tagline_en ?? ""}
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("formTaglineZh")}</span>
              <input
                name="tagline_zh"
                defaultValue={editing?.tagline_zh ?? ""}
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              />
            </label>
          </div>

          <fieldset className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4">
            <legend className="text-sm font-medium text-slate-800">
              {t("platforms")}
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="platform_ios"
                defaultChecked={editing?.platform_ios ?? false}
              />
              {t("platformIos")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="platform_android"
                defaultChecked={editing?.platform_android ?? false}
              />
              {t("platformAndroid")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="platform_web"
                defaultChecked={editing?.platform_web ?? false}
              />
              {t("platformWeb")}
            </label>
          </fieldset>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("appStoreUrl")}</span>
            <input
              name="app_store_url"
              type="url"
              placeholder="https://apps.apple.com/..."
              defaultValue={editing?.app_store_url ?? ""}
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("playUrl")}</span>
            <input
              name="google_play_url"
              type="url"
              placeholder="https://play.google.com/..."
              defaultValue={editing?.google_play_url ?? ""}
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("webUrl")}</span>
            <input
              name="web_url"
              type="url"
              placeholder="https://"
              defaultValue={editing?.web_url ?? ""}
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("sortOrder")}</span>
            <input
              name="sort_order"
              type="number"
              defaultValue={editing?.sort_order ?? 0}
              className="max-w-[120px] rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            />
          </label>

          {formErr ? (
            <p className="text-sm text-red-600" role="alert">
              {formErr}
            </p>
          ) : null}
          {formMsg ? (
            <p className="text-sm text-teal-800" role="status">
              {formMsg}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {t("save")}
            </button>
            {editing ? (
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-5 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setEditing(null);
                  setFormErr(null);
                  setFormMsg(null);
                }}
              >
                {t("cancel")}
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section>
        <h3 className="text-base font-semibold text-slate-900">{t("listTitle")}</h3>
        {apps.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">{t("empty")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {apps.map((app) => (
              <li
                key={app.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-mono text-xs text-slate-500">
                    {app.slug}
                  </span>
                  <p className="font-medium text-slate-900">
                    {app.name_en} / {app.name_zh}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setEditing(app);
                      setFormErr(null);
                      setFormMsg(null);
                    }}
                  >
                    {t("edit")}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50"
                    onClick={() => void handleDelete(app.id)}
                  >
                    {t("delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
        <h3 className="text-base font-semibold text-slate-900">
          {t("importTitle")}
        </h3>
        <p className="mt-2 text-sm text-slate-600">{t("importHint")}</p>
        <form className="mt-4 space-y-3" onSubmit={handleImport}>
          <textarea
            name="json"
            rows={8}
            required
            placeholder="[]"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-slate-400"
          />
          {importErr ? (
            <p className="text-sm text-red-600" role="alert">
              {importErr}
            </p>
          ) : null}
          {importMsg ? (
            <p className="text-sm text-teal-800" role="status">
              {importMsg}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {t("importSubmit")}
          </button>
        </form>
      </section>
    </div>
  );
}
