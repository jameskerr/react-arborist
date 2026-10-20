const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@dnd-kit/core": path.resolve(__dirname, "../../node_modules/@dnd-kit/core"),
      "@dnd-kit/utilities": path.resolve(__dirname, "../../node_modules/@dnd-kit/utilities"),
    };
    return config;
  },
};

module.exports = nextConfig;
