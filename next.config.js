/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['images1.vinted.net', 'images2.vinted.net', 'via.placeholder.com'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Completely exclude server-only modules from client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib/scrape/serverOnlyParser': false,
      };
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@/lib/scrape/serverOnlyParser': false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;