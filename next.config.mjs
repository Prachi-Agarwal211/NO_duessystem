/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost', // For local development
      'images.unsplash.com', // If using Unsplash images
      'lh3.googleusercontent.com', // For Google OAuth avatars
      'imagedelivery.net' // Cloudflare Images (if needed)
    ],
    // Enable image optimization for better mobile performance
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'], // Modern format for better compression
  },
  async headers() {
    return [
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
            value: 'camera=(), microphone=(), geolocation=()',
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
