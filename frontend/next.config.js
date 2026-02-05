const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['react-konva', 'konva'],
  webpack: (config, { isServer }) => {
    // Single React instance (avoids useContext null during SSG and react-konva issues)
    const dir = path.join(__dirname, 'node_modules');
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.join(dir, 'react'),
      'react-dom': path.join(dir, 'react-dom'),
    };
    return config;
  },
  images: {
    domains: ['localhost'],
    // Add your Supabase project hostname for storage images, e.g. 'abcdefgh.supabase.co'
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
}

module.exports = nextConfig
