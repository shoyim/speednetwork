import type { NextConfig } from 'next'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001'

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'no-cache, no-store' },
        ],
      },
    ]
  },
}

export default nextConfig
