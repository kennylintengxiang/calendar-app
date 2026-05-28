import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ⚠️ "standalone" output is for Docker/self-hosted only.
  // Vercel has its own deployment system — removing it fixes 502/500 errors.
  // output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
