/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["react-arborist"],
  webpack: (config, { isServer }) => {
    // Prefer ESM build for react-arborist
    config.resolve.mainFields = ["module", "main"];
    
    // Handle ESM-only packages
    if (!isServer) {
      config.resolve.extensionAlias = {
        ".js": [".js", ".ts", ".tsx"],
        ".jsx": [".jsx", ".tsx"],
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
