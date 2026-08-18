"use client";

import { useCallback, useRef, useState } from "react";
import type { Achievement, ChatMessage, StoryResponse } from "@/lib/types";
import Typewriter from "./Typewriter";
import Markdown from "./Markdown";
import TurnIndicator from "./TurnIndicator";
import Loading from "./Loading";
import StartScreen from "./StartScreen";
import EndingView from "./EndingView";

const TOTAL_TURNS = 13;
const NUM_CHIPS = ["①", "②", "③", "④"];

const GAME_START: ChatMessage = {
  role: "user",
  content: "游戏开始：我，一个无名小卒，背着行囊踏进了佛城的城门。",
};

type Phase = "start" | "loading" | "story" | "ending" | "error";

export default function Game() {
  const [phase, setPhase] = useState<Phase>("start");
  const [history, setHistory] = useState<ChatMessage[]>([GAME_START]);
  const [turn, setTurn] = useState(1);
  const [story, setStory] = useState<StoryResponse | null>(null);
  const [lastChoice, setLastChoice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [doneTyping, setDoneTyping] = useState(false);
  const [skipTyping, setSkipTyping] = useState(false);

  // 结局流程：总结 + 按总结发成就
  const [summary, setSummary] = useState("");
  const [summaryStatus, setSummaryStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementsStatus, setAchievementsStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [endingError, setEndingError] = useState("");

  const pendingRef = useRef<{ history: ChatMessage[]; turn: number } | null>(null);
  const busyRef = useRef(false);
  const endingBusyRef = useRef(false);

  // ---- 结局流程：总结 → 按总结发成就 ----
  const fetchAchievements = useCallback(async (summaryText: string) => {
    setAchievementsStatus("loading");
    try {
      const res = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: summaryText }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error || `请求失败 (HTTP ${res.status})`);
      }
      const list = json.data?.achievements as Achievement[];
      setAchievements(Array.isArray(list) ? list : []);
      setAchievementsStatus("done");
    } catch (e) {
      setEndingError(e instanceof Error ? e.message : "成就生成失败");
      setAchievementsStatus("error");
    }
  }, []);

  const beginEndingFlow = useCallback(
    async (fullHistory: ChatMessage[]) => {
      if (endingBusyRef.current) return;
      endingBusyRef.current = true;
      setSummaryStatus("loading");
      setEndingError("");
      try {
        const res = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history: fullHistory }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) {
          throw new Error(json.error || `请求失败 (HTTP ${res.status})`);
        }
        const sum = (json.data?.summary || "").trim();
        if (!sum) throw new Error("总结生成失败：模型未返回有效内容");
        setSummary(sum);
        setSummaryStatus("done");
        await fetchAchievements(sum);
      } catch (e) {
        setEndingError(e instanceof Error ? e.message : "总结生成失败");
        setSummaryStatus("error");
        setAchievementsStatus("idle");
      } finally {
        endingBusyRef.current = false;
      }
    },
    [fetchAchievements]
  );

  const retryEndingFlow = () => {
    if (history.length > 0) {
      void beginEndingFlow(history);
    }
  };

  // ---- 剧情回合 ----
  const requestStory = useCallback(
    async (nextHistory: ChatMessage[], nextTurn: number) => {
      if (busyRef.current) return;
      busyRef.current = true;
      pendingRef.current = { history: nextHistory, turn: nextTurn };
      setPhase("loading");
      setErrorMsg("");
      setSkipTyping(false);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history: nextHistory, turn: nextTurn }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) {
          throw new Error(json.error || `请求失败 (HTTP ${res.status})`);
        }
        const s = json.data as StoryResponse;
        setStory(s);
        setTurn(nextTurn);
        setDoneTyping(false);
        if (s.is_ending) {
          // 结局：把结局正文写进历史，随后后台生成总结与成就
          const fullHistory: ChatMessage[] = [
            ...nextHistory,
            { role: "assistant", content: s.ending_story },
          ];
          setHistory(fullHistory);
          setPhase("ending");
          void beginEndingFlow(fullHistory);
        } else {
          setHistory((h) => [
            ...h,
            { role: "assistant", content: s.narrative },
          ]);
          setPhase("story");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "网络连接异常";
        setErrorMsg(msg);
        setPhase("error");
      } finally {
        busyRef.current = false;
      }
    },
    [beginEndingFlow]
  );

  const startGame = () => requestStory([GAME_START], 1);

  const choose = useCallback(
    (option: string) => {
      if (busyRef.current || !story) return;
      const nextHistory: ChatMessage[] = [
        ...history,
        { role: "user", content: option },
      ];
      setLastChoice(option);
      requestStory(nextHistory, turn + 1);
    },
    [history, story, turn, requestStory]
  );

  const retry = () => {
    if (pendingRef.current) {
      requestStory(pendingRef.current.history, pendingRef.current.turn);
    }
  };

  const restart = () => {
    setHistory([GAME_START]);
    setTurn(1);
    setStory(null);
    setLastChoice("");
    setErrorMsg("");
    setDoneTyping(false);
    setSkipTyping(false);
    setSummary("");
    setSummaryStatus("idle");
    setAchievements([]);
    setAchievementsStatus("idle");
    setEndingError("");
    setPhase("start");
  };

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-16 pt-5 sm:pt-8">
      {/* 顶部回合指示器 */}
      {phase !== "start" && (
        <header className="sticky top-0 z-30 -mx-4 mb-5 bg-night/80 px-4 py-3 backdrop-blur">
          <TurnIndicator turn={Math.min(turn, TOTAL_TURNS)} total={TOTAL_TURNS} />
        </header>
      )}

      <main className="flex flex-1 flex-col">
        {phase === "start" && <StartScreen onStart={startGame} />}
        {phase === "loading" && <Loading />}
        {phase === "error" && <ErrorView msg={errorMsg} onRetry={retry} onRestart={restart} />}
        {phase === "story" && story && (
          <StoryView
            story={story}
            turn={turn}
            doneTyping={doneTyping}
            skipTyping={skipTyping}
            lastChoice={lastChoice}
            onSkip={() => setSkipTyping(true)}
            onDone={() => setDoneTyping(true)}
            onChoose={choose}
          />
        )}
        {phase === "ending" && story && (
          <EndingView
            endingStory={story.ending_story}
            summary={summary}
            summaryStatus={summaryStatus}
            achievements={achievements}
            achievementsStatus={achievementsStatus}
            endingError={endingError}
            onRetryEnding={retryEndingFlow}
            onRestart={restart}
          />
        )}
      </main>

      <footer className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-ghost/40">
        🐴🍔🐱🌲🐺🤖 FHC · AI 剧本实时生成
      </footer>
    </div>
  );
}

