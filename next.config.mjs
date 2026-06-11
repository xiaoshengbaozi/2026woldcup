/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  allowedDevOrigins: ["http://10.10.10.25:3000"],
  images: {
    unoptimized: true
  }
};

export default nextConfig;
