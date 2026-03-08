import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "市民シミュレーター｜Social Simulacra × 行政DX",
  description: "政策を入力すると、6種類の市民ペルソナがAIとして反応します",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] p-8 px-5 font-sans text-white">
        {children}
      </body>
    </html>
  );
}
