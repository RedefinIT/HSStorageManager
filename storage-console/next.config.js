/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/storage/:path*',
        destination: 'http://localhost:3040/rest/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
