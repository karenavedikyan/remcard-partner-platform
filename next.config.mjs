/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { cpus: 1 },
  ...(process.env.R06_NEXT_DIST_DIR ? { distDir: process.env.R06_NEXT_DIST_DIR } : {}),
};

export default nextConfig;
