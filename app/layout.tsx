import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "佛城风云：六巨头列传",
  description:
    "一款 20 回合的文字RPG：你，一个无名小卒，踏入赛博玄幻的佛城，与马神、骜魔、喵神、林魔、狼魔、帅神六巨头周旋。是骟、是夹、还是当买办？命运由你选择。",
  keywords: ["佛城", "六巨头", "文字RPG", "AI游戏", "DeepSeek", "赛博玄幻"],
};

export const viewport: Viewport = {
  themeColor: "#05060f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="scanlines min-h-dvh font-[system-ui,'PingFang_SC','Hiragino_Sans_GB','Microsoft_YaHei',sans-serif]">
        {children}
      </body>
    </html>
  );
}
