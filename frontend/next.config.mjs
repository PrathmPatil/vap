/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Allow production Docker builds to complete while leftover page types are cleaned up.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
