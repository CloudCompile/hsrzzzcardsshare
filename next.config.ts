import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "enka.network", pathname: "/ui/**" },
      { protocol: "https", hostname: "cdn.jsdelivr.net", pathname: "/gh/Mar-7th/StarRailRes/**" },
    ],
    dangerouslyAllowSVG: false,
  },
  experimental: {
    optimizePackageImports: [],
  },
};

export default nextConfig;
