// DeepSeek API 服务端调用封装（OpenAI 兼容接口）
// 仅供 Next.js Server Component / Route Handler 使用，绝不打进浏览器端。
//
// 可靠性要点（经过大量实测确认）：
// 1. deepseek-v4-flash 是推理模型，必须用 thinking: { type: "disabled" } 关闭思考，
//    否则 max_tokens 会被 reasoning_content 耗尽、content 为空。
// 2. 消息必须以 USER 消息收尾（system 收尾 100% 空白）。
// 3. 关键：不要使用 response_format: { type: "json_object" }。
//    实测该模式在长上下文下会让模型以 ~17%~100% 的概率输出"纯空白"（finish=stop、
//    几十到上百个空格 token），且随服务端波动剧烈，重试 nudge 也只能"再抛一次硬币"。
//    关闭它后模型从不空白，而是输出"剧情正文 + * 开头的选项列表"这样的结构化正文，
//    用下方的容错解析器即可稳定还原为 JSON 契约。

import type { Achievement, ChatMessage } from "./types";
import {
  matchGiantKey,
  randomGiantKey,
  type GiantKey,
} from "./giants";

const DEEPSEEK_BASE = "https://api.deepseek.com/chat/completions";

const MAX_ATTEMPTS = 5;

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "缺少 API Key：请在环境变量中配置 DEEPSEEK_API_KEY"
    );
  }
  return key;
}

function getModel(): string {
  return process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash";
}

/* ================================================================
 * 容错解析器
 * ================================================================ */

/**
 * 容错 JSON 提取：DeepSeek 偶发会在 JSON 外包一层 markdown 围栏或前后有多余文字。
 */
export function extractJson(text: string): unknown {
  if (!text) throw new Error("模型返回内容为空");

  // 1) 直接解析
  try {
    return JSON.parse(text);
  } catch {
    /* 继续兜底 */
  }

  // 2) 去掉 ```json ... ``` 围栏
  let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* 继续兜底 */
  }

  // 3) 掐出第一个 { 到最后一个 } 之间的片段
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const slice = cleaned.slice(start, end + 1);
    const noTrailingComma = slice.replace(/,(\s*[}\]])/g, "$1");
    for (const candidate of [slice, noTrailingComma]) {
      try {
        return JSON.parse(candidate);
      } catch {
        /* 继续尝试 */
      }
    }
  }

  throw new Error("模型返回的不是合法 JSON：" + text.slice(0, 200));
}

/** 从结构化正文中提取选项行（支持 * 、- 、• 、1. 、① 等前缀） */
function extractOptionLines(text: string): string[] {
  return text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => /^[*\-•]\s+/.test(l) || /^\d+[.、)]\s+/.test(l) || /^[①-④]/.test(l))
    .map((l) =>
      l
        .replace(/^[*\-•]\s+/, "")
        .replace(/^\d+[.、)]\s+/, "")
        .replace(/^[①-④]\s*/, "")
        .trim()
    )
    .filter((l) => l.length > 0);
}

/** 解析剧情输出：优先当 JSON；否则按"正文 + * 选项列表"解析 */
function parseStoryContent(content: string): {
  narrative: string;
  options: string[];
} {
  // 1) JSON 形态（模型偶尔仍会输出 JSON）
  try {
    const raw = extractJson(content);
    const obj = (raw ?? {}) as Record<string, unknown>;
    const narrative = typeof obj.narrative === "string" ? obj.narrative : "";
    const options = Array.isArray(obj.options)
      ? obj.options.filter((o): o is string => typeof o === "string")
      : [];
    if (narrative.trim() && options.length >= 1) return { narrative, options };
  } catch {
    /* 不是 JSON，走正文解析 */
  }

  // 2) 正文 + 选项列表
  const lines = content.split(/\n/);
  const firstBullet = lines.findIndex((l) => /^\s*[*\-•]\s+/.test(l));
  if (firstBullet !== -1) {
    const narrative = lines.slice(0, firstBullet).join("\n").trim();
    const options = extractOptionLines(content);
    return { narrative, options };
  }

  // 3) 整段当作剧情正文
  return { narrative: content.trim(), options: [] };
}

/** 解析成就输出：优先当 JSON；否则按 "emoji | title | desc" 行解析 */
function parseAchievementsContent(content: string): Achievement[] {
  // 1) JSON 形态
  try {
    const raw = extractJson(content);
    const obj = (raw ?? {}) as Record<string, unknown>;
    if (Array.isArray(obj.achievements)) {
      const list = obj.achievements.map((a) => {
        if (typeof a === "string") {
          const m = a.match(/^【([^】]+)】\s*[:：]?\s*([\s\S]*)$/);
          return m
            ? { emoji: "🎖", title: m[1], desc: m[2] }
            : { emoji: "🎖", title: a, desc: "" };
        }
        const o = (a ?? {}) as Record<string, unknown>;
        return {
          emoji: typeof o.emoji === "string" ? o.emoji : "🎖",
          title:
            typeof o.title === "string"
              ? o.title
              : typeof o.emoji === "string"
                ? o.emoji
                : "神秘成就",
          desc: typeof o.desc === "string" ? o.desc : "",
        };
      });
      if (list.length > 0) return list;
    }
  } catch {
    /* 不是 JSON，走行解析 */
  }

  // 2) "emoji | title | desc" 逐行解析
  const out: Achievement[] = [];
  for (const line of content.split(/\n/)) {
    const t = line.trim();
    if (!t) continue;
    const parts = t.split("|").map((s) => s.trim());
    if (parts.length >= 3) {
      out.push({ emoji: parts[0] || "🎖", title: parts[1], desc: parts[2] });
    } else if (parts.length === 2) {
      out.push({ emoji: "🎖", title: parts[0], desc: parts[1] });
    } else {
      out.push({ emoji: "🎖", title: t, desc: "" });
    }
  }
  return out;
}

