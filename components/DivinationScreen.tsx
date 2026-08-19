"use client";

import { useState } from "react";
import { styleLabel, type StoryStyle } from "@/lib/story-styles";
import { giantLabel, GIANTS, type GiantKey } from "@/lib/giants";
import Loading from "./Loading";

interface DivinationScreenProps {
  style: StoryStyle;
  onStart: (giant: GiantKey) => void;
  onBack: () => void;
}

interface DivinationResult {
  giant: GiantKey;
  reading: string;
}

type Status = "idle" | "loading" | "done" | "error";

export default function DivinationScreen({
  style,
  onStart,
  onBack,
}: DivinationScreenProps) {
  const [char, setChar] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<DivinationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    const c = Array.from(char.trim()).join("");
    if (!c) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/divination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character: c, style }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error || `请求失败 (HTTP ${res.status})`);
      }
      setResult({ giant: json.data?.giant, reading: json.data?.reading || "" });
      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "测字失败");
      setStatus("error");
    }
  };

  return (
    <div className="animate-float-up flex flex-col items-center gap-6 pt-10 text-center">
      {status === "done" && result ? (
        /* ---- 测字结果 ---- */
        <div className="flex w-full max-w-sm flex-col items-center gap-5">
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.4em] text-cyber/80 glow-cyan">
              Nǐ de fúyuán
            </p>
            <h2 className="animate-glitch text-2xl font-black text-neon glow-green">
              测字结缘
            </h2>
          </div>

          <div className="w-full rounded-2xl border-2 border-neon/40 bg-night-2/80 p-6 backdrop-blur glow-green">
            <p className="text-xs text-ghost">
              你写下的「<span className="text-ice font-bold text-lg">{char}</span>」，
              测得与你有缘的第一位巨头是——
            </p>
            <div className="my-4 text-6xl">
              {GIANTS.find((g) => g.key === result.giant)?.emoji}
            </div>
            <div className="text-xl font-black text-neon">
              {giantLabel(result.giant)}
            </div>
            <p className="mt-3 text-sm leading-6 text-ghost">{result.reading}</p>
          </div>

          <button
            onClick={() => onStart(result.giant)}
            className="option-btn h-[52px] w-full max-w-sm rounded-xl border-2 border-neon/70 bg-neon/10 text-lg font-bold tracking-widest text-neon glow-green"
          >
            以「{giantLabel(result.giant)}」开局 ▶
          </button>
          <div className="flex gap-4 text-xs text-ghost/70">
            <button onClick={() => { setStatus("idle"); setResult(null); setChar(""); }} className="hover:text-neon">
              ↻ 重测一个字
            </button>
            <button onClick={onBack} className="hover:text-cyber">
              ← 重选风格
            </button>
          </div>
        </div>
      ) : (
        /* ---- 输入一个字 ---- */
        <div className="flex w-full max-w-sm flex-col items-center gap-5">
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.4em] text-cyber/80 glow-cyan">
              Cè zì jié yuán
            </p>
            <h2 className="animate-glitch text-2xl font-black text-neon glow-green">
              测字结缘
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-ghost">
              写下一个与你最有缘的字。系统将依<strong className="text-ice">笔画、五行、字义与意境</strong>，
              为你匹配一位命定的巨头，作为你踏入佛城后遇见的第一位巨头。
            </p>
            <p className="mt-2 text-[11px] text-plasma/70">
              本局风格：{styleLabel(style)}
            </p>
          </div>

          <div className="flex w-full items-center justify-center">
            <input
              type="text"
              value={char}
              onChange={(e) =>
                setChar(Array.from(e.target.value).slice(0, 1).join(""))
              }
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="字"
              aria-label="写下一个字"
              autoFocus
              className="h-[84px] w-[84px] rounded-2xl border-2 border-white/15 bg-night-3/80 text-center text-5xl font-black text-neon outline-none backdrop-blur focus:border-neon/70 glow-green"
            />
          </div>
          {char && Array.from(char).length !== 1 && (
            <p className="text-xs text-plasma">请只写下一个字</p>
          )}

          {status === "error" && (
            <p className="max-w-xs text-sm leading-6 text-plasma">{errorMsg}</p>
          )}

          <button
            onClick={submit}
            disabled={!char || status === "loading"}
            className={`option-btn h-[52px] w-full max-w-sm rounded-xl border-2 px-6 text-lg font-bold tracking-widest ${
              char && status !== "loading"
                ? "border-neon/70 bg-neon/10 text-neon glow-green"
                : "cursor-not-allowed border-white/10 bg-white/5 text-ghost/50"
            }`}
          >
            {status === "loading" ? "正在测字…" : "测一测 ✍️"}
          </button>

          <button
            onClick={onBack}
            className="text-xs text-ghost/70 hover:text-cyber"
          >
            ← 重选风格
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="mt-2">
          <Loading />
        </div>
      )}
    </div>
  );
}
