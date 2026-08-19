"use client";

import { useState } from "react";
import { STYLE_OPTIONS, type StoryStyle } from "@/lib/story-styles";

const SIX = [
  { emoji: "🐴", name: "马神", role: "老大 · 扇/骟", color: "text-neon" },
  { emoji: "🍔", name: "骜魔", role: "老二 · 夹逼", color: "text-cyber" },
  { emoji: "🐱", name: "喵神", role: "老三 · 买办", color: "text-plasma" },
  { emoji: "🌲", name: "林魔", role: "老四 · 踩", color: "text-neon" },
  { emoji: "🐺", name: "狼魔", role: "老五 · 十炮", color: "text-cyber" },
  { emoji: "🤖", name: "帅神", role: "老六 · 收租", color: "text-plasma" },
];

interface StartScreenProps {
  onStart: (style: StoryStyle) => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  const [selected, setSelected] = useState<StoryStyle | null>(null);

  return (
    <div className="animate-float-up flex flex-col items-center gap-7 pt-10 text-center">
      {/* 标题 */}
      <div>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.5em] text-cyber/80 glow-cyan">
          Fóchéng Fēngyún
        </p>
        <h1 className="animate-glitch text-4xl font-black leading-tight text-neon glow-green">
          佛城风云
        </h1>
        <p className="mt-1 text-xl font-bold text-ice">六巨头列传</p>
        <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-ghost">
          你，一个无名小卒，背着行囊踏进了佛城。
          这里有阴毛、有肉夹馍、有买办，也有十回合的生死荒诞。
        </p>
      </div>

      {/* 剧情风格选择 */}
      <div className="w-full max-w-sm">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-plasma/80">
          ✦ 选择剧情风格 ✦
        </p>
        <div className="grid grid-cols-2 gap-2">
          {STYLE_OPTIONS.map((s) => {
            const active = selected === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSelected(s.key)}
                aria-pressed={active}
                className={`h-[76px] rounded-xl border-2 px-2 py-2 backdrop-blur transition-colors ${
                  active
                    ? "border-neon bg-neon/15 glow-green"
                    : "border-white/10 bg-night-2/80 hover:border-neon/40"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-xl leading-none">{s.emoji}</span>
                  <span
                    className={`text-sm font-bold ${active ? "text-neon" : "text-ice"}`}
                  >
                    {s.label}
                  </span>
                  {active && <span className="text-xs text-neon">✓</span>}
                </div>
                <div className="mt-1 text-[10px] leading-tight text-ghost/70">
                  {s.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 开始按钮 */}
      <button
        onClick={() => selected && onStart(selected)}
        disabled={!selected}
        className={`option-btn h-[52px] w-full max-w-sm rounded-xl border-2 px-6 text-lg font-bold tracking-widest transition-opacity ${
          selected
            ? "border-neon/70 bg-neon/10 text-neon glow-green"
            : "cursor-not-allowed border-white/10 bg-white/5 text-ghost/50"
        }`}
      >
        {selected ? "踏入佛城 ▶" : "先选择一种剧情风格"}
      </button>

      <p className="text-[11px] text-ghost/50">
        共 10 回合 · AI 实时生成剧情 · 结局与成就由你的选择决定
      </p>
    </div>
  );
}
