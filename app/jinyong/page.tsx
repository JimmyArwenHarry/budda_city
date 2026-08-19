import type { Metadata } from "next";
import Link from "next/link";
import JinYongGame from "@/components/jinyong/JinYongGame";

export const metadata: Metadata = {
  title: "江湖录：卑贱子的逆命",
  description:
    "一款金庸文风的文字武侠RPG：乱世如炉，众生如柴。你以农民、乞丐、小流氓、妓女等卑贱之身踏入江湖，在卦摊前写下一个字，测得命格，于刀光剑影里挣命、结缘、了恩怨。十回江湖，终以约 800 字战记与一首七律作结。",
  keywords: ["江湖录", "金庸", "文字RPG", "武侠", "AI游戏", "DeepSeek", "七律"],
};

export default function JinYongPage() {
  return (
    <>
      <JinYongGame />
      {/* 入口：回到佛城 */}
      <Link
        href="/"
        className="fixed bottom-4 left-4 z-50 rounded-full border-2 border-neon/50 bg-night-3/90 px-4 py-2 text-sm font-bold text-neon glow-green backdrop-blur transition-colors hover:border-neon hover:bg-neon/10"
      >
        🐴 回佛城风云 ›
      </Link>
    </>
  );
}
