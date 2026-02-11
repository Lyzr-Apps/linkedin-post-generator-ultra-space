/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for optimized Docker deployments
  output: 'standalone',

  // Reduce build time by skipping type checking (run separately)
  typescript: {
    ignoreBuildErrors: false,
  },

  // Optimize images
  images: {
    unoptimized: true,
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Faster rebuilds in development
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
}

module.exports = nextConfig
