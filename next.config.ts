import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['node-thermal-printer', 'node-cron'],
}

export default nextConfig
