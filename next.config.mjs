/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost', // For local development
      'images.unsplash.com', // If using Unsplash images
      'lh3.googleusercontent.com' // For Google OAuth avatars
    ],
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
