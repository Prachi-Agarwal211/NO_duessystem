/** @type {import('next').NextConfig} */
const nextConfig = {
  // Balanced configuration for both performance and reliability
  output: 'standalone',
  swcMinify: true,
  compress: true,

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

    // Basic optimizations without aggressive code splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Separate React core (critical buffer)
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react-core',
            chunks: 'all',
            priority: 20
          },
          // Separate heavy animation libraries
          animations: {
            test: /[\\/]node_modules[\\/](framer-motion|@studio-freight\/react-lenis)[\\/]/,
            name: 'animations',
            chunks: 'all',
            priority: 15
          },
          // Separate Chart.js and heavy visual libs
          charts: {
            test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
            name: 'charts',
            chunks: 'all',
            priority: 12
          },
          // Separate PDF generation libraries (very heavy)
          pdf: {
            test: /[\\/]node_modules[\\/](jspdf|pdf-lib|pdfkit|html2canvas)[\\/]/,
            name: 'pdf-utils',
            chunks: 'all',
            priority: 10,
            enforce: true
          },
          // Separate other vendors
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true
          }
        }
      },
    };

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
    // webpackBuildWorker removed - may cause Vercel build issues
    // optimizeCss removed - requires critters package
  },

  images: {
    unoptimized: false, // Allow Next.js to optimize images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'imagedelivery.net',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },

  async headers() {
    return [
      {
        // Security headers for all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
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
        // Specific headers for manifest.json to prevent 401 errors
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, must-revalidate',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        // Cache headers for static assets
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Redirect from old paths to new ones if needed
      // {
      //   source: '/old-path',
      //   destination: '/new-path',
      //   permanent: true,
      // },
    ];
  },
  reactStrictMode: true,
};

export default nextConfig;
