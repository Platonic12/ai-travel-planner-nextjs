/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['*']
    }
  },
  // 启用独立输出模式，用于Docker部署
  output: 'standalone',
};
export default nextConfig;
