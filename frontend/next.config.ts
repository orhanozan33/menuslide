import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  transpilePackages: ['react-konva', 'konva'],
  serverExternalPackages: ['pg', 'puppeteer'],
  webpack: (config) => {
    const dir = path.join(process.cwd(), 'node_modules');
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.join(dir, 'react'),
      'react-dom': path.join(dir, 'react-dom'),
    };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
    ],
  },
  experimental: {
    optimizePackageImports: ['konva', 'react-konva', 'grapesjs', '@grapesjs/react'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        source: '/downloads/Menuslide.apk',
        headers: [
          { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
          { key: 'Content-Disposition', value: 'attachment; filename="Menuslide.apk"' },
        ],
      },
      {
        source: '/display/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
      {
        source: '/:locale(en|fr|tr)/display/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
    ];
  },
};

export default nextConfig;
