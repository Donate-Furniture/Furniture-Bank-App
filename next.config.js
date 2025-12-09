/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Disable filesystem caching to prevent file locking errors on Windows
    config.cache = false;
    return config;
  },
};

module.exports = nextConfig;