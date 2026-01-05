import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEO平台 - 大模型应用引擎优化",
  description: "帮助企业优化产品在大模型AI应用中的曝光度和推荐率",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
