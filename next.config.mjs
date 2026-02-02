/** @type {import('next').NextConfig} */
const nextConfig = {
  // Balanced configuration for both performance and reliability
  output: 'standalone',
  swcMinify: true,
  compress: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  // Simplified webpack configuration
  webpack: (config, { isServer }) => {
    // Add externals for client-side to exclude Node.js modules
    if (!isServer) {
      config.externals = {
        ...config.externals,
        'nodemailer': 'nodemailer',
        'crypto': 'crypto',
        'fs': 'fs',
        'net': 'net',
        'dns': 'dns',
        'tls': 'tls',
        'child_process': 'child_process',
        'stream': 'stream',
        'util': 'util',
        'url': 'url',
        'zlib': 'zlib',
        'http': 'http',
        'https': 'https',
        'assert': 'assert',
        'os': 'os',
        'path': 'path',
      };
    }

    // Add fallbacks for Node.js modules in client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        net: false,
        dns: false,
        tls: false,
        child_process: false,
      };
    }

    return config;
  },

  // Simplified experimental features - removed options causing deployment issues
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'chart.js',
      'react-chartjs-2',
      '@supabase/supabase-js'
    ],
  },

  images: {
    unoptimized: false,
    remotePatterns: [
      { protocol: 'https', hostname: 'localhost' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'imagedelivery.net' },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  reactStrictMode: true,
};

export default nextConfig;
