import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "某某科技 | 企业官网",
  description: "某某科技 —— 专注数字化解决方案的创新型技术公司。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-white text-zinc-900">
        {children}
      </body>
    </html>
  );
}
