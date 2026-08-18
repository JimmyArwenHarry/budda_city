import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { callSummary } from "@/lib/deepseek";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// 基于完整剧情历史，让模型写一份约 800 字的佛城战记总结
// 注意：要求直接输出总结正文（不要求 JSON），规避 json_object 在长上下文下的空白问题
const SUMMARY_INSTRUCTION = `【总结指令】《佛城风云：六巨头列传》的游戏已经结束。请基于上面展示的完整剧情（玩家从踏入佛城到终局的所有选择与遭遇），为玩家生成一份约 800 字的战记总结（务必不少于 700 字）。
要求：
- 覆盖玩家的关键抉择、与六巨头（马神🐴/骜魔🍔/喵神🐱/林魔🌲/狼魔🐺/帅神🤖）及配角的恩怨、最终命运；
- 文风延续黑色幽默与佛城黑话（阴毛=阴谋、猪球=足球、肉夹馍、夹逼等）；
- 总结要有画面感与节奏感，读起来像一段佛城说书。
直接输出总结正文即可，不要JSON，不要markdown标题，不要"总结如下"之类的多余前缀。`;

export async function POST(req: NextRequest) {
  let body: { history?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history : [];
  if (history.length === 0) {
    return NextResponse.json({ error: "缺少剧情历史" }, { status: 400 });
  }

  // 必须以 USER 消息收尾（deepseek-v4-flash 在 thinking:disabled 下 system 收尾会返回空白）
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: SUMMARY_INSTRUCTION },
  ];

  try {
    const { summary } = await callSummary(messages);
    return NextResponse.json({ data: { summary } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "总结生成失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
