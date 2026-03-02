import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["recharts", "victory-vendor"],
};

export default nextConfig;
