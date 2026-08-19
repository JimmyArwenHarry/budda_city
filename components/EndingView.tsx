"use client";

import { useMemo, useState } from "react";
import type { Achievement } from "@/lib/types";
import Markdown from "./Markdown";
import Typewriter from "./Typewriter";

interface EndingViewProps {
  endingStory: string;
  summary: string;
  summaryStatus: "idle" | "loading" | "done" | "error";
  achievements: Achievement[];
  achievementsStatus: "idle" | "loading" | "done" | "error";
  endingError: string;
  onRetryEnding: () => void;
  onRestart: () => void;
}

interface AchievementCard {
  emoji: string;
  title: string;
  desc: string;
}

function normalize(ach: Achievement | string): AchievementCard {
  if (typeof ach === "string") {
    // 兼容字符串格式：【称号】: 描述
    const m = ach.match(/^【([^】]+)】\s*[:：]?\s*([\s\S]*)$/);
    if (m) return { emoji: "🎖", title: m[1], desc: m[2] };
    return { emoji: "🎖", title: "神秘成就", desc: ach };
  }
  return {
    emoji: ach.emoji || "🎖",
    title: ach.title || "神秘成就",
    desc: ach.desc || "",
  };
}

/** 内联小加载块 */
function MiniLoading({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-night-2/80 p-6 text-center backdrop-blur">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <div className="absolute inset-0 animate-neon-spin rounded-full border-2 border-transparent border-t-neon border-r-cyber" />
        <div className="animate-neon-pulse text-xl">🐴</div>
      </div>
      <p className="font-mono text-xs text-ghost">
        {label}
        <span className="animate-blink text-neon">▍</span>
      </p>
    </div>
  );
}

/** 章节小标题 */
function SectionTitle({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <p
      className={`font-mono text-[11px] uppercase tracking-[0.3em] ${color}`}
    >
      {icon} {label}
    </p>
  );
}

