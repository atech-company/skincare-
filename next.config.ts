import type { NextConfig } from "next";
import path from "path";

const apiHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").hostname;
  } catch {
    return "localhost";
  }
})();

const nextConfig: NextConfig = {
  // Laragon has an extra package-lock.json at C:\laragon\ — pin tracing to this app
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "http", hostname: apiHost, pathname: "/storage/**" },
      { protocol: "https", hostname: apiHost, pathname: "/storage/**" },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@tanstack/react-query",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
