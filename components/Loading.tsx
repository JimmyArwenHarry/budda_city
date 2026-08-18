"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "正在遭遇马魔🐴的阴毛…",
  "骜魔🍔正对你施展夹逼定理…",
  "喵神🐱正在瞄准你的咖喱鸡扒…",
  "狼魔🐺准备假摔碰瓷你…",
  "林魔🌲踩着单车抄小路赶来…",
  "帅神🤖边吃粑粑边算你的房租…",
  "焦老大🍌正在解说你的命运…",
  "钱多💰不知从哪投喂你一块筷勒月毒蛋糕…",
  "阿熠1️⃣正在闭区间里召唤你…",
];

export default function Loading() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % PHRASES.length), 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      {/* 旋转光环 */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-neon-spin rounded-full border-2 border-transparent border-t-neon border-r-cyber" />
        <div className="absolute inset-2 animate-neon-spin rounded-full border-2 border-transparent border-b-plasma border-l-neon [animation-duration:1.1s]" />
        <div className="absolute inset-0 animate-neon-pulse flex items-center justify-center text-4xl">
          🐴
        </div>
      </div>

      <p className="font-mono text-sm text-ghost">
        <span>{PHRASES[idx]}</span>
        <span className="animate-blink text-neon">▍</span>
      </p>

      <p className="text-[11px] text-ghost/60">
        GPT 正在佛城上空推演你的命运，请稍候…
      </p>
    </div>
  );
}
