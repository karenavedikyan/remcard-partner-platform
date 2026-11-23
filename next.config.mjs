/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Chat previews require metadata in <head>, including crawlers whose user-agent is not known to Next.js.
  htmlLimitedBots: /.*/,
  experimental: { cpus: 1 },
  ...(process.env.LOGIN_ENTRY_NEXT_DIST_DIR || process.env.R06_NEXT_DIST_DIR
    ? { distDir: process.env.LOGIN_ENTRY_NEXT_DIST_DIR || process.env.R06_NEXT_DIST_DIR }
    : {}),
};

export default nextConfig;
