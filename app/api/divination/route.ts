import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { callDivination } from "@/lib/deepseek";
import { isStoryStyle, styleLabel, type StoryStyle } from "@/lib/story-styles";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 测字指令：结构化正文契约（不要求 JSON，规避 json_object 空白问题） */
function divinationInstruction(character: string, style?: StoryStyle): string {
  const styleNote = style
    ? `（本局风格：${styleLabel(style)}，点评措辞贴合该风格）`
    : "";
  return (
    `【测字指令】玩家本局写下了一个字：「${character}」${styleNote}。` +
    `请像佛城的测字先生一样，分析这个字：①笔画数；②五行属性（按汉字五行推断）；③字义与意境。` +
    `然后从六巨头（马神🐴/骜魔🍔/喵神🐱/林魔🌲/狼魔🐺/帅神🤖，各自的五行/技能/性格见人物数据库）中，` +
    `选出一位与该字缘分最深者，作为玩家在游戏中遇到的第一位巨头。` +
    `输出格式：只输出两行，不要任何其他文字——\n` +
    `第一行：巨头的key，必须且只能是 ma / ao / miao / lin / lang / shuai 之一；\n` +
    `第二行：60 字以内的测字点评（结合笔画/五行/字义，风趣幽默地解释为何是这位巨头；` +
    `点评只围绕你选定的这位巨头展开，不要提到或比较其他巨头，避免与第一行矛盾）。`
  );
}

export async function POST(req: NextRequest) {
  let body: { character?: unknown; style?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  // 只接受"一个字"（含生僻字/emoji，按码点取长度）
  const chars = Array.from(String(body.character ?? "").trim());
  if (chars.length !== 1) {
    return NextResponse.json({ error: "请写下一个字" }, { status: 400 });
  }
  const character = chars[0];
  // 非法风格宽容处理：视为未选
  const style = isStoryStyle(body.style) ? body.style : undefined;

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(style) },
    { role: "user", content: divinationInstruction(character, style) },
  ];

  try {
    const { giantKey, reading } = await callDivination(messages);
    return NextResponse.json({ data: { character, giant: giantKey, reading } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "测字失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
