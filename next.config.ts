import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["*.trycloudflare.com", "localhost:3000", "localhost:3003"],
};

export default nextConfig;
