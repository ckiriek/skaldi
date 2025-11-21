/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Temporarily ignore type errors for production build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily ignore ESLint errors for production build
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    domains: ['qtlpjxjlwrjindgybsfd.supabase.co'],
  },
}

module.exports = nextConfig
