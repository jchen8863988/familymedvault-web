import { SITE_URL } from "@/lib/seo";

/** Organization + WebSite JSON-LD for rich results / knowledge panels. */
export function JsonLd() {
  const root = `${SITE_URL}/`;
  const orgId = `${SITE_URL}/` + "#organization";
  const siteId = `${SITE_URL}/` + "#website";

  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: "FamilyMedVault",
        url: root,
      },
      {
        "@type": "WebSite",
        "@id": siteId,
        name: "FamilyMedVault",
        url: root,
        inLanguage: ["en-US", "zh-CN"],
        publisher: { "@id": orgId },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
