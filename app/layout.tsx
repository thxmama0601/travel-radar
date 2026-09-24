import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CC三寶媽-旅遊雷達｜日本、台灣、韓國旅遊新聞與優惠",
  description: "整合日本、台灣與韓國最新旅遊消息、優惠、交通與政策，保留來源和發布時間。",
  icons: {
    icon: "/cc-mama-logo.png",
    shortcut: "/cc-mama-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
