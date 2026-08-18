import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { callDeepSeek } from "@/lib/deepseek";
import type { ChatMessage, StoryResponse } from "@/lib/types";

export const runtime = "nodejs";
// Vercel Hobby 函数最长 60s；DeepSeek 推理通常 5~15s，足够
export const maxDuration = 60;

const TOTAL_TURNS = 13;

interface RequestBody {
  /** 历史对话（不含 system），role ∈ user | assistant */
  history?: ChatMessage[];
  /** 当前生成序号：1~13 为剧情回合，13 为结局结算 */
  turn?: number;
}

/** 普通剧情回合指令：正文 + * 选项列表（不要求 JSON，规避 json_object 空白问题） */
function storyInstruction(turn: number): string {
  const finaleNote =
    turn === 12
      ? "\n注意：turn=12 是最终大高潮，剧情要迎来六巨头佛城大混战、天翻地覆的终极清算，但仍需给出 3 个选项。"
      : "";
  return (
    `【回合指令】第 ${turn} 回合（turn=${turn}）。` +
    `请先写 100-200 字剧情正文（承接上文，务必包含巨头专属 emoji 与佛城黑话：阴毛、肉夹馍、夹逼、买办、收租等），` +
    `然后在最后单独列出 3 个选项，每个选项单独一行并以 * 开头。` +
    `不要JSON，不要markdown标题，不要多余的说明文字。` +
    finaleNote
  );
}

/** 结局回合指令：只需结局正文，无选项 */
function endingInstruction(): string {
  return (
    `【回合指令】第 ${TOTAL_TURNS} 回合（turn=${TOTAL_TURNS}），这是游戏结局。` +
    `请根据玩家过去所有选择，写一段 150-300 字的最终结局正文：总结玩家的命运` +
    `（被吃掉了？被夹逼成肉夹馍？当了买办？成了扫地僧？还是掀翻六巨头当上佛城新贵？），` +
    `并与前文关键事件呼应。直接输出结局正文即可，不要JSON，不要选项，不要标题。`
  );
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const turn = Number(body.turn) || 1;

  if (history.length === 0 && turn === 1) {
    return NextResponse.json({ error: "缺少对话历史" }, { status: 400 });
  }

  const isEnding = turn >= TOTAL_TURNS;

  // 构建消息：System + 历史 + 回合指令
  // 重要：回合指令必须以 USER 消息收尾（deepseek-v4-flash 在 thinking:disabled 下，
  // 若最后一条是 system 消息会返回空白 content，实测 100% 失败）
  const turnInstruction = isEnding ? endingInstruction() : storyInstruction(turn);
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: turnInstruction },
  ];

  try {
    // 结局回合不要求选项，剧情正文即 ending_story
    const { narrative, options } = await callDeepSeek(messages, {
      requireOptions: !isEnding,
    });
    const story: StoryResponse = {
      narrative: isEnding ? "" : narrative,
      options: isEnding ? [] : options,
      is_ending: isEnding,
      ending_story: isEnding ? narrative : "",
      achievements: [],
    };
    return NextResponse.json({ data: story });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
