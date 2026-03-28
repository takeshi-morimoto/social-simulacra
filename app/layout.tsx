import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import AuthSessionProvider from "@/components/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "参謀AI｜選挙シミュレーター",
  description: "選挙区を選び、公約を入力すると、AIが生成した有権者ペルソナが反応します。投票率加重による支持率分析で選挙戦略を支援。",
  openGraph: {
    title: "参謀AI｜選挙シミュレーター",
    description: "AIが生成した有権者ペルソナが公約に反応。投票率加重による支持率分析で選挙戦略を支援。",
    type: "website",
    locale: "ja_JP",
    siteName: "参謀AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "参謀AI｜選挙シミュレーター",
    description: "AIが生成した有権者ペルソナが公約に反応。投票率加重による支持率分析で選挙戦略を支援。",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Noto+Serif+JP:wght@600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-950" style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
