/**
 * Canonical site URL for sitemap, metadata, JSON-LD.
 * Override with NEXT_PUBLIC_SITE_URL if the canonical host differs.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.familymedvault.com"
).replace(/\/$/, "");

/** Path without locale prefix; home is "". */
export type SeoPath = "" | "/community" | "/privacy" | "/terms";

export function absoluteUrl(locale: "en" | "zh", path: SeoPath): string {
  const suffix = path === "" ? "" : path;
  if (locale === "en") {
    return suffix === "" ? `${SITE_URL}/` : `${SITE_URL}${suffix}`;
  }
  return suffix === "" ? `${SITE_URL}/zh` : `${SITE_URL}/zh${suffix}`;
}

/** Canonical + hreflang-style alternates for next/metadata. */
export function buildAlternates(locale: string, path: SeoPath) {
  const enUrl = absoluteUrl("en", path);
  const zhUrl = absoluteUrl("zh", path);
  const canonical = locale === "zh" ? zhUrl : enUrl;
  return {
    canonical,
    languages: {
      "x-default": enUrl,
      en: enUrl,
      "zh-CN": zhUrl,
    } as Record<string, string>,
  };
}

export function openGraphLocales(locale: string): {
  locale: string;
  alternateLocale: string[];
} {
  return locale === "zh"
    ? { locale: "zh_CN", alternateLocale: ["en_US"] }
    : { locale: "en_US", alternateLocale: ["zh_CN"] };
}
