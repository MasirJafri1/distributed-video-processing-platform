/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",

        hostname: "*.amazonaws.com",
      },
      {
        protocol: "https",

        hostname: "*.masir-projects.me",
      },
    ],
  },
};

export default nextConfig;
