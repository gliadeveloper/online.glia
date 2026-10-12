import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@blocknote/core", "jsdom"],
};

export default nextConfig;
