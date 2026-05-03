import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Pin Turbopack root when a parent folder (e.g. ~/Desktop) has another lockfile.
  turbopack: {
    root: process.cwd(),
  },
};

export default withNextIntl(nextConfig);
