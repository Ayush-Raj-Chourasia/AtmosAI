import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@n-weis/shared'],
  turbopack: {},
  output: "standalone",
  async headers() {
    return [
      {
        // Service worker specific headers
        source: "/firebase-messaging-sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' https://www.gstatic.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