/* ================================================================
 * 单次调用
 * ================================================================ */

/** 单次调用，返回原始 content 字符串（不使用 response_format，规避空白输出） */
async function singleCall(
  messages: ChatMessage[],
  maxTokens = 1500
): Promise<string> {
  const body = {
    model: getModel(),
    temperature: 1.05,
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    stream: false,
    messages,
  };
  let res: Response;
  try {
    res = await fetch(DEEPSEEK_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/timeout|abort/i.test(msg)) {
      throw new Error("请求超时：大模型迟迟未响应，请重试");
    }
    throw new Error("无法连接 DeepSeek API，请检查网络");
  }

  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 300);
    try {
      const j = JSON.parse(text);
      detail = j?.error?.message || detail;
    } catch {
      /* 保留原文 */
    }
    const status = res.status;
    if (status === 401) {
      throw new Error(
        "API Key 无效或已过期，请检查 DEEPSEEK_API_KEY"
      );
    }
    if (status === 429) {
      throw new Error("请求过于频繁（触发限流），请稍候再试");
    }
    if (status === 402) {
      throw new Error("DeepSeek 账户余额不足，请充值后重试");
    }
    throw new Error(`DeepSeek API 错误(${status})：${detail}`);
  }

  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("DeepSeek 返回了无法解析的响应");
  }
  return data.choices?.[0]?.message?.content ?? "";
}

/* ================================================================
 * 三个业务接口
 * ================================================================ */

export interface DeepSeekOptions {
  temperature?: number;
  maxTokens?: number;
}

/** 剧情回合：返回 { narrative, options }。空白/无选项时追加 nudge 提示重试。 */
export async function callDeepSeek(
  messages: ChatMessage[],
  opts: DeepSeekOptions & { requireOptions?: boolean } = {}
): Promise<{ narrative: string; options: string[] }> {
  const { maxTokens = 1500, requireOptions = true } = opts;

  /** 重试提示：引导模型回到"正文 + * 选项列表"结构 */
  const nudge = (attempt: number): ChatMessage => ({
    role: "user",
    content:
      `⚠️【自动重试·第 ${attempt} 次】你上一条回复不完整（缺少剧情正文或选项）。` +
      `请先写 100-200 字剧情正文，然后空一行，用 * 开头逐行列出 3 个选项。` +
      `不要JSON，不要markdown标题。`,
  });

  let lastErr: unknown = null;
  let current: ChatMessage[] = messages;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const content = await singleCall(current, maxTokens);
    if (!content.trim()) {
      lastErr = new Error("模型返回内容为空");
      if (attempt < MAX_ATTEMPTS - 1) current = [...current, nudge(attempt + 1)];
      continue;
    }
    const { narrative, options } = parseStoryContent(content);
    if (narrative.trim() && (options.length >= 2 || !requireOptions)) {
      return { narrative, options };
    }
    lastErr = new Error("模型输出缺少剧情或选项");
    if (attempt < MAX_ATTEMPTS - 1) current = [...current, nudge(attempt + 1)];
  }
  // 兜底：解析最后一轮的正文（哪怕没有选项），保证玩家能继续
  const lastContent = await singleCall(current, maxTokens).catch(() => "");
  const last = parseStoryContent(lastContent || "");
  if (last.narrative.trim()) {
    return { narrative: last.narrative, options: last.options };
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("剧情生成失败，请稍后重试");
}

