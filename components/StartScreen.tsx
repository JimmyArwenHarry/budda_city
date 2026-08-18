"use client";

const SIX = [
  { emoji: "🐴", name: "马神", role: "老大 · 扇/骟", color: "text-neon" },
  { emoji: "🍔", name: "骜魔", role: "老二 · 夹逼", color: "text-cyber" },
  { emoji: "🐱", name: "喵神", role: "老三 · 买办", color: "text-plasma" },
  { emoji: "🌲", name: "林魔", role: "老四 · 踩", color: "text-neon" },
  { emoji: "🐺", name: "狼魔", role: "老五 · 十炮", color: "text-cyber" },
  { emoji: "🤖", name: "帅神", role: "老六 · 收租", color: "text-plasma" },
];

interface StartScreenProps {
  onStart: () => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="animate-float-up flex flex-col items-center gap-8 pt-10 text-center">
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
          你，一个无名小卒，背着行囊踏进了赛博玄幻的佛城。
          这里有阴毛、有肉夹馍、有买办，也有二十回合的生死荒诞。
        </p>
      </div>

      {/* 六巨头 */}
      <div className="grid w-full max-w-sm grid-cols-3 gap-2">
        {SIX.map((s) => (
          <div
            key={s.name}
            className="rounded-xl border border-white/10 bg-night-2/80 px-2 py-3 backdrop-blur"
          >
            <div className="text-2xl">{s.emoji}</div>
            <div className={`mt-1 text-sm font-bold ${s.color}`}>{s.name}</div>
            <div className="text-[10px] text-ghost/70">{s.role}</div>
          </div>
        ))}
      </div>

      {/* 开始按钮 */}
      <button
        onClick={onStart}
        className="option-btn h-[52px] w-full max-w-sm rounded-xl border-2 border-neon/70 bg-neon/10 px-6 text-lg font-bold tracking-widest text-neon glow-green"
      >
        踏入佛城 ▶
      </button>

      <p className="text-[11px] text-ghost/50">
        共 20 回合 · AI 实时生成剧情 · 结局与成就由你的选择决定
      </p>
    </div>
  );
}
