/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  allowedDevOrigins: ["*.trycloudflare.com", "localhost:3000", "localhost:3003"],
};
module.exports = nextConfig;
