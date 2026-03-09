import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "政策市民シミュレーター｜Social Simulacra",
  description: "自治体を選び、政策を入力すると、AIが生成した市民ペルソナが反応します。人口動態に基づくリアルな市民の声をシミュレーション。",
  openGraph: {
    title: "政策市民シミュレーター｜Social Simulacra",
    description: "AIが生成した市民ペルソナが政策に反応。自治体の人口動態に基づくリアルな市民シミュレーション。",
    type: "website",
    locale: "ja_JP",
    siteName: "Social Simulacra",
  },
  twitter: {
    card: "summary_large_image",
    title: "政策市民シミュレーター｜Social Simulacra",
    description: "AIが生成した市民ペルソナが政策に反応。自治体の人口動態に基づくリアルな市民シミュレーション。",
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
        {children}
      </body>
    </html>
  );
}
