/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ OPTIMIZATION: Enable SWC minification (faster than Terser)
  swcMinify: true,
  
  // ✅ OPTIMIZATION: Compress output for smaller bundle
  compress: true,
  
  // ✅ OPTIMIZATION: Reduce build output
  productionBrowserSourceMaps: false,
  
  // ✅ OPTIMIZATION: Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Production optimizations only
    if (!dev) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        
        // Split chunks for better caching
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate vendor chunks
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)?.[1];
                return `vendor.${packageName?.replace('@', '')}`;
              },
              priority: 10,
            },
            // Separate Framer Motion (large library)
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: 'vendor.framer-motion',
              priority: 20,
            },
            // Separate Supabase
            supabase: {
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              name: 'vendor.supabase',
              priority: 20,
            },
            // Common UI components
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // ✅ OPTIMIZATION: Experimental features for better performance
  experimental: {
    // Enable optimized fonts
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    
    // Reduce memory usage during builds
    webpackBuildWorker: true,
    
    // Enable optimized CSS
    optimizeCss: true,
    
    // Optimize server components
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },

  images: {
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
    // Enable image optimization for better mobile performance
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'], // Modern format for better compression
  },
  
  // ✅ OPTIMIZATION: Cache static assets aggressively
  async headers() {
    return [
      // Cache static assets
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache built files
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Security headers for all routes
      {
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
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            key: 'Link',
            value: '</manifest.json>; rel="manifest"',
          }
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