/* ============ 剧情回合视图 ============ */
interface StoryViewProps {
  story: StoryResponse;
  turn: number;
  doneTyping: boolean;
  skipTyping: boolean;
  lastChoice: string;
  onSkip: () => void;
  onDone: () => void;
  onChoose: (option: string) => void;
}

function StoryView({
  story,
  turn,
  doneTyping,
  skipTyping,
  lastChoice,
  onSkip,
  onDone,
  onChoose,
}: StoryViewProps) {
  const isFinale = turn >= 12;
  return (
    <div className="animate-float-up flex flex-col gap-4">
      {/* 回合标签 */}
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-neon/30 bg-neon/10 px-2 py-0.5 font-mono text-xs font-bold text-neon">
          {isFinale ? "⚡ 最终高潮" : `回合 ${turn}`}
        </span>
        <span className="text-xs text-ghost/60">佛城 · 荒诞的每一刻都在发生</span>
      </div>

      {/* 剧情卡片（点击跳过打字机） */}
      <div
        onClick={onSkip}
        className="cursor-pointer rounded-2xl border border-white/10 bg-night-2/80 p-5 backdrop-blur"
      >
        <Typewriter
          key={story.narrative}
          text={story.narrative}
          skip={skipTyping}
          speed={28}
          stepChars={
            story.narrative.length > 180 ? 3 : story.narrative.length > 90 ? 2 : 1
          }
          onDone={onDone}
        >
          {(revealed) => (
            <>
              <Markdown>{revealed}</Markdown>
              {!doneTyping && (
                <span className="animate-blink text-neon">▍</span>
              )}
            </>
          )}
        </Typewriter>
        {!doneTyping && (
          <p className="mt-2 text-right text-[10px] text-ghost/40">
            点击剧情可跳过 ▸
          </p>
        )}
      </div>

      {/* 上一选择回显 */}
      {lastChoice && (
        <div className="rounded-lg border border-white/5 bg-night-3/40 px-4 py-2 text-xs text-ghost">
          <span className="mr-1.5 font-bold text-cyber">➤</span>
          <span className="mr-1 text-cyber">你的选择：</span>
          {lastChoice}
        </div>
      )}

      {/* 选项按钮 */}
      <div className="flex flex-col gap-3">
        {story.options.map((opt, i) => (
          <button
            key={i}
            disabled={!doneTyping}
            onClick={() => onChoose(opt)}
            className="option-btn min-h-[48px] w-full rounded-xl border border-white/15 bg-night-3/70 px-4 py-3 text-left text-[15px] leading-6 text-ice"
          >
            <span className="mr-2 font-mono text-neon">
              {NUM_CHIPS[i] ?? `(${i + 1})`}
            </span>
            {opt}
          </button>
        ))}
        {!doneTyping && (
          <p className="animate-blink text-center text-xs text-ghost/60">
            剧情播放中，请稍候…
          </p>
        )}
      </div>
    </div>
  );
}

/* ============ 错误视图 ============ */
function ErrorView({
  msg,
  onRetry,
  onRestart,
}: {
  msg: string;
  onRetry: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="animate-float-up flex flex-col items-center gap-4 py-16 text-center">
      <div className="text-5xl">💥</div>
      <p className="text-lg font-bold text-ice">佛城上空，信号中断</p>
      <p className="max-w-xs text-sm leading-6 text-ghost">{msg}</p>
      <button
        onClick={onRetry}
        className="option-btn h-[50px] w-full max-w-xs rounded-xl border-2 border-neon/70 bg-neon/10 font-bold text-neon glow-green"
      >
        🔄 重新连入佛城
      </button>
      <button
        onClick={onRestart}
        className="h-[50px] w-full max-w-xs rounded-xl border border-white/15 text-sm text-ghost"
      >
        回到主界面
      </button>
    </div>
  );
}