export default function EndingView({
  endingStory,
  summary,
  summaryStatus,
  achievements,
  achievementsStatus,
  endingError,
  onRetryEnding,
  onRestart,
}: EndingViewProps) {
  const cards = useMemo(() => achievements.map(normalize), [achievements]);
  const [copied, setCopied] = useState(false);
  const [doneTyping, setDoneTyping] = useState(false);
  const [skipTyping, setSkipTyping] = useState(false);

  const summaryReady = summaryStatus === "done" && !!summary.trim();
  const achievementsReady = achievementsStatus === "done" && cards.length > 0;

  const buildShareText = () => {
    const lines = [
      "🏆【佛城风云：六巨头列传】我的最终命运",
      "在佛城与六巨头周旋 10 回合后，我……",
      "",
    ];
    if (summaryReady) {
      lines.push("📜 佛城战记");
      lines.push(summary);
      lines.push("");
    }
    if (cards.length > 0) {
      lines.push("🎖 专属成就");
      cards.forEach((c, i) => lines.push(`${i + 1}. ${c.emoji} ${c.title} — ${c.desc}`));
      lines.push("");
    }
    lines.push("你也来试试？看你能否活过 10 回合。");
    return lines.join("\n");
  };

  const handleShare = async () => {
    const text = buildShareText();
    // 优先用原生分享（手机可分享到微信/朋友圈）
    if (navigator.share) {
      try {
        await navigator.share({ title: "佛城风云：六巨头列传", text });
        return;
      } catch (e) {
        /* 用户取消分享则回退到复制 */
      }
    }
    await copyText(text);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 旧浏览器兜底
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* 终局标题 */}
      <div className="relative overflow-hidden rounded-2xl border border-plasma/50 bg-gradient-to-b from-plasma/15 to-transparent p-6 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_50%_-20%,rgba(185,103,255,0.5),transparent_60%)]" />
        <p className="font-mono text-[11px] uppercase tracking-[0.5em] text-plasma glow-purple">
          Fin · 佛城终局
        </p>
        <h2 className="mt-2 text-3xl font-black text-plasma glow-purple">
          你的命运，已尘埃落定
        </h2>
        <div className="mt-3 font-mono text-xs text-ghost">
          10 / 10 回合 · 六巨头混战落幕
        </div>
      </div>

      {/* 结局正文（打字机 + 点击跳过） */}
      <div
        onClick={() => setSkipTyping(true)}
        className="cursor-pointer rounded-2xl border border-white/10 bg-night-2/80 p-5 backdrop-blur"
      >
        <Typewriter
          text={endingStory}
          skip={skipTyping}
          speed={22}
          stepChars={endingStory.length > 260 ? 4 : endingStory.length > 130 ? 2 : 1}
          onDone={() => setDoneTyping(true)}
        >
          {(revealed) => (
            <>
              <Markdown>{revealed}</Markdown>
              {!doneTyping && <span className="animate-blink text-neon">▍</span>}
            </>
          )}
        </Typewriter>
        {!doneTyping && (
          <p className="mt-2 text-right text-[10px] text-ghost/40">
            点击结局可跳过 ▸
          </p>
        )}
      </div>

      {/* 读完后：战记总结 + 成就 */}
      {doneTyping && (
        <>
          {/* 战记总结 */}
          <div className="flex flex-col gap-3">
            <SectionTitle icon="📜" label="佛城战记 · 剧情总结" color="text-cyber/80" />
            {summaryStatus === "loading" && (
              <MiniLoading label="正在为你撰写 800 字战记…" />
            )}
            {summaryStatus === "error" && (
              <div className="rounded-xl border border-plasma/40 bg-plasma/10 p-4">
                <p className="text-sm text-ice">{endingError || "总结生成失败"}</p>
                <button
                  onClick={onRetryEnding}
                  className="option-btn mt-3 h-[46px] w-full rounded-xl border-2 border-cyber/70 bg-cyber/10 font-bold text-cyber glow-cyan"
                >
                  🔄 重新生成战记
                </button>
              </div>
            )}
            {summaryReady && (
              <div className="animate-float-up rounded-2xl border border-cyber/25 bg-night-2/80 p-5 backdrop-blur">
                <Markdown>{summary}</Markdown>
              </div>
            )}
          </div>

          {/* 成就（按总结颁发） */}
          <div className="flex flex-col gap-3">
            <SectionTitle icon="🎖" label="专属成就 · 按战记颁发" color="text-neon/80" />
            {achievementsStatus === "loading" && (
              <MiniLoading label="正在根据战记为你颁奖…" />
            )}
            {achievementsStatus === "error" && (
              <div className="rounded-xl border border-plasma/40 bg-plasma/10 p-4">
                <p className="text-sm text-ice">{endingError || "成就生成失败"}</p>
                <button
                  onClick={onRetryEnding}
                  className="option-btn mt-3 h-[46px] w-full rounded-xl border-2 border-neon/70 bg-neon/10 font-bold text-neon glow-green"
                >
                  🔄 重新颁发成就
                </button>
              </div>
            )}
            {achievementsReady && (
              <div className="flex flex-col gap-3">
                {cards.map((c, i) => (
                  <div
                    key={i}
                    className="animate-float-up flex items-start gap-4 rounded-xl border border-neon/25 bg-night-2/80 p-4 backdrop-blur"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-neon/30 bg-neon/10 text-2xl">
                      {c.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-neon glow-green">
                        {i + 1}. {c.title}
                      </div>
                      {c.desc && (
                        <div className="mt-1 text-sm leading-6 text-ice/80">
                          {c.desc}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="animate-float-up flex flex-col gap-3">
            <button
              onClick={handleShare}
              disabled={!summaryReady && !achievementsReady}
              className="option-btn h-[52px] w-full rounded-xl border-2 border-cyber/70 bg-cyber/10 text-base font-bold text-cyber glow-cyan disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copied ? "✅ 成就文本已复制！" : "📤 复制总结与成就，分享给朋友"}
            </button>
            <button
              onClick={onRestart}
              className="option-btn h-[52px] w-full rounded-xl border border-white/15 bg-night-3/60 text-base font-bold text-ice"
            >
              ↺ 重新开始
            </button>
          </div>
        </>
      )}
    </div>
  );
}
