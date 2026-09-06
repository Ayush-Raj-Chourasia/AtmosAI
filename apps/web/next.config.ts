import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@disaster-app/shared'],
  turbopack: {},
  output: "standalone",
  async headers() {
    return [
      // {
      //   // Global security headers for all routes
      //   source: "/(.*)",
      //   headers: [
      //     {
      //       key: "X-Content-Type-Options",
      //       value: "nosniff",
      //     },
      //     {
      //       key: "X-Frame-Options",
      //       value: "DENY",
      //     },
      //     {
      //       key: "Referrer-Policy",
      //       value: "strict-origin-when-cross-origin",
      //     },
      //     {
      //       key: "Strict-Transport-Security",
      //       value: "max-age=31536000; includeSubDomains; preload",
      //     },
      //     {
      //       key: "X-XSS-Protection",
      //       value: "1; mode=block",
      //     },
      //     {
      //       key: "Permissions-Policy",
      //       value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
      //     },
      //     {
      //       key: "Content-Security-Policy",
      //       value: [
      //         "default-src 'self'",
      //         "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com",
      //         "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      //         "font-src 'self' https://fonts.gstatic.com",
      //         "img-src 'self' data: blob: https: http:",
      //         "connect-src 'self' http://localhost:* https://localhost:* https://*.supabase.co wss://*.supabase.co https://api.apify.com https://fcm.googleapis.com https://firebaseinstallations.googleapis.com https://firebaseremoteconfig.googleapis.com https://*.firebaseio.com https://disaster-api.denyherianto.com",
      //         "frame-src 'self' https://accounts.google.com",
      //         "worker-src 'self' blob:",
      //         "manifest-src 'self'",
      //       ].join("; "),
      //     },
      //   ],
      // },
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
