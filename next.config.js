/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'bomboclatbeastcode.codes',
          },
        ],
        destination: 'https://www.bomboclatbeastcode.codes/:path*',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: '/__/auth/:path*',
          destination: 'https://beastcode-7555e.firebaseapp.com/__/auth/:path*',
        },
      ],
    };
  },
}

module.exports = nextConfig
