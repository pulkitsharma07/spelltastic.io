import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  distDir: process.env.BUILD_DIR || ".next",
};

export default nextConfig;
