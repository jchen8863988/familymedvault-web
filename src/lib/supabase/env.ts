/** Trim env strings — pasted `.env` values often pick up trailing spaces or line breaks. */
export function normalizeEnv(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidSupabaseHttpUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
