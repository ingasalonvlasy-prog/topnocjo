import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,
  serverExternalPackages: ["sharp"],
  devIndicators: false,
  poweredByHeader: false,
  images: {
    qualities: [60, 65, 75, 85],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { hostname: "cdn.shopify.com" },
      { hostname: "placehold.co" },
      { hostname: "**.cdninstagram.com" },
      { hostname: "**.fbcdn.net" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/products/:handle",
        destination: "/produkt/:handle",
        permanent: true,
      },
      {
        source: "/collections/:handle",
        destination: "/kategorie/:handle",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
