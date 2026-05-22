/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  allowedDevOrigins: ["*.trycloudflare.com", "localhost:3000", "localhost:3003", "192.168.31.242", "192.168.31.242:3000"],
};
module.exports = nextConfig;
