/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure experimental features if needed
  experimental: {
    // Add server actions configuration with increased body size limit
    serverActions: {
      bodySizeLimit: '10mb' // Increase the limit to 10MB to match our PDF size limit
    }
  },
  // Add image domains configuration
  images: {
    domains: ['i.ytimg.com'],
  }
}

module.exports = nextConfig 