"use client";

import { Analytics } from "@vercel/analytics/next";
import { useEffect, useState } from "react";

const CONSENT_KEY = "fmv_cookie_consent";

/** Loads Vercel Analytics only after cookie banner consent === `all`. */
export function ConditionalAnalytics() {
  const [allow, setAllow] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        setAllow(localStorage.getItem(CONSENT_KEY) === "all");
      } catch {
        setAllow(false);
      }
    };
    sync();
    window.addEventListener("fmv-consent", sync);
    return () => window.removeEventListener("fmv-consent", sync);
  }, []);

  if (!allow) return null;
  return <Analytics />;
}