/** 结局总结：根据完整剧情历史生成约 800 字战记总结（直接返回正文，永不出空白） */
export async function callSummary(
  messages: ChatMessage[],
  opts: DeepSeekOptions = {}
): Promise<{ summary: string }> {
  const { maxTokens = 2500 } = opts;

  const nudge = (attempt: number): ChatMessage => ({
    role: "user",
    content:
      `⚠️【自动重试·第 ${attempt} 次】你上一条总结无效（空白或太短）。` +
      `请直接输出一份不少于 600 字的剧情战记总结正文，不要JSON，不要标题。`,
  });

  let lastErr: unknown = null;
  let current: ChatMessage[] = messages;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const content = await singleCall(current, maxTokens);
    if (!content.trim()) {
      lastErr = new Error("模型返回内容为空");
      if (attempt < MAX_ATTEMPTS - 1) current = [...current, nudge(attempt + 1)];
      continue;
    }
    // 优先提取 JSON 的 summary 字段；否则整段正文即总结
    let summary = "";
    try {
      const raw = extractJson(content);
      const obj = (raw ?? {}) as Record<string, unknown>;
      if (typeof obj.summary === "string" && obj.summary.trim()) {
        summary = obj.summary.trim();
      }
    } catch {
      /* 正文形态 */
    }
    if (!summary) summary = content.trim();
    if (summary) return { summary };
    lastErr = new Error("总结为空");
    if (attempt < MAX_ATTEMPTS - 1) current = [...current, nudge(attempt + 1)];
  }
  throw lastErr instanceof Error ? lastErr : new Error("总结生成失败，请稍后重试");
}

/** 成就颁发：根据剧情总结生成 3 个专属成就（"emoji | title | desc" 行格式解析） */
export async function callAchievements(
  messages: ChatMessage[],
  opts: DeepSeekOptions = {}
): Promise<{ achievements: Achievement[] }> {
  const { maxTokens = 1200 } = opts;

  const nudge = (attempt: number): ChatMessage => ({
    role: "user",
    content:
      `⚠️【自动重试·第 ${attempt} 次】请每行一个成就，用 | 分隔三个字段：emoji | title | desc，共 3 行。不要JSON，不要编号，不要多余文字。`,
  });

  let lastErr: unknown = null;
  let current: ChatMessage[] = messages;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const content = await singleCall(current, maxTokens);
    if (!content.trim()) {
      lastErr = new Error("模型返回内容为空");
      if (attempt < MAX_ATTEMPTS - 1) current = [...current, nudge(attempt + 1)];
      continue;
    }
    const achievements = parseAchievementsContent(content);
    if (achievements.length >= 3) {
      return { achievements: achievements.slice(0, 3) };
    }
    lastErr = new Error("模型返回的成就过少");
    if (attempt < MAX_ATTEMPTS - 1) current = [...current, nudge(attempt + 1)];
  }
  throw lastErr instanceof Error ? lastErr : new Error("成就生成失败，请稍后重试");
}

/* ================================================================
 * 测字：根据玩家写的一个字，从六巨头中选出最有缘的一位
 * ================================================================ */

/** 解析测字输出：优先当 JSON；否则按"第一行巨头key + 剩余为点评"解析 */
function parseDivinationContent(content: string): {
  giantKey: GiantKey;
  reading: string;
} | null {
  // 1) JSON 形态（模型偶发输出）
  try {
    const raw = extractJson(content);
    const obj = (raw ?? {}) as Record<string, unknown>;
    const giantRaw =
      typeof obj.giant === "string"
        ? obj.giant
        : typeof obj.giant_key === "string"
          ? obj.giant_key
          : "";
    if (giantRaw) {
      const key = matchGiantKey(giantRaw);
      if (key) {
        const reading =
          typeof obj.reading === "string" ? obj.reading.trim() : "";
        return { giantKey: key, reading };
      }
    }
  } catch {
    /* 不是 JSON，走行解析 */
  }

  // 2) 行解析：第一行是巨头 key/名，剩余为点评
  const lines = content
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  const key =
    matchGiantKey(lines[0]) ?? matchGiantKey(content.slice(0, 40));
  if (!key) return null;
  const reading = lines.slice(1).join("\n").trim();
  return { giantKey: key, reading };
}

/** 测字：返回 { giantKey, reading }。空白/无 key 时追加 nudge 重试，最终兜底随机巨头。 */
export async function callDivination(
  messages: ChatMessage[],
  opts: DeepSeekOptions = {}
): Promise<{ giantKey: GiantKey; reading: string }> {
  const { maxTokens = 500 } = opts;

  const nudge = (attempt: number): ChatMessage => ({
    role: "user",
    content:
      `⚠️【自动重试·第 ${attempt} 次】只输出两行：` +
      `第一行是巨头key（必须是 ma / ao / miao / lin / lang / shuai 之一），` +
      `第二行是 60 字以内的测字点评。不要JSON，不要编号，不要多余文字。`,
  });

  let lastErr: unknown = null;
  let current: ChatMessage[] = messages;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const content = await singleCall(current, maxTokens);
    if (!content.trim()) {
      lastErr = new Error("模型返回内容为空");
      if (attempt < MAX_ATTEMPTS - 1) current = [...current, nudge(attempt + 1)];
      continue;
    }
    const parsed = parseDivinationContent(content);
    if (parsed) {
      return parsed;
    }
    lastErr = new Error("模型输出缺少有效的巨头 key");
    if (attempt < MAX_ATTEMPTS - 1) current = [...current, nudge(attempt + 1)];
  }
  // 兜底：随机选一位巨头（尽量让玩家能继续）
  const fallbackKey = randomGiantKey();
  return {
    giantKey: fallbackKey,
    reading: "（测字灵机一瞬未能辨清，天意让福缘落在此处。）",
  };
}
