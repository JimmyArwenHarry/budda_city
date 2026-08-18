import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { callAchievements } from "@/lib/deepseek";
import { isStoryStyle, styleLabel, type StoryStyle } from "@/lib/story-styles";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { summary?: string; style?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  if (!summary) {
    return NextResponse.json({ error: "缺少剧情总结" }, { status: 400 });
  }
  // 非法风格宽容处理：视为未选
  const style = isStoryStyle(body.style) ? body.style : undefined;

  // 注意：成就基于"总结"生成，上下文很短；要求输出 "emoji | title | desc" 行格式（不要求 JSON）
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(style) },
    { role: "user", content: "游戏已结束。下面是一位玩家的完整剧情的战记总结：" },
    { role: "assistant", content: summary },
    {
      role: "user",
      content:
        "请根据这份总结，为这位玩家颁发 3 个极具嘲讽或赞美的专属【成就】。title 是恶搞称号，desc 是结合剧情的嘲讽或赞美的一句话（可呼应佛城黑话：阴毛、肉夹馍、夹逼、买办、收租等）。" +
        (style
          ? `成就称号与描述须贴合本局风格（${styleLabel(style)}）。`
          : "") +
        "输出格式：每行一个成就，用 | 分隔三个字段，例如：🐴 | 地表最强173 | 成功逃脱马魔的骟击。" +
        "不要JSON，不要编号，不要markdown，不要多余文字，只输出 3 行。",
    },
  ];

  try {
    const { achievements } = await callAchievements(messages);
    return NextResponse.json({ data: { achievements } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "成就生成失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
