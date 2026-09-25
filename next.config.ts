import type { NextConfig } from "next";
const config: NextConfig = {
  output:
    process.env.NEXT_OUTPUT_STANDALONE === "true" ? "standalone" : undefined,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: process.env.CMS_PUBLIC_STORE_ID
      ? [
          {
            protocol: "https",
            hostname: `${process.env.CMS_PUBLIC_STORE_ID.replace(/^store_/, "").toLowerCase()}.public.blob.vercel-storage.com`,
            pathname: "/media/**",
          },
        ]
      : [],
    formats: ["image/webp"],
    qualities: [65, 75, 85],
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
          },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
