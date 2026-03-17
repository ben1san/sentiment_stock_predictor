import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // src ディレクトリ配下を有効化
  // Vercel デプロイ用
  output: "standalone",

  // バックエンド API へのリバースプロキシ（開発環境）
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
