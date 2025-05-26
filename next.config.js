/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel için output export kaldırıldı
  
  // Base path (gerekirse)
  // basePath: '/dugun-photo',
  
  // Asset prefix (gerekirse)
  // assetPrefix: '/dugun-photo',
  
  // Trailing slash
  trailingSlash: true,
  
  // Image optimization
  images: {
    unoptimized: true
  },
  
  // ESLint kuralları
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScript hatalarını ignore et
  typescript: {
    ignoreBuildErrors: true,
  }
};

module.exports = nextConfig; 