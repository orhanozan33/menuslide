/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
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
