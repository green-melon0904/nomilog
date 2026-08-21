import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://api.workos.com",
  "img-src 'self' data: https:",
  // IBM Plex Sans JPのCSSとフォント本体だけを許可し、任意の外部スタイル配信元は追加しない。
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self' https://*.supabase.co https://api.workos.com"
].join("; ");

const nextConfig: NextConfig = {
  // Codex内ブラウザは127.0.0.1で開くため、開発時のHMR接続も同じローカルオリジンだけ許可する。
  // 本番で外部オリジンを許可する設定ではなく、ローカル開発用の接続不整合を防ぐ目的に限定している。
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  },
  async headers() {
    // WorkOSのセッションCookieと公開レビューを同じアプリで扱うため、ブラウザ側にも
    // 最低限の境界を明示する。AuthKit自身も認証済み応答へno-storeを付ける。
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  }
};

export default nextConfig;
