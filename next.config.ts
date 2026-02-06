import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // Needed for Railway Docker deployment
};

export default nextConfig;
