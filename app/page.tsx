import Link from "next/link";
import Game from "@/components/Game";

export default function Home() {
  return (
    <>
      <Game />
      {/* 入口：另辟金庸江湖 */}
      <Link
        href="/jinyong"
        className="fixed bottom-4 right-4 z-50 rounded-full border-2 border-gold/50 bg-night-3/90 px-4 py-2 text-sm font-bold text-gold glow-gold backdrop-blur transition-colors hover:border-gold hover:bg-gold/10"
      >
        🏯 另辟 · 金庸江湖 ›
      </Link>
    </>
  );
}
