import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack root when a parent folder (e.g. ~/Desktop) has another lockfile.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
