/** Lowercase substrings that strongly correlate with SEO / outreach spam. Adjust via COMMUNITY_BLOCKED_SUBSTRINGS. */
const DEFAULT_BLOCKED_PHRASES = [
  "we can place your website",
  "place your website on google",
  "first page of google",
  "google 1st page",
  "seo services",
  "seo service",
  "cheap seo",
  "rank higher on google",
  "link building service",
  "buy backlinks",
  "guest post service",
  "whatsapp me for",
  "telegram:",
];

function extraPhrasesFromEnv(): string[] {
  const raw = process.env.COMMUNITY_BLOCKED_SUBSTRINGS;
  if (!raw?.trim()) return [];
  return raw
    .split(/[,，]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Too many bare URLs in one short text → likely spam. */
function urlSpamScore(text: string): number {
  const m = text.match(/https?:\/\/[^\s]+/gi);
  return m?.length ?? 0;
}

export type SpamRejectReason = "phrase" | "links";

export function checkCommunitySpam(
  ...chunks: string[]
):
  | { ok: true }
  | { ok: false; reason: SpamRejectReason } {
  const combined = chunks
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  const phrases = [...DEFAULT_BLOCKED_PHRASES, ...extraPhrasesFromEnv()];
  for (const p of phrases) {
    if (p.length >= 4 && combined.includes(p)) {
      return { ok: false, reason: "phrase" };
    }
  }

  const urls = urlSpamScore(combined);
  const len = combined.length || 1;
  if (urls >= 4 || (urls >= 3 && len < 400)) {
    return { ok: false, reason: "links" };
  }

  return { ok: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidOptionalEmail(email: string): boolean {
  const s = email.trim();
  if (!s) return true;
  return EMAIL_RE.test(s);
}
