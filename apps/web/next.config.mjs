/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@linksnap/db', '@linksnap/redis', '@linksnap/utils', '@linksnap/queue'],
  experimental: {
    serverComponentsExternalPackages: ['ioredis', 'postgres', 'bullmq'],
  },
};

export default nextConfig;
