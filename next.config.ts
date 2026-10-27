import type { NextConfig } from "next";

// Hassas not tutan bir uygulama olduğu için temel güvenlik başlıkları açık.
// CSP için nonce desteği gerekir; ilk sürümde eklenmedi (README'deki "Sonraki adımlar").
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
