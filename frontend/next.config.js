/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: ['localhost'],
    // Add your Supabase project hostname for storage images, e.g. 'abcdefgh.supabase.co'
  },
}

module.exports = nextConfig
