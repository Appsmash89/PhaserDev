import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow Next/Image to serve from /uploads (local files in public/)
    localPatterns: [
      {
        pathname: '/uploads/**',
      },
      {
        pathname: '/assets/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pollinations.ai',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
